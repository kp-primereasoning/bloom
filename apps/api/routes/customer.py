"""
Customer routes - CUSTOMER role only.
"""

from fastapi import APIRouter, Depends

from auth.dependencies import require_role


router = APIRouter(prefix="/customer", tags=["customer"])


@router.get("/ping")
async def customer_ping(current_user: dict = Depends(require_role(["CUSTOMER"]))):
    """Test endpoint - CUSTOMER only."""
    return {"ok": True, "role": current_user["role"]}
