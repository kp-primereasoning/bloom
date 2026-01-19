"""
FastAPI dependencies for authentication and authorization.

This module provides a unified authentication interface that switches
between custom JWT and Cognito based on the USE_COGNITO feature flag.
"""

import logging
from typing import Callable, Optional
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from auth.service import auth_service

logger = logging.getLogger(__name__)

security = HTTPBearer()


def _use_cognito() -> bool:
    """Check if Cognito authentication is enabled."""
    from services.aws.config import get_aws_settings
    return get_aws_settings().use_cognito


async def _get_current_user_jwt(
    credentials: HTTPAuthorizationCredentials,
) -> dict:
    """Validate user using custom JWT authentication."""
    request_id = str(uuid4())
    try:
        payload = auth_service.verify_token(credentials.credentials)
        return {
            "id": payload["sub"],
            "email": payload["email"],
            "role": payload["role"]
        }
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid or expired token",
                    "request_id": request_id
                }
            }
        )


async def _get_current_user_cognito(
    credentials: HTTPAuthorizationCredentials,
) -> dict:
    """Validate user using Cognito JWT authentication."""
    from auth.cognito_dependencies import get_current_user_cognito
    return await get_current_user_cognito(credentials)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency to extract and validate current user from JWT.
    
    Automatically switches between custom JWT and Cognito based on
    the USE_COGNITO feature flag.
    
    Returns user dict with id, email, and role.
    Raises 401 if token is invalid or expired.
    """
    if _use_cognito():
        logger.debug("Using Cognito authentication")
        return await _get_current_user_cognito(credentials)
    else:
        logger.debug("Using custom JWT authentication")
        return await _get_current_user_jwt(credentials)


def require_role(allowed_roles: list[str]) -> Callable:
    """
    Returns a FastAPI dependency that validates user role.
    
    Usage:
        @router.get("/admin/resource")
        async def admin_resource(user: dict = Depends(require_role(["ADMIN"]))):
            ...
    """
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        request_id = str(uuid4())
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Role {current_user['role']} not authorized for this resource",
                        "request_id": request_id
                    }
                }
            )
        return current_user
    return role_checker
