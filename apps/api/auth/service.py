"""
Authentication service for JWT creation and password handling.
"""

import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import bcrypt

from models.user import User


class AuthService:
    """Service for JWT token management and password hashing."""
    
    def __init__(self):
        self.secret_key = os.environ.get("JWT_SECRET", "dev-secret-key-change-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 24 hours
    
    def create_access_token(self, user: User) -> str:
        """Create a JWT access token for the given user."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "iss": "bloom-api",
            "aud": "bloom-web",
            "exp": int(expire.timestamp()),  # Explicit UNIX timestamp
            "iat": int(now.timestamp())       # Explicit UNIX timestamp
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> dict:
        """Verify and decode a JWT token. Allows 60 seconds clock skew."""
        return jwt.decode(
            token,
            self.secret_key,
            algorithms=[self.algorithm],
            audience="bloom-web",
            issuer="bloom-api",
            options={"leeway": 60}
        )
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hashed password."""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


# Singleton instance
auth_service = AuthService()
