"""
Development user seeding.
Only runs in development environment.
"""

from datetime import datetime, timezone
from uuid import uuid4

from models.user import User, UserRole
from auth.service import auth_service
from db.users import create_user, user_count


# Dev seed users with predictable credentials
# Using example.com (RFC 2606 reserved domain) for valid email format
DEV_USERS = [
    {
        "email": "admin@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.ADMIN,
    },
    {
        "email": "florist@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.FLORIST,
    },
    {
        "email": "pm@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.PROPERTY_MANAGER,
    },
    {
        "email": "customer@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.CUSTOMER,
    },
]


async def seed_dev_users() -> None:
    """
    Seed one user per role if no users exist.
    Only runs in development mode.
    """
    # Check if users already exist
    count = await user_count()
    if count > 0:
        print(f"Skipping seed: {count} users already exist")
        return
    
    print("Seeding development users...")
    
    for user_data in DEV_USERS:
        user = User(
            id=uuid4(),
            email=user_data["email"],
            hashed_password=auth_service.hash_password(user_data["password"]),
            role=user_data["role"],
            created_at=datetime.now(timezone.utc),
        )
        await create_user(user)
        print(f"  Created user: {user.email} ({user.role.value})")
    
    print(f"Seeded {len(DEV_USERS)} development users")
