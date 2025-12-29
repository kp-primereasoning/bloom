"""
Florist routes - FLORIST role only.
"""

from fastapi import APIRouter, Depends

from auth.dependencies import require_role


router = APIRouter(prefix="/florist", tags=["florist"])


@router.get("/ping")
async def florist_ping(current_user: dict = Depends(require_role(["FLORIST"]))):
    """Test endpoint - FLORIST only."""
    return {"ok": True, "role": current_user["role"]}
