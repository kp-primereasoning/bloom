"""
Property Manager routes - PROPERTY_MANAGER role only.
"""

from fastapi import APIRouter, Depends

from auth.dependencies import require_role


router = APIRouter(prefix="/pm", tags=["pm"])


@router.get("/ping")
async def pm_ping(current_user: dict = Depends(require_role(["PROPERTY_MANAGER"]))):
    """Test endpoint - PROPERTY_MANAGER only."""
    return {"ok": True, "role": current_user["role"]}
