#!/usr/bin/env python3
"""
AWS Connection Test Script

Tests connectivity to all AWS services used by the Bloom API.
Run this script after provisioning AWS infrastructure to verify
all services are accessible.

Usage:
    python scripts/test_connections.py

Exit codes:
    0 - All tests passed
    1 - One or more tests failed
"""

import os
import sys
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def print_result(service: str, success: bool, message: str = ""):
    """Print test result with emoji indicator."""
    emoji = "✅" if success else "❌"
    status = "PASS" if success else "FAIL"
    print(f"{emoji} {service}: {status}")
    if message:
        print(f"   {message}")


def test_postgresql() -> bool:
    """Test PostgreSQL database connectivity."""
    try:
        from sqlalchemy import create_engine, text
        from db.database import get_database_url
        
        url = get_database_url()
        engine = create_engine(url)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            if result == 1:
                print_result("PostgreSQL", True, "Connected successfully")
                return True
            else:
                print_result("PostgreSQL", False, "Unexpected query result")
                return False
                
    except Exception as e:
        print_result("PostgreSQL", False, str(e))
        return False


def test_cognito() -> bool:
    """Test Cognito User Pool connectivity."""
    try:
        from services.aws.config import get_aws_settings
        from services.aws.cognito import CognitoClient
        
        settings = get_aws_settings()
        
        if not settings.use_cognito:
            print_result("Cognito", True, "Disabled via feature flag (skipped)")
            return True
        
        if not settings.cognito_user_pool_id or not settings.cognito_client_id:
            print_result("Cognito", False, "Not configured (missing pool ID or client ID)")
            return False
        
        client = CognitoClient(
            user_pool_id=settings.cognito_user_pool_id,
            client_id=settings.cognito_client_id,
            region=settings.cognito_region,
        )
        
        if client.check_health():
            print_result("Cognito", True, f"User Pool: {settings.cognito_user_pool_id}")
            return True
        else:
            print_result("Cognito", False, "Health check failed")
            return False
            
    except Exception as e:
        print_result("Cognito", False, str(e))
        return False


def test_s3() -> bool:
    """Test S3 bucket connectivity with read/write test."""
    try:
        from services.aws.config import get_aws_settings
        from services.aws.s3 import S3Client
        
        settings = get_aws_settings()
        
        client = S3Client(
            bucket_name=settings.s3_bucket_name,
            region=settings.s3_region,
        )
        
        # Test basic health check (list objects)
        if not client.check_health():
            print_result("S3", False, f"Cannot access bucket: {settings.s3_bucket_name}")
            return False
        
        # Test write/read with a test object
        test_key = f"_connection_test/{datetime.utcnow().isoformat()}.txt"
        test_content = b"Connection test"
        
        try:
            # Write test object
            client.client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=test_key,
                Body=test_content,
            )
            
            # Read test object
            response = client.client.get_object(
                Bucket=settings.s3_bucket_name,
                Key=test_key,
            )
            read_content = response["Body"].read()
            
            # Clean up
            client.client.delete_object(
                Bucket=settings.s3_bucket_name,
                Key=test_key,
            )
            
            if read_content == test_content:
                print_result("S3", True, f"Bucket: {settings.s3_bucket_name} (read/write OK)")
                return True
            else:
                print_result("S3", False, "Read content mismatch")
                return False
                
        except Exception as e:
            print_result("S3", False, f"Read/write test failed: {e}")
            return False
            
    except Exception as e:
        print_result("S3", False, str(e))
        return False


def test_secrets_manager() -> bool:
    """Test Secrets Manager connectivity."""
    try:
        from services.aws.config import get_aws_settings
        from services.aws.secrets import SecretsManagerClient
        
        settings = get_aws_settings()
        
        if not settings.use_aws_secrets:
            print_result("Secrets Manager", True, "Disabled via feature flag (skipped)")
            return True
        
        client = SecretsManagerClient(region=settings.aws_region)
        
        if client.check_health(settings.db_secret_name):
            print_result("Secrets Manager", True, f"Secret: {settings.db_secret_name}")
            return True
        else:
            print_result("Secrets Manager", False, f"Cannot access secret: {settings.db_secret_name}")
            return False
            
    except Exception as e:
        print_result("Secrets Manager", False, str(e))
        return False


def test_ses() -> bool:
    """Test SES connectivity by checking send quota."""
    try:
        from services.aws.config import get_aws_settings
        import boto3
        
        settings = get_aws_settings()
        
        ses_client = boto3.client("ses", region_name=settings.ses_region)
        
        # Get send quota to verify connectivity
        quota = ses_client.get_send_quota()
        
        max_24hr = quota.get("Max24HourSend", 0)
        sent_24hr = quota.get("SentLast24Hours", 0)
        
        print_result(
            "SES", 
            True, 
            f"From: {settings.ses_from_email} | Quota: {sent_24hr}/{max_24hr} emails/24hr"
        )
        return True
        
    except Exception as e:
        print_result("SES", False, str(e))
        return False


def main():
    """Run all connection tests."""
    print("=" * 60)
    print("Bloom API - AWS Connection Tests")
    print(f"Time: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    print()
    
    results = []
    
    # Run all tests
    print("Testing PostgreSQL...")
    results.append(("PostgreSQL", test_postgresql()))
    print()
    
    print("Testing Cognito...")
    results.append(("Cognito", test_cognito()))
    print()
    
    print("Testing S3...")
    results.append(("S3", test_s3()))
    print()
    
    print("Testing Secrets Manager...")
    results.append(("Secrets Manager", test_secrets_manager()))
    print()
    
    print("Testing SES...")
    results.append(("SES", test_ses()))
    print()
    
    # Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for service, success in results:
        emoji = "✅" if success else "❌"
        print(f"  {emoji} {service}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All connection tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check configuration and AWS resources.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
