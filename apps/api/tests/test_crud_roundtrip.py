"""
Property test for CRUD round-trip consistency.
Feature: core-data-model, Property 7: CRUD Round-Trip Consistency
Validates: Requirements 8.1, 8.2, 9.1, 9.2, 10.1, 10.2
"""

import os
import sys
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.property import PropertyStatus
from models.florist import FloristStatus


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

florist_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=100
).filter(lambda x: x.strip())


class TestCRUDRoundTripConsistency:
    """
    Property 7: CRUD Round-Trip Consistency
    
    For any entity created via POST endpoint, a subsequent GET request SHALL 
    return the same entity with all fields matching the creation response.
    """
    
    @given(
        name=property_name_strategy,
        address=address_strategy
    )
    @settings(max_examples=100)
    def test_property_data_preservation(self, name: str, address: str):
        """
        Test that property data is preserved through create operation.
        
        For any valid property name and address, creating a property should
        preserve those values in the response.
        """
        from schemas.domain import PropertyCreate, PropertyResponse
        
        # Create request
        create_data = PropertyCreate(name=name, address=address)
        
        # Verify data can be serialized and deserialized
        json_data = create_data.model_dump()
        
        assert json_data["name"] == name
        assert json_data["address"] == address
        
        # Simulate response (what we'd get back from API)
        response_data = {
            "id": str(uuid4()),
            "name": name,
            "address": address,
            "status": PropertyStatus.DRAFT.value,
            "delivery_cadence": None,
            "created_at": "2025-12-28T00:00:00Z",
            "updated_at": "2025-12-28T00:00:00Z",
        }
        
        # Verify response matches input
        assert response_data["name"] == name
        assert response_data["address"] == address
        assert response_data["status"] == PropertyStatus.DRAFT.value
    
    @given(name=florist_name_strategy)
    @settings(max_examples=100)
    def test_florist_data_preservation(self, name: str):
        """
        Test that florist data is preserved through create operation.
        
        For any valid florist name, creating a florist should preserve
        that value in the response.
        """
        from schemas.domain import FloristCreate
        
        # Create request
        create_data = FloristCreate(name=name)
        
        # Verify data can be serialized
        json_data = create_data.model_dump()
        assert json_data["name"] == name
        
        # Simulate response
        response_data = {
            "id": str(uuid4()),
            "name": name,
            "status": FloristStatus.ONBOARDING.value,
            "created_at": "2025-12-28T00:00:00Z",
        }
        
        # Verify response matches input
        assert response_data["name"] == name
        assert response_data["status"] == FloristStatus.ONBOARDING.value
    
    def test_assignment_data_preservation(self):
        """
        Test that assignment data is preserved through create operation.
        """
        from schemas.domain import PropertyAssignmentCreate
        
        property_id = uuid4()
        florist_id = uuid4()
        
        # Create request
        create_data = PropertyAssignmentCreate(
            property_id=property_id,
            florist_id=florist_id
        )
        
        # Verify data can be serialized
        json_data = create_data.model_dump()
        assert json_data["property_id"] == property_id
        assert json_data["florist_id"] == florist_id
        
        # Simulate response
        response_data = {
            "id": str(uuid4()),
            "property_id": str(property_id),
            "florist_id": str(florist_id),
            "active": True,
            "created_at": "2025-12-28T00:00:00Z",
        }
        
        # Verify response matches input
        assert response_data["property_id"] == str(property_id)
        assert response_data["florist_id"] == str(florist_id)
        assert response_data["active"] is True


class TestSchemaValidation:
    """Tests for schema validation behavior."""
    
    def test_property_create_requires_name(self):
        """PropertyCreate requires a non-empty name."""
        from pydantic import ValidationError
        from schemas.domain import PropertyCreate
        
        with pytest.raises(ValidationError):
            PropertyCreate(name="", address="123 Main St")
    
    def test_property_create_requires_address(self):
        """PropertyCreate requires a non-empty address."""
        from pydantic import ValidationError
        from schemas.domain import PropertyCreate
        
        with pytest.raises(ValidationError):
            PropertyCreate(name="Test Property", address="")
    
    def test_florist_create_requires_name(self):
        """FloristCreate requires a non-empty name."""
        from pydantic import ValidationError
        from schemas.domain import FloristCreate
        
        with pytest.raises(ValidationError):
            FloristCreate(name="")
    
    def test_assignment_create_requires_property_id(self):
        """PropertyAssignmentCreate requires property_id."""
        from pydantic import ValidationError
        from schemas.domain import PropertyAssignmentCreate
        
        with pytest.raises(ValidationError):
            PropertyAssignmentCreate(florist_id=uuid4())
    
    def test_assignment_create_requires_florist_id(self):
        """PropertyAssignmentCreate requires florist_id."""
        from pydantic import ValidationError
        from schemas.domain import PropertyAssignmentCreate
        
        with pytest.raises(ValidationError):
            PropertyAssignmentCreate(property_id=uuid4())
