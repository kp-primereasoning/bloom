"""
Property tests for subscription status validation.
Feature: customer-dashboard-v1
Property 2: Subscription Status Validation
Validates: Requirements 4.1, 4.2
"""

import os
import sys
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st
from pydantic import ValidationError

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.me import MeSubscriptionUpdate


# Strategy for generating invalid subscription statuses
@st.composite
def invalid_status_strategy(draw):
    """Generate status values that are not ACTIVE or PAUSED."""
    invalid_statuses = [
        "CREATED",
        "created",
        "active",  # lowercase
        "paused",  # lowercase
        "CANCELLED",
        "PENDING",
        "INACTIVE",
        "",
        "null",
        "undefined",
    ]
    # Also generate random strings
    random_string = draw(st.text(min_size=1, max_size=20).filter(
        lambda x: x.upper() not in ["ACTIVE", "PAUSED"]
    ))
    return draw(st.sampled_from(invalid_statuses + [random_string]))


# Strategy for generating valid subscription statuses
@st.composite
def valid_status_strategy(draw):
    """Generate valid subscription statuses (ACTIVE or PAUSED)."""
    return draw(st.sampled_from(["ACTIVE", "PAUSED"]))


class TestSubscriptionStatusValidation:
    """
    Property 2: Subscription Status Validation
    
    For any subscription update request, the PATCH /me/subscription endpoint
    accepts only ACTIVE or PAUSED status values; any other value (including
    CREATED) results in HTTP 400.
    """
    
    @given(status=valid_status_strategy())
    @settings(max_examples=100)
    def test_valid_statuses_accepted(self, status: str):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.1
        
        Test that ACTIVE and PAUSED statuses are accepted.
        """
        # Should not raise ValidationError
        update = MeSubscriptionUpdate(subscription_status=status)
        assert update.subscription_status == status
    
    @given(status=invalid_status_strategy())
    @settings(max_examples=100)
    def test_invalid_statuses_rejected(self, status: str):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.1, 4.2
        
        Test that invalid statuses (including CREATED) are rejected.
        """
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status=status)
    
    def test_created_status_explicitly_rejected(self):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.2
        
        Test that CREATED status is explicitly rejected.
        """
        with pytest.raises(ValidationError) as exc_info:
            MeSubscriptionUpdate(subscription_status="CREATED")
        
        # Verify the error is about invalid literal value
        assert "subscription_status" in str(exc_info.value)
    
    def test_active_status_accepted(self):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.1
        
        Test that ACTIVE status is accepted.
        """
        update = MeSubscriptionUpdate(subscription_status="ACTIVE")
        assert update.subscription_status == "ACTIVE"
    
    def test_paused_status_accepted(self):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.1
        
        Test that PAUSED status is accepted.
        """
        update = MeSubscriptionUpdate(subscription_status="PAUSED")
        assert update.subscription_status == "PAUSED"
    
    def test_case_sensitivity(self):
        """
        Feature: customer-dashboard-v1, Property 2: Subscription Status Validation
        Validates: Requirements 4.1
        
        Test that status values are case-sensitive.
        """
        # Lowercase should be rejected
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="active")
        
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="paused")
        
        # Mixed case should be rejected
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="Active")
        
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="Paused")
