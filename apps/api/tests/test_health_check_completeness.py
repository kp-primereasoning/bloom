"""
Property-based tests for health check completeness.

Property 4: Health Check Completeness
*For any* combination of enabled services, the /health/full endpoint SHALL
report status for all enabled services and return 503 if any is unhealthy.

Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
"""

from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings
import pytest


class TestHealthCheckCompleteness:
    """
    Property 4: Health Check Completeness
    
    Tests that health checks report status for all services correctly.
    """
    
    @given(
        db_healthy=st.booleans(),
        s3_healthy=st.booleans(),
    )
    @settings(max_examples=20, deadline=None)
    def test_health_full_reports_all_core_services(self, db_healthy, s3_healthy):
        """
        For any combination of service health, /health/full should report
        status for PostgreSQL and S3.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=False,
            use_aws_secrets=False,
        )
        
        # Mock database session
        mock_db = MagicMock()
        if db_healthy:
            mock_db.execute.return_value.scalar.return_value = 1
        else:
            mock_db.execute.side_effect = Exception("DB connection failed")
        
        # Mock S3 client
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = s3_healthy
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                with patch('middleware.request_id.get_request_id', return_value="test-request-id"):
                    from routes.health import health_full
                    
                    response = health_full(db=mock_db)
        
        # Extract content from response
        if hasattr(response, 'body'):
            import json
            content = json.loads(response.body)
        else:
            content = response
        
        # Verify all core services are reported
        assert "services" in content
        assert "postgresql" in content["services"]
        assert "s3" in content["services"]
        
        # Verify status matches health
        assert content["services"]["postgresql"]["status"] == ("healthy" if db_healthy else "unhealthy")
        assert content["services"]["s3"]["status"] == ("healthy" if s3_healthy else "unhealthy")
    
    @given(
        cognito_healthy=st.booleans(),
    )
    @settings(max_examples=20, deadline=None)
    def test_cognito_reported_when_enabled(self, cognito_healthy):
        """
        When USE_COGNITO=true, Cognito health should be reported.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=True,
            cognito_user_pool_id="test-pool",
            cognito_client_id="test-client",
            use_aws_secrets=False,
        )
        
        # Mock database session (healthy)
        mock_db = MagicMock()
        mock_db.execute.return_value.scalar.return_value = 1
        
        # Mock S3 client (healthy)
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = True
        
        # Mock Cognito client
        mock_cognito_client = MagicMock()
        mock_cognito_client.check_health.return_value = cognito_healthy
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                with patch('services.aws.cognito.get_cognito_client', return_value=mock_cognito_client):
                    with patch('middleware.request_id.get_request_id', return_value="test-request-id"):
                        from routes.health import health_full
                        
                        response = health_full(db=mock_db)
        
        if hasattr(response, 'body'):
            import json
            content = json.loads(response.body)
        else:
            content = response
        
        assert "cognito" in content["services"]
        assert content["services"]["cognito"]["enabled"] is True
        assert content["services"]["cognito"]["status"] == ("healthy" if cognito_healthy else "unhealthy")
    
    def test_cognito_disabled_when_not_enabled(self):
        """
        When USE_COGNITO=false, Cognito should be reported as disabled.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=False,
            use_aws_secrets=False,
        )
        
        mock_db = MagicMock()
        mock_db.execute.return_value.scalar.return_value = 1
        
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = True
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                with patch('middleware.request_id.get_request_id', return_value="test-request-id"):
                    from routes.health import health_full
                    
                    response = health_full(db=mock_db)
        
        if hasattr(response, 'body'):
            import json
            content = json.loads(response.body)
        else:
            content = response
        
        assert content["services"]["cognito"]["status"] == "disabled"
        assert content["services"]["cognito"]["enabled"] is False
    
    @given(
        secrets_healthy=st.booleans(),
    )
    @settings(max_examples=20, deadline=None)
    def test_secrets_manager_reported_when_enabled(self, secrets_healthy):
        """
        When USE_AWS_SECRETS=true, Secrets Manager health should be reported.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=False,
            use_aws_secrets=True,
            db_secret_name="test/secret",
        )
        
        mock_db = MagicMock()
        mock_db.execute.return_value.scalar.return_value = 1
        
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = True
        
        mock_secrets_client = MagicMock()
        mock_secrets_client.check_health.return_value = secrets_healthy
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                with patch('services.aws.secrets.get_secrets_client', return_value=mock_secrets_client):
                    with patch('middleware.request_id.get_request_id', return_value="test-request-id"):
                        from routes.health import health_full
                        
                        response = health_full(db=mock_db)
        
        if hasattr(response, 'body'):
            import json
            content = json.loads(response.body)
        else:
            content = response
        
        assert "secrets_manager" in content["services"]
        assert content["services"]["secrets_manager"]["enabled"] is True
        assert content["services"]["secrets_manager"]["status"] == ("healthy" if secrets_healthy else "unhealthy")
    
    @given(
        db_healthy=st.booleans(),
        s3_healthy=st.booleans(),
        cognito_healthy=st.booleans(),
        secrets_healthy=st.booleans(),
    )
    @settings(max_examples=30, deadline=None)
    def test_returns_503_when_any_service_unhealthy(
        self, db_healthy, s3_healthy, cognito_healthy, secrets_healthy
    ):
        """
        For any combination where at least one service is unhealthy,
        the endpoint should return 503.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=True,
            cognito_user_pool_id="test-pool",
            cognito_client_id="test-client",
            use_aws_secrets=True,
            db_secret_name="test/secret",
        )
        
        mock_db = MagicMock()
        if db_healthy:
            mock_db.execute.return_value.scalar.return_value = 1
        else:
            mock_db.execute.side_effect = Exception("DB error")
        
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = s3_healthy
        
        mock_cognito_client = MagicMock()
        mock_cognito_client.check_health.return_value = cognito_healthy
        
        mock_secrets_client = MagicMock()
        mock_secrets_client.check_health.return_value = secrets_healthy
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                with patch('services.aws.cognito.get_cognito_client', return_value=mock_cognito_client):
                    with patch('services.aws.secrets.get_secrets_client', return_value=mock_secrets_client):
                        with patch('middleware.request_id.get_request_id', return_value="test-request-id"):
                            from routes.health import health_full
                            
                            response = health_full(db=mock_db)
        
        all_healthy = db_healthy and s3_healthy and cognito_healthy and secrets_healthy
        
        if all_healthy:
            # Should return dict directly (200)
            assert isinstance(response, dict)
            assert response["status"] == "healthy"
        else:
            # Should return JSONResponse with 503
            assert hasattr(response, 'status_code')
            assert response.status_code == 503
    
    def test_request_id_included_in_response(self):
        """
        Response should include request_id for traceability.
        """
        from services.aws.config import AWSSettings
        
        mock_settings = AWSSettings(
            use_cognito=False,
            use_aws_secrets=False,
        )
        
        mock_db = MagicMock()
        mock_db.execute.return_value.scalar.return_value = 1
        
        mock_s3_client = MagicMock()
        mock_s3_client.check_health.return_value = True
        
        with patch('services.aws.config.get_aws_settings', return_value=mock_settings):
            with patch('services.aws.s3.get_s3_client', return_value=mock_s3_client):
                from routes.health import health_full
                
                response = health_full(db=mock_db)
        
        # Just verify request_id is present (value comes from middleware)
        assert "request_id" in response
        assert response["request_id"] is not None
