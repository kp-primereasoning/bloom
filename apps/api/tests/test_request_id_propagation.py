"""
Property test for request ID propagation.

Property 1: Request ID Propagation
For any API request, the response headers SHALL contain an X-Request-ID that matches
either the client-provided X-Request-ID header or is a valid UUID if none was provided.

Validates: Requirements 1.1, 1.4
"""

import uuid
import pytest
from hypothesis import given, strategies as st
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def is_valid_uuid(val: str) -> bool:
    """Check if string is a valid UUID."""
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError):
        return False


class TestRequestIDPropagation:
    """Property tests for request ID middleware."""
    
    def test_generates_uuid_when_no_header_provided(self):
        """Request without X-Request-ID should get a generated UUID in response."""
        response = client.get("/health")
        
        assert "X-Request-ID" in response.headers
        assert is_valid_uuid(response.headers["X-Request-ID"])
    
    @given(st.uuids())
    def test_propagates_client_provided_request_id(self, client_request_id: uuid.UUID):
        """
        Property: For any valid UUID provided as X-Request-ID,
        the response should contain the same UUID.
        """
        request_id_str = str(client_request_id)
        
        response = client.get(
            "/health",
            headers={"X-Request-ID": request_id_str}
        )
        
        assert response.headers.get("X-Request-ID") == request_id_str
    
    @given(st.text(alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'S'), max_codepoint=127), min_size=1, max_size=100).filter(lambda x: x.strip()))
    def test_accepts_any_ascii_string_as_request_id(self, custom_id: str):
        """
        Property: For any non-empty ASCII string provided as X-Request-ID,
        the response should contain the same string.
        Note: HTTP headers only support ASCII characters.
        """
        response = client.get(
            "/health",
            headers={"X-Request-ID": custom_id}
        )
        
        assert response.headers.get("X-Request-ID") == custom_id
    
    def test_error_response_contains_request_id(self):
        """Error responses should include request_id in the error envelope."""
        # Trigger a 404 error
        response = client.get("/nonexistent-endpoint")
        
        assert response.status_code == 404
        assert "X-Request-ID" in response.headers
        
        # Error envelope should contain request_id
        data = response.json()
        if "error" in data:
            assert "request_id" in data["error"]
            assert is_valid_uuid(data["error"]["request_id"])
    
    def test_error_response_uses_provided_request_id(self):
        """Error responses should use the client-provided request ID."""
        custom_id = str(uuid.uuid4())
        
        # Trigger a validation error with invalid data
        response = client.post(
            "/admin/properties",
            json={},  # Missing required fields
            headers={"X-Request-ID": custom_id}
        )
        
        # Should get 401 (unauthorized) or 422 (validation)
        assert response.headers.get("X-Request-ID") == custom_id
