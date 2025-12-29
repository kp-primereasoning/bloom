"""
In-memory user store for MLP.
Will be replaced with database in future iterations.
"""

from typing import Optional
from uuid import UUID

from models.user import User, UserRole


# In-memory user storage
_users: dict[str, User] = {}


async def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by email address."""
    return _users.get(email.lower())


async def get_user_by_id(user_id: UUID) -> Optional[User]:
    """Get a user by ID."""
    for user in _users.values():
        if user.id == user_id:
            return user
    return None


async def get_user_by_role(role: str) -> Optional[User]:
    """Get the first user with the specified role."""
    for user in _users.values():
        if user.role.value == role:
            return user
    return None


async def create_user(user: User) -> User:
    """Create a new user."""
    _users[user.email.lower()] = user
    return user


async def get_all_users() -> list[User]:
    """Get all users."""
    return list(_users.values())


async def user_count() -> int:
    """Get the number of users."""
    return len(_users)


def clear_users() -> None:
    """Clear all users (for testing)."""
    _users.clear()
