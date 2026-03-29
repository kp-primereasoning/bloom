"""
Development data seeding.
Only runs in development environment.

Creates realistic demo data:
- 5 properties with varied statuses
- 3 florists (all READY)
- 2 PM users assigned to properties
- 30 customers distributed across properties with CREATED/ACTIVE/PAUSED mix
- 1 admin user
- 1 florist user
- Deliveries for ACTIVE/PAUSED customers

Seed is idempotent - running multiple times produces the same result.
"""

from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4
import hashlib

from sqlalchemy.orm import Session

from models.user import User, UserRole, UserStatus, SubscriptionStatus
from models.property import Property, PropertyStatus
from models.florist import Florist, FloristStatus
from models.property_assignment import PropertyAssignment
from models.delivery import Delivery, DeliveryStatus, SubscriptionPlan
from auth.service import auth_service
from db.database import SessionLocal


def deterministic_uuid(seed_string: str) -> UUID:
    """Generate a deterministic UUID from a seed string for idempotent seeding."""
    hash_bytes = hashlib.md5(seed_string.encode()).digest()
    return UUID(bytes=hash_bytes)


# =============================================================================
# Seed Configuration
# =============================================================================

DEV_USERS = [
    {"email": "admin@bloom.example.com", "password": "bloom123", "role": UserRole.ADMIN},
    {"email": "florist@bloom.example.com", "password": "bloom123", "role": UserRole.FLORIST},
]

PM_USERS = [
    {"email": "pm1@bloom.example.com", "password": "bloom123", "role": UserRole.PROPERTY_MANAGER, "property_index": 0},
    {"email": "pm2@bloom.example.com", "password": "bloom123", "role": UserRole.PROPERTY_MANAGER, "property_index": 1},
]

DEV_PROPERTIES = [
    {"name": "The Meridian", "address": "123 Main Street, San Francisco, CA 94102", "delivery_cadence": "weekly"},
    {"name": "Harbor View Apartments", "address": "456 Ocean Drive, San Francisco, CA 94107", "delivery_cadence": "bi-weekly"},
    {"name": "Parkside Residences", "address": "789 Park Avenue, San Francisco, CA 94118", "delivery_cadence": "weekly"},
    {"name": "Downtown Lofts", "address": "321 Market Street, San Francisco, CA 94103", "delivery_cadence": "monthly"},
    {"name": "Sunset Towers", "address": "555 Sunset Boulevard, San Francisco, CA 94122", "delivery_cadence": None},
]

DEV_FLORISTS = [
    {"name": "Bloom & Petal"},
    {"name": "Garden Gate Flowers"},
    {"name": "Fresh Start Florals"},
]

CUSTOMER_CONFIG = {
    "total": 30,
    "status_distribution": {
        SubscriptionStatus.CREATED: 10,
        SubscriptionStatus.ACTIVE: 15,
        SubscriptionStatus.PAUSED: 5,
    },
}


# =============================================================================
# Seed Entry Point
# =============================================================================

def seed_dev_users_sync() -> None:
    """
    Seed all demo data. Idempotent — safe to call multiple times.
    """
    db: Session = SessionLocal()
    try:
        _seed_all(db)
    finally:
        db.close()


async def seed_dev_users() -> None:
    """Async wrapper for seed_dev_users_sync."""
    seed_dev_users_sync()


# =============================================================================
# Internal Seed Functions
# =============================================================================

def _seed_all(db: Session) -> None:
    """Seed everything in the correct order."""
    property_ids = _seed_properties(db)
    florist_ids = _seed_florists(db)
    _seed_assignments(db, property_ids, florist_ids)
    _seed_core_users(db, florist_ids)
    _seed_pm_users(db, property_ids)
    _seed_customers(db, property_ids)
    _seed_deliveries(db, property_ids)


def _seed_properties(db: Session) -> list[UUID]:
    """Seed properties. Returns list of property IDs."""
    count = db.query(Property).count()
    if count > 0:
        print(f"Skipping property seed: {count} properties already exist")
        return [p.id for p in db.query(Property).all()]

    print("Seeding properties...")
    ids = []
    for prop_data in DEV_PROPERTIES:
        prop_id = deterministic_uuid(f"property:{prop_data['name']}")
        prop = Property(
            id=prop_id,
            name=prop_data["name"],
            address=prop_data["address"],
            delivery_cadence=prop_data["delivery_cadence"],
            status=PropertyStatus.CREATED,
        )
        db.add(prop)
        ids.append(prop_id)
        print(f"  Created property: {prop.name}")
    db.commit()
    print(f"Seeded {len(DEV_PROPERTIES)} properties")
    return ids


def _seed_florists(db: Session) -> list[UUID]:
    """Seed florists. Returns list of florist IDs."""
    count = db.query(Florist).count()
    if count > 0:
        print(f"Skipping florist seed: {count} florists already exist")
        return [f.id for f in db.query(Florist).all()]

    print("Seeding florists...")
    ids = []
    for florist_data in DEV_FLORISTS:
        florist_id = deterministic_uuid(f"florist:{florist_data['name']}")
        florist = Florist(id=florist_id, name=florist_data["name"], status=FloristStatus.READY)
        db.add(florist)
        ids.append(florist_id)
        print(f"  Created florist: {florist.name}")
    db.commit()
    print(f"Seeded {len(DEV_FLORISTS)} florists")
    return ids


def _seed_assignments(db: Session, property_ids: list[UUID], florist_ids: list[UUID]) -> None:
    """Assign florists to first 3 properties."""
    count = db.query(PropertyAssignment).count()
    if count > 0:
        print(f"Skipping assignment seed: {count} assignments already exist")
        return

    print("Seeding property-florist assignments...")
    for i in range(min(3, len(property_ids), len(florist_ids))):
        assignment = PropertyAssignment(
            id=deterministic_uuid(f"assignment:{property_ids[i]}:{florist_ids[i]}"),
            property_id=property_ids[i],
            florist_id=florist_ids[i],
            active=True,
        )
        db.add(assignment)
        print(f"  Assigned florist {i+1} to property {i+1}")
    db.commit()


def _seed_core_users(db: Session, florist_ids: list[UUID]) -> None:
    """Seed admin and florist users."""
    for user_data in DEV_USERS:
        email = user_data["email"].lower()
        if db.query(User).filter(User.email == email).first():
            continue
        florist_id = florist_ids[0] if user_data["role"] == UserRole.FLORIST and florist_ids else None
        user = User(
            id=deterministic_uuid(f"user:{email}"),
            email=email,
            hashed_password=auth_service.hash_password(user_data["password"]),
            role=user_data["role"],
            status=UserStatus.ACTIVE,
            florist_id=florist_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        print(f"  Created user: {email} ({user_data['role'].value})")
    db.commit()


def _seed_pm_users(db: Session, property_ids: list[UUID]) -> None:
    """Seed PM users and assign them to properties."""
    for pm_data in PM_USERS:
        email = pm_data["email"].lower()
        if db.query(User).filter(User.email == email).first():
            continue

        prop_idx = pm_data["property_index"]
        prop_id = property_ids[prop_idx] if prop_idx < len(property_ids) else None

        pm_user = User(
            id=deterministic_uuid(f"user:{email}"),
            email=email,
            hashed_password=auth_service.hash_password(pm_data["password"]),
            role=UserRole.PROPERTY_MANAGER,
            status=UserStatus.ACTIVE,
            property_id=prop_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(pm_user)
        db.flush()  # Get the ID before updating property

        # Update property with PM assignment
        if prop_id:
            prop = db.query(Property).filter(Property.id == prop_id).first()
            if prop:
                prop.property_manager_id = pm_user.id
                has_florist = db.query(PropertyAssignment).filter(
                    PropertyAssignment.property_id == prop_id,
                    PropertyAssignment.active == True,
                ).first() is not None
                prop.status = PropertyStatus.ACTIVE if has_florist else PropertyStatus.PENDING_FLORIST

        print(f"  Created PM: {email}")

    db.commit()
    print(f"Seeded {len(PM_USERS)} PM users")


def _seed_customers(db: Session, property_ids: list[UUID]) -> None:
    """Seed 30 customer users distributed across properties."""
    # Check if customers already exist
    existing = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    if existing > 0:
        print(f"Skipping customer seed: {existing} customers already exist")
        return

    print("Seeding customer users...")
    plans = [SubscriptionPlan.ESSENTIAL, SubscriptionPlan.SIGNATURE, SubscriptionPlan.STATEMENT]
    customer_num = 1

    for status, count in CUSTOMER_CONFIG["status_distribution"].items():
        for i in range(count):
            prop_idx = (customer_num - 1) % len(property_ids)
            prop_id = property_ids[prop_idx]
            email = f"customer{customer_num}@bloom.example.com"
            plan = plans[(customer_num - 1) % len(plans)] if status == SubscriptionStatus.ACTIVE else None

            customer = User(
                id=deterministic_uuid(f"user:{email}"),
                email=email,
                hashed_password=auth_service.hash_password("bloom123"),
                role=UserRole.CUSTOMER,
                status=UserStatus.ACTIVE,
                property_id=prop_id,
                subscription_status=status,
                subscription_plan=plan,
                created_at=datetime.now(timezone.utc),
            )
            db.add(customer)
            customer_num += 1

    db.commit()
    print(f"Seeded {CUSTOMER_CONFIG['total']} customers")


def _seed_deliveries(db: Session, property_ids: list[UUID]) -> None:
    """Seed deliveries for ACTIVE and PAUSED customers."""
    count = db.query(Delivery).count()
    if count > 0:
        print(f"Skipping delivery seed: {count} deliveries already exist")
        return

    print("Seeding deliveries...")
    now = datetime.now(timezone.utc)
    plans = [SubscriptionPlan.ESSENTIAL, SubscriptionPlan.SIGNATURE, SubscriptionPlan.STATEMENT]
    past_statuses = (
        [DeliveryStatus.DELIVERED] * 7 +
        [DeliveryStatus.SKIPPED] * 2 +
        [DeliveryStatus.MISSED] * 1
    )

    customers = db.query(User).filter(User.role == UserRole.CUSTOMER).all()
    delivery_num = 0

    for customer in customers:
        if not customer.property_id:
            continue

        customer_num = int(
            customer.email.replace("customer", "").replace("@bloom.example.com", "")
        ) if customer.email.startswith("customer") else 1
        plan = plans[(customer_num - 1) % len(plans)]

        if customer.subscription_status == SubscriptionStatus.ACTIVE:
            num_past = 3 + (customer_num % 3)
            future_days = 7 + (customer_num % 8)

            db.add(Delivery(
                id=deterministic_uuid(f"delivery:{customer.id}:future"),
                user_id=customer.id,
                property_id=customer.property_id,
                subscription_plan=plan,
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=now + timedelta(days=future_days),
                created_at=now,
                updated_at=now,
            ))
            delivery_num += 1

            for i in range(num_past):
                days_ago = (i + 1) * 7
                status = past_statuses[(customer_num + i) % len(past_statuses)]
                db.add(Delivery(
                    id=deterministic_uuid(f"delivery:{customer.id}:past:{i}"),
                    user_id=customer.id,
                    property_id=customer.property_id,
                    subscription_plan=plan,
                    status=status,
                    scheduled_for=now - timedelta(days=days_ago),
                    delivered_at=now - timedelta(days=days_ago) if status == DeliveryStatus.DELIVERED else None,
                    created_at=now - timedelta(days=days_ago + 7),
                    updated_at=now - timedelta(days=days_ago),
                ))
                delivery_num += 1

        elif customer.subscription_status == SubscriptionStatus.PAUSED:
            num_past = 2 + (customer_num % 2)
            for i in range(num_past):
                days_ago = (i + 1) * 7 + 14
                status = past_statuses[(customer_num + i) % len(past_statuses)]
                db.add(Delivery(
                    id=deterministic_uuid(f"delivery:{customer.id}:past:{i}"),
                    user_id=customer.id,
                    property_id=customer.property_id,
                    subscription_plan=plan,
                    status=status,
                    scheduled_for=now - timedelta(days=days_ago),
                    delivered_at=now - timedelta(days=days_ago) if status == DeliveryStatus.DELIVERED else None,
                    created_at=now - timedelta(days=days_ago + 7),
                    updated_at=now - timedelta(days=days_ago),
                ))
                delivery_num += 1

    db.commit()
    print(f"Seeded {delivery_num} deliveries")
