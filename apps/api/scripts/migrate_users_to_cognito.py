#!/usr/bin/env python3
"""
User Migration Script - PostgreSQL to Cognito

Migrates existing users from PostgreSQL to AWS Cognito User Pool.
Users are created with temporary passwords and must reset on first login.

Usage:
    python scripts/migrate_users_to_cognito.py [--dry-run] [--limit N]

Options:
    --dry-run   Preview migration without making changes
    --limit N   Migrate only first N users

Exit codes:
    0 - Migration completed successfully
    1 - Migration failed or had errors
"""

import argparse
import os
import sys
from datetime import datetime
from typing import Optional
import secrets
import string

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def generate_temp_password(length: int = 16) -> str:
    """Generate a secure temporary password meeting Cognito requirements."""
    # Ensure at least one of each required character type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    
    # Fill remaining length with random characters
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*"
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))
    
    # Shuffle to randomize position of required characters
    secrets.SystemRandom().shuffle(password)
    
    return "".join(password)


def get_users_from_db(limit: Optional[int] = None):
    """Fetch users from PostgreSQL database."""
    from sqlalchemy import create_engine, text
    from db.database import get_database_url
    
    url = get_database_url()
    engine = create_engine(url)
    
    query = """
        SELECT id, email, role, created_at
        FROM users
        ORDER BY created_at ASC
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        users = [dict(row._mapping) for row in result]
    
    return users


def migrate_user_to_cognito(cognito_client, user: dict, dry_run: bool = False) -> dict:
    """
    Migrate a single user to Cognito.
    
    Returns dict with migration result.
    """
    email = user["email"]
    role = user["role"]
    
    result = {
        "email": email,
        "role": role,
        "success": False,
        "message": "",
        "cognito_username": None,
    }
    
    if dry_run:
        result["success"] = True
        result["message"] = "DRY RUN - Would create user"
        return result
    
    try:
        # Generate temporary password
        temp_password = generate_temp_password()
        
        # Create user in Cognito
        response = cognito_client.admin_create_user(
            email=email,
            role=role,
            temporary_password=temp_password,
            name=email.split("@")[0],  # Use email prefix as name
        )
        
        result["success"] = True
        result["message"] = "Created successfully"
        result["cognito_username"] = response.get("username")
        
    except Exception as e:
        error_str = str(e)
        
        # Handle specific error cases
        if "UsernameExistsException" in error_str:
            result["success"] = True
            result["message"] = "Already exists in Cognito (skipped)"
        else:
            result["success"] = False
            result["message"] = f"Error: {error_str}"
    
    return result


def main():
    """Run user migration."""
    parser = argparse.ArgumentParser(description="Migrate users from PostgreSQL to Cognito")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    parser.add_argument("--limit", type=int, help="Migrate only first N users")
    args = parser.parse_args()
    
    print("=" * 60)
    print("Bloom API - User Migration to Cognito")
    print(f"Time: {datetime.utcnow().isoformat()}Z")
    if args.dry_run:
        print("Mode: DRY RUN (no changes will be made)")
    print("=" * 60)
    print()
    
    # Check Cognito configuration
    from services.aws.config import get_aws_settings
    settings = get_aws_settings()
    
    if not settings.use_cognito:
        print("❌ Error: USE_COGNITO is not enabled")
        print("   Set USE_COGNITO=true in environment to enable migration")
        return 1
    
    if not settings.cognito_user_pool_id or not settings.cognito_client_id:
        print("❌ Error: Cognito not configured")
        print("   Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID")
        return 1
    
    print(f"Target User Pool: {settings.cognito_user_pool_id}")
    print(f"Region: {settings.cognito_region}")
    print()
    
    # Initialize Cognito client
    from services.aws.cognito import CognitoClient
    cognito_client = CognitoClient(
        user_pool_id=settings.cognito_user_pool_id,
        client_id=settings.cognito_client_id,
        region=settings.cognito_region,
    )
    
    # Verify Cognito connectivity
    print("Verifying Cognito connectivity...")
    if not cognito_client.check_health():
        print("❌ Error: Cannot connect to Cognito User Pool")
        return 1
    print("✅ Cognito connection verified")
    print()
    
    # Fetch users from database
    print("Fetching users from PostgreSQL...")
    try:
        users = get_users_from_db(limit=args.limit)
        print(f"✅ Found {len(users)} users to migrate")
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        return 1
    print()
    
    if not users:
        print("No users to migrate.")
        return 0
    
    # Migrate users
    print("Starting migration...")
    print("-" * 60)
    
    results = {
        "success": 0,
        "skipped": 0,
        "failed": 0,
    }
    
    for i, user in enumerate(users, 1):
        result = migrate_user_to_cognito(cognito_client, user, dry_run=args.dry_run)
        
        emoji = "✅" if result["success"] else "❌"
        print(f"{emoji} [{i}/{len(users)}] {result['email']} ({result['role']})")
        print(f"   {result['message']}")
        
        if result["success"]:
            if "skipped" in result["message"].lower() or "exists" in result["message"].lower():
                results["skipped"] += 1
            else:
                results["success"] += 1
        else:
            results["failed"] += 1
    
    # Summary
    print()
    print("=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"  ✅ Created: {results['success']}")
    print(f"  ⏭️  Skipped: {results['skipped']}")
    print(f"  ❌ Failed:  {results['failed']}")
    print(f"  📊 Total:   {len(users)}")
    print()
    
    if results["failed"] > 0:
        print("⚠️  Migration completed with errors")
        return 1
    else:
        if args.dry_run:
            print("✅ Dry run completed - no changes made")
            print("   Run without --dry-run to perform actual migration")
        else:
            print("🎉 Migration completed successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
