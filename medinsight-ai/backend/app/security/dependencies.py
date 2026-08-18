import datetime
import logging
from typing import List, Optional, Dict, Any, Union
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from app.database.mongodb import get_mongodb, serialize_doc
from app.security.jwt import decode_access_token
from app.security.rbac import has_permission, get_role_permissions, RoleEnum

logger = logging.getLogger("medinsight.security")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class CurrentUser:
    """Represents an authenticated clinical workforce user with resolved RBAC permissions."""

    def __init__(self, doc: Dict[str, Any], session_id: Optional[str] = None):
        self.id: int = int(doc.get("id", 1))
        self.staff_id: str = doc.get("staff_id", f"STF-{self.id:05d}")
        self.username: str = doc.get("username", "")
        self.email: str = doc.get("email", "")
        self.first_name: str = doc.get("first_name", "")
        self.last_name: str = doc.get("last_name", "")
        self.full_name: str = doc.get("full_name", f"{self.first_name} {self.last_name}".strip())
        self.role: str = str(doc.get("role", RoleEnum.PHYSICIAN.value)).lower().strip()
        self.department: str = doc.get("department", "Internal Medicine")
        self.facility: str = doc.get("facility", "MedInsight Central Hospital")
        self.is_active: bool = bool(doc.get("is_active", True))
        self.must_change_password: bool = bool(doc.get("must_change_password", False))
        self.session_id: Optional[str] = session_id

        # Merge role defaults with explicit user overrides
        explicit = doc.get("permissions") or []
        role_defaults = get_role_permissions(self.role)
        self.permissions: List[str] = sorted(list(set(role_defaults + explicit)))

    def can(self, permission: str) -> bool:
        """Checks if current user holds permission."""
        return has_permission(self.role, self.permissions, permission)


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db=Depends(get_mongodb)
) -> CurrentUser:
    """
    Enforces authentication on protected routes.
    1. Extracts and decodes short-lived JWT.
    2. Validates session in 'sessions' collection (detects logged-out or revoked sessions).
    3. Validates user account active status and account lock status in MongoDB.
    """
    # Also support Authorization header directly if not caught by OAuth2PasswordBearer
    if not token:
        auth_hdr = request.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with clinical credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired clinical session token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    session_id: Optional[str] = payload.get("session_id")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing subject identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clinical database is temporarily unavailable.",
        )

    # 1. Verify Active Session (if session tracking is active)
    if session_id:
        session_doc = db["sessions"].find_one({"session_id": session_id})
        if session_doc:
            if session_doc.get("revoked_at") is not None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This clinical session has been terminated. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Update session last_seen
            try:
                db["sessions"].update_one(
                    {"session_id": session_id},
                    {"$set": {"last_seen_at": datetime.datetime.utcnow().isoformat()}}
                )
            except Exception:
                pass

    # 2. Retrieve User Document from MongoDB
    user_doc = db["users"].find_one({"username": username})
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff user account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Account Active Check
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff user account has been deactivated by hospital administration.",
        )

    # 4. Account Lockout Check
    locked_until = user_doc.get("locked_until")
    if locked_until:
        try:
            lock_dt = datetime.datetime.fromisoformat(locked_until)
            if datetime.datetime.utcnow() < lock_dt:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is temporarily locked due to repeated failed login attempts. Contact IT security.",
                )
        except (ValueError, TypeError):
            pass

    return CurrentUser(user_doc, session_id=session_id)


def require_permission(required_permission: str):
    """
    FastAPI dependency that enforces a specific granular RBAC permission.
    Returns CurrentUser if authorized; raises HTTP 403 Forbidden otherwise.
    """
    def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.can(required_permission):
            logger.warning(
                f"Access Denied: User '{current_user.username}' (role: {current_user.role}) "
                f"lacks required permission '{required_permission}'."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Restricted: Operation requires '{required_permission}' permission.",
            )
        return current_user
    return permission_checker


def require_any_permission(*permissions: str):
    """FastAPI dependency that enforces at least one of the listed permissions."""
    def any_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not any(current_user.can(p) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Restricted: Requires one of {list(permissions)} permissions.",
            )
        return current_user
    return any_checker


def require_role(*allowed_roles: str):
    """FastAPI dependency that restricts route to specific roles."""
    normalized_roles = [r.lower().strip() for r in allowed_roles]
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in normalized_roles and current_user.role not in [RoleEnum.ADMINISTRATOR.value, RoleEnum.SUPER_ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Restricted: Role '{current_user.role}' is not authorized. Allowed: {list(allowed_roles)}.",
            )
        return current_user
    return role_checker


def require_roles(allowed_roles: List[str]):
    """Alias for backwards compatibility."""
    return require_role(*allowed_roles)


def log_audit_event(
    db,
    user: Optional[CurrentUser],
    action: str,
    resource: str,
    patient_id: Optional[int] = None,
    encounter_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: str = "127.0.0.1",
    status_result: str = "SUCCESS"
):
    """
    HIPAA Compliant Audit Trail Logging.
    Records security and access events without storing plaintext passwords or tokens.
    """
    if db is None:
        return

    try:
        now_iso = datetime.datetime.utcnow().isoformat()
        audit_entry = {
            "user_id": user.id if user else None,
            "staff_id": user.staff_id if user else "STF-UNKNOWN",
            "username": user.username if user else "anonymous",
            "action": action,
            "resource": resource,
            "patient_id": patient_id,
            "encounter_id": encounter_id,
            "details": details or {},
            "status": status_result,
            "ip_address": ip_address,
            "timestamp": now_iso
        }
        db["audit_logs"].insert_one(audit_entry)
    except Exception as ex:
        logger.error(f"Audit log recording error: {ex}")
