"""
Production seed script — bootstraps the first real property go-live.

Creates:
  - 1 admin account
  - 1 property (update address/name before running)
  - 1 property manager account assigned to the property
  - 1 florist account (Shopify connection done separately via the Shopify app)

Usage:
    ENVIRONMENT=production python scripts/seed_production.py \
        --admin-email ops@yourdomain.com \
        --pm-email pm@yourproperty.com \
        --florist-email florist@theirshop.com \
        --property-name "The Meridian" \
        --property-address "123 Main St, San Francisco, CA 94102"

Passwords are NOT set here — users receive a password-reset email on first login.
Re-running is safe (idempotent — skips existing records).
"""

import argparse
import os
import sys

# Ensure the api root is on the path when run from scripts/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from models.user import User, UserRole, UserStatus, SubscriptionStatus
from models.property import Property, PropertyStatus
from models.property_assignment import PropertyAssignment
import secrets


def _get_or_create_user(db, email: str, role: UserRole) -> tuple[User, bool]:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing, False

    user = User(
        email=email,
        hashed_password=secrets.token_hex(32),  # Random — user must reset via login flow
        role=role,
        status=UserStatus.ACTIVE,
        subscription_status=SubscriptionStatus.CREATED,
    )
    db.add(user)
    db.flush()
    return user, True


def _get_or_create_property(db, name: str, address: str) -> tuple[Property, bool]:
    existing = db.query(Property).filter(Property.name == name).first()
    if existing:
        return existing, False

    prop = Property(
        name=name,
        address=address,
        status=PropertyStatus.CREATED,
        delivery_cadence="weekly",
        delivery_lead_days=3,
    )
    db.add(prop)
    db.flush()
    return prop, True


def _assign_pm(db, pm: User, prop: Property) -> bool:
    existing = db.query(PropertyAssignment).filter(
        PropertyAssignment.user_id == pm.id,
        PropertyAssignment.property_id == prop.id,
    ).first()
    if existing:
        return False

    assignment = PropertyAssignment(user_id=pm.id, property_id=prop.id)
    db.add(assignment)
    return True


def seed(admin_email, pm_email, florist_email, property_name, property_address):
    db = SessionLocal()
    try:
        created = []

        admin, is_new = _get_or_create_user(db, admin_email, UserRole.ADMIN)
        if is_new:
            created.append(f"Admin: {admin_email}")

        pm, is_new = _get_or_create_user(db, pm_email, UserRole.PROPERTY_MANAGER)
        if is_new:
            created.append(f"PM: {pm_email}")

        florist, is_new = _get_or_create_user(db, florist_email, UserRole.FLORIST)
        if is_new:
            created.append(f"Florist: {florist_email}")

        prop, is_new = _get_or_create_property(db, property_name, property_address)
        if is_new:
            created.append(f"Property: {property_name}")

        if _assign_pm(db, pm, prop):
            created.append(f"Assigned PM {pm_email} -> {property_name}")

        db.commit()

        if created:
            print("Created:")
            for item in created:
                print(f"  + {item}")
        else:
            print("Nothing to create — all records already exist.")

        print()
        print("Next steps:")
        print("  1. All accounts have randomized passwords. Send password-reset links via your auth flow.")
        print(f"  2. Connect florist Shopify store via the Shopify app (florist: {florist_email}).")
        print(f"  3. Assign florist to property in admin dashboard.")
        print(f"  4. Set delivery cadence and lead days on the property.")
        print(f"  5. Register residents and activate subscriptions for go-live validation.")

    finally:
        db.close()


if __name__ == "__main__":
    env = os.environ.get("ENVIRONMENT", "development")
    if env != "production":
        print(f"WARNING: ENVIRONMENT={env}. Set ENVIRONMENT=production to run against production DB.")
        response = input("Continue anyway? [y/N] ").strip().lower()
        if response != "y":
            sys.exit(0)

    parser = argparse.ArgumentParser(description="Seed production database with initial accounts")
    parser.add_argument("--admin-email", required=True)
    parser.add_argument("--pm-email", required=True)
    parser.add_argument("--florist-email", required=True)
    parser.add_argument("--property-name", required=True)
    parser.add_argument("--property-address", required=True)
    args = parser.parse_args()

    seed(
        admin_email=args.admin_email,
        pm_email=args.pm_email,
        florist_email=args.florist_email,
        property_name=args.property_name,
        property_address=args.property_address,
    )
