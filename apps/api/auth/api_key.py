"""
API key authentication for Shopify app → Bloom API communication.

Florists authenticate via X-API-Key header. The key is hashed with SHA-256
and looked up in the florist_connections table.
"""

import hashlib
import secrets
import logging
from uuid import uuid4

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from db.database import get_db
from models.florist_connection import FloristConnection

logger = logging.getLogger(__name__)


def hash_api_key(api_key: str) -> str:
    """SHA-256 hash of an API key for storage and lookup."""
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_api_key() -> str:
    """Generate a cryptographically secure API key."""
    return secrets.token_urlsafe(32)


async def require_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> FloristConnection:
    """
    Dependency that validates the X-API-Key header and returns the FloristConnection.

    Raises 401 if the key is missing, empty, or not found.
    """
    request_id = str(uuid4())

    if not x_api_key or not x_api_key.strip():
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_API_KEY",
                    "message": "API key is required",
                    "request_id": request_id,
                }
            },
        )

    key_hash = hash_api_key(x_api_key.strip())
    connection = (
        db.query(FloristConnection)
        .filter(FloristConnection.api_key_hash == key_hash)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_API_KEY",
                    "message": "Invalid API key",
                    "request_id": request_id,
                }
            },
        )

    return connection
