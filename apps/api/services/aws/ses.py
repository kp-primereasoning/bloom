"""
AWS SES client for transactional email.

This module provides email sending capabilities for delivery notifications
and other transactional emails. Failures are logged but do not block
request processing.
"""

import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SESClient:
    """
    Client for AWS Simple Email Service (SES).
    
    Provides transactional email sending with graceful error handling.
    Email failures are logged but do not raise exceptions to avoid
    blocking request processing.
    """
    
    def __init__(self, from_email: str, region: str):
        """
        Initialize SES client.
        
        Args:
            from_email: Verified sender email address
            region: AWS region for SES
        """
        self.from_email = from_email
        self.region = region
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of boto3 client."""
        if self._client is None:
            self._client = boto3.client("ses", region_name=self.region)
        return self._client
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
    ) -> bool:
        """
        Send a transactional email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            body_html: HTML body content
            body_text: Plain text body (defaults to HTML if not provided)
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            response = self.client.send_email(
                Source=self.from_email,
                Destination={
                    "ToAddresses": [to_email],
                },
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8",
                    },
                    "Body": {
                        "Html": {
                            "Data": body_html,
                            "Charset": "UTF-8",
                        },
                        "Text": {
                            "Data": body_text or body_html,
                            "Charset": "UTF-8",
                        },
                    },
                },
            )
            
            message_id = response.get("MessageId", "unknown")
            logger.info(f"Email sent successfully to {to_email}, MessageId: {message_id}")
            return True
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                f"Failed to send email to {to_email}: {error_code} - {error_message}"
            )
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}")
            return False
    
    def send_delivery_scheduled(
        self,
        to_email: str,
        delivery_date: str,
        property_name: Optional[str] = None,
    ) -> bool:
        """
        Send delivery scheduled notification.
        
        Args:
            to_email: Customer email address
            delivery_date: Formatted delivery date string
            property_name: Optional property name for personalization
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Your Bloom Delivery is Scheduled 🌸"
        
        property_text = f" at {property_name}" if property_name else ""
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e91e63;">Your Delivery is Scheduled!</h1>
            <p>Great news! Your floral delivery{property_text} is scheduled for:</p>
            <p style="font-size: 24px; font-weight: bold; color: #333;">
                {delivery_date}
            </p>
            <p>Our florist will deliver fresh flowers right to your door.</p>
            <p style="color: #666; font-size: 14px;">
                If you need to make any changes, please contact us.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                This email was sent by Bloom. Please do not reply to this email.
            </p>
        </body>
        </html>
        """
        
        body_text = f"""
        Your Bloom Delivery is Scheduled!
        
        Great news! Your floral delivery{property_text} is scheduled for:
        {delivery_date}
        
        Our florist will deliver fresh flowers right to your door.
        
        If you need to make any changes, please contact us.
        """
        
        return self.send_email(to_email, subject, body_html, body_text)
    
    def send_delivery_completed(
        self,
        to_email: str,
        photo_url: Optional[str] = None,
        delivery_date: Optional[str] = None,
    ) -> bool:
        """
        Send delivery completed notification.
        
        Args:
            to_email: Customer email address
            photo_url: Optional presigned URL for delivery photo
            delivery_date: Optional delivery date for reference
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Your Bloom Delivery Has Arrived! 💐"
        
        photo_section = ""
        if photo_url:
            photo_section = f"""
            <p>
                <a href="{photo_url}" style="color: #e91e63; text-decoration: none;">
                    📷 View Delivery Photo
                </a>
            </p>
            """
        
        date_text = f" on {delivery_date}" if delivery_date else ""
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e91e63;">Your Delivery Has Arrived!</h1>
            <p>Your floral delivery{date_text} has been completed.</p>
            {photo_section}
            <p>We hope you enjoy your beautiful flowers!</p>
            <p style="color: #666; font-size: 14px;">
                Thank you for choosing Bloom.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                This email was sent by Bloom. Please do not reply to this email.
            </p>
        </body>
        </html>
        """
        
        photo_text = f"\nView delivery photo: {photo_url}" if photo_url else ""
        
        body_text = f"""
        Your Bloom Delivery Has Arrived!
        
        Your floral delivery{date_text} has been completed.
        {photo_text}
        
        We hope you enjoy your beautiful flowers!
        
        Thank you for choosing Bloom.
        """
        
        return self.send_email(to_email, subject, body_html, body_text)
    
    def send_subscription_confirmation(
        self,
        to_email: str,
        property_name: str,
    ) -> bool:
        """
        Send subscription confirmation email.
        
        Args:
            to_email: Customer email address
            property_name: Name of the property
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Welcome to Bloom! 🌷"
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e91e63;">Welcome to Bloom!</h1>
            <p>Your subscription at <strong>{property_name}</strong> is now active.</p>
            <p>You'll receive fresh flowers delivered right to your door on your property's delivery schedule.</p>
            <p style="color: #666; font-size: 14px;">
                You can manage your subscription anytime from your account dashboard.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                This email was sent by Bloom. Please do not reply to this email.
            </p>
        </body>
        </html>
        """
        
        body_text = f"""
        Welcome to Bloom!
        
        Your subscription at {property_name} is now active.
        
        You'll receive fresh flowers delivered right to your door on your property's delivery schedule.
        
        You can manage your subscription anytime from your account dashboard.
        """
        
        return self.send_email(to_email, subject, body_html, body_text)
    
    def check_health(self) -> bool:
        """
        Check SES connectivity by getting send quota.
        
        Returns:
            True if SES is accessible, False otherwise
        """
        try:
            self.client.get_send_quota()
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"SES health check failed: {error_code}")
            return False
        except Exception as e:
            logger.error(f"SES health check failed: {e}")
            return False


# Module-level singleton instance (lazy initialized)
_ses_client: Optional[SESClient] = None


def get_ses_client(from_email: str = None, region: str = None) -> SESClient:
    """
    Get or create the SES client singleton.
    
    Args:
        from_email: Sender email (uses config default if not provided)
        region: AWS region (uses config default if not provided)
        
    Returns:
        SESClient instance
    """
    global _ses_client
    
    if _ses_client is None:
        from services.aws.config import get_aws_settings
        settings = get_aws_settings()
        
        _ses_client = SESClient(
            from_email=from_email or settings.ses_from_email,
            region=region or settings.ses_region,
        )
    
    return _ses_client
