"""
Authentication routes for login, registration, and user info.

Supports both custom JWT and AWS Cognito authentication based on
the USE_COGNITO feature flag.
"""

import logging
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
from schemas.domain import (
    RegisterRequest, RegisterResponse, UserResponseWithOnboarding, MeResponseWithPropertyName,
    CognitoCallbackRequest, WaitlistCreateRequest, WaitlistCreateResponse,
)
from services import property_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _use_cognito() -> bool:
    """Check if Cognito authentication is enabled."""
    from services.aws.config import get_aws_settings
    return get_aws_settings().use_cognito


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponseWithOnboarding
    refresh_token: str | None = None


class RefreshRequest(BaseModel):
    """Token refresh request body."""
    refresh_token: str


class RefreshResponse(BaseModel):
    """Token refresh response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600


@router.post("/cognito/callback", response_model=LoginResponse)
async def cognito_callback(request: CognitoCallbackRequest):
    """
    Exchange Cognito authorization code for tokens and provision local user.

    1. Exchanges auth code with Cognito /oauth2/token endpoint
    2. Decodes ID token to extract email and sub
    3. Finds or creates local user by email
    4. Returns access_token + user object
    """
    import httpx
    from jose import jwt as jose_jwt

    if not request.code or not request.code.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "MISSING_AUTH_CODE",
                    "message": "Authorization code is required",
                    "request_id": str(uuid4()),
                }
            },
        )

    cognito_domain = os.environ.get(
        "COGNITO_DOMAIN", "bloom-dev.auth.us-east-1.amazoncognito.com"
    )
    client_id = os.environ.get("COGNITO_CLIENT_ID", "5j7l03d6avbg43fh0hvvslom2f")
    redirect_uri = os.environ.get(
        "COGNITO_REDIRECT_URI", "http://localhost:5173/auth/callback"
    )

    token_url = f"https://{cognito_domain}/oauth2/token"
    payload = {
        "grant_type": "authorization_code",
        "code": request.code,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
    }

    # Exchange code with Cognito
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                token_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail={
                "error": {
                    "code": "COGNITO_UNAVAILABLE",
                    "message": "Authentication service temporarily unavailable",
                    "request_id": str(uuid4()),
                }
            },
        )

    if resp.status_code != 200:
        logger.warning(f"Cognito token exchange failed: {resp.status_code} {resp.text}")
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_AUTH_CODE",
                    "message": "Authorization code is invalid or expired",
                    "request_id": str(uuid4()),
                }
            },
        )

    tokens = resp.json()
    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "INVALID_ID_TOKEN",
                    "message": "Failed to extract user information from token",
                    "request_id": str(uuid4()),
                }
            },
        )

    # Decode ID token (unverified — Cognito already validated it)
    try:
        claims = jose_jwt.get_unverified_claims(id_token)
        email = claims.get("email")
        sub = claims.get("sub")
        if not email or not sub:
            raise ValueError("Missing email or sub claim")
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "INVALID_ID_TOKEN",
                    "message": "Failed to extract user information from token",
                    "request_id": str(uuid4()),
                }
            },
        )

    # Find or create local user
    email = email.lower()
    user = await get_user_by_email(email)
    if not user:
        hashed_password = auth_service.hash_password(str(uuid4()))
        user = User(
            id=UUID(sub),
            email=email,
            hashed_password=hashed_password,
            role=UserRole.CUSTOMER,
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc),
        )
        await create_user(user)

    access_token = auth_service.create_access_token(user)

    return LoginResponse(
        access_token=access_token,
        user=UserResponseWithOnboarding(
            id=user.id,
            email=user.email,
            role=user.role,
            property_id=user.property_id,
            subscription_status=user.subscription_status if user.role == UserRole.CUSTOMER else None,
            created_at=user.created_at,
        ),
    )


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(request: RegisterRequest):
    """
    Register a new customer account.
    
    When USE_COGNITO=true, creates user in Cognito and local DB.
    When USE_COGNITO=false, creates user in local DB only with custom JWT.
    
    Returns JWT token and user info (same format as login).
    Returns 409 if email already exists.
    """
    # Check for existing user in local DB
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
    
    user_id = uuid4()
    access_token = None
    
    if _use_cognito():
        # Register with Cognito
        from services.aws.cognito import get_cognito_client
        from botocore.exceptions import ClientError
        
        cognito = get_cognito_client()
        if cognito is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": "Authentication service not available",
                        "request_id": str(uuid4())
                    }
                }
            )
        
        try:
            # Register in Cognito
            cognito_result = cognito.register(
                email=request.email,
                password=request.password,
                role="CUSTOMER",
            )
            user_id = UUID(cognito_result["user_sub"])
            
            # Login to get tokens
            tokens = cognito.login(request.email, request.password)
            access_token = tokens["access_token"]
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "UsernameExistsException":
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
            logger.error(f"Cognito registration failed: {error_code}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "REGISTRATION_FAILED",
                        "message": "Registration failed",
                        "request_id": str(uuid4())
                    }
                }
            )
    
    # Create user in local DB (for both Cognito and non-Cognito modes)
    hashed_password = auth_service.hash_password(request.password)
    new_user = User(
        id=user_id,
        email=request.email,
        hashed_password=hashed_password,
        role=UserRole.CUSTOMER,
        property_id=None,
        subscription_status=SubscriptionStatus.CREATED,
        created_at=datetime.now(timezone.utc)
    )
    
    await create_user(new_user)
    
    # Send welcome email (fire and forget)
    try:
        from services.email import send_welcome
        send_welcome(new_user.email)
    except Exception:
        pass  # Non-fatal
    
    # Generate custom JWT if not using Cognito
    if access_token is None:
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
    
    When USE_COGNITO=true, authenticates against Cognito.
    When USE_COGNITO=false, authenticates against local DB.
    
    Returns 401 if credentials are invalid.
    """
    access_token = None
    refresh_token = None
    
    if _use_cognito():
        # Authenticate with Cognito
        from services.aws.cognito import get_cognito_client
        from botocore.exceptions import ClientError
        
        cognito = get_cognito_client()
        if cognito is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": "Authentication service not available",
                        "request_id": str(uuid4())
                    }
                }
            )
        
        try:
            tokens = cognito.login(request.email, request.password)
            access_token = tokens["access_token"]
            refresh_token = tokens.get("refresh_token")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code in ["NotAuthorizedException", "UserNotFoundException"]:
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
            logger.error(f"Cognito login failed: {error_code}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "LOGIN_FAILED",
                        "message": "Login failed",
                        "request_id": str(uuid4())
                    }
                }
            )
    else:
        # Authenticate with local DB
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
    
    # Get user from local DB for response
    user = await get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found in database",
                    "request_id": str(uuid4())
                }
            }
        )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponseWithOnboarding(
            id=user.id,
            email=user.email,
            role=user.role,
            property_id=user.property_id,
            subscription_status=user.subscription_status if user.role == UserRole.CUSTOMER else None,
            created_at=user.created_at
        )
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: RefreshRequest):
    """
    Refresh access token using refresh token.
    
    Only available when USE_COGNITO=true. Returns 400 when using custom JWT.
    """
    if not _use_cognito():
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NOT_SUPPORTED",
                    "message": "Token refresh not supported with custom JWT authentication",
                    "request_id": str(uuid4())
                }
            }
        )
    
    from services.aws.cognito import get_cognito_client
    from botocore.exceptions import ClientError
    
    cognito = get_cognito_client()
    if cognito is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Authentication service not available",
                    "request_id": str(uuid4())
                }
            }
        )
    
    try:
        tokens = cognito.refresh_token(request.refresh_token)
        return RefreshResponse(
            access_token=tokens["access_token"],
            expires_in=tokens.get("expires_in", 3600),
        )
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "NotAuthorizedException":
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "code": "INVALID_REFRESH_TOKEN",
                        "message": "Invalid or expired refresh token",
                        "request_id": str(uuid4())
                    }
                }
            )
        logger.error(f"Token refresh failed: {error_code}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "REFRESH_FAILED",
                    "message": "Token refresh failed",
                    "request_id": str(uuid4())
                }
            }
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


@router.post("/waitlist", response_model=WaitlistCreateResponse, status_code=201)
async def create_waitlist_entry(
    request: WaitlistCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a waitlist entry for an unlisted building.

    Requires authentication. Users may submit multiple entries.
    """
    from models.waitlist import WaitlistEntry, WaitlistStatus

    entry = WaitlistEntry(
        user_id=UUID(current_user["id"]),
        building_name=request.building_name,
        building_address=request.building_address,
        status=WaitlistStatus.PENDING.value,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return WaitlistCreateResponse(id=entry.id)


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
