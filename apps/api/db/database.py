"""
Database connection and session management for the Bloom API.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Get the directory where this file is located
_this_dir = Path(__file__).parent.parent

# Load .env.local for local development (if exists) - use absolute path
_env_local = _this_dir / ".env.local"
if _env_local.exists():
    load_dotenv(_env_local, override=True)
else:
    load_dotenv()  # Fallback to .env

# Build DATABASE_URL from environment variables
DATABASE_URL = os.environ.get("DATABASE_URL")

# Support component-based connection if DATABASE_URL not set
if not DATABASE_URL:
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "5432")
    DB_NAME = os.environ.get("DB_NAME", "bloom")
    DB_USER = os.environ.get("DB_USER", "bloom")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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
