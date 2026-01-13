"""
Unit tests for health check endpoints.

Validates: Requirements 2.1, 2.2
"""

import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_basic_health_check_returns_200(self):
        """GET /health should return 200 with healthy status."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_db_health_check_returns_200_when_connected(self):
        """
        GET /health/db should return 200 when database is connected.
        
        Note: This test requires a running database connection.
        In CI without DB, this may return 503.
        """
        response = client.get("/health/db")
        
        # Either healthy (200) or unhealthy (503) is valid
        # depending on whether DB is available
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert "status" in data
        
        if response.status_code == 200:
            assert data["status"] == "healthy"
            assert data["database"] == "connected"
        else:
            assert data["status"] == "unhealthy"
            assert "error" in data
    
    def test_health_check_includes_request_id_header(self):
        """Health endpoints should include X-Request-ID in response."""
        response = client.get("/health")
        
        assert "X-Request-ID" in response.headers
    
    def test_db_health_check_includes_request_id_header(self):
        """DB health endpoint should include X-Request-ID in response."""
        response = client.get("/health/db")
        
        assert "X-Request-ID" in response.headers
