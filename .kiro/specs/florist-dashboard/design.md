# Design Document: Florist Dashboard

## Overview

The Florist Dashboard provides florists with visibility into their assigned properties and upcoming deliveries. Florists can view scheduled deliveries, mark them as delivered or missed, and manage their account settings. The dashboard follows the existing patterns established by the Customer Dashboard, with role-specific API endpoints and a consistent UI structure.

The implementation adds new florist-specific API endpoints (`/florist/me`, `/florist/deliveries`) and enhances the existing placeholder pages with functional components.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  FloristDeliveriesPage (/florist/deliveries)                    │
│  ├── useEffect → getFloristDeliveries() on mount                │
│  ├── Deliveries Table (date, property, customer, plan, actions) │
│  └── Action Buttons (Mark Delivered, Mark Missed)               │
│                                                                 │
│  FloristSettingsPage (/florist/settings)                        │
│  ├── useEffect → getFloristMe() on mount                        │
│  ├── Business Info Card (name, status)                          │
│  ├── Assigned Properties List                                   │
│  └── Shopify Integration Placeholder                            │
│                                                                 │
│  FloristAvailabilityPage (/florist/availability)                │
│  ├── Capacity Display/Edit                                      │
│  └── Delivery Windows Placeholder                               │
│                                                                 │
│  FloristProductsPage (/florist/products)                        │
│  └── Shopify Mapping Placeholder                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│  GET /florist/me                                                │
│  ├── Requires JWT authentication with FLORIST role              │
│  ├── Returns florist profile with assigned properties           │
│  └── Joins PropertyAssignment and Property tables               │
│                                                                 │
│  GET /florist/deliveries                                        │
│  ├── Requires JWT authentication with FLORIST role              │
│  ├── Returns SCHEDULED deliveries for assigned properties       │
│  └── Includes customer email, property details, plan            │
│                                                                 │
│  PATCH /florist/deliveries/{delivery_id}                        │
│  ├── Requires JWT authentication with FLORIST role              │
│  ├── Validates florist has assignment to delivery's property    │
│  ├── Accepts status: DELIVERED or MISSED                        │
│  └── Sets delivered_at timestamp for DELIVERED status           │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### Florist Me Endpoint (`GET /florist/me`)

Returns the florist's profile with their assigned properties:

```python
# Response schema
class FloristMeResponse(BaseModel):
    florist_id: UUID
    florist_name: str
    florist_status: FloristStatus
    assigned_properties: list[AssignedPropertyResponse]

class AssignedPropertyResponse(BaseModel):
    property_id: UUID
    property_name: str
    property_address: str
```

Implementation approach:
1. Get current user from JWT, verify FLORIST role
2. Look up Florist record by matching user email or a florist_id field
3. Query PropertyAssignment for active assignments
4. Join Property table to get property details
5. Return enriched response

#### Florist Deliveries Endpoint (`GET /florist/deliveries`)

Returns upcoming deliveries for the florist's assigned properties:

```python
# Response schema
class FloristDeliveryResponse(BaseModel):
    id: UUID
    customer_email: str
    property_id: UUID
    property_name: str
    property_address: str
    subscription_plan: SubscriptionPlan
    status: DeliveryStatus
    scheduled_for: datetime

class FloristDeliveriesListResponse(BaseModel):
    deliveries: list[FloristDeliveryResponse]
```

Implementation approach:
1. Get current user from JWT, verify FLORIST role
2. Get florist's active property assignments
3. Query Delivery table for SCHEDULED deliveries where property_id in assigned properties
4. Join User table to get customer email
5. Join Property table to get property details
6. Order by scheduled_for ascending
7. Return list

#### Update Delivery Status Endpoint (`PATCH /florist/deliveries/{delivery_id}`)

Updates a delivery's status:

```python
# Request schema
class UpdateDeliveryStatusRequest(BaseModel):
    status: Literal["DELIVERED", "MISSED"]

# Response: FloristDeliveryResponse
```

Implementation approach:
1. Get current user from JWT, verify FLORIST role
2. Get delivery by ID
3. Verify delivery's property_id is in florist's active assignments
4. Verify current status is SCHEDULED (only valid source state)
5. Update status to requested value
6. If DELIVERED, set delivered_at to current timestamp
7. Return updated delivery

### Frontend Components

#### FloristDeliveriesPage

Located at `apps/web/src/pages/florist/DeliveriesPage.tsx`:

```typescript
// State
const [deliveries, setDeliveries] = useState<FloristDelivery[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [actionLoading, setActionLoading] = useState<string | null>(null);

// Actions
const handleMarkDelivered = async (deliveryId: string) => { ... };
const handleMarkMissed = async (deliveryId: string) => { ... };
```

Table columns:
- Delivery Date (formatted scheduled_for)
- Property (property_name)
- Customer (customer_email)
- Plan (subscription_plan badge)
- Actions (Mark Delivered, Mark Missed buttons)

#### FloristSettingsPage

Located at `apps/web/src/pages/florist/SettingsPage.tsx`:

Displays:
- Business name
- Status badge (ONBOARDING, READY, ARCHIVED)
- List of assigned properties
- Shopify integration placeholder

#### FloristAvailabilityPage

Located at `apps/web/src/pages/florist/AvailabilityPage.tsx`:

Displays:
- Weekly delivery capacity (editable)
- Delivery windows placeholder

#### FloristProductsPage

Located at `apps/web/src/pages/florist/ProductsPage.tsx`:

Displays:
- Explanation of Shopify integration concept
- Three subscription tiers with descriptions
- "Coming soon" indicator

### API Client Methods

```typescript
// apps/web/src/lib/api.ts

/**
 * Get florist profile with assigned properties.
 */
export async function getFloristMe(): Promise<FloristMeResponse> {
  return apiRequest<FloristMeResponse>('/florist/me');
}

/**
 * Get upcoming deliveries for florist's assigned properties.
 */
export async function getFloristDeliveries(): Promise<FloristDeliveriesListResponse> {
  return apiRequest<FloristDeliveriesListResponse>('/florist/deliveries');
}

/**
 * Update delivery status (DELIVERED or MISSED).
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: 'DELIVERED' | 'MISSED'
): Promise<FloristDeliveryResponse> {
  return apiRequest<FloristDeliveryResponse>(`/florist/deliveries/${deliveryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
```

### Shared Types

```typescript
// packages/shared/src/types/domain.ts

export type FloristStatus = 'ONBOARDING' | 'READY' | 'ARCHIVED';

export interface AssignedProperty {
  property_id: string;
  property_name: string;
  property_address: string;
}

export interface FloristMeResponse {
  florist_id: string;
  florist_name: string;
  florist_status: FloristStatus;
  assigned_properties: AssignedProperty[];
}

export interface FloristDelivery {
  id: string;
  customer_email: string;
  property_id: string;
  property_name: string;
  property_address: string;
  subscription_plan: SubscriptionPlan;
  status: DeliveryStatus;
  scheduled_for: string;
}

export interface FloristDeliveriesListResponse {
  deliveries: FloristDelivery[];
}

export interface UpdateDeliveryStatusRequest {
  status: 'DELIVERED' | 'MISSED';
}
```

## Data Models

### Delivery State Machine

```
                    ┌─────────────┐
                    │  SCHEDULED  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │  DELIVERED  │ │   SKIPPED   │ │   MISSED    │
       └─────────────┘ └─────────────┘ └─────────────┘
       (florist marks) (customer skips) (florist marks)
```

### Florist-Property-Delivery Relationship

```
┌──────────┐     ┌────────────────────┐     ┌──────────┐
│ Florist  │────▶│ PropertyAssignment │◀────│ Property │
└──────────┘     └────────────────────┘     └──────────┘
                         │                       │
                         │ active=true           │
                         ▼                       ▼
                 ┌─────────────────────────────────┐
                 │           Delivery              │
                 │  (property_id, user_id, status) │
                 └─────────────────────────────────┘
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: FLORIST Role Enforcement

*For any* user with a non-FLORIST role attempting to access `/florist/*` endpoints, the API returns HTTP 403 Forbidden.

**Validates: Requirements 1.4, 2.5, 3.5**

### Property 2: Florist Me Response Structure

*For any* authenticated florist user, the `GET /florist/me` endpoint returns a response containing florist_id, florist_name, florist_status, and assigned_properties array. When the florist has active assignments, assigned_properties contains objects with property_id, property_name, and property_address.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 3: Deliveries Filtered by Assignment and Status

*For any* florist with active property assignments, the `GET /florist/deliveries` endpoint returns only deliveries where: (a) status is SCHEDULED, and (b) property_id matches one of the florist's active assignments. No deliveries for unassigned properties are returned.

**Validates: Requirements 2.1, 2.4**

### Property 4: Deliveries Ordered by Date

*For any* list of deliveries returned by `GET /florist/deliveries`, the deliveries are ordered by scheduled_for date in ascending order (soonest first).

**Validates: Requirements 2.3**

### Property 5: Delivery Response Contains Required Fields

*For any* delivery returned by the florist deliveries endpoint, the response includes customer_email, property_name, property_address, subscription_plan, and scheduled_for fields.

**Validates: Requirements 2.2**

### Property 6: Assignment-Based Authorization

*For any* florist attempting to update a delivery via `PATCH /florist/deliveries/{id}`, the operation succeeds only if the delivery's property_id matches one of the florist's active property assignments. Otherwise, HTTP 403 is returned.

**Validates: Requirements 3.3, 3.4, 4.2, 4.3**

### Property 7: Delivery Status Update with Timestamp

*For any* valid delivery status update to DELIVERED, the delivery's status changes to DELIVERED and delivered_at is set to a non-null timestamp. For updates to MISSED, status changes to MISSED and delivered_at remains null.

**Validates: Requirements 3.1, 3.2, 4.1**

### Property 8: Valid Status Transitions

*For any* delivery status update request, the operation succeeds only if the current status is SCHEDULED. Attempts to update deliveries with status DELIVERED, MISSED, or SKIPPED return HTTP 400.

**Validates: Requirements 4.4**

### Property 9: Route Protection by Role

*For any* user with a non-FLORIST role navigating to `/florist/*` routes, the router redirects them to their role's default landing page.

**Validates: Requirements 8.1**

## Error Handling

### API Errors

All API errors follow the existing Error Envelope format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "request_id": "uuid"
  }
}
```

Error codes:
- `FORBIDDEN`: User role is not FLORIST, or florist not assigned to delivery's property
- `UNAUTHORIZED`: Missing or invalid JWT token
- `NOT_FOUND`: Delivery ID does not exist
- `INVALID_STATUS`: Requested status transition is not allowed
- `INVALID_STATE`: Delivery is not in SCHEDULED state

### Frontend Error Display

Errors are displayed inline:
- Red text with error message near the action that failed
- Clears on next successful action or page refresh
- Does not block other UI interactions

## Testing Strategy

### Property-Based Tests (Backend)

Using `hypothesis` library for Python property-based testing:

1. **Property 1 Test**: Generate users with different roles, verify only FLORIST gets 200 on florist endpoints
2. **Property 2 Test**: Generate florists with various assignment states, verify response structure
3. **Property 3 Test**: Generate deliveries with various statuses and properties, verify filtering
4. **Property 4 Test**: Generate multiple deliveries, verify ordering by scheduled_for
5. **Property 5 Test**: Generate deliveries, verify all required fields present
6. **Property 6 Test**: Generate florists and deliveries, verify authorization checks
7. **Property 7 Test**: Generate valid status updates, verify timestamp behavior
8. **Property 8 Test**: Generate deliveries in various states, verify transition rules

Configuration: Minimum 100 iterations per property test.

### Unit Tests (Backend)

- Test unauthenticated request returns 401
- Test florist with no assignments returns empty array
- Test delivery not found returns 404
- Test invalid status value returns 400

### Unit Tests (Frontend)

- Test loading state renders spinner
- Test error state renders error message
- Test empty state renders appropriate message
- Test deliveries table renders correct columns
- Test action buttons trigger correct API calls
- Test successful action removes delivery from list

### Integration Tests

- Full flow: Login as florist → View deliveries → Mark delivered → Verify removed from list
- Full flow: Login as florist → View settings → Verify assigned properties displayed
