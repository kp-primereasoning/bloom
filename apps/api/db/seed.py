"""
Development data seeding.
Only runs in development environment.
"""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from models.user import User, UserRole
from models.property import Property, PropertyStatus
from models.florist import Florist, FloristStatus
from auth.service import auth_service
from db.users import create_user, user_count
from db.database import SessionLocal


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

# Dev seed properties
DEV_PROPERTIES = [
    {
        "name": "The Meridian",
        "address": "123 Main Street, San Francisco, CA 94102",
        "delivery_cadence": "weekly",
        "status": PropertyStatus.ACTIVE,
    },
    {
        "name": "Harbor View Apartments",
        "address": "456 Ocean Drive, San Francisco, CA 94107",
        "delivery_cadence": "bi-weekly",
        "status": PropertyStatus.PENDING_PM,
    },
    {
        "name": "Parkside Residences",
        "address": "789 Park Avenue, San Francisco, CA 94118",
        "delivery_cadence": None,
        "status": PropertyStatus.CREATED,
    },
]

# Dev seed florists
DEV_FLORISTS = [
    {
        "name": "Bloom & Petal",
        "status": FloristStatus.READY,
    },
    {
        "name": "Garden Gate Flowers",
        "status": FloristStatus.READY,
    },
    {
        "name": "Fresh Start Florals",
        "status": FloristStatus.ONBOARDING,
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
        print(f"Skipping user seed: {count} users already exist")
    else:
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
    
    # Seed properties and florists
    seed_dev_entities()


def seed_dev_users_sync() -> None:
    """
    Synchronous version of seed_dev_users for module-level initialization.
    """
    from db.users import _users
    
    # Check if users already exist (sync version - direct dict access)
    if len(_users) > 0:
        print(f"Skipping user seed: {len(_users)} users already exist")
    else:
        print("Seeding development users...")
        for user_data in DEV_USERS:
            user = User(
                id=uuid4(),
                email=user_data["email"],
                hashed_password=auth_service.hash_password(user_data["password"]),
                role=user_data["role"],
                created_at=datetime.now(timezone.utc),
            )
            # Direct dict access for sync operation
            _users[user.email.lower()] = user
            print(f"  Created user: {user.email} ({user.role.value})")
        print(f"Seeded {len(DEV_USERS)} development users")


def seed_dev_entities() -> None:
    """
    Seed properties and florists if they don't exist.
    """
    print("Opening database session...")
    db: Session = SessionLocal()
    print("Database session opened")
    try:
        # Check if properties exist
        property_count = db.query(Property).count()
        if property_count == 0:
            print("Seeding development properties...")
            for prop_data in DEV_PROPERTIES:
                prop = Property(
                    id=uuid4(),
                    name=prop_data["name"],
                    address=prop_data["address"],
                    delivery_cadence=prop_data["delivery_cadence"],
                    status=prop_data["status"],
                )
                db.add(prop)
                print(f"  Created property: {prop.name} ({prop.status.value})")
            db.commit()
            print(f"Seeded {len(DEV_PROPERTIES)} development properties")
        else:
            print(f"Skipping property seed: {property_count} properties already exist")
        
        # Check if florists exist
        florist_count = db.query(Florist).count()
        if florist_count == 0:
            print("Seeding development florists...")
            for florist_data in DEV_FLORISTS:
                florist = Florist(
                    id=uuid4(),
                    name=florist_data["name"],
                    status=florist_data["status"],
                )
                db.add(florist)
                print(f"  Created florist: {florist.name} ({florist.status.value})")
            db.commit()
            print(f"Seeded {len(DEV_FLORISTS)} development florists")
        else:
            print(f"Skipping florist seed: {florist_count} florists already exist")
    finally:
        print("Closing database session...")
        db.close()
        print("Database session closed")
