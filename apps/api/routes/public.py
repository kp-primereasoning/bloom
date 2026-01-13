"""
Public routes - no authentication required.

Provides endpoints for public content like FAQs.
"""

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/public", tags=["public"])


# =============================================================================
# FAQ Models
# =============================================================================

class FAQItem(BaseModel):
    """A single FAQ item."""
    id: str
    question: str
    answer_markdown: str


class FAQResponse(BaseModel):
    """Response containing FAQ content."""
    version: int
    items: List[FAQItem]


# =============================================================================
# FAQ Endpoint
# =============================================================================

@router.get("/faq", response_model=FAQResponse)
async def get_faq():
    """
    Get FAQ content from static configuration.
    
    Public endpoint - no authentication required.
    Returns FAQ items with markdown-formatted answers.
    """
    config_path = Path(__file__).parent.parent / "config" / "faq.json"
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return FAQResponse(**data)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="FAQ configuration file not found"
        )
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid FAQ configuration: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading FAQ: {str(e)}"
        )
