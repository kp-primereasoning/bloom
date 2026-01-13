"""
Authentication routes for login, registration, and user info.
"""

import os
from datetime import datetime, timezone
from uuid import uuid4, UUID

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from auth.service import auth_service
from auth.dependencies import get_current_user
from db.database import get_db
from db.users import get_user_by_email, get_user_by_role, create_user, get_user_by_id
from models.user import User, UserRole, UserResponse, SubscriptionStatus
from schemas.domain import RegisterRequest, RegisterResponse, UserResponseWithOnboarding, MeResponseWithPropertyName
from services import property_service


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponseWithOnboarding


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(request: RegisterRequest):
    """
    Register a new customer account.
    
    Creates a user with role=CUSTOMER, subscription_status=CREATED, property_id=null.
    Returns JWT token and user info (same format as login).
    
    Returns 409 if email already exists.
    """
    # Check for existing user
    existing = await get_user_by_email(request.email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "EMAIL_EXISTS",
                    "message": "Email already exists",
                    "request_id": str(uuid4())
                }
            }
        )
    
    # Hash password and create user
    hashed_password = auth_service.hash_password(request.password)
    new_user = User(
        id=uuid4(),
        email=request.email,
        hashed_password=hashed_password,
        role=UserRole.CUSTOMER,
        property_id=None,
        subscription_status=SubscriptionStatus.CREATED,
        created_at=datetime.now(timezone.utc)
    )
    
    await create_user(new_user)
    
    # Generate JWT
    access_token = auth_service.create_access_token(new_user)
    
    return RegisterResponse(
        access_token=access_token,
        user=UserResponseWithOnboarding(
            id=new_user.id,
            email=new_user.email,
            role=new_user.role,
            property_id=new_user.property_id,
            subscription_status=new_user.subscription_status,
            created_at=new_user.created_at
        )
    )


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
        user=UserResponseWithOnboarding(
            id=user.id,
            email=user.email,
            role=user.role,
            property_id=user.property_id,
            subscription_status=user.subscription_status if user.role == UserRole.CUSTOMER else None,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=MeResponseWithPropertyName)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current authenticated user with enriched property data.
    
    Includes property_name and property_address resolved from property_id for dashboard display.
    """
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
    
    # Resolve property_name and property_address if user has property_id
    property_name = None
    property_address = None
    if user.property_id:
        prop = property_service.get_property(db, user.property_id)
        if prop:
            property_name = prop.name
            property_address = prop.address
    
    return MeResponseWithPropertyName(
        id=user.id,
        email=user.email,
        role=user.role,
        property_id=user.property_id,
        property_name=property_name,
        property_address=property_address,
        unit=getattr(user, 'unit', None),
        subscription_status=user.subscription_status if user.role == UserRole.CUSTOMER else None,
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
            user=UserResponseWithOnboarding(
                id=user.id,
                email=user.email,
                role=user.role,
                property_id=user.property_id,
                subscription_status=user.subscription_status if user.role == UserRole.CUSTOMER else None,
                created_at=user.created_at
            )
        )
