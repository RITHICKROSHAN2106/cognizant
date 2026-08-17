from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
from app.database.mongodb import get_mongodb
from app.schemas.schemas import UserLogin, Token, UserResponse, ApiResponse
from app.security.password import verify_password
from app.security.jwt import create_access_token
from app.security.dependencies import get_current_user, log_audit_event, CurrentUser
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[Token])
def login(login_data: UserLogin, db=Depends(get_mongodb)):
    user_doc = db["users"].find_one({"username": login_data.username})
    if not user_doc or not verify_password(login_data.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid clinical credentials or username",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    current_user = CurrentUser(user_doc)
    token_payload = {
        "sub": current_user.username,
        "role": current_user.role,
        "id": current_user.id,
        "name": current_user.full_name
    }
    access_token = create_access_token(token_payload)

    log_audit_event(
        db=db,
        user=current_user,
        action="USER_LOGIN_SUCCESS",
        resource="auth",
        details={"role": current_user.role, "department": current_user.department}
    )

    user_resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=current_user.is_active
    )

    token_obj = Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp
    )

    return ApiResponse(success=True, data=token_obj, message="Authentication successful")


@router.post("/logout", response_model=ApiResponse[Dict[str, Any]])
def logout(db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    log_audit_event(
        db=db,
        user=current_user,
        action="USER_LOGOUT",
        resource="auth"
    )
    return ApiResponse(success=True, data={"status": "logged_out"}, message="Logged out successfully")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    user_resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=current_user.is_active
    )
    return ApiResponse(
        success=True,
        data=user_resp,
        message=f"Current user profile: {current_user.full_name}"
    )


@router.get("/users", response_model=ApiResponse[List[UserResponse]])
def get_users(
    role: Optional[str] = Query(None),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {"is_active": True}
    if role:
        query["role"] = role
    users = list(db["users"].find(query))
    return ApiResponse(
        success=True,
        data=[
            UserResponse(
                id=u.get("id", 1),
                email=u.get("email", ""),
                username=u.get("username", ""),
                full_name=u.get("full_name", ""),
                role=u.get("role", "physician"),
                department=u.get("department", "Internal Medicine"),
                is_active=u.get("is_active", True)
            )
            for u in users
        ],
        message="Active users retrieved"
    )
