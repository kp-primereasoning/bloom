"""
Property test for property status computation rules.
Feature: core-data-model, Property status is auto-computed based on assignments.
Validates: Automatic status computation based on florist and PM assignments.
"""

import os
import sys

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.property import PropertyStatus
from services.property_service import compute_property_status


class TestStatusComputationRules:
    """
    Property status is automatically computed based on assignments.

    Rules:
    - No florist + No PM -> CREATED
    - Florist + No PM -> PENDING_PM
    - No florist + PM -> PENDING_FLORIST
    - Florist + PM -> ACTIVE
    """

    @given(
        has_florist=st.booleans(),
        has_pm=st.booleans()
    )
    @settings(max_examples=100)
    def test_status_computation_matrix(self, has_florist: bool, has_pm: bool):
        """
        Test that status computation covers all boolean combinations.
        """
        status = compute_property_status(has_florist, has_pm)

        # Verify the status is always one of the valid enum values
        assert status in PropertyStatus

        # Verify specific rules
        if has_florist and has_pm:
            assert status == PropertyStatus.ACTIVE
        elif has_florist and not has_pm:
            assert status == PropertyStatus.PENDING_PM
        elif not has_florist and has_pm:
            assert status == PropertyStatus.PENDING_FLORIST
        else:
            assert status == PropertyStatus.CREATED

    def test_no_assignments_returns_created(self):
        """No florist + No PM -> CREATED"""
        status = compute_property_status(has_florist=False, has_pm=False)
        assert status == PropertyStatus.CREATED

    def test_florist_only_returns_pending_pm(self):
        """Florist + No PM -> PENDING_PM"""
        status = compute_property_status(has_florist=True, has_pm=False)
        assert status == PropertyStatus.PENDING_PM

    def test_pm_only_returns_pending_florist(self):
        """No florist + PM -> PENDING_FLORIST"""
        status = compute_property_status(has_florist=False, has_pm=True)
        assert status == PropertyStatus.PENDING_FLORIST

    def test_both_assignments_returns_active(self):
        """Florist + PM -> ACTIVE"""
        status = compute_property_status(has_florist=True, has_pm=True)
        assert status == PropertyStatus.ACTIVE


class TestStatusEnumValues:
    """
    Tests that the PropertyStatus enum has the expected values.
    """

    def test_all_expected_statuses_exist(self):
        """Verify all expected status values exist in the enum."""
        expected = ["CREATED", "PENDING_FLORIST", "PENDING_PM", "ACTIVE", "ARCHIVED"]
        for status_name in expected:
            assert hasattr(PropertyStatus, status_name), f"Missing status: {status_name}"

    def test_status_string_values(self):
        """Verify status string values match names."""
        assert PropertyStatus.CREATED.value == "CREATED"
        assert PropertyStatus.PENDING_FLORIST.value == "PENDING_FLORIST"
        assert PropertyStatus.PENDING_PM.value == "PENDING_PM"
        assert PropertyStatus.ACTIVE.value == "ACTIVE"
        assert PropertyStatus.ARCHIVED.value == "ARCHIVED"

    def test_archived_is_separate_from_computation(self):
        """ARCHIVED status is set via soft-delete, not computed."""
        # compute_property_status never returns ARCHIVED
        for has_florist in [True, False]:
            for has_pm in [True, False]:
                status = compute_property_status(has_florist, has_pm)
                assert status != PropertyStatus.ARCHIVED
