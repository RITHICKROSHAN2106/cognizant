import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import Dict, Any, List, Optional
from app.database.mongodb import get_mongodb, serialize_doc, serialize_docs
from app.schemas.schemas import (
    ApiResponse, UserResponse, StaffUserCreate, StaffUserUpdate,
    AdminPasswordReset, AuditLogEntry, SecurityStatusResponse, RolePermissionMatrix
)
from app.security.password import get_password_hash
from app.security.dependencies import (
    get_current_user, require_permission, log_audit_event, CurrentUser
)
from app.security.rbac import (
    PermissionEnum, RoleEnum, ROLE_PERMISSIONS, get_role_permissions
)

router = APIRouter(prefix="/admin", tags=["Hospital Workforce Administration & Security Governance"])


@router.get("/users", response_model=ApiResponse[List[UserResponse]])
def list_staff_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    department: Optional[str] = Query(None, description="Filter by department"),
    search: Optional[str] = Query(None, description="Search by name, username, or staff ID"),
    is_active: Optional[bool] = Query(None, description="Filter active/inactive staff"),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.USERS_VIEW.value))
):
    """Lists hospital staff workforce directory."""
    query: Dict[str, Any] = {}
    if role:
        query["role"] = role.lower().strip()
    if department:
        query["department"] = {"$regex": department, "$options": "i"}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        s = search.strip()
        query["$or"] = [
            {"username": {"$regex": s, "$options": "i"}},
            {"staff_id": {"$regex": s, "$options": "i"}},
            {"first_name": {"$regex": s, "$options": "i"}},
            {"last_name": {"$regex": s, "$options": "i"}},
            {"email": {"$regex": s, "$options": "i"}}
        ]

    users = list(db["users"].find(query).sort("id", 1))
    user_responses = [
        UserResponse(
            id=u.get("id", 1),
            staff_id=u.get("staff_id", f"STF-{u.get('id', 1):05d}"),
            email=u.get("email", ""),
            username=u.get("username", ""),
            full_name=u.get("full_name") or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip(),
            role=u.get("role", "physician"),
            department=u.get("department", "Internal Medicine"),
            facility=u.get("facility", "MedInsight Central Hospital"),
            permissions=u.get("permissions") or get_role_permissions(u.get("role", "physician")),
            is_active=u.get("is_active", True),
            must_change_password=u.get("must_change_password", False),
            failed_login_attempts=int(u.get("failed_login_attempts", 0)),
            locked_until=u.get("locked_until"),
            last_login_at=u.get("last_login_at"),
            created_at=u.get("created_at")
        )
        for u in users
    ]

    return ApiResponse(
        success=True,
        data=user_responses,
        message=f"Retrieved {len(user_responses)} workforce staff records."
    )


@router.post("/users", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def create_staff_user(
    payload: StaffUserCreate,
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.USERS_CREATE.value))
):
    """Enrolls a new clinical staff account with assigned role and credentials."""
    # 1. Check duplicate username, staff_id, or email
    existing = db["users"].find_one({
        "$or": [
            {"username": payload.username.strip()},
            {"staff_id": payload.staff_id.strip()},
            {"email": payload.email.strip()}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff user with this Username, Staff ID, or Email address already exists."
        )

    # 2. Determine new ID
    max_user = db["users"].find().sort("id", -1).limit(1)
    max_list = list(max_user)
    new_id = (max_list[0]["id"] + 1) if max_list and "id" in max_list[0] else 100

    now_iso = datetime.datetime.utcnow().isoformat()
    norm_role = payload.role.lower().strip()
    role_perms = get_role_permissions(norm_role)
    explicit_perms = payload.permissions or role_perms

    user_doc = {
        "id": new_id,
        "staff_id": payload.staff_id.strip().upper(),
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip(),
        "full_name": f"{payload.first_name.strip()} {payload.last_name.strip()}",
        "email": payload.email.strip().lower(),
        "username": payload.username.strip().lower(),
        "role": norm_role,
        "department": payload.department.strip(),
        "facility": payload.facility.strip(),
        "hashed_password": get_password_hash(payload.temporary_password),
        "permissions": explicit_perms,
        "is_active": True,
        "must_change_password": payload.must_change_password,
        "failed_login_attempts": 0,
        "locked_until": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "created_by": current_user.username
    }

    db["users"].insert_one(user_doc)

    log_audit_event(
        db=db,
        user=current_user,
        action="USER_CREATED",
        resource="users",
        details={
            "created_user_id": new_id,
            "created_staff_id": user_doc["staff_id"],
            "created_username": user_doc["username"],
            "assigned_role": norm_role
        },
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    user_resp = UserResponse(
        id=new_id,
        staff_id=user_doc["staff_id"],
        email=user_doc["email"],
        username=user_doc["username"],
        full_name=user_doc["full_name"],
        role=user_doc["role"],
        department=user_doc["department"],
        facility=user_doc["facility"],
        permissions=user_doc["permissions"],
        is_active=True,
        must_change_password=user_doc["must_change_password"],
        failed_login_attempts=0,
        locked_until=None,
        created_at=now_iso
    )

    return ApiResponse(
        success=True,
        data=user_resp,
        message=f"Staff account '{user_doc['full_name']}' created successfully."
    )


@router.patch("/users/{user_id}", response_model=ApiResponse[UserResponse])
def update_staff_user(
    user_id: int,
    payload: StaffUserUpdate,
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.USERS_UPDATE.value))
):
    """Modifies an existing staff profile, role assignment, or active status."""
    user_doc = db["users"].find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff user #{user_id} not found."
        )

    updates: Dict[str, Any] = {"updated_at": datetime.datetime.utcnow().isoformat()}

    if payload.first_name is not None:
        updates["first_name"] = payload.first_name.strip()
    if payload.last_name is not None:
        updates["last_name"] = payload.last_name.strip()
    if payload.first_name is not None or payload.last_name is not None:
        fn = payload.first_name or user_doc.get("first_name", "")
        ln = payload.last_name or user_doc.get("last_name", "")
        updates["full_name"] = f"{fn} {ln}".strip()

    if payload.email is not None:
        updates["email"] = payload.email.strip().lower()
    if payload.department is not None:
        updates["department"] = payload.department.strip()
    if payload.facility is not None:
        updates["facility"] = payload.facility.strip()
    if payload.role is not None:
        norm_role = payload.role.lower().strip()
        updates["role"] = norm_role
        if payload.permissions is None:
            updates["permissions"] = get_role_permissions(norm_role)
    if payload.permissions is not None:
        updates["permissions"] = payload.permissions
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active
        # If deactivating, revoke all active sessions immediately
        if not payload.is_active:
            db["sessions"].update_many(
                {"user_id": user_id, "revoked_at": None},
                {"$set": {"revoked_at": datetime.datetime.utcnow().isoformat()}}
            )

    db["users"].update_one({"id": user_id}, {"$set": updates})
    updated_doc = db["users"].find_one({"id": user_id})

    action_name = "USER_DISABLED" if payload.is_active is False else "USER_UPDATED"
    log_audit_event(
        db=db,
        user=current_user,
        action=action_name,
        resource="users",
        details={"target_user_id": user_id, "updated_fields": list(updates.keys())},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    user_resp = UserResponse(
        id=user_id,
        staff_id=updated_doc.get("staff_id", f"STF-{user_id:05d}"),
        email=updated_doc.get("email", ""),
        username=updated_doc.get("username", ""),
        full_name=updated_doc.get("full_name", ""),
        role=updated_doc.get("role", "physician"),
        department=updated_doc.get("department", ""),
        facility=updated_doc.get("facility", ""),
        permissions=updated_doc.get("permissions") or get_role_permissions(updated_doc.get("role", "physician")),
        is_active=updated_doc.get("is_active", True),
        must_change_password=updated_doc.get("must_change_password", False),
        failed_login_attempts=int(updated_doc.get("failed_login_attempts", 0)),
        locked_until=updated_doc.get("locked_until"),
        last_login_at=updated_doc.get("last_login_at"),
        created_at=updated_doc.get("created_at")
    )

    return ApiResponse(
        success=True,
        data=user_resp,
        message=f"Staff account '{user_resp.full_name}' updated successfully."
    )


@router.post("/users/{user_id}/unlock", response_model=ApiResponse[Dict[str, Any]])
def unlock_staff_account(
    user_id: int,
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.USERS_UPDATE.value))
):
    """Unlocks a locked staff account and resets failed login attempts."""
    user_doc = db["users"].find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found.")

    db["users"].update_one(
        {"id": user_id},
        {"$set": {"locked_until": None, "failed_login_attempts": 0, "updated_at": datetime.datetime.utcnow().isoformat()}}
    )

    log_audit_event(
        db=db,
        user=current_user,
        action="ACCOUNT_UNLOCKED",
        resource="users",
        details={"unlocked_user_id": user_id, "staff_id": user_doc.get("staff_id")},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return ApiResponse(
        success=True,
        data={"user_id": user_id, "status": "unlocked"},
        message=f"Account for '{user_doc.get('full_name')}' successfully unlocked."
    )


@router.post("/users/{user_id}/reset-password", response_model=ApiResponse[Dict[str, Any]])
def reset_staff_password(
    user_id: int,
    payload: AdminPasswordReset,
    request: Request,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.USERS_UPDATE.value))
):
    """Administrator-triggered password reset with forced first-login change."""
    if len(payload.temporary_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Temporary password must be at least 8 characters.")

    user_doc = db["users"].find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found.")

    new_hash = get_password_hash(payload.temporary_password)
    now_iso = datetime.datetime.utcnow().isoformat()

    db["users"].update_one(
        {"id": user_id},
        {
            "$set": {
                "hashed_password": new_hash,
                "must_change_password": payload.must_change_password,
                "failed_login_attempts": 0,
                "locked_until": None,
                "updated_at": now_iso
            }
        }
    )

    # Invalidate all current active sessions for that user
    db["sessions"].update_many(
        {"user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now_iso}}
    )

    log_audit_event(
        db=db,
        user=current_user,
        action="ADMIN_PASSWORD_RESET",
        resource="users",
        details={"target_user_id": user_id, "target_staff_id": user_doc.get("staff_id")},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return ApiResponse(
        success=True,
        data={"user_id": user_id, "must_change_password": payload.must_change_password},
        message=f"Temporary password set for '{user_doc.get('full_name')}'. Sessions revoked."
    )


@router.get("/roles", response_model=ApiResponse[List[RolePermissionMatrix]])
def get_roles_and_permissions(
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.ROLES_MANAGE.value))
):
    """Retrieves full RBAC roles and permissions matrix with assigned staff counts."""
    roles_docs = list(db["roles"].find({})) if db is not None else []
    
    # Calculate live staff count per role
    role_counts: Dict[str, int] = {}
    if db is not None:
        for u in db["users"].find({"is_active": True}):
            r = u.get("role", "").lower()
            role_counts[r] = role_counts.get(r, 0) + 1

    matrix: List[RolePermissionMatrix] = []
    for r in roles_docs:
        role_name = r.get("role", "")
        matrix.append(RolePermissionMatrix(
            role=role_name,
            display_name=r.get("display_name", role_name.title()),
            description=r.get("description", ""),
            category=r.get("category", "General"),
            permissions=r.get("permissions", get_role_permissions(role_name)),
            staff_count=role_counts.get(role_name, 0)
        ))

    return ApiResponse(
        success=True,
        data=matrix,
        message=f"Retrieved {len(matrix)} clinical workforce role definitions."
    )


@router.get("/audit-logs", response_model=ApiResponse[List[AuditLogEntry]])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by audit action"),
    username: Optional[str] = Query(None, description="Filter by username"),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.AUDIT_VIEW.value))
):
    """Retrieves HIPAA compliance audit logs with filtering and pagination."""
    query: Dict[str, Any] = {}
    if action:
        query["action"] = action
    if username:
        query["username"] = {"$regex": username, "$options": "i"}
    if resource:
        query["resource"] = resource
    if patient_id:
        query["patient_id"] = patient_id

    logs = list(db["audit_logs"].find(query).sort("timestamp", -1).skip(skip).limit(limit)) if db is not None else []
    
    entries = [
        AuditLogEntry(
            id=str(log.get("_id", "")),
            user_id=log.get("user_id"),
            staff_id=log.get("staff_id"),
            username=log.get("username", "anonymous"),
            action=log.get("action", "UNKNOWN"),
            resource=log.get("resource", "general"),
            patient_id=log.get("patient_id"),
            encounter_id=log.get("encounter_id"),
            details=log.get("details"),
            ip_address=log.get("ip_address", "127.0.0.1"),
            timestamp=log.get("timestamp", datetime.datetime.utcnow().isoformat())
        )
        for log in logs
    ]

    return ApiResponse(
        success=True,
        data=entries,
        message=f"Retrieved {len(entries)} audit events."
    )


@router.get("/security-status", response_model=ApiResponse[SecurityStatusResponse])
def get_security_monitoring_status(
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.SECURITY_VIEW.value))
):
    """Real-time institutional security monitor: active sessions, locked accounts, and events."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database offline.")

    total_staff = db["users"].count_documents({})
    active_staff = db["users"].count_documents({"is_active": True})
    deactivated_staff = db["users"].count_documents({"is_active": False})
    locked_accounts = db["users"].count_documents({"locked_until": {"$ne": None}})

    # Count active non-revoked sessions
    now_iso = datetime.datetime.utcnow().isoformat()
    active_sessions = db["sessions"].count_documents({
        "revoked_at": None,
        "expires_at": {"$gte": now_iso}
    })

    recent_logs = list(db["audit_logs"].find().sort("timestamp", -1).limit(10))
    recent_events = [
        AuditLogEntry(
            id=str(log.get("_id", "")),
            user_id=log.get("user_id"),
            staff_id=log.get("staff_id"),
            username=log.get("username", "anonymous"),
            action=log.get("action", "UNKNOWN"),
            resource=log.get("resource", "general"),
            patient_id=log.get("patient_id"),
            encounter_id=log.get("encounter_id"),
            details=log.get("details"),
            ip_address=log.get("ip_address", "127.0.0.1"),
            timestamp=log.get("timestamp", now_iso)
        )
        for log in recent_logs
    ]

    status_data = SecurityStatusResponse(
        total_staff=total_staff,
        active_staff=active_staff,
        deactivated_staff=deactivated_staff,
        locked_accounts=locked_accounts,
        active_sessions=active_sessions,
        recent_events_count=len(recent_events),
        recent_events=recent_events
    )

    return ApiResponse(
        success=True,
        data=status_data,
        message="Institutional security governance status retrieved."
    )
