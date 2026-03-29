"""
User store — PostgreSQL-backed.

Replaces the previous in-memory dict. All functions accept an optional
db session; if not provided, a new session is opened and closed internally.
This keeps call-site changes minimal for routes that already inject db.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from db.database import SessionLocal
from models.user import User, UserRole, UserStatus


def _get_session(db: Optional[Session]) -> tuple[Session, bool]:
    """Return (session, should_close). Opens a new session if none provided."""
    if db is not None:
        return db, False
    return SessionLocal(), True


async def get_user_by_email(email: str, db: Optional[Session] = None) -> Optional[User]:
    """Get a user by email address."""
    session, should_close = _get_session(db)
    try:
        return session.query(User).filter(User.email == email.lower()).first()
    finally:
        if should_close:
            session.close()


async def get_user_by_id(user_id: UUID, db: Optional[Session] = None) -> Optional[User]:
    """Get a user by ID."""
    session, should_close = _get_session(db)
    try:
        return session.query(User).filter(User.id == user_id).first()
    finally:
        if should_close:
            session.close()


async def get_user_by_role(role: str, db: Optional[Session] = None) -> Optional[User]:
    """Get the first active user with the specified role."""
    session, should_close = _get_session(db)
    try:
        return (
            session.query(User)
            .filter(User.role == role, User.status == UserStatus.ACTIVE)
            .first()
        )
    finally:
        if should_close:
            session.close()


async def create_user(user: User, db: Optional[Session] = None) -> User:
    """Persist a new user to the database."""
    # Normalise email
    user.email = user.email.lower()
    session, should_close = _get_session(db)
    try:
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        if should_close:
            session.close()


async def get_all_users(
    include_archived: bool = False,
    db: Optional[Session] = None,
) -> list[User]:
    """Get all users, excluding ARCHIVED by default."""
    session, should_close = _get_session(db)
    try:
        q = session.query(User)
        if not include_archived:
            q = q.filter(User.status == UserStatus.ACTIVE)
        return q.all()
    finally:
        if should_close:
            session.close()


async def update_user(
    user_id: UUID,
    updates: dict,
    db: Optional[Session] = None,
) -> Optional[User]:
    """Update a user by ID. Returns the updated user or None if not found."""
    session, should_close = _get_session(db)
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        for key, value in updates.items():
            setattr(user, key, value)
        session.commit()
        session.refresh(user)
        return user
    finally:
        if should_close:
            session.close()


async def user_count(db: Optional[Session] = None) -> int:
    """Get the total number of active users."""
    session, should_close = _get_session(db)
    try:
        return session.query(User).filter(User.status == UserStatus.ACTIVE).count()
    finally:
        if should_close:
            session.close()


async def archive_user(user_id: UUID, db: Optional[Session] = None) -> Optional[User]:
    """Soft delete a user by setting status to ARCHIVED."""
    return await update_user(user_id, {"status": UserStatus.ARCHIVED}, db)


def clear_users() -> None:
    """No-op — kept for test compatibility. Use DB fixtures instead."""
    pass
