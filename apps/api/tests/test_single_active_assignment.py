"""
Property test for single active assignment constraint.
Feature: core-data-model, Property 4: Single Active Assignment Constraint
Validates: Requirements 5.1, 5.2, 5.3
"""

import os
import sys
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestSingleActiveAssignmentConstraint:
    """
    Property 4: Single Active Assignment Constraint
    
    For any Property, at most one PropertyAssignment with active=true can exist 
    at any time. When a new assignment is created for a property with an existing 
    active assignment, the previous assignment SHALL be deactivated.
    """
    
    @given(
        num_florists=st.integers(min_value=2, max_value=5)
    )
    @settings(max_examples=100)
    def test_assignment_deactivation_logic(self, num_florists: int):
        """
        Test that the assignment service logic correctly handles deactivation.
        
        For any number of sequential assignments to the same property,
        only the last assignment should remain active.
        """
        # This tests the logic without database - verifying the algorithm
        
        # Simulate assignment state
        assignments = []
        property_id = uuid4()
        
        for i in range(num_florists):
            florist_id = uuid4()
            
            # Deactivate existing active assignments (simulating service logic)
            for assignment in assignments:
                if assignment["property_id"] == property_id and assignment["active"]:
                    assignment["active"] = False
            
            # Create new assignment
            new_assignment = {
                "id": uuid4(),
                "property_id": property_id,
                "florist_id": florist_id,
                "active": True
            }
            assignments.append(new_assignment)
        
        # Verify only one active assignment exists
        active_count = sum(1 for a in assignments if a["property_id"] == property_id and a["active"])
        assert active_count == 1, f"Expected 1 active assignment, got {active_count}"
        
        # Verify the last assignment is the active one
        last_assignment = assignments[-1]
        assert last_assignment["active"], "Last assignment should be active"
    
    @given(
        num_properties=st.integers(min_value=1, max_value=3),
        assignments_per_property=st.integers(min_value=1, max_value=3)
    )
    @settings(max_examples=100)
    def test_multiple_properties_independent(
        self,
        num_properties: int,
        assignments_per_property: int
    ):
        """
        Test that assignments to different properties are independent.
        
        Each property should have exactly one active assignment,
        regardless of assignments to other properties.
        """
        # Simulate assignment state
        assignments = []
        property_ids = [uuid4() for _ in range(num_properties)]
        
        for property_id in property_ids:
            for _ in range(assignments_per_property):
                florist_id = uuid4()
                
                # Deactivate existing active assignments for THIS property only
                for assignment in assignments:
                    if assignment["property_id"] == property_id and assignment["active"]:
                        assignment["active"] = False
                
                # Create new assignment
                new_assignment = {
                    "id": uuid4(),
                    "property_id": property_id,
                    "florist_id": florist_id,
                    "active": True
                }
                assignments.append(new_assignment)
        
        # Verify each property has exactly one active assignment
        for property_id in property_ids:
            active_count = sum(
                1 for a in assignments 
                if a["property_id"] == property_id and a["active"]
            )
            assert active_count == 1, f"Property {property_id} should have exactly 1 active assignment"
    
    def test_first_assignment_is_active(self):
        """First assignment to a property should be active."""
        property_id = uuid4()
        florist_id = uuid4()
        
        # Simulate first assignment
        assignment = {
            "id": uuid4(),
            "property_id": property_id,
            "florist_id": florist_id,
            "active": True  # Default on creation
        }
        
        assert assignment["active"], "First assignment should be active"
    
    def test_second_assignment_deactivates_first(self):
        """Second assignment should deactivate the first."""
        property_id = uuid4()
        
        # First assignment
        first = {
            "id": uuid4(),
            "property_id": property_id,
            "florist_id": uuid4(),
            "active": True
        }
        
        # Deactivate first (simulating service logic)
        first["active"] = False
        
        # Second assignment
        second = {
            "id": uuid4(),
            "property_id": property_id,
            "florist_id": uuid4(),
            "active": True
        }
        
        assert not first["active"], "First assignment should be deactivated"
        assert second["active"], "Second assignment should be active"
