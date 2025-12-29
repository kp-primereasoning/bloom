"""
FastAPI dependencies for authentication and authorization.
"""

from typing import Callable
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from auth.service import auth_service


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency to extract and validate current user from JWT.
    
    Returns user dict with id, email, and role.
    Raises 401 if token is invalid or expired.
    """
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
