from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional, Dict, Any
import datetime
from app.database.mongodb import get_mongodb
from app.security.jwt import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class CurrentUser:
    def __init__(self, doc: Dict[str, Any]):
        self.id = doc.get("id", 1)
        self.username = doc.get("username", "")
        self.email = doc.get("email", "")
        self.full_name = doc.get("full_name", "")
        self.role = doc.get("role", "physician")
        self.department = doc.get("department", "")
        self.is_active = doc.get("is_active", True)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db=Depends(get_mongodb)
) -> CurrentUser:
    if not token:
        # Development fallback demo user
        user_doc = db["users"].find_one({"username": "dr.sarah"})
        if user_doc:
            return CurrentUser(user_doc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_doc = db["users"].find_one({"username": username})
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return CurrentUser(user_doc)


def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles and current_user.role != "administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' lacks permission for this operation. Required: {allowed_roles}",
            )
        return current_user
    return role_checker


def log_audit_event(
    db,
    user: Optional[CurrentUser],
    action: str,
    resource: str,
    patient_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: str = "127.0.0.1"
):
    try:
        audit_entry = {
            "user_id": user.id if user else None,
            "username": user.username if user else "anonymous",
            "action": action,
            "resource": resource,
            "patient_id": patient_id,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        db["audit_logs"].insert_one(audit_entry)
    except Exception:
        pass
