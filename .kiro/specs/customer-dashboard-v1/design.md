# Design Document: Customer Dashboard v1

## Overview

Customer Dashboard v1 provides authenticated customers with a clear view of their subscription status, property information, and actionable controls. The dashboard adapts its UI based on the customer's onboarding state, guiding incomplete users back to the appropriate step while allowing fully onboarded users to pause or resume their subscription.

The implementation extends the existing `/auth/me` endpoint to include `property_name` (resolved server-side) and enhances the customer home page with contextual action buttons.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  CustomerDashboardPage                                          │
│  ├── useEffect → getMe() on mount                               │
│  ├── Status Card (property_name, subscription_status)           │
│  ├── Next Delivery Card (placeholder)                           │
│  └── Action Button (contextual based on state)                  │
│       ├── property_id=null → Link to /onboarding/property       │
│       ├── status=CREATED → Link to /onboarding/subscription     │
│       ├── status=ACTIVE → Pause button → PATCH /me/subscription │
│       └── status=PAUSED → Resume button → PATCH /me/subscription│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│  GET /auth/me (enhanced)                                        │
│  ├── Requires JWT authentication                                │
│  ├── Returns user fields + property_name (nullable)             │
│  └── Joins Property table when property_id is set               │
│                                                                 │
│  PATCH /me/subscription (existing)                              │
│  ├── Requires CUSTOMER role                                     │
│  ├── Accepts only ACTIVE or PAUSED                              │
│  └── Returns updated user object                                │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### Enhanced Me Endpoint (`GET /auth/me`)

The existing `/auth/me` endpoint will be enhanced to return `property_name`:

```python
# Response schema
class MeResponseWithPropertyName(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    property_id: Optional[UUID] = None
    property_name: Optional[str] = None  # NEW: resolved from Property table
    subscription_status: Optional[SubscriptionStatus] = None
    created_at: datetime
```

Implementation approach:
1. After fetching the user, check if `property_id` is set
2. If set, query the Property table to get the property name
3. Return the enriched response

#### Subscription Update Endpoint (`PATCH /me/subscription`)

Already implemented in `apps/api/routes/me.py`. Validates:
- Only CUSTOMER role can call
- Only ACTIVE or PAUSED status accepted (CREATED rejected with 400)
- Returns updated user object

### Frontend Components

#### CustomerDashboardPage (`/customer`)

Located at `apps/web/src/pages/customer/HomePage.tsx`. Will be enhanced to:

1. **Fetch enriched user data** on mount via `getMe()`
2. **Display status cards**:
   - Property card: Shows `property_name` or "No property selected"
   - Subscription card: Shows status with colored pill
   - Next delivery card: Shows "Coming soon" placeholder
3. **Render contextual action button** based on state:
   - `property_id === null` → "Select your building" link
   - `subscription_status === 'CREATED'` → "Activate subscription" link
   - `subscription_status === 'ACTIVE'` → "Pause subscription" button
   - `subscription_status === 'PAUSED'` → "Resume subscription" button
4. **Handle loading and error states** inline

### API Client Methods

```typescript
// apps/web/src/lib/api.ts

/**
 * Get current user with enriched property data.
 */
export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me');
}

/**
 * Update subscription status (ACTIVE or PAUSED only).
 */
export async function updateMySubscription(
  data: MeSubscriptionUpdateRequest
): Promise<MeResponse> {
  return apiRequest<MeResponse>('/me/subscription', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
```

### Shared Types

```typescript
// packages/shared/src/types/domain.ts

/**
 * Response from GET /auth/me with enriched property data
 */
export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  property_name: string | null;  // NEW
  subscription_status: SubscriptionStatus | null;
  created_at: string;
}
```

## Data Models

### User State Machine

```
                    ┌─────────────┐
                    │   CREATED   │
                    │ (no property)│
                    └──────┬──────┘
                           │ Select property
                           ▼
                    ┌─────────────┐
                    │   CREATED   │
                    │(has property)│
                    └──────┬──────┘
                           │ Activate subscription
                           ▼
              ┌────────────────────────┐
              │                        │
              ▼                        │
       ┌─────────────┐          ┌─────────────┐
       │   ACTIVE    │◄────────►│   PAUSED    │
       └─────────────┘  Pause/  └─────────────┘
                        Resume
```

### Dashboard State Derivation

| property_id | subscription_status | Action Button |
|-------------|---------------------|---------------|
| null        | CREATED             | "Select your building" → /onboarding/property |
| set         | CREATED             | "Activate subscription" → /onboarding/subscription |
| set         | ACTIVE              | "Pause subscription" → PATCH /me/subscription |
| set         | PAUSED              | "Resume subscription" → PATCH /me/subscription |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Me Endpoint Property Name Resolution

*For any* authenticated user, the `GET /auth/me` endpoint returns a `property_name` that equals the property's name when `property_id` is set, or null when `property_id` is null.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Subscription Status Validation

*For any* subscription update request, the `PATCH /me/subscription` endpoint accepts only ACTIVE or PAUSED status values; any other value (including CREATED) results in HTTP 400.

**Validates: Requirements 4.1, 4.2**

### Property 3: Customer Role Enforcement

*For any* user with a non-CUSTOMER role attempting to call `PATCH /me/subscription`, the endpoint returns HTTP 403.

**Validates: Requirements 4.3**

### Property 4: Subscription Update Round-Trip

*For any* valid subscription update (ACTIVE or PAUSED) by a CUSTOMER, the endpoint returns the updated user object with the new subscription_status, and a subsequent `GET /auth/me` call returns the same status.

**Validates: Requirements 4.4**

### Property 5: Error Envelope Format

*For any* error response from the subscription endpoint, the response body contains an `error` object with `code`, `message`, and `request_id` fields.

**Validates: Requirements 4.5**

### Property 6: Dashboard Action Button State Mapping

*For any* customer user state, the dashboard displays exactly one action button matching the state derivation table: "Select your building" when property_id is null, "Activate subscription" when status is CREATED with property, "Pause subscription" when ACTIVE, or "Resume subscription" when PAUSED.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

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
- `INVALID_STATUS`: Subscription status is not ACTIVE or PAUSED
- `FORBIDDEN`: User role is not CUSTOMER
- `UNAUTHORIZED`: Missing or invalid JWT token

### Frontend Error Display

Errors are displayed inline near the action button area:
- Red text with error message
- Clears on next successful action or page refresh
- Does not block other UI interactions

## Testing Strategy

### Property-Based Tests (Backend)

Using `hypothesis` library for Python property-based testing:

1. **Property 1 Test**: Generate random users with/without property_id, verify property_name resolution
2. **Property 2 Test**: Generate random status values, verify only ACTIVE/PAUSED accepted
3. **Property 3 Test**: Generate users with different roles, verify CUSTOMER-only access
4. **Property 4 Test**: Generate valid updates, verify round-trip consistency
5. **Property 5 Test**: Generate error scenarios, verify envelope format

Configuration: Minimum 100 iterations per property test.

### Unit Tests (Backend)

- Test CREATED status rejection returns 400
- Test unauthenticated request returns 401
- Test property_name is null when property doesn't exist

### Unit Tests (Frontend)

- Test loading state renders spinner
- Test error state renders error message
- Test each action button renders for correct state
- Test button click triggers correct API call

### Integration Tests

- Full flow: Login → Dashboard → Pause → Verify status → Resume → Verify status
