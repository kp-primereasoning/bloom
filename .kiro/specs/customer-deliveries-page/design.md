# Design Document: Customer Deliveries Page

## Overview

This document describes the technical design for the Customer Deliveries Page feature. The page provides customers with a modern, card-first interface to view their upcoming and past deliveries at `/customer/deliveries`. The implementation spans backend (data model, API, seed data), shared types, and frontend (page component with cards and tables).

## Architecture

The feature follows the existing Bloom architecture patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              DeliveriesPage.tsx                          │   │
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │ Header   │ │ Next Delivery│ │ History  │ │Support │  │   │
│  │  │ Card     │ │ Card + Table │ │ Card+Tbl │ │ Card   │  │   │
│  │  └──────────┘ └──────────────┘ └──────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                    api.getMyDeliveries()                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                        Backend (FastAPI)                        │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                  GET /me/deliveries                        │ │
│  │                  (CUSTOMER role only)                      │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                  Delivery Model (ORM)                      │ │
│  │  - id, user_id, property_id, subscription_plan             │ │
│  │  - status, scheduled_for, delivered_at                     │ │
│  │  - created_at, updated_at, archived_at                     │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     PostgreSQL (RDS)                            │
│                     deliveries table                            │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### 1. Delivery Model (`apps/api/models/delivery.py`)

```python
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

class SubscriptionPlan(str, Enum):
    ESSENTIAL = "ESSENTIAL"
    SIGNATURE = "SIGNATURE"
    STATEMENT = "STATEMENT"

class DeliveryStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    DELIVERED = "DELIVERED"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"

class Delivery(Base):
    __tablename__ = "deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # FK to users (in-memory)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), nullable=False)
    status = Column(SQLEnum(DeliveryStatus), nullable=False, default=DeliveryStatus.SCHEDULED)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    archived_at = Column(DateTime(timezone=True), nullable=True)
```

#### 2. Delivery Schemas (`apps/api/schemas/domain.py` additions)

```python
class DeliveryResponse(BaseModel):
    id: UUID
    user_id: UUID
    property_id: UUID
    subscription_plan: SubscriptionPlan
    status: DeliveryStatus
    scheduled_for: datetime
    delivered_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = {"from_attributes": True}

class MeDeliveriesResponse(BaseModel):
    next_delivery: Optional[DeliveryResponse]
    history: list[DeliveryResponse]
```

#### 3. Me Deliveries Endpoint (`apps/api/routes/me.py` addition)

```python
@router.get("/deliveries", response_model=MeDeliveriesResponse)
async def get_my_deliveries(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Get current customer's deliveries.
    Returns next scheduled delivery and history (up to 20, most recent first).
    Excludes archived deliveries.
    """
    user_id = UUID(current_user["id"])
    now = datetime.now(timezone.utc)
    
    # Get next scheduled delivery (future, not archived)
    next_delivery = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.scheduled_for > now,
        Delivery.archived_at.is_(None)
    ).order_by(Delivery.scheduled_for.asc()).first()
    
    # Get history (past deliveries, not archived, limit 20)
    history = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.scheduled_for <= now,
        Delivery.archived_at.is_(None)
    ).order_by(Delivery.scheduled_for.desc()).limit(20).all()
    
    return MeDeliveriesResponse(
        next_delivery=next_delivery,
        history=history
    )
```

### Shared Types (`packages/shared/src/types/domain.ts` additions)

```typescript
// Subscription plan tiers
export const SubscriptionPlan = {
  ESSENTIAL: 'ESSENTIAL',
  SIGNATURE: 'SIGNATURE',
  STATEMENT: 'STATEMENT',
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// Delivery status lifecycle
export const DeliveryStatus = {
  SCHEDULED: 'SCHEDULED',
  DELIVERED: 'DELIVERED',
  SKIPPED: 'SKIPPED',
  MISSED: 'MISSED',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

// Delivery entity
export interface Delivery {
  id: string;
  user_id: string;
  property_id: string;
  subscription_plan: SubscriptionPlan;
  status: DeliveryStatus;
  scheduled_for: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// Response from GET /me/deliveries
export interface MeDeliveriesResponse {
  next_delivery: Delivery | null;
  history: Delivery[];
}
```

### Frontend Components

#### 1. API Client Method (`apps/web/src/lib/api.ts` addition)

```typescript
export async function getMyDeliveries(): Promise<MeDeliveriesResponse> {
  return apiRequest<MeDeliveriesResponse>('/me/deliveries');
}
```

#### 2. DeliveriesPage Component (`apps/web/src/pages/customer/DeliveriesPage.tsx`)

```typescript
// Component structure
export function DeliveriesPage() {
  // State: userData (from /auth/me), deliveries (from /me/deliveries)
  // Loading states, error states
  
  return (
    <div className="space-y-6">
      <HeaderCard userData={userData} />
      <NextDeliveryCard 
        delivery={deliveries?.next_delivery} 
        userData={userData} 
      />
      <DeliveryHistoryCard history={deliveries?.history || []} />
      <SupportCard />
    </div>
  );
}
```

## Data Models

### Delivery Table Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | NOT NULL | Reference to user (in-memory store) |
| property_id | UUID | FK properties.id, NOT NULL | Reference to property |
| subscription_plan | ENUM | NOT NULL | ESSENTIAL, SIGNATURE, STATEMENT |
| status | ENUM | NOT NULL, DEFAULT SCHEDULED | SCHEDULED, DELIVERED, SKIPPED, MISSED |
| scheduled_for | TIMESTAMPTZ | NOT NULL | Scheduled delivery date/time |
| delivered_at | TIMESTAMPTZ | NULL | Actual delivery timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Record creation time |
| updated_at | TIMESTAMPTZ | NULL | Last update time |
| archived_at | TIMESTAMPTZ | NULL | Soft delete timestamp |

### Seed Data Strategy

For development, seed deliveries for CUSTOMER users:
- Users with ACTIVE subscription: 1 future SCHEDULED delivery + 3-5 past deliveries
- Users with PAUSED subscription: 2-3 past deliveries (no future)
- Users with CREATED subscription: No deliveries

Past deliveries have varied statuses: DELIVERED (70%), SKIPPED (20%), MISSED (10%)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CUSTOMER-only access

*For any* API request to GET /me/deliveries, if the authenticated user's role is not CUSTOMER, the API shall return a 403 Forbidden error in Error_Envelope format.

**Validates: Requirements 2.4**

### Property 2: Archived delivery exclusion

*For any* response from GET /me/deliveries, neither next_delivery nor any item in history shall have a non-null archived_at value.

**Validates: Requirements 2.3**

### Property 3: History ordering

*For any* response from GET /me/deliveries where history contains more than one delivery, the deliveries shall be ordered by scheduled_for descending (most recent first).

**Validates: Requirements 2.2**

### Property 4: Next delivery is future

*For any* response from GET /me/deliveries where next_delivery is not null, the scheduled_for timestamp shall be greater than the current time.

**Validates: Requirements 2.1**

### Property 5: History limit

*For any* response from GET /me/deliveries, the history array shall contain at most 20 deliveries.

**Validates: Requirements 2.2**

### Property 6: Seed idempotence

*For any* execution of the seed function, running it multiple times shall produce the same set of deliveries (no duplicates created).

**Validates: Requirements 3.3**

### Property 7: Response shape consistency

*For any* successful response from GET /me/deliveries, the response shall contain exactly two fields: next_delivery (Delivery | null) and history (Delivery[]).

**Validates: Requirements 2.1**

## Error Handling

### API Error Responses

All errors follow the existing Error_Envelope format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "request_id": "uuid"
  }
}
```

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Unauthenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Non-CUSTOMER role | 403 | FORBIDDEN | "Access denied" |
| Database error | 500 | INTERNAL_ERROR | "An error occurred" |

### Frontend Error Handling

- Display inline error messages within the relevant card
- Parse Error_Envelope to extract user-friendly message
- Provide retry option for transient errors

## Testing Strategy

### Backend Tests

**Unit Tests:**
- Test delivery model creation and field validation
- Test schema serialization/deserialization

**Property-Based Tests (Hypothesis):**
- Property 1: Role enforcement (generate random non-CUSTOMER roles, verify 403)
- Property 2: Archived exclusion (generate deliveries with/without archived_at, verify filtering)
- Property 3: History ordering (generate random deliveries, verify sort order)
- Property 4: Next delivery future check (verify scheduled_for > now)
- Property 5: History limit (generate >20 deliveries, verify limit)

**Integration Tests:**
- CUSTOMER can call /me/deliveries and gets correct shape
- Non-CUSTOMER role receives 403

### Frontend Tests

**Unit Tests:**
- DeliveriesPage renders all 4 cards
- Loading skeleton displays during fetch
- Error state displays on API failure
- Empty state displays when no deliveries

**Component Tests:**
- NextDeliveryCard shows correct action button based on subscription_status
- DeliveryHistoryCard renders table with correct columns
- Status chips display correct styling

### Test Configuration

- Backend: pytest with hypothesis (min 100 iterations per property test)
- Frontend: vitest with React Testing Library
- Tag format: `**Feature: customer-deliveries-page, Property N: {property_text}**`
