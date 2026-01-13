"""
Property test for status computation.
Feature: enhanced-properties-table, Property 1: Status Computation Correctness
Validates: Requirements 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4
"""

import os
import sys

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.property import PropertyStatus
from services.property_service import compute_property_status


class TestStatusComputationProperty:
    """
    Property 1: Status Computation Correctness
    
    For any property with a given florist assignment state (has_florist: boolean) 
    and property manager assignment state (has_pm: boolean), the computed status SHALL be:
    - CREATED when has_florist=false AND has_pm=false
    - PENDING_PM when has_florist=true AND has_pm=false
    - PENDING_FLORIST when has_florist=false AND has_pm=true
    - ACTIVE when has_florist=true AND has_pm=true
    """
    
    @given(
        has_florist=st.booleans(),
        has_pm=st.booleans()
    )
    @settings(max_examples=100)
    def test_status_computation_correctness(self, has_florist: bool, has_pm: bool):
        """
        For any combination of has_florist and has_pm boolean values,
        compute_property_status SHALL return the correct status.
        """
        result = compute_property_status(has_florist, has_pm)
        
        # Determine expected status based on inputs
        if has_florist and has_pm:
            expected = PropertyStatus.ACTIVE
        elif has_florist:
            expected = PropertyStatus.PENDING_PM
        elif has_pm:
            expected = PropertyStatus.PENDING_FLORIST
        else:
            expected = PropertyStatus.CREATED
        
        assert result == expected, \
            f"compute_property_status({has_florist}, {has_pm}) should return {expected}, got {result}"


class TestStatusComputationExamples:
    """
    Example-based tests for status computation edge cases.
    """
    
    def test_no_assignments_returns_created(self):
        """Property with no florist and no PM should be CREATED."""
        assert compute_property_status(False, False) == PropertyStatus.CREATED
    
    def test_florist_only_returns_pending_pm(self):
        """Property with florist but no PM should be PENDING_PM."""
        assert compute_property_status(True, False) == PropertyStatus.PENDING_PM
    
    def test_pm_only_returns_pending_florist(self):
        """Property with PM but no florist should be PENDING_FLORIST."""
        assert compute_property_status(False, True) == PropertyStatus.PENDING_FLORIST
    
    def test_both_assignments_returns_active(self):
        """Property with both florist and PM should be ACTIVE."""
        assert compute_property_status(True, True) == PropertyStatus.ACTIVE
