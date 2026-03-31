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
    
    Validates the token against Cognito JWKS and extracts user claims.
    
    Returns:
        User dict with id (sub), email, and role
        
    Raises:
        HTTPException 401: If token is invalid or expired
        HTTPException 503: If Cognito client is not available
    """
    request_id = str(uuid4())
    
    cognito_client = get_cognito_client()
    if cognito_client is None:
        logger.error("Cognito client not available")
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Authentication service not available",
                    "request_id": request_id
                }
            }
        )
    
    token = credentials.credentials
    
    # Validate token against Cognito JWKS
    claims = cognito_client.validate_token(token)
    
    if claims is None:
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
    
    # Extract user info from claims
    # Cognito tokens have 'sub' as the user ID
    # Custom attributes are prefixed with 'custom:'
    return {
        "id": claims.get("sub"),
        "email": claims.get("email"),
        "role": claims.get("custom:role", "CUSTOMER"),
    }


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
        "role": claims.get("custom:role", "CUSTOMER"),
    }
