"""
Authentication routes for login and user info.
"""

import os
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from auth.service import auth_service
from auth.dependencies import get_current_user
from db.users import get_user_by_email, get_user_by_role
from models.user import UserRole, UserResponse


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT with user info.
    
    Returns 401 if credentials are invalid.
    """
    user = await get_user_by_email(request.email)
    
    if not user or not auth_service.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password",
                    "request_id": str(uuid4())
                }
            }
        )
    
    access_token = auth_service.create_access_token(user)
    return LoginResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current authenticated user."""
    from db.users import get_user_by_id
    from uuid import UUID
    
    user = await get_user_by_id(UUID(current_user["id"]))
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found",
                    "request_id": str(uuid4())
                }
            }
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        created_at=user.created_at
    )


# Dev-only endpoint for role switching
if os.environ.get("ENVIRONMENT") == "development":
    class DevSwitchRoleRequest(BaseModel):
        """Request body for dev role switching."""
        role: str
    
    @router.post("/dev/switch-role", response_model=LoginResponse)
    async def dev_switch_role(request: DevSwitchRoleRequest):
        """
        Dev-only endpoint to get JWT for a specific role.
        
        Finds the seeded user for the requested role and returns a JWT.
        """
        # Validate role
        try:
            role = UserRole(request.role)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": {
                        "code": "INVALID_ROLE",
                        "message": f"Invalid role: {request.role}",
                        "request_id": str(uuid4())
                    }
                }
            )
        
        user = await get_user_by_role(request.role)
        if not user:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": f"No user found for role {request.role}",
                        "request_id": str(uuid4())
                    }
                }
            )
        
        access_token = auth_service.create_access_token(user)
        return LoginResponse(
            access_token=access_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                role=user.role,
                created_at=user.created_at
            )
        )
