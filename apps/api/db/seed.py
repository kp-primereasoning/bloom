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

from models.user import User, UserRole, UserStatus, UserDB, SubscriptionStatus
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

# Core users with predictable credentials
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
]

# Property Manager users (will be assigned to properties)
PM_USERS = [
    {
        "email": "pm1@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.PROPERTY_MANAGER,
        "property_index": 0,  # Assigned to first property
    },
    {
        "email": "pm2@bloom.example.com",
        "password": "bloom123",
        "role": UserRole.PROPERTY_MANAGER,
        "property_index": 1,  # Assigned to second property
    },
]

# 5 Properties with varied statuses
DEV_PROPERTIES = [
    {
        "name": "The Meridian",
        "address": "123 Main Street, San Francisco, CA 94102",
        "delivery_cadence": "weekly",
    },
    {
        "name": "Harbor View Apartments",
        "address": "456 Ocean Drive, San Francisco, CA 94107",
        "delivery_cadence": "bi-weekly",
    },
    {
        "name": "Parkside Residences",
        "address": "789 Park Avenue, San Francisco, CA 94118",
        "delivery_cadence": "weekly",
    },
    {
        "name": "Downtown Lofts",
        "address": "321 Market Street, San Francisco, CA 94103",
        "delivery_cadence": "monthly",
    },
    {
        "name": "Sunset Towers",
        "address": "555 Sunset Boulevard, San Francisco, CA 94122",
        "delivery_cadence": None,  # No cadence set yet
    },
]

# 3 Florists (all READY)
DEV_FLORISTS = [
    {"name": "Bloom & Petal"},
    {"name": "Garden Gate Flowers"},
    {"name": "Fresh Start Florals"},
]

# Customer distribution: 30 total
# - 10 CREATED (new signups)
# - 15 ACTIVE (paying subscribers)
# - 5 PAUSED (temporarily paused)
CUSTOMER_CONFIG = {
    "total": 30,
    "status_distribution": {
        SubscriptionStatus.CREATED: 10,
        SubscriptionStatus.ACTIVE: 15,
        SubscriptionStatus.PAUSED: 5,
    },
}


# =============================================================================
# Helpers
# =============================================================================

def _upsert_user(db: Session, user: User) -> None:
    """Insert a user row if it doesn't already exist (idempotent)."""
    existing = db.query(UserDB).filter(UserDB.email == user.email.lower()).first()
    if existing:
        return
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


# =============================================================================
# Seed Functions
# =============================================================================

async def seed_dev_users() -> None:
    """
    Seed one user per role if no users exist.
    Only runs in development mode.
    """
    with SessionLocal() as db:
        count = db.query(UserDB).count()
    if count > 0:
        print(f"Skipping user seed: {count} users already exist")
    else:
        print("Seeding development users...")
        with SessionLocal() as db:
            for user_data in DEV_USERS:
                user = User(
                    id=deterministic_uuid(f"user:{user_data['email']}"),
                    email=user_data["email"],
                    hashed_password=auth_service.hash_password(user_data["password"]),
                    role=user_data["role"],
                    status=UserStatus.ACTIVE,
                    created_at=datetime.now(timezone.utc),
                )
                _upsert_user(db, user)
                print(f"  Created user: {user.email} ({user.role.value})")
            db.commit()
        print(f"Seeded {len(DEV_USERS)} development users")

    seed_dev_entities()


def seed_dev_users_sync() -> None:
    """
    Synchronous version of seed_dev_users for module-level initialization.
    Seeds all demo data including properties, florists, PMs, and customers.
    """
    with SessionLocal() as db:
        count = db.query(UserDB).count()

    if count > 0:
        print(f"Skipping user seed: {count} users already exist")
        seed_dev_entities()
        return

    print("Seeding development users...")

    with SessionLocal() as db:
        for user_data in DEV_USERS:
            user = User(
                id=deterministic_uuid(f"user:{user_data['email']}"),
                email=user_data["email"],
                hashed_password=auth_service.hash_password(user_data["password"]),
                role=user_data["role"],
                status=UserStatus.ACTIVE,
                created_at=datetime.now(timezone.utc),
            )
            _upsert_user(db, user)
            print(f"  Created user: {user.email} ({user.role.value})")
        db.commit()

    print(f"Seeded {len(DEV_USERS)} core users")

    # Seed entities (properties, florists, PMs, customers)
    seed_dev_entities()


def seed_dev_entities() -> None:
    """
    Seed properties, florists, PM users, and customers.
    Idempotent - checks for existing data before inserting.
    """
    print("Opening database session...")
    db: Session = SessionLocal()
    print("Database session opened")

    try:
        # =================================================================
        # Seed Properties
        # =================================================================
        property_count = db.query(Property).count()
        property_ids = []

        if property_count == 0:
            print("Seeding development properties...")
            for i, prop_data in enumerate(DEV_PROPERTIES):
                prop_id = deterministic_uuid(f"property:{prop_data['name']}")
                prop = Property(
                    id=prop_id,
                    name=prop_data["name"],
                    address=prop_data["address"],
                    delivery_cadence=prop_data["delivery_cadence"],
                    status=PropertyStatus.CREATED,
                )
                db.add(prop)
                property_ids.append(prop_id)
                print(f"  Created property: {prop.name}")
            db.commit()
            print(f"Seeded {len(DEV_PROPERTIES)} development properties")
        else:
            print(f"Skipping property seed: {property_count} properties already exist")
            property_ids = [p.id for p in db.query(Property).all()]

        # =================================================================
        # Seed Florists
        # =================================================================
        florist_count = db.query(Florist).count()
        florist_ids = []

        if florist_count == 0:
            print("Seeding development florists...")
            for florist_data in DEV_FLORISTS:
                florist_id = deterministic_uuid(f"florist:{florist_data['name']}")
                florist = Florist(
                    id=florist_id,
                    name=florist_data["name"],
                    status=FloristStatus.READY,
                )
                db.add(florist)
                florist_ids.append(florist_id)
                print(f"  Created florist: {florist.name} (READY)")
            db.commit()
            print(f"Seeded {len(DEV_FLORISTS)} development florists")
        else:
            print(f"Skipping florist seed: {florist_count} florists already exist")
            florist_ids = [f.id for f in db.query(Florist).all()]

        # =================================================================
        # Seed Property-Florist Assignments
        # =================================================================
        assignment_count = db.query(PropertyAssignment).count()

        if assignment_count == 0 and len(property_ids) > 0 and len(florist_ids) > 0:
            print("Seeding property-florist assignments...")
            for i in range(min(3, len(property_ids), len(florist_ids))):
                assignment = PropertyAssignment(
                    id=deterministic_uuid(f"assignment:{property_ids[i]}:{florist_ids[i]}"),
                    property_id=property_ids[i],
                    florist_id=florist_ids[i],
                    active=True,
                )
                db.add(assignment)
                print(f"  Assigned florist to property {i+1}")
            db.commit()
            print("Seeded property-florist assignments")

        # =================================================================
        # Seed PM Users
        # =================================================================
        pm_emails = [pm["email"].lower() for pm in PM_USERS]
        existing_pm_count = db.query(UserDB).filter(UserDB.email.in_(pm_emails)).count()

        if existing_pm_count == 0 and len(property_ids) >= 2:
            print("Seeding PM users...")
            for pm_data in PM_USERS:
                prop_idx = pm_data["property_index"]
                prop_id = property_ids[prop_idx] if prop_idx < len(property_ids) else None

                pm_user = User(
                    id=deterministic_uuid(f"user:{pm_data['email']}"),
                    email=pm_data["email"],
                    hashed_password=auth_service.hash_password(pm_data["password"]),
                    role=pm_data["role"],
                    status=UserStatus.ACTIVE,
                    property_id=prop_id,
                    created_at=datetime.now(timezone.utc),
                )
                _upsert_user(db, pm_user)
                print(f"  Created PM: {pm_user.email}")

                # Update property with PM assignment
                if prop_id:
                    prop = db.query(Property).filter(Property.id == prop_id).first()
                    if prop:
                        prop.property_manager_id = pm_user.id
                        has_florist = db.query(PropertyAssignment).filter(
                            PropertyAssignment.property_id == prop_id,
                            PropertyAssignment.active == True
                        ).first() is not None
                        if has_florist:
                            prop.status = PropertyStatus.ACTIVE
                        else:
                            prop.status = PropertyStatus.PENDING_FLORIST

            db.commit()
            print(f"Seeded {len(PM_USERS)} PM users")
        else:
            print(f"Skipping PM seed: PMs already exist or not enough properties")

        # =================================================================
        # Seed Customer Users
        # =================================================================
        existing_customer_count = db.query(UserDB).filter(
            UserDB.role == UserRole.CUSTOMER
        ).count()

        if existing_customer_count == 0 and len(property_ids) > 0:
            print("Seeding customer users...")
            customer_num = 1

            for status, count in CUSTOMER_CONFIG["status_distribution"].items():
                for i in range(count):
                    prop_idx = (customer_num - 1) % len(property_ids)
                    prop_id = property_ids[prop_idx]

                    email = f"customer{customer_num}@bloom.example.com"
                    customer = User(
                        id=deterministic_uuid(f"user:{email}"),
                        email=email,
                        hashed_password=auth_service.hash_password("bloom123"),
                        role=UserRole.CUSTOMER,
                        status=UserStatus.ACTIVE,
                        property_id=prop_id,
                        subscription_status=status,
                        created_at=datetime.now(timezone.utc),
                    )
                    _upsert_user(db, customer)
                    customer_num += 1

            db.commit()
            print(f"Seeded {CUSTOMER_CONFIG['total']} customer users")
            print(f"  - {CUSTOMER_CONFIG['status_distribution'][SubscriptionStatus.CREATED]} CREATED")
            print(f"  - {CUSTOMER_CONFIG['status_distribution'][SubscriptionStatus.ACTIVE]} ACTIVE")
            print(f"  - {CUSTOMER_CONFIG['status_distribution'][SubscriptionStatus.PAUSED]} PAUSED")
        else:
            print(f"Skipping customer seed: {existing_customer_count} customers already exist")

        # =================================================================
        # Seed Deliveries
        # =================================================================
        seed_deliveries(db, property_ids)

    finally:
        print("Closing database session...")
        db.close()
        print("Database session closed")


def seed_deliveries(db: Session, property_ids: list) -> None:
    """
    Seed deliveries for ACTIVE and PAUSED customers.

    - ACTIVE customers: 1 future SCHEDULED delivery + 3-5 past deliveries
    - PAUSED customers: 2-3 past deliveries (no future)
    - CREATED customers: No deliveries

    Idempotent - checks for existing deliveries before inserting.
    """
    delivery_count = db.query(Delivery).count()

    if delivery_count > 0:
        print(f"Skipping delivery seed: {delivery_count} deliveries already exist")
        return

    print("Seeding deliveries...")
    now = datetime.now(timezone.utc)

    plans = [SubscriptionPlan.ESSENTIAL, SubscriptionPlan.SIGNATURE, SubscriptionPlan.STATEMENT]

    # Past delivery statuses: 70% DELIVERED, 20% SKIPPED, 10% MISSED
    past_statuses = (
        [DeliveryStatus.DELIVERED] * 7 +
        [DeliveryStatus.SKIPPED] * 2 +
        [DeliveryStatus.MISSED] * 1
    )

    delivery_num = 0

    customers = db.query(UserDB).filter(UserDB.role == UserRole.CUSTOMER).all()

    for user_row in customers:
        if not user_row.property_id or user_row.property_id not in property_ids:
            continue

        email = user_row.email
        customer_num = int(
            email.replace("customer", "").replace("@bloom.example.com", "")
        ) if email.startswith("customer") else 1
        plan = plans[(customer_num - 1) % len(plans)]

        if user_row.subscription_status == SubscriptionStatus.ACTIVE:
            num_past = 3 + (customer_num % 3)
            future_days = 7 + (customer_num % 8)
            future_delivery = Delivery(
                id=deterministic_uuid(f"delivery:{user_row.id}:future"),
                user_id=user_row.id,
                property_id=user_row.property_id,
                subscription_plan=plan,
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=now + timedelta(days=future_days),
                created_at=now,
                updated_at=now,
            )
            db.add(future_delivery)
            delivery_num += 1

            for i in range(num_past):
                days_ago = (i + 1) * 7
                status_idx = (customer_num + i) % len(past_statuses)
                status = past_statuses[status_idx]

                past_delivery = Delivery(
                    id=deterministic_uuid(f"delivery:{user_row.id}:past:{i}"),
                    user_id=user_row.id,
                    property_id=user_row.property_id,
                    subscription_plan=plan,
                    status=status,
                    scheduled_for=now - timedelta(days=days_ago),
                    delivered_at=now - timedelta(days=days_ago) if status == DeliveryStatus.DELIVERED else None,
                    created_at=now - timedelta(days=days_ago + 7),
                    updated_at=now - timedelta(days=days_ago),
                )
                db.add(past_delivery)
                delivery_num += 1

        elif user_row.subscription_status == SubscriptionStatus.PAUSED:
            num_past = 2 + (customer_num % 2)

            for i in range(num_past):
                days_ago = (i + 1) * 7 + 14
                status_idx = (customer_num + i) % len(past_statuses)
                status = past_statuses[status_idx]

                past_delivery = Delivery(
                    id=deterministic_uuid(f"delivery:{user_row.id}:past:{i}"),
                    user_id=user_row.id,
                    property_id=user_row.property_id,
                    subscription_plan=plan,
                    status=status,
                    scheduled_for=now - timedelta(days=days_ago),
                    delivered_at=now - timedelta(days=days_ago) if status == DeliveryStatus.DELIVERED else None,
                    created_at=now - timedelta(days=days_ago + 7),
                    updated_at=now - timedelta(days=days_ago),
                )
                db.add(past_delivery)
                delivery_num += 1

        # CREATED customers get no deliveries

    db.commit()
    print(f"Seeded {delivery_num} deliveries")
