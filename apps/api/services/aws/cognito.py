"""
AWS Cognito client for user authentication.

This module provides integration with AWS Cognito User Pools for
user registration, authentication, and token validation.
"""

import json
import logging
import time
from typing import Optional, Dict, Any
from urllib.request import urlopen

import boto3
from botocore.exceptions import ClientError
from jose import jwt, jwk, JWTError

logger = logging.getLogger(__name__)


class CognitoClient:
    """
    Client for AWS Cognito User Pools.
    
    Provides user registration, authentication, token refresh,
    and JWT validation against Cognito JWKS.
    """
    
    def __init__(self, user_pool_id: str, client_id: str, region: str):
        """
        Initialize Cognito client.
        
        Args:
            user_pool_id: Cognito User Pool ID
            client_id: Cognito App Client ID
            region: AWS region
        """
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.region = region
        self._client = None
        self._jwks: Optional[Dict] = None
        self._jwks_fetched_at: float = 0
        self._jwks_cache_ttl: int = 3600  # 1 hour
    
    @property
    def client(self):
        """Lazy initialization of boto3 Cognito client."""
        if self._client is None:
            self._client = boto3.client(
                "cognito-idp",
                region_name=self.region
            )
        return self._client
    
    @property
    def issuer(self) -> str:
        """Get the token issuer URL."""
        return f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"
    
    @property
    def jwks_url(self) -> str:
        """Get the JWKS URL for token validation."""
        return f"{self.issuer}/.well-known/jwks.json"
    
    def _get_jwks(self, force_refresh: bool = False) -> Dict:
        """
        Fetch and cache JWKS from Cognito.
        
        Args:
            force_refresh: Force refresh even if cache is valid
            
        Returns:
            JWKS dictionary with keys
        """
        now = time.time()
        cache_expired = (now - self._jwks_fetched_at) > self._jwks_cache_ttl
        
        if self._jwks is None or cache_expired or force_refresh:
            try:
                with urlopen(self.jwks_url, timeout=10) as response:
                    self._jwks = json.loads(response.read().decode("utf-8"))
                    self._jwks_fetched_at = now
                    logger.info("Successfully fetched Cognito JWKS")
            except Exception as e:
                logger.error(f"Failed to fetch JWKS: {e}")
                if self._jwks is None:
                    raise
                # Use stale cache if available
                logger.warning("Using stale JWKS cache")
        
        return self._jwks

    def _get_signing_key(self, token: str) -> Optional[Dict]:
        """
        Get the signing key for a token from JWKS.
        
        Args:
            token: JWT token to find key for
            
        Returns:
            JWK key dict or None if not found
        """
        try:
            headers = jwt.get_unverified_headers(token)
            kid = headers.get("kid")
            
            if not kid:
                logger.error("Token missing 'kid' header")
                return None
            
            jwks = self._get_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    return key
            
            # Key not found, try refreshing JWKS
            logger.warning(f"Key {kid} not found, refreshing JWKS")
            jwks = self._get_jwks(force_refresh=True)
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    return key
            
            logger.error(f"Key {kid} not found in JWKS")
            return None
            
        except Exception as e:
            logger.error(f"Error getting signing key: {e}")
            return None
    
    def register(
        self,
        email: str,
        password: str,
        role: str,
        **attributes
    ) -> Dict[str, Any]:
        """
        Register a new user in Cognito.
        
        Args:
            email: User's email address
            password: User's password
            role: User role (RESIDENT, PROPERTY_MANAGER, FLORIST, ADMIN)
            **attributes: Additional user attributes
            
        Returns:
            Dict with user_sub and confirmation status
            
        Raises:
            Exception: If registration fails
        """
        user_attributes = [
            {"Name": "email", "Value": email},
            {"Name": "custom:role", "Value": role},
        ]
        
        # Add optional attributes
        if attributes.get("name"):
            user_attributes.append({"Name": "name", "Value": attributes["name"]})
        if attributes.get("phone_number"):
            user_attributes.append({"Name": "phone_number", "Value": attributes["phone_number"]})
        
        try:
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=email,
                Password=password,
                UserAttributes=user_attributes,
            )
            
            logger.info(f"User registered: {email}")
            
            return {
                "user_sub": response["UserSub"],
                "confirmed": response["UserConfirmed"],
                "email": email,
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(f"Registration failed for {email}: {error_code} - {error_msg}")
            raise
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user and return tokens.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            Dict with access_token, id_token, refresh_token, and expires_in
            
        Raises:
            Exception: If authentication fails
        """
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={
                    "USERNAME": email,
                    "PASSWORD": password,
                },
            )
            
            auth_result = response.get("AuthenticationResult", {})
            
            logger.info(f"User logged in: {email}")
            
            return {
                "access_token": auth_result.get("AccessToken"),
                "id_token": auth_result.get("IdToken"),
                "refresh_token": auth_result.get("RefreshToken"),
                "expires_in": auth_result.get("ExpiresIn", 3600),
                "token_type": auth_result.get("TokenType", "Bearer"),
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(f"Login failed for {email}: {error_code} - {error_msg}")
            raise
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dict with new access_token, id_token, and expires_in
            
        Raises:
            Exception: If refresh fails
        """
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={
                    "REFRESH_TOKEN": refresh_token,
                },
            )
            
            auth_result = response.get("AuthenticationResult", {})
            
            logger.info("Token refreshed successfully")
            
            return {
                "access_token": auth_result.get("AccessToken"),
                "id_token": auth_result.get("IdToken"),
                "expires_in": auth_result.get("ExpiresIn", 3600),
                "token_type": auth_result.get("TokenType", "Bearer"),
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Token refresh failed: {error_code}")
            raise
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate a Cognito JWT token.
        
        Args:
            token: JWT access or ID token
            
        Returns:
            Decoded token claims or None if invalid
        """
        try:
            # Get signing key
            signing_key = self._get_signing_key(token)
            if not signing_key:
                return None
            
            # Construct public key
            public_key = jwk.construct(signing_key)
            
            # Decode and validate token
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
                options={"verify_exp": True},
            )
            
            return claims
            
        except JWTError as e:
            logger.warning(f"Token validation failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error validating token: {e}")
            return None
    
    def get_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from access token.
        
        Args:
            access_token: Valid access token
            
        Returns:
            User attributes dict or None if failed
        """
        try:
            response = self.client.get_user(AccessToken=access_token)
            
            # Convert attributes list to dict
            attributes = {}
            for attr in response.get("UserAttributes", []):
                attributes[attr["Name"]] = attr["Value"]
            
            return {
                "username": response.get("Username"),
                "sub": attributes.get("sub"),
                "email": attributes.get("email"),
                "role": attributes.get("custom:role"),
                "email_verified": attributes.get("email_verified") == "true",
                "attributes": attributes,
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Get user failed: {error_code}")
            return None
    
    def admin_create_user(
        self,
        email: str,
        role: str,
        temporary_password: Optional[str] = None,
        **attributes
    ) -> Dict[str, Any]:
        """
        Admin-create a user (for migration or admin operations).
        
        Args:
            email: User's email address
            role: User role
            temporary_password: Optional temporary password
            **attributes: Additional user attributes
            
        Returns:
            Dict with user info
        """
        user_attributes = [
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
            {"Name": "custom:role", "Value": role},
        ]
        
        if attributes.get("name"):
            user_attributes.append({"Name": "name", "Value": attributes["name"]})
        
        params = {
            "UserPoolId": self.user_pool_id,
            "Username": email,
            "UserAttributes": user_attributes,
            "MessageAction": "SUPPRESS",  # Don't send welcome email
        }
        
        if temporary_password:
            params["TemporaryPassword"] = temporary_password
        
        try:
            response = self.client.admin_create_user(**params)
            user = response.get("User", {})
            
            logger.info(f"Admin created user: {email}")
            
            return {
                "username": user.get("Username"),
                "status": user.get("UserStatus"),
                "created": str(user.get("UserCreateDate")),
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Admin create user failed: {error_code}")
            raise
    
    def check_health(self) -> bool:
        """
        Check Cognito connectivity by describing the user pool.
        
        Returns:
            True if Cognito is accessible, False otherwise
        """
        try:
            self.client.describe_user_pool(UserPoolId=self.user_pool_id)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Cognito health check failed: {error_code}")
            return False
        except Exception as e:
            logger.error(f"Cognito health check failed: {e}")
            return False


# Module-level singleton instance (lazy initialized)
_cognito_client: Optional[CognitoClient] = None


def get_cognito_client() -> Optional[CognitoClient]:
    """
    Get or create the Cognito client singleton.
    
    Returns:
        CognitoClient instance or None if Cognito is not configured
    """
    global _cognito_client
    
    if _cognito_client is None:
        from services.aws.config import get_aws_settings
        settings = get_aws_settings()
        
        if not settings.use_cognito:
            logger.debug("Cognito is disabled via feature flag")
            return None
        
        if not settings.cognito_user_pool_id or not settings.cognito_client_id:
            logger.warning("Cognito enabled but not configured")
            return None
        
        _cognito_client = CognitoClient(
            user_pool_id=settings.cognito_user_pool_id,
            client_id=settings.cognito_client_id,
            region=settings.cognito_region,
        )
    
    return _cognito_client
