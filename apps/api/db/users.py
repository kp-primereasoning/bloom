"""
User persistence layer — backed by Postgres via SQLAlchemy.
All functions keep the same async signatures as the previous in-memory store
so callers require no changes.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from db.database import SessionLocal
from models.user import User, UserRole, UserStatus, UserDB


async def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by email address."""
    with SessionLocal() as db:
        row = db.query(UserDB).filter(UserDB.email == email.lower()).first()
        return row.to_pydantic() if row else None


async def get_user_by_id(user_id: UUID) -> Optional[User]:
    """Get a user by ID."""
    with SessionLocal() as db:
        row = db.query(UserDB).filter(UserDB.id == user_id).first()
        return row.to_pydantic() if row else None


async def get_user_by_cognito_sub(cognito_sub: str) -> Optional[User]:
    """Get a user by their Cognito sub claim."""
    with SessionLocal() as db:
        row = db.query(UserDB).filter(UserDB.cognito_sub == cognito_sub).first()
        return row.to_pydantic() if row else None


async def get_user_by_role(role: str) -> Optional[User]:
    """Get the first user with the specified role."""
    with SessionLocal() as db:
        row = db.query(UserDB).filter(UserDB.role == role).first()
        return row.to_pydantic() if row else None


async def create_user(user: User) -> User:
    """Persist a new user. Raises IntegrityError on duplicate email."""
    with SessionLocal() as db:
        row = UserDB(
            id=user.id,
            email=user.email.lower(),
            hashed_password=user.hashed_password,
            role=user.role,
            status=user.status,
            property_id=user.property_id,
            unit=user.unit,
            subscription_status=user.subscription_status,
            subscription_plan=user.subscription_plan,
            florist_id=user.florist_id,
            stripe_customer_id=user.stripe_customer_id,
            stripe_subscription_id=user.stripe_subscription_id,
            skip_next_delivery=user.skip_next_delivery,
            email_notifications_enabled=user.email_notifications_enabled,
            created_at=user.created_at,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.to_pydantic()


async def get_all_users(include_archived: bool = False) -> list[User]:
    """Get all users, excluding ARCHIVED by default."""
    with SessionLocal() as db:
        q = db.query(UserDB)
        if not include_archived:
            q = q.filter(UserDB.status != UserStatus.ARCHIVED)
        return [row.to_pydantic() for row in q.all()]


async def update_user(user_id: UUID, updates: dict) -> Optional[User]:
    """Update a user by ID. Returns updated user or None if not found."""
    with SessionLocal() as db:
        row = db.query(UserDB).filter(UserDB.id == user_id).first()
        if not row:
            return None
        for key, value in updates.items():
            setattr(row, key, value)
        db.commit()
        db.refresh(row)
        return row.to_pydantic()


async def user_count() -> int:
    """Return total number of users in the database."""
    with SessionLocal() as db:
        return db.query(UserDB).count()


async def archive_user(user_id: UUID) -> Optional[User]:
    """Soft-delete a user by setting status to ARCHIVED."""
    return await update_user(user_id, {"status": UserStatus.ARCHIVED})


def clear_users() -> None:
    """Delete all users (test environments only)."""
    with SessionLocal() as db:
        db.query(UserDB).delete()
        db.commit()
