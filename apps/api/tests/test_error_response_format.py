"""
Property test for error response format consistency.
Feature: core-data-model, Property 8: Error Response Format Consistency
Validates: Requirements 12.1, 12.2, 12.3, 12.4
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4, UUID

import pytest
from hypothesis import given, settings, strategies as st
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import User, UserRole
from auth.service import AuthService


def is_valid_uuid(val: str) -> bool:
    """Check if a string is a valid UUID."""
    try:
        UUID(val)
        return True
    except (ValueError, TypeError):
        return False


class TestErrorResponseFormatConsistency:
    """
    Property 8: Error Response Format Consistency
    
    For any error response (400, 401, 403, 404), the response body SHALL contain 
    an "error" object with "code" (string), "message" (string), and "request_id" 
    (UUID string) fields.
    """
    
    def test_401_error_format(self):
        """401 Unauthorized errors follow standard format."""
        from main import app
        
        client = TestClient(app)
        response = client.get("/admin/properties")
        
        assert response.status_code == 401
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "request_id" in data["error"]
        
        # Verify types
        assert isinstance(data["error"]["code"], str)
        assert isinstance(data["error"]["message"], str)
        assert is_valid_uuid(data["error"]["request_id"])
    
    def test_403_error_format(self):
        """403 Forbidden errors follow standard format."""
        from main import app
        
        auth_service = AuthService()
        user = User(
            id=uuid4(),
            email="customer@test.com",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        response = client.get(
            "/admin/properties",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "request_id" in data["error"]
        
        # Verify types
        assert isinstance(data["error"]["code"], str)
        assert isinstance(data["error"]["message"], str)
        assert is_valid_uuid(data["error"]["request_id"])
        
        # Verify specific code
        assert data["error"]["code"] == "FORBIDDEN"
    
    def test_422_validation_error_format(self):
        """422 Validation errors follow standard format."""
        from main import app
        
        auth_service = AuthService()
        user = User(
            id=uuid4(),
            email="admin@test.com",
            hashed_password="hashed",
            role=UserRole.ADMIN,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        
        # Send invalid data (missing required fields)
        response = client.post(
            "/admin/properties",
            json={},  # Missing name and address
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "request_id" in data["error"]
        
        # Verify types
        assert isinstance(data["error"]["code"], str)
        assert isinstance(data["error"]["message"], str)
        assert is_valid_uuid(data["error"]["request_id"])
        
        # Verify specific code
        assert data["error"]["code"] == "VALIDATION_ERROR"
    
    @given(
        error_type=st.sampled_from(["auth", "forbidden", "validation"])
    )
    @settings(max_examples=100)
    def test_all_error_types_have_consistent_format(self, error_type: str):
        """
        All error types follow the same format structure.
        """
        from main import app
        
        auth_service = AuthService()
        client = TestClient(app)
        
        if error_type == "auth":
            # 401 - No auth header
            response = client.get("/admin/properties")
            expected_status = 401
        
        elif error_type == "forbidden":
            # 403 - Wrong role
            user = User(
                id=uuid4(),
                email="customer@test.com",
                hashed_password="hashed",
                role=UserRole.CUSTOMER,
                created_at=datetime.now(timezone.utc)
            )
            token = auth_service.create_access_token(user)
            response = client.get(
                "/admin/properties",
                headers={"Authorization": f"Bearer {token}"}
            )
            expected_status = 403
        
        else:  # validation
            # 422 - Invalid request body
            user = User(
                id=uuid4(),
                email="admin@test.com",
                hashed_password="hashed",
                role=UserRole.ADMIN,
                created_at=datetime.now(timezone.utc)
            )
            token = auth_service.create_access_token(user)
            response = client.post(
                "/admin/properties",
                json={},
                headers={"Authorization": f"Bearer {token}"}
            )
            expected_status = 422
        
        assert response.status_code == expected_status
        data = response.json()
        
        # All error responses must have the same structure
        assert "error" in data, f"Missing 'error' key for {error_type}"
        assert "code" in data["error"], f"Missing 'code' for {error_type}"
        assert "message" in data["error"], f"Missing 'message' for {error_type}"
        assert "request_id" in data["error"], f"Missing 'request_id' for {error_type}"
        
        # All fields must be strings
        assert isinstance(data["error"]["code"], str)
        assert isinstance(data["error"]["message"], str)
        assert isinstance(data["error"]["request_id"], str)
        
        # request_id must be a valid UUID
        assert is_valid_uuid(data["error"]["request_id"]), f"Invalid UUID for {error_type}"


class TestErrorCodes:
    """Tests for specific error codes."""
    
    def test_validation_error_code(self):
        """Validation errors have code VALIDATION_ERROR."""
        from main import app
        
        auth_service = AuthService()
        user = User(
            id=uuid4(),
            email="admin@test.com",
            hashed_password="hashed",
            role=UserRole.ADMIN,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        response = client.post(
            "/admin/florists",
            json={},  # Missing name
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    
    def test_forbidden_error_code(self):
        """Forbidden errors have code FORBIDDEN."""
        from main import app
        
        auth_service = AuthService()
        user = User(
            id=uuid4(),
            email="florist@test.com",
            hashed_password="hashed",
            role=UserRole.FLORIST,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        response = client.get(
            "/admin/properties",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
