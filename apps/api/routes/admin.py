"""
Admin routes - ADMIN role only.

Provides endpoints for managing properties, florists, assignments, and users.
"""

from uuid import UUID, uuid4
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from schemas.domain import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    EnrichedPropertyResponse,
    AssignPMRequest,
    FloristCreate,
    FloristResponse,
    PropertyAssignmentCreate,
    PropertyAssignmentResponse,
    UserCreate,
    UserUpdate,
    EnrichedUserResponse,
)
from models.user import UserResponse, UserRole, SubscriptionStatus
from services import property_service, florist_service, assignment_service
from db.users import get_all_users, get_user_by_email, get_user_by_id, create_user, update_user
from auth.service import auth_service
from auth.api_key import generate_api_key, hash_api_key
from models.florist_connection import FloristConnection


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
async def admin_ping(current_user: dict = Depends(require_role(["ADMIN"]))):
    """Test endpoint - ADMIN only."""
    return {"ok": True, "role": current_user["role"]}


# =============================================================================
# Property Endpoints
# =============================================================================

@router.post("/properties", response_model=PropertyResponse, status_code=201)
async def create_property(
    data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a new property (ADMIN only).
    
    Properties are always created in CREATED status.
    """
    return property_service.create_property(db, data)


@router.get("/properties", response_model=List[EnrichedPropertyResponse])
async def list_properties(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    List all properties with enriched data (ADMIN only).
    
    Returns computed fields:
    - total_users: Count of users associated with property
    - active_users: Count of users with ACTIVE subscription
    - florist_name: Name of assigned florist
    - property_manager_email: Email of assigned PM
    
    Query params:
    - include_archived: Include ARCHIVED properties (default: false)
    """
    return await property_service.get_enriched_properties(db, include_archived=include_archived)


@router.patch("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Update a property (ADMIN only).
    
    Note: Status is now computed automatically based on assignments.
    """
    request_id = str(uuid4())
    return property_service.update_property(db, property_id, data, request_id)


@router.patch("/properties/{property_id}/assign-pm", response_model=EnrichedPropertyResponse)
async def assign_property_manager(
    property_id: UUID,
    data: AssignPMRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Assign a property manager to a property (ADMIN only).
    
    Validates user has PROPERTY_MANAGER role.
    Automatically recomputes property status.
    """
    request_id = str(uuid4())
    prop = property_service.assign_property_manager(db, property_id, data.user_id, request_id)
    
    # Return enriched response
    enriched = await property_service.get_enriched_properties(db)
    return next((p for p in enriched if p["id"] == prop.id), None)


@router.delete("/properties/{property_id}", response_model=PropertyResponse)
async def delete_property(
    property_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Soft delete a property by setting status to ARCHIVED (ADMIN only).
    
    The property is not removed from the database, only marked as archived.
    Use include_archived=true query param to see archived properties.
    """
    request_id = str(uuid4())
    return property_service.archive_property(db, property_id, request_id)


# =============================================================================
# Florist Endpoints
# =============================================================================

@router.post("/florists", response_model=FloristResponse, status_code=201)
async def create_florist(
    data: FloristCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a new florist (ADMIN only).
    
    Florists are always created in ONBOARDING status.
    """
    return florist_service.create_florist(db, data)


@router.get("/florists", response_model=List[FloristResponse])
async def list_florists(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    List all florists (ADMIN only).
    
    Query params:
    - include_archived: Include ARCHIVED florists (default: false)
    """
    return florist_service.get_florists(db, include_archived=include_archived)


@router.delete("/florists/{florist_id}", response_model=FloristResponse)
async def delete_florist(
    florist_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Soft delete a florist by setting status to ARCHIVED (ADMIN only).
    
    The florist is not removed from the database, only marked as archived.
    Use include_archived=true query param to see archived florists.
    """
    request_id = str(uuid4())
    return florist_service.archive_florist(db, florist_id, request_id)


@router.post("/florists/{florist_id}/api-key")
async def generate_florist_api_key(
    florist_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Generate a new API key for a florist (ADMIN only).

    Returns the raw key once — it cannot be retrieved again.
    If the florist already has a connection, the old key is replaced.
    The admin gives this key to the florist to paste into the Shopify app.
    """
    request_id = str(uuid4())
    florist = florist_service.get_florist(db, florist_id)
    if not florist:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Florist not found",
                    "request_id": request_id,
                }
            },
        )

    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)

    # Upsert: delete any existing connection for this florist (key rotation)
    existing = (
        db.query(FloristConnection)
        .filter(FloristConnection.florist_id == florist_id)
        .first()
    )
    if existing:
        existing.api_key_hash = key_hash
    else:
        # Create a placeholder connection — shop_domain will be set when the
        # florist actually connects from the Shopify app.  For now use a
        # placeholder so the key can be validated.
        db.add(FloristConnection(
            florist_id=florist_id,
            shop_domain=f"pending-{florist_id}",
            api_key_hash=key_hash,
        ))

    db.commit()

    return {
        "florist_id": str(florist_id),
        "api_key": raw_key,
        "message": "Save this key — it cannot be retrieved again.",
    }


# =============================================================================
# Assignment Endpoints
# =============================================================================

@router.post("/property-assignments", response_model=PropertyAssignmentResponse, status_code=201)
async def create_assignment(
    data: PropertyAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a property-florist assignment (ADMIN only).
    
    If the property already has an active assignment, it will be deactivated.
    """
    request_id = str(uuid4())
    return assignment_service.create_assignment(db, data, request_id)


@router.get("/property-assignments", response_model=List[PropertyAssignmentResponse])
async def list_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all property assignments (ADMIN only)."""
    return assignment_service.get_assignments(db)


# =============================================================================
# User Endpoints
# =============================================================================

@router.get("/users", response_model=List[EnrichedUserResponse])
async def list_users(
    role: str | None = None,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    List all users with enriched data (ADMIN only).
    
    Returns:
    - property_name: Resolved from property_id for PROPERTY_MANAGER users
    - subscription_status: Only for CUSTOMER users, null for others
    
    Query params:
    - role: Filter by role (e.g., ?role=PROPERTY_MANAGER)
    - include_archived: Include ARCHIVED users (default: false)
    """
    users = await get_all_users(include_archived=include_archived)
    if role:
        users = [u for u in users if u.role == role]
    
    # Build enriched responses
    enriched = []
    for user in users:
        # Resolve property name if user has property_id
        property_name = None
        if user.property_id:
            prop = property_service.get_property(db, user.property_id)
            if prop:
                property_name = prop.name
        
        # subscription_status is null for non-CUSTOMER users
        sub_status = user.subscription_status if user.role == UserRole.CUSTOMER else None
        
        enriched.append(EnrichedUserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            property_id=user.property_id,
            property_name=property_name,
            subscription_status=sub_status,
            created_at=user.created_at
        ))
    
    return enriched


@router.post("/users", response_model=EnrichedUserResponse, status_code=201)
async def create_user_endpoint(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a new user (ADMIN only).
    
    Validation rules:
    - property_id is only valid for PROPERTY_MANAGER role
    - property_id must reference a valid Property if provided
    - CUSTOMER users get subscription_status = CREATED
    - Non-CUSTOMER users get subscription_status = None
    
    Returns 409 Conflict if email already exists.
    Returns 400 Bad Request for invalid field combinations.
    """
    from datetime import datetime, timezone
    from models.user import User
    
    # Check for existing user
    existing = await get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    
    # Validate property_id is only for PROPERTY_MANAGER
    if data.property_id is not None and data.role != UserRole.PROPERTY_MANAGER:
        raise HTTPException(
            status_code=400,
            detail="property_id is only valid for PROPERTY_MANAGER role"
        )
    
    # Validate property_id references a valid property
    if data.property_id is not None:
        prop = property_service.get_property(db, data.property_id)
        if not prop:
            raise HTTPException(
                status_code=400,
                detail="property_id references a non-existent property"
            )
    
    # Set subscription_status based on role
    sub_status = SubscriptionStatus.CREATED if data.role == UserRole.CUSTOMER else None
    
    # Hash password and create user
    hashed_password = auth_service.hash_password(data.password)
    new_user = User(
        id=uuid4(),
        email=data.email,
        hashed_password=hashed_password,
        role=data.role,
        property_id=data.property_id,
        subscription_status=sub_status if sub_status else SubscriptionStatus.CREATED,
        created_at=datetime.now(timezone.utc)
    )
    
    await create_user(new_user)
    
    # If PM is assigned to a property, update the property's property_manager_id
    property_name = None
    if new_user.property_id and data.role == UserRole.PROPERTY_MANAGER:
        prop = property_service.get_property(db, new_user.property_id)
        if prop:
            property_name = prop.name
            prop.property_manager_id = new_user.id
            property_service._recompute_property_status(db, prop)
            db.commit()
    
    return EnrichedUserResponse(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        property_id=new_user.property_id,
        property_name=property_name,
        subscription_status=sub_status,
        created_at=new_user.created_at
    )



@router.patch("/users/{user_id}", response_model=EnrichedUserResponse)
async def update_user_endpoint(
    user_id: UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Update a user (ADMIN only).
    
    Validation rules:
    - subscription_status can only be updated for CUSTOMER users
    - property_id can only be updated for PROPERTY_MANAGER users
    - Role changes trigger field sanitization:
      - If new role != PROPERTY_MANAGER, property_id is cleared
      - If new role != CUSTOMER, subscription_status is cleared
      - If new role == CUSTOMER, subscription_status is set to CREATED
    
    Returns 404 if user not found.
    Returns 400 for invalid field combinations.
    """
    # Get existing user
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updates = {}
    new_role = data.role if data.role is not None else user.role
    
    # Handle role change with field sanitization
    if data.role is not None and data.role != user.role:
        updates["role"] = data.role
        
        # Sanitize fields based on new role
        if data.role != UserRole.PROPERTY_MANAGER:
            updates["property_id"] = None
        if data.role != UserRole.CUSTOMER:
            updates["subscription_status"] = SubscriptionStatus.CREATED  # Store as CREATED but return as None
        elif data.role == UserRole.CUSTOMER:
            updates["subscription_status"] = SubscriptionStatus.CREATED
    
    # Validate and handle subscription_status update
    if data.subscription_status is not None:
        if new_role != UserRole.CUSTOMER:
            raise HTTPException(
                status_code=400,
                detail="subscription_status can only be updated for CUSTOMER users"
            )
        updates["subscription_status"] = data.subscription_status
    
    # Validate and handle property_id update
    if data.property_id is not None:
        if new_role != UserRole.PROPERTY_MANAGER:
            raise HTTPException(
                status_code=400,
                detail="property_id can only be updated for PROPERTY_MANAGER users"
            )
        # Validate property exists
        prop = property_service.get_property(db, data.property_id)
        if not prop:
            raise HTTPException(
                status_code=400,
                detail="property_id references a non-existent property"
            )
        
        # Track old property_id for status recomputation
        old_property_id = user.property_id
        updates["property_id"] = data.property_id
        
        # Recompute property status for old property if PM is being reassigned
        if old_property_id and old_property_id != data.property_id:
            old_prop = property_service.get_property(db, old_property_id)
            if old_prop:
                old_prop.property_manager_id = None
                property_service._recompute_property_status(db, old_prop)
        
        # Update new property's PM and recompute status
        prop.property_manager_id = user_id
        property_service._recompute_property_status(db, prop)
        db.commit()
    
    # Handle clearing property_id (removing PM from property)
    if "property_id" in updates and updates["property_id"] is None and user.property_id:
        old_prop = property_service.get_property(db, user.property_id)
        if old_prop and old_prop.property_manager_id == user_id:
            old_prop.property_manager_id = None
            property_service._recompute_property_status(db, old_prop)
            db.commit()
    
    # Apply updates
    if updates:
        updated_user = await update_user(user_id, updates)
    else:
        updated_user = user
    
    # Resolve property name for response
    property_name = None
    if updated_user.property_id:
        prop = property_service.get_property(db, updated_user.property_id)
        if prop:
            property_name = prop.name
    
    # subscription_status is null for non-CUSTOMER users in response
    sub_status = updated_user.subscription_status if updated_user.role == UserRole.CUSTOMER else None
    
    return EnrichedUserResponse(
        id=updated_user.id,
        email=updated_user.email,
        role=updated_user.role,
        property_id=updated_user.property_id,
        property_name=property_name,
        subscription_status=sub_status,
        created_at=updated_user.created_at
    )


# =============================================================================
# Delivery Generation (Manual Trigger)
# =============================================================================

@router.post("/generate-deliveries")
async def trigger_delivery_generation(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Manually trigger delivery generation for all eligible properties (ADMIN only).

    Same logic as the daily Lambda — finds properties within the lead-time
    window and creates SCHEDULED deliveries for active subscribers.
    """
    from services.delivery_generation import run_delivery_generation

    results = await run_delivery_generation(db)

    return {
        "properties_processed": len(results),
        "total_deliveries_created": sum(r.get("created", 0) for r in results),
        "total_skipped": sum(r.get("skipped", 0) for r in results),
        "errors": [r for r in results if "error" in r],
        "details": results,
    }


@router.delete("/users/{user_id}", response_model=EnrichedUserResponse)
async def delete_user_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Soft delete a user by setting status to ARCHIVED (ADMIN only).
    
    The user is not removed from the database, only marked as archived.
    Use include_archived=true query param to see archived users.
    
    Returns 404 if user not found.
    """
    from db.users import archive_user
    
    archived_user = await archive_user(user_id)
    if not archived_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Resolve property name for response
    property_name = None
    if archived_user.property_id:
        prop = property_service.get_property(db, archived_user.property_id)
        if prop:
            property_name = prop.name
    
    # subscription_status is null for non-CUSTOMER users in response
    sub_status = archived_user.subscription_status if archived_user.role == UserRole.CUSTOMER else None
    
    return EnrichedUserResponse(
        id=archived_user.id,
        email=archived_user.email,
        role=archived_user.role,
        property_id=archived_user.property_id,
        property_name=property_name,
        subscription_status=sub_status,
        created_at=archived_user.created_at
    )
