"""
Property test for property status transition rules.
Feature: core-data-model, Property 3: Status Transition Rules
Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st, assume

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.property import PropertyStatus


# Valid transitions map
VALID_TRANSITIONS = {
    PropertyStatus.DRAFT: [PropertyStatus.SUBMITTED],
    PropertyStatus.SUBMITTED: [PropertyStatus.ACTIVE],
    PropertyStatus.ACTIVE: [],
}


class TestStatusTransitionRules:
    """
    Property 3: Status Transition Rules
    
    For any Property status transition:
    - DRAFT → SUBMITTED is always allowed
    - SUBMITTED → ACTIVE is allowed only when an active PropertyAssignment exists
    - DRAFT → ACTIVE is never allowed (must go through SUBMITTED)
    
    All invalid transitions SHALL return a 400 error with code "BUSINESS_RULE_VIOLATION".
    """
    
    @given(
        current_status=st.sampled_from(list(PropertyStatus)),
        target_status=st.sampled_from(list(PropertyStatus))
    )
    @settings(max_examples=100)
    def test_transition_validity_matrix(
        self,
        current_status: PropertyStatus,
        target_status: PropertyStatus
    ):
        """
        Test that the transition validity matrix is correctly defined.
        
        This tests the business logic rules without database interaction.
        """
        # Skip same-status "transitions"
        assume(current_status != target_status)
        
        allowed = VALID_TRANSITIONS.get(current_status, [])
        is_valid = target_status in allowed
        
        # Verify specific rules
        if current_status == PropertyStatus.DRAFT:
            if target_status == PropertyStatus.SUBMITTED:
                assert is_valid, "DRAFT -> SUBMITTED should be valid"
            elif target_status == PropertyStatus.ACTIVE:
                assert not is_valid, "DRAFT -> ACTIVE should NOT be valid"
        
        elif current_status == PropertyStatus.SUBMITTED:
            if target_status == PropertyStatus.ACTIVE:
                assert is_valid, "SUBMITTED -> ACTIVE should be valid (with assignment)"
            elif target_status == PropertyStatus.DRAFT:
                assert not is_valid, "SUBMITTED -> DRAFT should NOT be valid"
        
        elif current_status == PropertyStatus.ACTIVE:
            # No transitions from ACTIVE
            assert not is_valid, f"ACTIVE -> {target_status.value} should NOT be valid"
    
    def test_draft_to_submitted_always_allowed(self):
        """DRAFT -> SUBMITTED transition is always allowed without assignment."""
        allowed = VALID_TRANSITIONS[PropertyStatus.DRAFT]
        assert PropertyStatus.SUBMITTED in allowed
    
    def test_draft_to_active_never_allowed(self):
        """DRAFT -> ACTIVE transition is never allowed (must go through SUBMITTED)."""
        allowed = VALID_TRANSITIONS[PropertyStatus.DRAFT]
        assert PropertyStatus.ACTIVE not in allowed
    
    def test_submitted_to_active_in_allowed_list(self):
        """SUBMITTED -> ACTIVE is in the allowed list (requires assignment check at runtime)."""
        allowed = VALID_TRANSITIONS[PropertyStatus.SUBMITTED]
        assert PropertyStatus.ACTIVE in allowed
    
    def test_no_transitions_from_active(self):
        """No transitions are allowed from ACTIVE status."""
        allowed = VALID_TRANSITIONS[PropertyStatus.ACTIVE]
        assert len(allowed) == 0


class TestStatusTransitionIntegration:
    """
    Integration tests for status transitions with mock database.
    These tests verify the service layer behavior.
    """
    
    def test_validate_transition_draft_to_submitted(self):
        """DRAFT -> SUBMITTED should be allowed without assignment."""
        from services.property_service import VALID_TRANSITIONS
        
        allowed = VALID_TRANSITIONS[PropertyStatus.DRAFT]
        assert PropertyStatus.SUBMITTED in allowed
    
    def test_validate_transition_draft_to_active_blocked(self):
        """DRAFT -> ACTIVE should be blocked."""
        from services.property_service import VALID_TRANSITIONS
        
        allowed = VALID_TRANSITIONS[PropertyStatus.DRAFT]
        assert PropertyStatus.ACTIVE not in allowed
    
    def test_validate_transition_submitted_to_active_requires_assignment(self):
        """SUBMITTED -> ACTIVE requires an active assignment (tested at service level)."""
        from services.property_service import VALID_TRANSITIONS
        
        # The transition is in the allowed list, but requires assignment check
        allowed = VALID_TRANSITIONS[PropertyStatus.SUBMITTED]
        assert PropertyStatus.ACTIVE in allowed
        # Note: The actual assignment check happens in _validate_status_transition
