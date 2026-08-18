import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, List, Optional
from app.database.mongodb import get_mongodb
from app.schemas.schemas import UserLogin, Token, UserResponse, ApiResponse, PasswordChangeRequest
from app.security.password import verify_password, get_password_hash
from app.security.jwt import create_access_token
from app.security.dependencies import get_current_user, log_audit_event, CurrentUser
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Workforce Session Security"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


@router.post("/login", response_model=ApiResponse[Token])
def login(login_data: UserLogin, request: Request, db=Depends(get_mongodb)):
    """
    Hospital Staff Authentication Endpoint.
    - Validates Username / Staff ID.
    - Verifies bcrypt hashed password.
    - Enforces temporary account lockout after 5 consecutive failed attempts.
    - Creates a tracked session document in MongoDB.
    - Issues a short-lived signed JWT access token.
    - Records HIPAA audit log.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clinical authentication database unavailable."
        )

    now = datetime.datetime.utcnow()
    now_iso = now.isoformat()
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Unknown Clinical Client")

    # 1. Look up user by username OR staff_id
    query = {"$or": [
        {"username": login_data.username.strip()},
        {"staff_id": login_data.username.strip()}
    ]}
    user_doc = db["users"].find_one(query)

    # 2. If user does not exist -> log failed attempt and return generic error
    if not user_doc:
        log_audit_event(
            db=db,
            user=None,
            action="LOGIN_FAILURE",
            resource="auth",
            details={"attempted_username": login_data.username, "reason": "USER_NOT_FOUND"},
            ip_address=client_ip,
            status_result="FAILURE"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid clinical credentials or username.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check Account Lockout State
    locked_until_str = user_doc.get("locked_until")
    if locked_until_str:
        try:
            locked_until_dt = datetime.datetime.fromisoformat(locked_until_str)
            if now < locked_until_dt:
                remaining_mins = max(1, int((locked_until_dt - now).total_seconds() // 60))
                log_audit_event(
                    db=db,
                    user=CurrentUser(user_doc),
                    action="LOGIN_BLOCKED_LOCKED_ACCOUNT",
                    resource="auth",
                    details={"remaining_minutes": remaining_mins},
                    ip_address=client_ip,
                    status_result="BLOCKED"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {remaining_mins} minutes or contact IT security.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                # Lockout has expired -> reset lock
                db["users"].update_one(
                    {"_id": user_doc["_id"]},
                    {"$set": {"locked_until": None, "failed_login_attempts": 0}}
                )
                user_doc["failed_login_attempts"] = 0
                user_doc["locked_until"] = None
        except (ValueError, TypeError):
            pass

    # 4. Check Account Deactivation
    if not user_doc.get("is_active", True):
        log_audit_event(
            db=db,
            user=CurrentUser(user_doc),
            action="LOGIN_BLOCKED_DEACTIVATED",
            resource="auth",
            ip_address=client_ip,
            status_result="BLOCKED"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff user account has been deactivated. Please contact your clinical administrator.",
        )

    # 5. Verify Password
    hashed_pwd = user_doc.get("hashed_password", "")
    is_valid_pwd = verify_password(login_data.password, hashed_pwd)

    if not is_valid_pwd:
        failed_count = int(user_doc.get("failed_login_attempts", 0)) + 1
        update_doc: Dict[str, Any] = {"failed_login_attempts": failed_count}

        lock_triggered = False
        if failed_count >= MAX_FAILED_ATTEMPTS:
            lock_until = (now + datetime.timedelta(minutes=LOCKOUT_DURATION_MINUTES)).isoformat()
            update_doc["locked_until"] = lock_until
            lock_triggered = True

        db["users"].update_one({"_id": user_doc["_id"]}, {"$set": update_doc})

        log_audit_event(
            db=db,
            user=CurrentUser(user_doc),
            action="LOGIN_FAILURE",
            resource="auth",
            details={
                "failed_attempts": failed_count,
                "lockout_triggered": lock_triggered
            },
            ip_address=client_ip,
            status_result="FAILURE"
        )

        if lock_triggered:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account locked: Maximum failed attempts reached ({MAX_FAILED_ATTEMPTS}). Locked for {LOCKOUT_DURATION_MINUTES} minutes.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid clinical credentials or username.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 6. Successful Authentication -> Reset failed attempts & Update Last Login
    session_id = uuid.uuid4().hex
    expires_at = (now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).isoformat()

    db["users"].update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login_at": now_iso
            }
        }
    )

    # 7. Record Active Session in MongoDB
    session_record = {
        "session_id": session_id,
        "user_id": user_doc.get("id"),
        "staff_id": user_doc.get("staff_id", f"DOC-{user_doc.get('id', 1):05d}"),
        "username": user_doc.get("username"),
        "role": user_doc.get("role"),
        "user_agent": user_agent,
        "ip_address": client_ip,
        "created_at": now_iso,
        "last_seen_at": now_iso,
        "expires_at": expires_at,
        "revoked_at": None
    }
    db["sessions"].insert_one(session_record)

    current_user = CurrentUser(user_doc, session_id=session_id)

    # 8. Issue Signed Access Token
    token_payload = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "staff_id": current_user.staff_id,
        "role": current_user.role,
        "session_id": session_id
    }
    access_token = create_access_token(token_payload)

    # 9. Audit Log Success
    log_audit_event(
        db=db,
        user=current_user,
        action="LOGIN_SUCCESS",
        resource="auth",
        details={
            "role": current_user.role,
            "department": current_user.department,
            "session_id": session_id
        },
        ip_address=client_ip,
        status_result="SUCCESS"
    )

    user_resp = UserResponse(
        id=current_user.id,
        staff_id=current_user.staff_id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        facility=current_user.facility,
        permissions=current_user.permissions,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        failed_login_attempts=0,
        locked_until=None,
        last_login_at=now_iso,
        created_at=user_doc.get("created_at")
    )

    token_obj = Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_id=session_id,
        user=user_resp
    )

    return ApiResponse(success=True, data=token_obj, message="Clinical staff authentication successful")


@router.post("/logout", response_model=ApiResponse[Dict[str, Any]])
def logout(
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Revokes the current active session in MongoDB."""
    now_iso = datetime.datetime.utcnow().isoformat()
    if current_user.session_id and db is not None:
        db["sessions"].update_one(
            {"session_id": current_user.session_id},
            {"$set": {"revoked_at": now_iso}}
        )

    log_audit_event(
        db=db,
        user=current_user,
        action="LOGOUT",
        resource="auth",
        details={"session_id": current_user.session_id},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return ApiResponse(success=True, data={"status": "session_revoked"}, message="Signed out and session revoked successfully")


@router.post("/logout-all", response_model=ApiResponse[Dict[str, Any]])
def logout_all_sessions(
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Revokes all active sessions across all devices for the current user."""
    now_iso = datetime.datetime.utcnow().isoformat()
    if db is not None:
        res = db["sessions"].update_many(
            {"user_id": current_user.id, "revoked_at": None},
            {"$set": {"revoked_at": now_iso}}
        )
        revoked_count = res.modified_count
    else:
        revoked_count = 1

    log_audit_event(
        db=db,
        user=current_user,
        action="LOGOUT_ALL_SESSIONS",
        resource="auth",
        details={"revoked_sessions_count": revoked_count},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return ApiResponse(
        success=True,
        data={"revoked_sessions": revoked_count},
        message=f"Revoked {revoked_count} active sessions across all devices."
    )


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_current_user_profile(
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns the authenticated user identity, role, and resolved RBAC permissions."""
    user_doc = db["users"].find_one({"username": current_user.username}) if db is not None else {}
    user_resp = UserResponse(
        id=current_user.id,
        staff_id=current_user.staff_id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        facility=current_user.facility,
        permissions=current_user.permissions,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        failed_login_attempts=int(user_doc.get("failed_login_attempts", 0) if user_doc else 0),
        locked_until=user_doc.get("locked_until") if user_doc else None,
        last_login_at=user_doc.get("last_login_at") if user_doc else None,
        created_at=user_doc.get("created_at") if user_doc else None
    )
    return ApiResponse(
        success=True,
        data=user_resp,
        message=f"Current user profile: {current_user.full_name} ({current_user.role.upper()})"
    )


@router.post("/change-password", response_model=ApiResponse[Dict[str, Any]])
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Allows authenticated clinical staff to update their account password."""
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    user_doc = db["users"].find_one({"username": current_user.username})
    if not user_doc or not verify_password(payload.current_password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )

    new_hash = get_password_hash(payload.new_password)
    now_iso = datetime.datetime.utcnow().isoformat()

    db["users"].update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "hashed_password": new_hash,
                "must_change_password": False,
                "updated_at": now_iso
            }
        }
    )

    log_audit_event(
        db=db,
        user=current_user,
        action="PASSWORD_CHANGED",
        resource="auth",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return ApiResponse(success=True, data={"status": "password_updated"}, message="Password updated successfully.")
