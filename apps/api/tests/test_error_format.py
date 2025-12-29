"""
Property test for error response format.
Feature: auth-rbac, Property 5: Error Response Format Consistency
Validates: Requirements 3.1.1, 3.1.2, 3.1.3
"""

import os
import sys
import re

import pytest
from hypothesis import given, settings, strategies as st
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request
from starlette.testclient import TestClient as StarletteTestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# UUID regex pattern
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)


def is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID."""
    return bool(UUID_PATTERN.match(value))


class TestErrorResponseFormat:
    """Property tests for error response format validation."""
    
    @given(
        status_code=st.sampled_from([401, 403]),
        error_code=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Nd'), whitelist_characters='_')),
        message=st.text(min_size=1, max_size=200)
    )
    @settings(max_examples=100)
    def test_error_response_contains_required_fields(self, status_code: int, error_code: str, message: str):
        """
        Property 5: Error Response Format Consistency
        
        For any authentication or authorization error (401 or 403), the response body 
        SHALL follow the standard error format containing: error.code (string), 
        error.message (string), and error.request_id (UUID string).
        """
        from middleware.exceptions import http_exception_handler
        import asyncio
        
        # Create an HTTPException with our standard format
        exc = HTTPException(
            status_code=status_code,
            detail={
                "error": {
                    "code": error_code,
                    "message": message,
                    "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                }
            }
        )
        
        # Create a mock request
        scope = {"type": "http", "method": "GET", "path": "/test"}
        request = Request(scope)
        
        # Call the exception handler
        response = asyncio.get_event_loop().run_until_complete(
            http_exception_handler(request, exc)
        )
        
        # Verify response structure
        assert response.status_code == status_code
        
        import json
        body = json.loads(response.body.decode())
        
        # Verify error envelope structure
        assert "error" in body, "Response must contain 'error' key"
        error = body["error"]
        
        assert "code" in error, "Error must contain 'code' field"
        assert "message" in error, "Error must contain 'message' field"
        assert "request_id" in error, "Error must contain 'request_id' field"
        
        # Verify field types
        assert isinstance(error["code"], str), "code must be a string"
        assert isinstance(error["message"], str), "message must be a string"
        assert isinstance(error["request_id"], str), "request_id must be a string"
        
        # Verify request_id is a valid UUID
        assert is_valid_uuid(error["request_id"]), "request_id must be a valid UUID"
    
    @given(message=st.text(min_size=1, max_size=200))
    @settings(max_examples=100)
    def test_plain_exception_wrapped_in_error_envelope(self, message: str):
        """
        Test that plain HTTPException details are wrapped in error envelope.
        """
        from middleware.exceptions import http_exception_handler
        import asyncio
        
        # Create a plain HTTPException (not in our format)
        exc = HTTPException(status_code=400, detail=message)
        
        # Create a mock request
        scope = {"type": "http", "method": "GET", "path": "/test"}
        request = Request(scope)
        
        # Call the exception handler
        response = asyncio.get_event_loop().run_until_complete(
            http_exception_handler(request, exc)
        )
        
        import json
        body = json.loads(response.body.decode())
        
        # Verify it's wrapped in error envelope
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]
        assert "request_id" in body["error"]
        assert body["error"]["message"] == message
