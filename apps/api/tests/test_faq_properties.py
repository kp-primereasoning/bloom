"""
Property tests for FAQ endpoint.
Feature: customer-help-faq
Property 1: FAQ JSON Round-Trip
Validates: Requirements 1.1, 1.2, 1.3, 2.2
"""

import json
import os
import sys
from pathlib import Path
from typing import List

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.public import FAQItem, FAQResponse


# =============================================================================
# Strategies
# =============================================================================

@st.composite
def faq_item_strategy(draw):
    """Generate a valid FAQItem."""
    return FAQItem(
        id=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='-_'
        ))),
        question=draw(st.text(min_size=1, max_size=200)),
        answer_markdown=draw(st.text(min_size=1, max_size=1000))
    )


@st.composite
def faq_response_strategy(draw):
    """Generate a valid FAQResponse."""
    items = draw(st.lists(faq_item_strategy(), min_size=0, max_size=20))
    return FAQResponse(
        version=draw(st.integers(min_value=1, max_value=100)),
        items=items
    )


# =============================================================================
# Property 1: FAQ JSON Round-Trip
# =============================================================================

class TestFAQJSONRoundTrip:
    """
    Property 1: FAQ JSON Round-Trip
    
    For any valid FAQResponse object, serializing it to JSON and parsing it back
    SHALL produce an equivalent object with the same version, item count, and
    item contents.
    
    **Feature: customer-help-faq, Property 1: FAQ JSON Round-Trip**
    **Validates: Requirements 1.1, 1.2, 1.3, 2.2**
    """
    
    @given(faq_response=faq_response_strategy())
    @settings(max_examples=100)
    def test_faq_json_roundtrip(self, faq_response: FAQResponse):
        """
        Feature: customer-help-faq, Property 1: FAQ JSON Round-Trip
        Validates: Requirements 1.1, 1.2, 1.3, 2.2
        
        Test that FAQResponse can be serialized to JSON and parsed back
        to produce an equivalent object.
        """
        # Serialize to JSON
        json_str = faq_response.model_dump_json()
        
        # Parse back from JSON
        parsed_dict = json.loads(json_str)
        parsed_response = FAQResponse(**parsed_dict)
        
        # Verify equivalence
        assert parsed_response.version == faq_response.version, \
            f"Version mismatch: {parsed_response.version} != {faq_response.version}"
        
        assert len(parsed_response.items) == len(faq_response.items), \
            f"Item count mismatch: {len(parsed_response.items)} != {len(faq_response.items)}"
        
        for i, (original, parsed) in enumerate(zip(faq_response.items, parsed_response.items)):
            assert parsed.id == original.id, \
                f"Item {i} id mismatch: {parsed.id} != {original.id}"
            assert parsed.question == original.question, \
                f"Item {i} question mismatch"
            assert parsed.answer_markdown == original.answer_markdown, \
                f"Item {i} answer_markdown mismatch"
    
    def test_actual_faq_file_roundtrip(self):
        """
        Feature: customer-help-faq, Property 1: FAQ JSON Round-Trip
        Validates: Requirements 1.1, 1.2, 1.3, 2.2
        
        Test that the actual faq.json file can be loaded and round-tripped.
        """
        config_path = Path(__file__).parent.parent / "config" / "faq.json"
        
        # Load the actual file
        with open(config_path, "r", encoding="utf-8") as f:
            original_data = json.load(f)
        
        # Parse into FAQResponse
        faq_response = FAQResponse(**original_data)
        
        # Serialize back to JSON
        json_str = faq_response.model_dump_json()
        
        # Parse again
        parsed_dict = json.loads(json_str)
        parsed_response = FAQResponse(**parsed_dict)
        
        # Verify equivalence
        assert parsed_response.version == faq_response.version
        assert len(parsed_response.items) == len(faq_response.items)
        
        for original, parsed in zip(faq_response.items, parsed_response.items):
            assert parsed.id == original.id
            assert parsed.question == original.question
            assert parsed.answer_markdown == original.answer_markdown


# =============================================================================
# Additional validation tests
# =============================================================================

class TestFAQValidation:
    """Tests for FAQ schema validation."""
    
    def test_faq_file_has_required_fields(self):
        """Test that faq.json has all required fields."""
        config_path = Path(__file__).parent.parent / "config" / "faq.json"
        
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Verify top-level fields
        assert "version" in data, "faq.json must have 'version' field"
        assert "items" in data, "faq.json must have 'items' field"
        assert isinstance(data["version"], int), "version must be an integer"
        assert isinstance(data["items"], list), "items must be a list"
        
        # Verify each item has required fields
        for i, item in enumerate(data["items"]):
            assert "id" in item, f"Item {i} must have 'id' field"
            assert "question" in item, f"Item {i} must have 'question' field"
            assert "answer_markdown" in item, f"Item {i} must have 'answer_markdown' field"
    
    def test_faq_file_has_mailto_link(self):
        """Test that faq.json contains at least one mailto support link."""
        config_path = Path(__file__).parent.parent / "config" / "faq.json"
        
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Check if any item contains a mailto link
        has_mailto = False
        for item in data["items"]:
            if "mailto:" in item.get("answer_markdown", ""):
                has_mailto = True
                break
        
        assert has_mailto, "faq.json must contain at least one mailto support link"
    
    def test_faq_items_have_unique_ids(self):
        """Test that all FAQ items have unique IDs."""
        config_path = Path(__file__).parent.parent / "config" / "faq.json"
        
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        ids = [item["id"] for item in data["items"]]
        assert len(ids) == len(set(ids)), "All FAQ item IDs must be unique"
    
    @given(
        version=st.integers(min_value=1, max_value=1000),
        num_items=st.integers(min_value=0, max_value=50)
    )
    @settings(max_examples=100)
    def test_faq_response_validation(self, version: int, num_items: int):
        """
        Feature: customer-help-faq, Property 1: FAQ JSON Round-Trip
        Validates: Requirements 1.2
        
        Test that FAQResponse validates version and items correctly.
        """
        items = [
            FAQItem(
                id=f"item-{i}",
                question=f"Question {i}?",
                answer_markdown=f"Answer {i}"
            )
            for i in range(num_items)
        ]
        
        response = FAQResponse(version=version, items=items)
        
        assert response.version == version
        assert len(response.items) == num_items
