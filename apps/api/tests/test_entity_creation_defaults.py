"""
Property test for entity creation defaults.
Feature: core-data-model, Property 1: Entity Creation Defaults
Validates: Requirements 1.3, 2.3, 3.3
"""

import os
import sys
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.property import Property, PropertyStatus
from models.florist import Florist, FloristStatus
from models.property_assignment import PropertyAssignment


# Strategies for generating valid entity data
property_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=100
).filter(lambda x: x.strip())

address_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=200
).filter(lambda x: x.strip())


class TestEntityCreationDefaults:
    """
    Property 1: Entity Creation Defaults
    
    For any newly created Property, Florist, or PropertyAssignment, 
    the system SHALL set the correct default values:
    - Property.status = DRAFT
    - Florist.status = ONBOARDING
    - PropertyAssignment.active = true
    """
    
    @given(
        name=property_name_strategy,
        address=address_strategy
    )
    @settings(max_examples=100)
    def test_property_defaults_to_draft_status(self, name: str, address: str):
        """
        For any Property created with arbitrary name and address,
        the status SHALL default to DRAFT.
        """
        prop = Property(name=name, address=address)
        
        # Status should default to DRAFT
        assert prop.status == PropertyStatus.DRAFT, \
            f"Property status should default to DRAFT, got {prop.status}"
    
    @given(name=property_name_strategy)
    @settings(max_examples=100)
    def test_florist_defaults_to_onboarding_status(self, name: str):
        """
        For any Florist created with arbitrary name,
        the status SHALL default to ONBOARDING.
        """
        florist = Florist(name=name)
        
        # Status should default to ONBOARDING
        assert florist.status == FloristStatus.ONBOARDING, \
            f"Florist status should default to ONBOARDING, got {florist.status}"
    
    @given(
        property_id=st.uuids(),
        florist_id=st.uuids()
    )
    @settings(max_examples=100)
    def test_assignment_defaults_to_active_true(self, property_id, florist_id):
        """
        For any PropertyAssignment created with arbitrary property_id and florist_id,
        the active flag SHALL default to true.
        """
        assignment = PropertyAssignment(
            property_id=property_id,
            florist_id=florist_id
        )
        
        # Active should default to True
        assert assignment.active is True, \
            f"PropertyAssignment.active should default to True, got {assignment.active}"


class TestEntityCreationExplicitValues:
    """
    Tests that explicit values override defaults correctly.
    """
    
    def test_property_explicit_status_overrides_default(self):
        """Property can be created with explicit status."""
        prop = Property(
            name="Test Property",
            address="123 Test St",
            status=PropertyStatus.SUBMITTED
        )
        assert prop.status == PropertyStatus.SUBMITTED
    
    def test_florist_explicit_status_overrides_default(self):
        """Florist can be created with explicit status."""
        florist = Florist(
            name="Test Florist",
            status=FloristStatus.READY
        )
        assert florist.status == FloristStatus.READY
    
    def test_assignment_explicit_active_overrides_default(self):
        """PropertyAssignment can be created with explicit active flag."""
        assignment = PropertyAssignment(
            property_id=uuid4(),
            florist_id=uuid4(),
            active=False
        )
        assert assignment.active is False
