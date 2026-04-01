"""
FastAPI dependencies for Cognito authentication.

This module provides authentication dependencies that validate
JWT tokens against AWS Cognito JWKS.
"""

import logging
from typing import Optional
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.aws.cognito import get_cognito_client

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user_cognito(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency to extract and validate current user from Cognito JWT.
    
    Validates the token against Cognito JWKS first. If that fails, falls back
    to local JWT validation (needed because the Cognito OAuth callback returns
    a locally-signed JWT with user claims from the database).
    
    Returns:
        User dict with id (sub), email, and role
        
    Raises:
        HTTPException 401: If token is invalid or expired
        HTTPException 503: If Cognito client is not available
    """
    request_id = str(uuid4())
    
    token = credentials.credentials
    
    # Try Cognito JWKS validation first
    cognito_client = get_cognito_client()
    if cognito_client is not None:
        claims = cognito_client.validate_token(token)
        if claims is not None:
            return {
                "id": claims.get("sub"),
                "email": claims.get("email"),
                "role": claims.get("custom:role", "CUSTOMER"),
            }
    
    # Fall back to local JWT validation (for tokens issued by /auth/cognito/callback)
    try:
        from auth.service import auth_service
        from jose import JWTError
        payload = auth_service.verify_token(token)
        return {
            "id": payload["sub"],
            "email": payload["email"],
            "role": payload["role"],
        }
    except Exception:
        pass
    
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


async def get_optional_user_cognito(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """
    FastAPI dependency for optional authentication.
    
    Returns user dict if valid token provided, None otherwise.
    Does not raise exceptions for missing or invalid tokens.
    """
    if credentials is None:
        return None
    
    cognito_client = get_cognito_client()
    if cognito_client is None:
        return None
    
    claims = cognito_client.validate_token(credentials.credentials)
    
    if claims is None:
        return None
    
    return {
        "id": claims.get("sub"),
        "email": claims.get("email"),
        "role": claims.get("custom:role", "RESIDENT"),
    }
