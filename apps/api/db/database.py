"""
Database connection and session management for the Bloom API.

Supports both environment variable configuration and AWS Secrets Manager
for credential retrieval, controlled by the USE_AWS_SECRETS feature flag.
"""

import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

# Get the directory where this file is located
_this_dir = Path(__file__).parent.parent

# Load .env.local for local development (if exists) - use absolute path
_env_local = _this_dir / ".env.local"
if _env_local.exists():
    load_dotenv(_env_local, override=True)
else:
    load_dotenv()  # Fallback to .env


def _get_database_url_from_secrets() -> Optional[str]:
    """
    Attempt to get database URL from AWS Secrets Manager.
    
    Returns:
        Database URL string or None if retrieval fails
    """
    try:
        from services.aws.secrets import get_secrets_client
        from services.aws.config import get_aws_settings
        
        settings = get_aws_settings()
        if not settings.use_aws_secrets:
            return None
        
        client = get_secrets_client(settings.aws_region)
        credentials = client.get_database_credentials(settings.db_secret_name)
        
        if credentials and all([
            credentials.get("host"),
            credentials.get("username"),
            credentials.get("password"),
            credentials.get("database"),
        ]):
            url = (
                f"postgresql://{credentials['username']}:{credentials['password']}"
                f"@{credentials['host']}:{credentials.get('port', 5432)}"
                f"/{credentials['database']}"
            )
            logger.info("Database credentials loaded from AWS Secrets Manager")
            return url
        
        logger.warning("Incomplete credentials from Secrets Manager, falling back to env vars")
        return None
        
    except ImportError:
        logger.debug("AWS services not available, using environment variables")
        return None
    except Exception as e:
        logger.warning(f"Failed to get credentials from Secrets Manager: {e}, falling back to env vars")
        return None


def _get_database_url_from_env() -> str:
    """
    Get database URL from environment variables.
    
    Returns:
        Database URL string
    """
    # Check for full DATABASE_URL first
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return database_url
    
    # Build from component variables
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PORT", "5432")
    db_name = os.environ.get("DB_NAME", "bloom")
    db_user = os.environ.get("DB_USER", "bloom")
    db_password = os.environ.get("DB_PASSWORD", "")
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def get_database_url() -> str:
    """
    Get database URL, trying Secrets Manager first if enabled.
    
    Falls back to environment variables if Secrets Manager is disabled
    or if retrieval fails.
    
    Returns:
        Database URL string
    """
    # Try Secrets Manager first
    url = _get_database_url_from_secrets()
    if url:
        return url
    
    # Fall back to environment variables
    return _get_database_url_from_env()


# Build DATABASE_URL
DATABASE_URL = get_database_url()

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 5},  # 5 second connection timeout
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency for database sessions.
    Yields a session and ensures cleanup after request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
