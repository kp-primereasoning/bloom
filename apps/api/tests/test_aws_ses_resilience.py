"""
Property-based tests for SES email failure resilience.

Property 6: Email Failure Resilience
*For any* email send operation, if SES fails, the API SHALL log the error
and continue processing the request without returning an error to the client.

Validates: Requirements 6.4
"""

from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings
import pytest

from botocore.exceptions import ClientError


# Strategy for valid email addresses
email_strategy = st.emails()

# Strategy for email subjects
subject_strategy = st.text(min_size=1, max_size=200).filter(lambda x: x.strip())

# Strategy for email body content
body_strategy = st.text(min_size=1, max_size=5000).filter(lambda x: x.strip())


class TestSESEmailResilience:
    """
    Property 6: Email Failure Resilience
    
    Tests that email failures are handled gracefully without raising exceptions.
    """
    
    @given(
        error_code=st.sampled_from([
            "MessageRejected",
            "MailFromDomainNotVerified",
            "ConfigurationSetDoesNotExist",
            "AccountSendingPaused",
            "InvalidParameterValue",
            "AccessDenied",
            "Throttling",
        ]),
        to_email=email_strategy,
        subject=subject_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_send_email_handles_all_ses_errors(self, error_code, to_email, subject):
        """
        For any SES error type, send_email should return False without raising.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        # Mock boto3 client to raise various SES errors
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.side_effect = ClientError(
            error_response={"Error": {"Code": error_code, "Message": "Test error"}},
            operation_name="SendEmail"
        )
        client._client = mock_boto_client
        
        # Should return False, not raise
        result = client.send_email(to_email, subject, "<p>Test</p>")
        assert result is False
    
    @given(
        to_email=email_strategy,
        delivery_date=st.text(min_size=1, max_size=50).filter(lambda x: x.strip()),
    )
    @settings(max_examples=100, deadline=None)
    def test_delivery_scheduled_handles_failures(self, to_email, delivery_date):
        """
        For any delivery scheduled notification, SES failures should return False.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.side_effect = ClientError(
            error_response={"Error": {"Code": "MessageRejected", "Message": "Test"}},
            operation_name="SendEmail"
        )
        client._client = mock_boto_client
        
        result = client.send_delivery_scheduled(to_email, delivery_date)
        assert result is False
    
    @given(
        to_email=email_strategy,
        photo_url=st.one_of(
            st.none(),
            st.text(min_size=10, max_size=500).filter(lambda x: x.startswith("http"))
        ),
    )
    @settings(max_examples=100, deadline=None)
    def test_delivery_completed_handles_failures(self, to_email, photo_url):
        """
        For any delivery completed notification, SES failures should return False.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.side_effect = Exception("Network error")
        client._client = mock_boto_client
        
        result = client.send_delivery_completed(to_email, photo_url)
        assert result is False
    
    @given(
        to_email=email_strategy,
        subject=subject_strategy,
        body_html=body_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_successful_send_returns_true(self, to_email, subject, body_html):
        """
        For any successful email send, the method should return True.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.return_value = {"MessageId": "test-message-id"}
        client._client = mock_boto_client
        
        result = client.send_email(to_email, subject, body_html)
        assert result is True
    
    @given(
        to_email=email_strategy,
        subject=subject_strategy,
        body_html=body_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_email_uses_correct_from_address(self, to_email, subject, body_html):
        """
        For any email, the from address should match the configured sender.
        """
        from services.aws.ses import SESClient
        
        from_email = "noreply@bloom.com"
        client = SESClient(from_email=from_email, region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.return_value = {"MessageId": "test-id"}
        client._client = mock_boto_client
        
        client.send_email(to_email, subject, body_html)
        
        # Verify the from address was used
        call_kwargs = mock_boto_client.send_email.call_args[1]
        assert call_kwargs["Source"] == from_email
    
    @given(
        to_email=email_strategy,
        subject=subject_strategy,
        body_html=body_strategy,
        body_text=st.one_of(st.none(), body_strategy),
    )
    @settings(max_examples=100, deadline=None)
    def test_email_includes_both_html_and_text(self, to_email, subject, body_html, body_text):
        """
        For any email, both HTML and text bodies should be included.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.return_value = {"MessageId": "test-id"}
        client._client = mock_boto_client
        
        client.send_email(to_email, subject, body_html, body_text)
        
        call_kwargs = mock_boto_client.send_email.call_args[1]
        message = call_kwargs["Message"]
        
        # Both HTML and Text should be present
        assert "Html" in message["Body"]
        assert "Text" in message["Body"]
        
        # HTML should match input
        assert message["Body"]["Html"]["Data"] == body_html
        
        # Text should be body_text if provided, otherwise body_html
        expected_text = body_text if body_text else body_html
        assert message["Body"]["Text"]["Data"] == expected_text
    
    def test_health_check_returns_false_on_error(self):
        """
        Health check should return False when SES is unavailable.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_send_quota.side_effect = ClientError(
            error_response={"Error": {"Code": "AccessDenied", "Message": "Test"}},
            operation_name="GetSendQuota"
        )
        client._client = mock_boto_client
        
        result = client.check_health()
        assert result is False
    
    def test_health_check_returns_true_on_success(self):
        """
        Health check should return True when SES is accessible.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_send_quota.return_value = {
            "Max24HourSend": 200,
            "MaxSendRate": 1,
            "SentLast24Hours": 10,
        }
        client._client = mock_boto_client
        
        result = client.check_health()
        assert result is True
    
    @given(
        to_email=email_strategy,
        property_name=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
    )
    @settings(max_examples=100, deadline=None)
    def test_subscription_confirmation_handles_failures(self, to_email, property_name):
        """
        For any subscription confirmation, SES failures should return False.
        """
        from services.aws.ses import SESClient
        
        client = SESClient(from_email="test@example.com", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.send_email.side_effect = ClientError(
            error_response={"Error": {"Code": "Throttling", "Message": "Rate exceeded"}},
            operation_name="SendEmail"
        )
        client._client = mock_boto_client
        
        result = client.send_subscription_confirmation(to_email, property_name)
        assert result is False
