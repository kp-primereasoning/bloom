"""
Property test for timestamp initialization and update behavior.
Feature: core-data-model, Property 2: Timestamp Initialization and Update
Validates: Requirements 1.4, 1.5, 2.4, 3.4
"""

import os
import sys
from datetime import datetime, timezone, timedelta
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


class TestTimestampInitialization:
    """
    Property 2: Timestamp Initialization and Update
    
    For any newly created entity, created_at SHALL be set to a timestamp
    within 5 seconds of the request time.
    """
    
    @given(
        name=property_name_strategy,
        address=address_strategy
    )
    @settings(max_examples=100)
    def test_property_created_at_initialized(self, name: str, address: str):
        """
        For any Property created, created_at SHALL be set to a timestamp
        within 5 seconds of creation time.
        """
        before = datetime.now(timezone.utc)
        prop = Property(name=name, address=address)
        after = datetime.now(timezone.utc)
        
        # created_at should be set
        assert prop.created_at is not None, "Property.created_at should be set"
        
        # created_at should be within the time window
        assert before <= prop.created_at <= after + timedelta(seconds=5), \
            f"Property.created_at should be within 5 seconds of creation"
    
    @given(
        name=property_name_strategy,
        address=address_strategy
    )
    @settings(max_examples=100)
    def test_property_updated_at_initialized(self, name: str, address: str):
        """
        For any Property created, updated_at SHALL be set to a timestamp
        within 5 seconds of creation time.
        """
        before = datetime.now(timezone.utc)
        prop = Property(name=name, address=address)
        after = datetime.now(timezone.utc)
        
        # updated_at should be set
        assert prop.updated_at is not None, "Property.updated_at should be set"
        
        # updated_at should be within the time window
        assert before <= prop.updated_at <= after + timedelta(seconds=5), \
            f"Property.updated_at should be within 5 seconds of creation"
    
    @given(name=property_name_strategy)
    @settings(max_examples=100)
    def test_florist_created_at_initialized(self, name: str):
        """
        For any Florist created, created_at SHALL be set to a timestamp
        within 5 seconds of creation time.
        """
        before = datetime.now(timezone.utc)
        florist = Florist(name=name)
        after = datetime.now(timezone.utc)
        
        # created_at should be set
        assert florist.created_at is not None, "Florist.created_at should be set"
        
        # created_at should be within the time window
        assert before <= florist.created_at <= after + timedelta(seconds=5), \
            f"Florist.created_at should be within 5 seconds of creation"
    
    @given(
        property_id=st.uuids(),
        florist_id=st.uuids()
    )
    @settings(max_examples=100)
    def test_assignment_created_at_initialized(self, property_id, florist_id):
        """
        For any PropertyAssignment created, created_at SHALL be set to a timestamp
        within 5 seconds of creation time.
        """
        before = datetime.now(timezone.utc)
        assignment = PropertyAssignment(
            property_id=property_id,
            florist_id=florist_id
        )
        after = datetime.now(timezone.utc)
        
        # created_at should be set
        assert assignment.created_at is not None, "PropertyAssignment.created_at should be set"
        
        # created_at should be within the time window
        assert before <= assignment.created_at <= after + timedelta(seconds=5), \
            f"PropertyAssignment.created_at should be within 5 seconds of creation"


class TestTimestampConsistency:
    """
    Tests for timestamp consistency across entity creation.
    """
    
    def test_property_created_at_equals_updated_at_on_creation(self):
        """On creation, Property.created_at and updated_at should be equal."""
        prop = Property(name="Test Property", address="123 Test St")
        
        # Both timestamps should be set and equal on creation
        assert prop.created_at is not None
        assert prop.updated_at is not None
        assert prop.created_at == prop.updated_at, \
            "created_at and updated_at should be equal on creation"
    
    def test_property_timestamps_are_timezone_aware(self):
        """Property timestamps should be timezone-aware (UTC)."""
        prop = Property(name="Test Property", address="123 Test St")
        
        assert prop.created_at.tzinfo is not None, \
            "created_at should be timezone-aware"
        assert prop.updated_at.tzinfo is not None, \
            "updated_at should be timezone-aware"
    
    def test_florist_timestamp_is_timezone_aware(self):
        """Florist timestamp should be timezone-aware (UTC)."""
        florist = Florist(name="Test Florist")
        
        assert florist.created_at.tzinfo is not None, \
            "created_at should be timezone-aware"
    
    def test_assignment_timestamp_is_timezone_aware(self):
        """PropertyAssignment timestamp should be timezone-aware (UTC)."""
        assignment = PropertyAssignment(
            property_id=uuid4(),
            florist_id=uuid4()
        )
        
        assert assignment.created_at.tzinfo is not None, \
            "created_at should be timezone-aware"
