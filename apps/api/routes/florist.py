"""
Florist routes - FLORIST role only.

Provides endpoints for florist dashboard functionality:
- GET /florist/me - Get florist profile with assigned properties
- GET /florist/deliveries - Get upcoming deliveries for assigned properties
- PATCH /florist/deliveries/{delivery_id} - Update delivery status
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from db.users import get_user_by_id
from models.florist import Florist, FloristStatus
from models.property_assignment import PropertyAssignment
from models.property import Property
from models.delivery import Delivery, DeliveryStatus
from schemas.domain import (
    FloristMeResponse,
    AssignedPropertyResponse,
    FloristDeliveryResponse,
    FloristDeliveriesListResponse,
    UpdateDeliveryStatusRequest,
)


router = APIRouter(prefix="/florist", tags=["florist"])


@router.get("/ping")
async def florist_ping(current_user: dict = Depends(require_role(["FLORIST"]))):
    """Test endpoint - FLORIST only."""
    return {"ok": True, "role": current_user["role"]}


@router.get("/me", response_model=FloristMeResponse)
async def get_florist_me(
    current_user: dict = Depends(require_role(["FLORIST"])),
    db: Session = Depends(get_db)
):
    """
    Get florist profile with assigned properties.
    
    Returns florist_id, florist_name, florist_status, and list of assigned properties.
    Requires FLORIST role authentication.
    """
    request_id = str(uuid4())
    
    # Get user to find florist_id
    user = await get_user_by_id(UUID(current_user["id"]))
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found",
                    "request_id": request_id
                }
            }
        )
    
    # Get florist record
    florist_id = getattr(user, 'florist_id', None)
    if not florist_id:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "FLORIST_NOT_LINKED",
                    "message": "User is not linked to a florist account",
                    "request_id": request_id
                }
            }
        )
    
    florist = db.query(Florist).filter(Florist.id == florist_id).first()
    if not florist:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "FLORIST_NOT_FOUND",
                    "message": "Florist account not found",
                    "request_id": request_id
                }
            }
        )
    
    # Get assigned properties
    assignments = db.query(PropertyAssignment).filter(
        PropertyAssignment.florist_id == florist_id,
        PropertyAssignment.active == True
    ).all()
    
    assigned_properties = []
    for assignment in assignments:
        prop = db.query(Property).filter(Property.id == assignment.property_id).first()
        if prop:
            assigned_properties.append(AssignedPropertyResponse(
                property_id=prop.id,
                property_name=prop.name,
                property_address=prop.address
            ))
    
    return FloristMeResponse(
        florist_id=florist.id,
        florist_name=florist.name,
        florist_status=florist.status,
        assigned_properties=assigned_properties
    )


@router.get("/deliveries", response_model=FloristDeliveriesListResponse)
async def get_florist_deliveries(
    current_user: dict = Depends(require_role(["FLORIST"])),
    db: Session = Depends(get_db)
):
    """
    Get upcoming deliveries for florist's assigned properties.
    
    Returns SCHEDULED deliveries ordered by scheduled_for date ascending.
    Includes customer email, property details, and subscription plan.
    Requires FLORIST role authentication.
    """
    request_id = str(uuid4())
    
    # Get user to find florist_id
    user = await get_user_by_id(UUID(current_user["id"]))
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found",
                    "request_id": request_id
                }
            }
        )
    
    florist_id = getattr(user, 'florist_id', None)
    if not florist_id:
        # Return empty list if user not linked to florist
        return FloristDeliveriesListResponse(deliveries=[])
    
    # Get assigned property IDs
    assignments = db.query(PropertyAssignment).filter(
        PropertyAssignment.florist_id == florist_id,
        PropertyAssignment.active == True
    ).all()
    
    assigned_property_ids = [a.property_id for a in assignments]
    
    if not assigned_property_ids:
        return FloristDeliveriesListResponse(deliveries=[])
    
    # Get SCHEDULED deliveries for assigned properties
    deliveries = db.query(Delivery).filter(
        Delivery.property_id.in_(assigned_property_ids),
        Delivery.status == DeliveryStatus.SCHEDULED,
        Delivery.archived_at == None
    ).order_by(Delivery.scheduled_for.asc()).all()
    
    # Build response with enriched data
    delivery_responses = []
    for delivery in deliveries:
        # Get property details
        prop = db.query(Property).filter(Property.id == delivery.property_id).first()
        
        # Get customer email
        customer = await get_user_by_id(delivery.user_id)
        customer_email = customer.email if customer else "unknown@example.com"
        
        delivery_responses.append(FloristDeliveryResponse(
            id=delivery.id,
            customer_email=customer_email,
            property_id=delivery.property_id,
            property_name=prop.name if prop else "Unknown Property",
            property_address=prop.address if prop else "",
            subscription_plan=delivery.subscription_plan,
            status=delivery.status,
            scheduled_for=delivery.scheduled_for
        ))
    
    return FloristDeliveriesListResponse(deliveries=delivery_responses)


@router.patch("/deliveries/{delivery_id}", response_model=FloristDeliveryResponse)
async def update_delivery_status(
    delivery_id: UUID,
    data: UpdateDeliveryStatusRequest,
    current_user: dict = Depends(require_role(["FLORIST"])),
    db: Session = Depends(get_db)
):
    """
    Update delivery status (DELIVERED or MISSED).
    
    Validates:
    - Florist has active assignment to delivery's property
    - Current delivery status is SCHEDULED
    
    Sets delivered_at timestamp when status is DELIVERED.
    Requires FLORIST role authentication.
    """
    request_id = str(uuid4())
    
    # Get user to find florist_id
    user = await get_user_by_id(UUID(current_user["id"]))
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found",
                    "request_id": request_id
                }
            }
        )
    
    florist_id = getattr(user, 'florist_id', None)
    if not florist_id:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "User is not linked to a florist account",
                    "request_id": request_id
                }
            }
        )
    
    # Get delivery
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Delivery not found",
                    "request_id": request_id
                }
            }
        )
    
    # Verify florist has assignment to delivery's property
    assignment = db.query(PropertyAssignment).filter(
        PropertyAssignment.florist_id == florist_id,
        PropertyAssignment.property_id == delivery.property_id,
        PropertyAssignment.active == True
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not assigned to this property",
                    "request_id": request_id
                }
            }
        )
    
    # Validate current status is SCHEDULED
    if delivery.status != DeliveryStatus.SCHEDULED:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_STATE",
                    "message": f"Cannot update delivery with status {delivery.status.value}. Only SCHEDULED deliveries can be updated.",
                    "request_id": request_id
                }
            }
        )
    
    # Update status
    delivery.status = DeliveryStatus(data.status)
    delivery.updated_at = datetime.now(timezone.utc)
    
    # Set delivered_at for DELIVERED status
    if data.status == "DELIVERED":
        delivery.delivered_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(delivery)
    
    # Get property details for response
    prop = db.query(Property).filter(Property.id == delivery.property_id).first()
    
    # Get customer email
    customer = await get_user_by_id(delivery.user_id)
    customer_email = customer.email if customer else "unknown@example.com"
    
    return FloristDeliveryResponse(
        id=delivery.id,
        customer_email=customer_email,
        property_id=delivery.property_id,
        property_name=prop.name if prop else "Unknown Property",
        property_address=prop.address if prop else "",
        subscription_plan=delivery.subscription_plan,
        status=delivery.status,
        scheduled_for=delivery.scheduled_for
    )
