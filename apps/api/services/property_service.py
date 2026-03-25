"""
Property service - business logic for property management.

Handles property CRUD operations and automatic status computation.
"""

from uuid import UUID
from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.property import Property, PropertyStatus
from models.property_assignment import PropertyAssignment
from schemas.domain import PropertyCreate, PropertyUpdate


def compute_property_status(has_florist: bool, has_pm: bool) -> PropertyStatus:
    """
    Compute property status based on assignments.
    
    Rules:
    - No florist + No PM -> CREATED
    - Florist + No PM -> PENDING_PM
    - No Florist + PM -> PENDING_FLORIST
    - Florist + PM -> ACTIVE
    
    Args:
        has_florist: Whether property has an active florist assignment
        has_pm: Whether property has a property manager assigned
        
    Returns:
        The computed PropertyStatus
    """
    if has_florist and has_pm:
        return PropertyStatus.ACTIVE
    elif has_florist:
        return PropertyStatus.PENDING_PM
    elif has_pm:
        return PropertyStatus.PENDING_FLORIST
    else:
        return PropertyStatus.CREATED


def _has_active_florist_assignment(db: Session, property_id: UUID) -> bool:
    """Check if property has an active florist assignment."""
    return db.query(PropertyAssignment).filter(
        PropertyAssignment.property_id == property_id,
        PropertyAssignment.active == True
    ).first() is not None


def _recompute_property_status(db: Session, prop: Property) -> None:
    """
    Recompute and update property status based on current assignments.
    
    Called after florist or PM assignment changes.
    """
    has_florist = _has_active_florist_assignment(db, prop.id)
    has_pm = prop.property_manager_id is not None
    prop.status = compute_property_status(has_florist, has_pm)


def create_property(db: Session, data: PropertyCreate) -> Property:
    """
    Create a new property in CREATED status.
    
    Properties are always created in CREATED status (no assignments yet).
    """
    prop = Property(
        name=data.name,
        address=data.address,
        delivery_cadence=data.delivery_cadence,
        status=PropertyStatus.CREATED  # Always CREATED on creation
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def get_properties(db: Session, include_archived: bool = False) -> List[Property]:
    """Get all properties, excluding ARCHIVED by default."""
    query = db.query(Property)
    if not include_archived:
        query = query.filter(Property.status != PropertyStatus.ARCHIVED)
    return query.all()


def get_property(db: Session, property_id: UUID) -> Optional[Property]:
    """Get a property by ID."""
    return db.query(Property).filter(Property.id == property_id).first()


def update_property(
    db: Session,
    property_id: UUID,
    data: PropertyUpdate,
    request_id: str
) -> Property:
    """
    Update a property.
    
    Note: Status is now computed automatically based on assignments.
    Manual status updates are no longer supported.
    """
    prop = get_property(db, property_id)
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Property not found",
                    "request_id": request_id
                }
            }
        )
    
    # Update fields if provided (status is computed, not manually set)
    if data.name is not None:
        prop.name = data.name
    if data.address is not None:
        prop.address = data.address
    if data.delivery_cadence is not None:
        prop.delivery_cadence = data.delivery_cadence
    
    db.commit()
    db.refresh(prop)
    return prop


def assign_property_manager(
    db: Session,
    property_id: UUID,
    user_id: UUID,
    request_id: str
) -> Property:
    """
    Assign a property manager to a property.
    
    Validates user has PROPERTY_MANAGER role and recomputes status.
    
    Args:
        db: Database session
        property_id: ID of property to update
        user_id: ID of user to assign as PM
        request_id: Request ID for error tracking
        
    Returns:
        Updated property with recomputed status
        
    Raises:
        HTTPException: If property not found or user is not a PM
    """
    from db.users import get_user_by_id
    from models.user import UserRole
    import asyncio
    
    prop = get_property(db, property_id)
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Property not found",
                    "request_id": request_id
                }
            }
        )
    
    # Get user and validate role
    # Note: Using asyncio.run since users are in async in-memory store
    user = asyncio.get_event_loop().run_until_complete(get_user_by_id(user_id))
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "User not found",
                    "request_id": request_id
                }
            }
        )
    
    if user.role != UserRole.PROPERTY_MANAGER:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_ROLE",
                    "message": "User must have PROPERTY_MANAGER role",
                    "request_id": request_id
                }
            }
        )
    
    # Assign PM and recompute status
    prop.property_manager_id = user_id
    _recompute_property_status(db, prop)
    
    db.commit()
    db.refresh(prop)
    return prop



async def get_enriched_properties(db: Session, include_archived: bool = False) -> List[dict]:
    """
    Get all properties with enriched data for admin table.
    
    Returns computed fields:
    - total_users: Count of users with this property_id
    - active_users: Count of users with ACTIVE subscription
    - florist_name: Name of assigned florist (from active assignment)
    - property_manager_email: Email of assigned PM
    
    Args:
        db: Database session
        include_archived: Include ARCHIVED properties (default: False)
        
    Returns:
        List of enriched property dictionaries
    """
    from db.users import get_all_users
    from models.user import SubscriptionStatus
    from models.florist import Florist
    
    # Get all properties
    properties = get_properties(db, include_archived=include_archived)
    
    # Get all users for counting
    all_users = await get_all_users()
    
    # Build enriched response
    enriched = []
    for prop in properties:
        # Count users for this property
        property_users = [u for u in all_users if u.property_id == prop.id]
        total_users = len(property_users)
        active_users = len([u for u in property_users if u.subscription_status == SubscriptionStatus.ACTIVE])
        
        # Get florist name from active assignment
        florist_name = None
        active_assignment = db.query(PropertyAssignment).filter(
            PropertyAssignment.property_id == prop.id,
            PropertyAssignment.active == True
        ).first()
        if active_assignment:
            florist = db.query(Florist).filter(Florist.id == active_assignment.florist_id).first()
            if florist:
                florist_name = florist.name
        
        # Get property manager email
        property_manager_email = None
        if prop.property_manager_id:
            from db.users import get_user_by_id
            pm_user = await get_user_by_id(prop.property_manager_id)
            if pm_user:
                property_manager_email = pm_user.email
        
        enriched.append({
            "id": prop.id,
            "name": prop.name,
            "address": prop.address,
            "status": prop.status,
            "delivery_cadence": prop.delivery_cadence,
            "total_users": total_users,
            "active_users": active_users,
            "florist_name": florist_name,
            "property_manager_email": property_manager_email,
            "created_at": prop.created_at,
            "updated_at": prop.updated_at,
        })
    
    return enriched


def archive_property(db: Session, property_id: UUID, request_id: str) -> Property:
    """
    Soft delete a property by setting status to ARCHIVED.
    
    Args:
        db: Database session
        property_id: ID of property to archive
        request_id: Request ID for error tracking
        
    Returns:
        Archived property
        
    Raises:
        HTTPException: If property not found
    """
    prop = get_property(db, property_id)
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Property not found",
                    "request_id": request_id
                }
            }
        )

    # 5.7: Prevent archiving if there are active subscriptions
    import asyncio
    from db.users import get_all_users
    from models.user import SubscriptionStatus as SubStatus

    all_users = asyncio.get_event_loop().run_until_complete(
        get_all_users()
    )
    active_subs = [
        u for u in all_users
        if u.property_id == property_id
        and getattr(u, "subscription_status", None) == SubStatus.ACTIVE
    ]
    if active_subs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "ACTIVE_SUBSCRIPTIONS",
                    "message": f"Cannot archive property with {len(active_subs)} active subscription(s). Pause them first.",
                    "request_id": request_id,
                }
            }
        )

    prop.status = PropertyStatus.ARCHIVED

    # Cascade: archive all future SCHEDULED deliveries for this property
    from models.delivery import Delivery, DeliveryStatus
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    db.query(Delivery).filter(
        Delivery.property_id == property_id,
        Delivery.status == DeliveryStatus.SCHEDULED,
        Delivery.scheduled_for > now,
        Delivery.archived_at.is_(None),
    ).update({"archived_at": now}, synchronize_session="fetch")

    db.commit()
    db.refresh(prop)
    return prop
