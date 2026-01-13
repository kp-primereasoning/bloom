# Design Document: Production Hardening

## Overview

This design covers production hardening improvements for the Bloom platform, focusing on observability, data integrity, local development experience, and deployment documentation. The implementation uses Python/FastAPI for the API and React/TypeScript for the web frontend.

## Architecture

```mermaid
graph TB
    subgraph "Request Flow"
        Client[Client] --> MW[Request ID Middleware]
        MW --> Router[FastAPI Router]
        Router --> Service[Service Layer]
        Service --> DB[(PostgreSQL)]
    end
    
    subgraph "Observability"
        MW --> Logger[Structured Logger]
        Logger --> CW[CloudWatch Logs]
        Router --> Sentry[Sentry/Error Tracking]
    end
    
    subgraph "Health Checks"
        LB[Load Balancer] --> Health[/health]
        LB --> HealthDB[/health/db]
        HealthDB --> DB
    end
```

## Components and Interfaces

### 1. Request ID Middleware

A FastAPI middleware that generates/propagates request IDs for tracing.

```python
# apps/api/middleware/request_id.py
import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Use client-provided ID or generate new one
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(request_id)
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

def get_request_id() -> str:
    """Get current request ID from context."""
    return request_id_var.get() or str(uuid.uuid4())
```

### 2. Enhanced Error Envelope

Update exception handlers to include request_id from context.

```python
# apps/api/middleware/exceptions.py (updated)
from middleware.request_id import get_request_id

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = get_request_id()
    
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        # Ensure request_id is present
        exc.detail["error"]["request_id"] = request_id
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "request_id": request_id
            }
        }
    )
```

### 3. Database Health Check Endpoint

```python
# apps/api/routes/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.database import get_db
import asyncio

router = APIRouter(tags=["health"])

@router.get("/health/db")
async def health_db(db: Session = Depends(get_db)):
    """
    Database health check endpoint.
    
    Executes a simple query to verify database connectivity.
    Returns 200 if healthy, 503 if unhealthy.
    """
    try:
        # Execute simple query with 5 second timeout
        result = await asyncio.wait_for(
            asyncio.to_thread(lambda: db.execute(text("SELECT 1")).scalar()),
            timeout=5.0
        )
        return {"status": "healthy", "database": "connected"}
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": "Database query timeout"
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "error": str(e)
            }
        )
```

### 4. Soft Delete Implementation

Add ARCHIVED status to entities and filter by default.

```python
# Model updates - add ARCHIVED to status enums
class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class PropertyStatus(str, Enum):
    CREATED = "CREATED"
    PENDING_FLORIST = "PENDING_FLORIST"
    PENDING_PM = "PENDING_PM"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class FloristStatus(str, Enum):
    ONBOARDING = "ONBOARDING"
    READY = "READY"
    ARCHIVED = "ARCHIVED"
```

### 5. Enhanced Seed Data

```python
# apps/api/db/seed.py (updated structure)
SEED_CONFIG = {
    "properties": 5,      # Mixed statuses
    "florists": 3,        # All active/ready
    "pm_users": 2,        # Assigned to properties
    "customers": 30,      # Distributed across properties
}

# Customer distribution: CREATED (10), ACTIVE (15), PAUSED (5)
CUSTOMER_STATUS_DISTRIBUTION = {
    SubscriptionStatus.CREATED: 10,
    SubscriptionStatus.ACTIVE: 15,
    SubscriptionStatus.PAUSED: 5,
}
```

## Data Models

### Updated User Model

```python
class User(BaseModel):
    id: UUID
    email: EmailStr
    hashed_password: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE  # NEW: for soft delete
    property_id: Optional[UUID] = None
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    created_at: datetime
```

### Database Constraints

The following constraints must be verified/added:

1. **user.email unique** - Already exists at application level, verify DB constraint
2. **property_manager_id FK** - References user ID (in-memory store, no FK)
3. **florist.status** - Add ARCHIVED to enum
4. **property.status** - Add ARCHIVED to enum

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Request ID Propagation

*For any* API request, the response headers SHALL contain an X-Request-ID that matches either the client-provided X-Request-ID header or is a valid UUID if none was provided.

**Validates: Requirements 1.1, 1.4**

### Property 2: Error Envelope Contains Request ID

*For any* API error response (4xx or 5xx), the response body SHALL contain an "error" object with a "request_id" field that is a valid UUID.

**Validates: Requirements 1.3, 4.5**

### Property 3: PM Role Validation on Assignment

*For any* PM assignment request, if the target user does not have PROPERTY_MANAGER role, the API SHALL return HTTP 400 with error code "INVALID_ROLE".

**Validates: Requirements 4.3, 6.1, 6.2**

### Property 4: Duplicate Email Rejection

*For any* user creation request with an email that already exists, the API SHALL return HTTP 409 Conflict.

**Validates: Requirements 5.1, 5.2**

### Property 5: Soft Delete Behavior

*For any* delete operation on users, properties, or florists, the entity SHALL be marked as ARCHIVED rather than removed from the database, and the entity SHALL be excluded from default list queries.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 6: Archive Filter Toggle

*For any* list query with include_archived=true parameter, the response SHALL include entities with ARCHIVED status.

**Validates: Requirements 7.5**

### Property 7: Seed Idempotence

*For any* number of seed executions, the resulting data state SHALL be identical (same entity counts, no duplicates).

**Validates: Requirements 8.5**

### Property 8: Server-Side Validation

*For any* admin mutation with invalid data (missing required fields, invalid email format, invalid role), the API SHALL return HTTP 400/422 with a descriptive error message.

**Validates: Requirements 4.1, 4.2, 4.4**

## Error Handling

### Error Response Format

All errors follow the standard envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "request_id": "uuid-string"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 422 | Request validation failed |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate resource (e.g., email) |
| INVALID_ROLE | 400 | User role doesn't match requirement |
| INTERNAL_ERROR | 500 | Unhandled server error |
| DB_UNHEALTHY | 503 | Database connectivity issue |

### Sentry Integration (Optional)

If SENTRY_DSN is configured:

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if sentry_dsn := os.environ.get("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "development")
    )
```

## Testing Strategy

### Unit Tests

- Validate request ID middleware generates/propagates IDs correctly
- Validate error handlers include request_id in responses
- Validate soft delete marks entities as ARCHIVED
- Validate list queries exclude ARCHIVED by default
- Validate PM role validation rejects non-PM users

### Property-Based Tests

Using Hypothesis for Python:

1. **Request ID Format** - All generated request IDs are valid UUIDs
2. **Error Envelope Structure** - All error responses have required fields
3. **Seed Idempotence** - Multiple seed runs produce identical state
4. **Validation Rejection** - Invalid inputs are consistently rejected

### Integration Tests

- Health check endpoint returns correct status based on DB state
- End-to-end request tracing with request_id
- Soft delete + archive filter workflow

### Test Configuration

```python
# pytest.ini / pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]

# Hypothesis settings
[tool.hypothesis]
max_examples = 100
```
