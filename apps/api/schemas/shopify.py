"""
Pydantic schemas for the Shopify-facing florist API endpoints.

These match the types expected by the Shopify app's bloom-api.server.ts client.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared types
# ---------------------------------------------------------------------------

class BloomProductSchema(BaseModel):
    """A product synced from Shopify."""
    shopify_product_id: str
    shopify_variant_id: str
    title: str
    price: str
    image_url: Optional[str] = None
    inventory_quantity: int = 0
    status: str = "active"


class TierMappingSchema(BaseModel):
    """A tier-to-product mapping."""
    tier: str  # ESSENTIAL | SIGNATURE | STATEMENT
    shopify_product_id: str
    product_title: str
    product_price: str
    mapped_at: str  # ISO datetime string


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

class ValidateKeyResponse(BaseModel):
    valid: bool
    florist_id: Optional[str] = None
    florist_name: Optional[str] = None


class ValidateKeyRequest(BaseModel):
    """Optional body for validate-key to register the shop domain."""
    shop_domain: Optional[str] = None


class ConnectionStatusResponse(BaseModel):
    shop_domain: str
    florist_id: Optional[str] = None
    connected_at: str


class DisconnectRequest(BaseModel):
    shop_domain: str


# ---------------------------------------------------------------------------
# Product sync
# ---------------------------------------------------------------------------

class SyncProductsRequest(BaseModel):
    shop_domain: str
    products: List[BloomProductSchema]


class SyncResult(BaseModel):
    success: bool
    synced: int
    failed: int
    errors: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Tier mapping
# ---------------------------------------------------------------------------

class SetTierMappingRequest(BaseModel):
    tier: str = Field(..., pattern="^(ESSENTIAL|SIGNATURE|STATEMENT)$")
    shopify_product_id: str


# ---------------------------------------------------------------------------
# Webhook forwarding
# ---------------------------------------------------------------------------

class ProductUpdateRequest(BaseModel):
    shop_domain: str
    product: BloomProductSchema


class ProductDeleteRequest(BaseModel):
    shop_domain: str
    shopify_product_id: str


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class FloristDashboardResponse(BaseModel):
    florist_id: str
    florist_name: str
    florist_status: str
    synced_product_count: int
    mapped_tiers: List[TierMappingSchema]
    pending_delivery_count: int
    last_sync_at: Optional[str] = None
