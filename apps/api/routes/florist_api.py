"""
Shopify-facing florist API endpoints.

These endpoints are called by the Shopify embedded app via X-API-Key auth.
Prefix: /api/florists

Endpoints:
  POST /validate-key          — Validate API key, return florist info
  GET  /connection             — Get connection status by shop domain
  POST /disconnect             — Notify disconnection
  POST /products/sync          — Sync products from Shopify
  GET  /products               — Get florist's synced products
  GET  /tier-mappings           — Get tier mappings
  POST /tier-mappings           — Set a tier mapping
  DELETE /tier-mappings/{tier}  — Remove a tier mapping
  POST /status/ready            — Mark florist as READY
  GET  /dashboard               — Get florist dashboard data
  POST /products/update         — Webhook: product updated
  POST /products/delete         — Webhook: product deleted
"""

import logging
from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth.api_key import require_api_key, hash_api_key
from db.database import get_db
from models.florist import Florist, FloristStatus
from models.florist_connection import FloristConnection
from models.florist_product import FloristProduct
from models.florist_tier_mapping import FloristTierMapping
from models.delivery import Delivery, DeliveryStatus
from models.property_assignment import PropertyAssignment
from schemas.shopify import (
    ValidateKeyResponse,
    ValidateKeyRequest,
    ConnectionStatusResponse,
    DisconnectRequest,
    SyncProductsRequest,
    SyncResult,
    BloomProductSchema,
    TierMappingSchema,
    SetTierMappingRequest,
    ProductUpdateRequest,
    ProductDeleteRequest,
    FloristDashboardResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/florists", tags=["florist-api"])


# ============================================================================
# Helpers
# ============================================================================

def _tier_mapping_to_schema(m: FloristTierMapping) -> TierMappingSchema:
    return TierMappingSchema(
        tier=m.tier,
        shopify_product_id=m.shopify_product_id,
        product_title=m.product_title,
        product_price=m.product_price,
        mapped_at=m.mapped_at.isoformat() if m.mapped_at else "",
    )


def _error(code: str, message: str, status: int = 400) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={"error": {"code": code, "message": message, "request_id": str(uuid4())}},
    )


# ============================================================================
# 1. POST /validate-key
# ============================================================================

@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_api_key(
    body: ValidateKeyRequest = None,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """
    Validate the API key and return florist info.
    
    Optionally accepts a shop_domain in the body to register the connection
    to a specific Shopify store.
    """
    # If shop_domain provided and connection has a placeholder, update it
    if body and body.shop_domain and conn.shop_domain.startswith("pending-"):
        # Check no other connection already uses this shop domain
        existing = (
            db.query(FloristConnection)
            .filter(
                FloristConnection.shop_domain == body.shop_domain,
                FloristConnection.id != conn.id,
            )
            .first()
        )
        if not existing:
            conn.shop_domain = body.shop_domain
            db.commit()

    florist = db.query(Florist).filter(Florist.id == conn.florist_id).first()
    return ValidateKeyResponse(
        valid=True,
        florist_id=str(conn.florist_id),
        florist_name=florist.name if florist else None,
    )


# ============================================================================
# 2. GET /connection?shop=<domain>
# ============================================================================

@router.get("/connection", response_model=ConnectionStatusResponse)
async def get_connection_status(
    shop: str = Query(..., description="Shopify shop domain"),
    db: Session = Depends(get_db),
):
    """Get connection status for a shop domain. Returns 404 if not connected."""
    conn = db.query(FloristConnection).filter(FloristConnection.shop_domain == shop).first()
    if not conn:
        raise _error("NOT_FOUND", "No connection found for this shop", 404)
    return ConnectionStatusResponse(
        shop_domain=conn.shop_domain,
        florist_id=str(conn.florist_id),
        connected_at=conn.connected_at.isoformat() if conn.connected_at else "",
    )


# ============================================================================
# 3. POST /disconnect
# ============================================================================

@router.post("/disconnect")
async def disconnect(
    data: DisconnectRequest,
    db: Session = Depends(get_db),
):
    """Remove a florist connection by shop domain.

    When a florist disconnects their Shopify store mid-cycle, any future
    SCHEDULED deliveries assigned to that florist are flagged as MISSED
    so they don't silently disappear.
    """
    conn = (
        db.query(FloristConnection)
        .filter(FloristConnection.shop_domain == data.shop_domain)
        .first()
    )
    if conn:
        florist_id = conn.florist_id

        # Flag future SCHEDULED deliveries for properties assigned to this florist
        now = datetime.now(timezone.utc)
        assigned_property_ids = [
            a.property_id
            for a in db.query(PropertyAssignment).filter(
                PropertyAssignment.florist_id == florist_id,
                PropertyAssignment.active == True,
            ).all()
        ]
        if assigned_property_ids:
            affected = (
                db.query(Delivery)
                .filter(
                    Delivery.property_id.in_(assigned_property_ids),
                    Delivery.status == DeliveryStatus.SCHEDULED,
                    Delivery.scheduled_for > now,
                    Delivery.archived_at.is_(None),
                )
                .update(
                    {"status": DeliveryStatus.MISSED, "updated_at": now},
                    synchronize_session="fetch",
                )
            )
            logger.warning(
                f"Florist {florist_id} disconnected — flagged {affected} future deliveries as MISSED"
            )

        db.delete(conn)
        db.commit()
    return {"success": True}


# ============================================================================
# 4. POST /products/sync
# ============================================================================

@router.post("/products/sync", response_model=SyncResult)
async def sync_products(
    data: SyncProductsRequest,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """
    Replace all synced products for this connection with the provided list.
    Full-replace strategy: delete existing, insert new.
    """
    synced = 0
    failed = 0
    errors: list[str] = []

    # Delete existing products for this connection
    db.query(FloristProduct).filter(FloristProduct.connection_id == conn.id).delete()

    now = datetime.now(timezone.utc)
    for p in data.products:
        try:
            product = FloristProduct(
                connection_id=conn.id,
                shopify_product_id=p.shopify_product_id,
                shopify_variant_id=p.shopify_variant_id,
                title=p.title,
                price=p.price,
                image_url=p.image_url,
                inventory_quantity=p.inventory_quantity,
                status=p.status,
                synced_at=now,
            )
            db.add(product)
            synced += 1
        except Exception as e:
            failed += 1
            errors.append(f"Failed to sync {p.shopify_product_id}: {str(e)}")

    # Update connection metadata
    conn.last_sync_at = now
    conn.synced_count = synced

    db.commit()

    return SyncResult(success=failed == 0, synced=synced, failed=failed, errors=errors)


# ============================================================================
# 5. GET /products
# ============================================================================

@router.get("/products", response_model=List[BloomProductSchema])
async def get_products(
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Get all synced products for this florist."""
    products = (
        db.query(FloristProduct)
        .filter(FloristProduct.connection_id == conn.id)
        .all()
    )
    return [
        BloomProductSchema(
            shopify_product_id=p.shopify_product_id,
            shopify_variant_id=p.shopify_variant_id,
            title=p.title,
            price=p.price,
            image_url=p.image_url,
            inventory_quantity=p.inventory_quantity,
            status=p.status,
        )
        for p in products
    ]


# ============================================================================
# 6. GET /tier-mappings
# ============================================================================

@router.get("/tier-mappings", response_model=List[TierMappingSchema])
async def get_tier_mappings(
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Get all tier mappings for this florist."""
    mappings = (
        db.query(FloristTierMapping)
        .filter(FloristTierMapping.connection_id == conn.id)
        .all()
    )
    return [_tier_mapping_to_schema(m) for m in mappings]


# ============================================================================
# 7. POST /tier-mappings
# ============================================================================

@router.post("/tier-mappings", response_model=TierMappingSchema)
async def set_tier_mapping(
    data: SetTierMappingRequest,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Set or update a tier mapping. Upserts by (connection_id, tier)."""
    # Look up the product to get title and price
    product = (
        db.query(FloristProduct)
        .filter(
            FloristProduct.connection_id == conn.id,
            FloristProduct.shopify_product_id == data.shopify_product_id,
        )
        .first()
    )
    if not product:
        raise _error("PRODUCT_NOT_FOUND", "Product not found in synced catalog", 404)

    # Upsert: find existing or create
    existing = (
        db.query(FloristTierMapping)
        .filter(
            FloristTierMapping.connection_id == conn.id,
            FloristTierMapping.tier == data.tier,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        existing.shopify_product_id = data.shopify_product_id
        existing.product_title = product.title
        existing.product_price = product.price
        existing.mapped_at = now
        mapping = existing
    else:
        mapping = FloristTierMapping(
            connection_id=conn.id,
            tier=data.tier,
            shopify_product_id=data.shopify_product_id,
            product_title=product.title,
            product_price=product.price,
            mapped_at=now,
        )
        db.add(mapping)

    db.commit()
    db.refresh(mapping)
    return _tier_mapping_to_schema(mapping)


# ============================================================================
# 8. DELETE /tier-mappings/{tier}
# ============================================================================

@router.delete("/tier-mappings/{tier}")
async def remove_tier_mapping(
    tier: str,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Remove a tier mapping."""
    if tier not in ("ESSENTIAL", "SIGNATURE", "STATEMENT"):
        raise _error("INVALID_TIER", f"Invalid tier: {tier}")

    deleted = (
        db.query(FloristTierMapping)
        .filter(
            FloristTierMapping.connection_id == conn.id,
            FloristTierMapping.tier == tier,
        )
        .delete()
    )
    db.commit()
    return {"success": True}


# ============================================================================
# 9. POST /status/ready
# ============================================================================

@router.post("/status/ready")
async def set_florist_ready(
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Mark the florist as READY for deliveries."""
    florist = db.query(Florist).filter(Florist.id == conn.florist_id).first()
    if not florist:
        raise _error("FLORIST_NOT_FOUND", "Florist not found", 404)

    florist.status = FloristStatus.READY
    db.commit()
    return {"success": True}


# ============================================================================
# 10. GET /dashboard
# ============================================================================

@router.get("/dashboard", response_model=FloristDashboardResponse)
async def get_dashboard(
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Get florist dashboard data for the Shopify app."""
    florist = db.query(Florist).filter(Florist.id == conn.florist_id).first()
    if not florist:
        raise _error("FLORIST_NOT_FOUND", "Florist not found", 404)

    # Synced product count
    product_count = (
        db.query(FloristProduct)
        .filter(FloristProduct.connection_id == conn.id)
        .count()
    )

    # Tier mappings
    mappings = (
        db.query(FloristTierMapping)
        .filter(FloristTierMapping.connection_id == conn.id)
        .all()
    )

    # Pending deliveries across assigned properties
    assigned_property_ids = [
        a.property_id
        for a in db.query(PropertyAssignment)
        .filter(
            PropertyAssignment.florist_id == conn.florist_id,
            PropertyAssignment.active == True,
        )
        .all()
    ]

    pending_count = 0
    if assigned_property_ids:
        pending_count = (
            db.query(Delivery)
            .filter(
                Delivery.property_id.in_(assigned_property_ids),
                Delivery.status == DeliveryStatus.SCHEDULED,
                Delivery.archived_at == None,
            )
            .count()
        )

    return FloristDashboardResponse(
        florist_id=str(florist.id),
        florist_name=florist.name,
        florist_status=florist.status.value,
        synced_product_count=product_count,
        mapped_tiers=[_tier_mapping_to_schema(m) for m in mappings],
        pending_delivery_count=pending_count,
        last_sync_at=conn.last_sync_at.isoformat() if conn.last_sync_at else None,
    )


# ============================================================================
# 11. POST /products/update  (webhook forwarding)
# ============================================================================

@router.post("/products/update")
async def notify_product_update(
    data: ProductUpdateRequest,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Handle a Shopify product update webhook forwarded from the Shopify app."""
    p = data.product

    existing = (
        db.query(FloristProduct)
        .filter(
            FloristProduct.connection_id == conn.id,
            FloristProduct.shopify_product_id == p.shopify_product_id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        existing.shopify_variant_id = p.shopify_variant_id
        existing.title = p.title
        existing.price = p.price
        existing.image_url = p.image_url
        existing.inventory_quantity = p.inventory_quantity
        existing.status = p.status
        existing.synced_at = now
    else:
        db.add(FloristProduct(
            connection_id=conn.id,
            shopify_product_id=p.shopify_product_id,
            shopify_variant_id=p.shopify_variant_id,
            title=p.title,
            price=p.price,
            image_url=p.image_url,
            inventory_quantity=p.inventory_quantity,
            status=p.status,
            synced_at=now,
        ))

    # Update tier mapping title/price if this product is mapped
    db.query(FloristTierMapping).filter(
        FloristTierMapping.connection_id == conn.id,
        FloristTierMapping.shopify_product_id == p.shopify_product_id,
    ).update({"product_title": p.title, "product_price": p.price})

    db.commit()
    return {"success": True}


# ============================================================================
# 12. POST /products/delete  (webhook forwarding)
# ============================================================================

@router.post("/products/delete")
async def notify_product_deletion(
    data: ProductDeleteRequest,
    conn: FloristConnection = Depends(require_api_key),
    db: Session = Depends(get_db),
):
    """Handle a Shopify product deletion webhook forwarded from the Shopify app."""
    # Remove the product
    db.query(FloristProduct).filter(
        FloristProduct.connection_id == conn.id,
        FloristProduct.shopify_product_id == data.shopify_product_id,
    ).delete()

    # Remove any tier mapping that referenced this product
    db.query(FloristTierMapping).filter(
        FloristTierMapping.connection_id == conn.id,
        FloristTierMapping.shopify_product_id == data.shopify_product_id,
    ).delete()

    # Update synced count
    conn.synced_count = (
        db.query(FloristProduct)
        .filter(FloristProduct.connection_id == conn.id)
        .count()
    )

    db.commit()
    return {"success": True}
