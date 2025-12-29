# Design Document: Core Data Model + AWS-Backed Persistence

## Overview

This design implements the foundational data model for the Bloom platform, introducing three core domain entities (Property, Florist, PropertyAssignment) backed by an AWS RDS PostgreSQL database. The system uses SQLAlchemy as the ORM with Alembic for migrations, providing a production-ready persistence layer.

The architecture follows these principles:
1. Database-level constraints enforce referential integrity and business rules
2. ORM models provide type-safe Python interfaces to the data
3. Admin-only API endpoints expose CRUD operations with proper authorization
4. Shared TypeScript types enable type-safe frontend development

## Architecture

```mermaid
erDiagram
    properties ||--o{ property_assignments : "has"
    florists ||--o{ property_assignments : "assigned to"
    
    properties {
        uuid id PK
        string name
        string address
        enum status
        string delivery_cadence
        timestamp created_at
        timestamp updated_at
    }
    
    florists {
        uuid id PK
        string name
        enum status
        timestamp created_at
    }
    
    property_assignments {
        uuid id PK
        uuid property_id FK
        uuid florist_id FK
        boolean active
        timestamp created_at
    }
```

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant RBACGuard
    participant Service
    participant ORM
    participant RDS

    Admin->>API: POST /admin/properties
    API->>RBACGuard: Validate JWT + ADMIN role
    RBACGuard->>API: Authorized ✓
    API->>Service: create_property(data)
    Service->>ORM: Property.create()
    ORM->>RDS: INSERT INTO properties
    RDS->>ORM: Row created
    ORM->>Service: Property instance
    Service->>API: PropertyResponse
    API->>Admin: 201 Created
```

## Components and Interfaces

### Database Layer

#### 1. Database Connection (`apps/api/db/database.py`)

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL")

# Support component-based connection if DATABASE_URL not set
if not DATABASE_URL:
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "5432")
    DB_NAME = os.environ.get("DB_NAME", "bloom")
    DB_USER = os.environ.get("DB_USER", "bloom")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### 2. Property Model (`apps/api/models/property.py`)

```python
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base

class PropertyStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    ACTIVE = "ACTIVE"

class Property(Base):
    __tablename__ = "properties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    status = Column(SQLEnum(PropertyStatus), nullable=False, default=PropertyStatus.DRAFT)
    delivery_cadence = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # updated_at is managed at ORM layer via onupdate, not DB-level trigger
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assignments = relationship("PropertyAssignment", back_populates="property")
```

#### 3. Florist Model (`apps/api/models/florist.py`)

```python
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base

class FloristStatus(str, Enum):
    ONBOARDING = "ONBOARDING"
    READY = "READY"

class Florist(Base):
    __tablename__ = "florists"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    status = Column(SQLEnum(FloristStatus), nullable=False, default=FloristStatus.ONBOARDING)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assignments = relationship("PropertyAssignment", back_populates="florist")
```

#### 4. PropertyAssignment Model (`apps/api/models/property_assignment.py`)

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base

class PropertyAssignment(Base):
    __tablename__ = "property_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    florist_id = Column(UUID(as_uuid=True), ForeignKey("florists.id", ondelete="CASCADE"), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    property = relationship("Property", back_populates="assignments")
    florist = relationship("Florist", back_populates="assignments")
    
    # Partial unique index: only one active assignment per property
    __table_args__ = (
        Index(
            "ix_property_assignments_one_active_per_property",
            "property_id",
            unique=True,
            postgresql_where=(active == True)
        ),
    )
```

### Migration System

#### 5. Alembic Configuration (`apps/api/alembic.ini`)

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = driver://user:pass@localhost/dbname

[post_write_hooks]
hooks = black
black.type = console_scripts
black.entrypoint = black
black.options = -q
```

#### 6. Initial Migration (`apps/api/alembic/versions/001_create_core_tables.py`)

```python
"""Create core domain tables

Revision ID: 001
Create Date: 2025-12-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Enable pgcrypto extension for UUID generation
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    
    # Create properties table
    # Note: updated_at is managed at ORM layer (SQLAlchemy onupdate), not DB-level
    op.create_table(
        'properties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'SUBMITTED', 'ACTIVE', name='propertystatus'), nullable=False, server_default='DRAFT'),
        sa.Column('delivery_cadence', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create florists table
    op.create_table(
        'florists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('ONBOARDING', 'READY', name='floriststatus'), nullable=False, server_default='ONBOARDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create property_assignments table
    op.create_table(
        'property_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('properties.id', ondelete='CASCADE'), nullable=False),
        sa.Column('florist_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('florists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create partial unique index for one active assignment per property
    op.create_index(
        'ix_property_assignments_one_active_per_property',
        'property_assignments',
        ['property_id'],
        unique=True,
        postgresql_where=sa.text('active = true')
    )

def downgrade():
    op.drop_index('ix_property_assignments_one_active_per_property')
    op.drop_table('property_assignments')
    op.drop_table('florists')
    op.drop_table('properties')
    op.execute('DROP TYPE IF EXISTS propertystatus')
    op.execute('DROP TYPE IF EXISTS floriststatus')
    # Note: pgcrypto extension is not dropped as it may be used by other tables
```

### API Layer

#### 7. Pydantic Schemas (`apps/api/schemas/domain.py`)

```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
from models.property import PropertyStatus
from models.florist import FloristStatus

# Property schemas
class PropertyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1, max_length=500)
    delivery_cadence: Optional[str] = Field(None, max_length=100)

class PropertyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[PropertyStatus] = None
    delivery_cadence: Optional[str] = Field(None, max_length=100)

class PropertyResponse(BaseModel):
    id: UUID
    name: str
    address: str
    status: PropertyStatus
    delivery_cadence: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Florist schemas
class FloristCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class FloristResponse(BaseModel):
    id: UUID
    name: str
    status: FloristStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# PropertyAssignment schemas
class PropertyAssignmentCreate(BaseModel):
    property_id: UUID
    florist_id: UUID

class PropertyAssignmentResponse(BaseModel):
    id: UUID
    property_id: UUID
    florist_id: UUID
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### 8. Property Service (`apps/api/services/property_service.py`)

```python
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from models.property import Property, PropertyStatus
from models.property_assignment import PropertyAssignment
from schemas.domain import PropertyCreate, PropertyUpdate

# Valid status transitions
VALID_TRANSITIONS = {
    PropertyStatus.DRAFT: [PropertyStatus.SUBMITTED],
    PropertyStatus.SUBMITTED: [PropertyStatus.ACTIVE],
    PropertyStatus.ACTIVE: [],  # No transitions from ACTIVE in MLP
}

def create_property(db: Session, data: PropertyCreate) -> Property:
    """Create a new property in DRAFT status."""
    prop = Property(
        name=data.name,
        address=data.address,
        delivery_cadence=data.delivery_cadence,
        status=PropertyStatus.DRAFT
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop

def get_properties(db: Session) -> list[Property]:
    """Get all properties."""
    return db.query(Property).all()

def get_property(db: Session, property_id: UUID) -> Property | None:
    """Get a property by ID."""
    return db.query(Property).filter(Property.id == property_id).first()

def update_property(db: Session, property_id: UUID, data: PropertyUpdate, request_id: str) -> Property:
    """Update a property with status transition validation."""
    prop = get_property(db, property_id)
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Property not found", "request_id": request_id}}
        )
    
    # Handle status transition
    if data.status and data.status != prop.status:
        validate_status_transition(db, prop, data.status, request_id)
        prop.status = data.status
    
    # Update other fields
    if data.name is not None:
        prop.name = data.name
    if data.address is not None:
        prop.address = data.address
    if data.delivery_cadence is not None:
        prop.delivery_cadence = data.delivery_cadence
    
    db.commit()
    db.refresh(prop)
    return prop

def validate_status_transition(db: Session, prop: Property, new_status: PropertyStatus, request_id: str):
    """Validate property status transition rules."""
    allowed = VALID_TRANSITIONS.get(prop.status, [])
    
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "BUSINESS_RULE_VIOLATION",
                    "message": f"Invalid status transition from {prop.status.value} to {new_status.value}",
                    "request_id": request_id
                }
            }
        )
    
    # SUBMITTED -> ACTIVE requires active assignment
    if new_status == PropertyStatus.ACTIVE:
        has_active = db.query(PropertyAssignment).filter(
            PropertyAssignment.property_id == prop.id,
            PropertyAssignment.active == True
        ).first()
        
        if not has_active:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": {
                        "code": "BUSINESS_RULE_VIOLATION",
                        "message": "Cannot activate property without an active florist assignment",
                        "request_id": request_id
                    }
                }
            )
```

#### 9. Florist Service (`apps/api/services/florist_service.py`)

```python
from uuid import UUID
from sqlalchemy.orm import Session
from models.florist import Florist, FloristStatus
from schemas.domain import FloristCreate

def create_florist(db: Session, data: FloristCreate) -> Florist:
    """Create a new florist in ONBOARDING status."""
    florist = Florist(
        name=data.name,
        status=FloristStatus.ONBOARDING
    )
    db.add(florist)
    db.commit()
    db.refresh(florist)
    return florist

def get_florists(db: Session) -> list[Florist]:
    """Get all florists."""
    return db.query(Florist).all()

def get_florist(db: Session, florist_id: UUID) -> Florist | None:
    """Get a florist by ID."""
    return db.query(Florist).filter(Florist.id == florist_id).first()
```

#### 10. Assignment Service (`apps/api/services/assignment_service.py`)

```python
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from models.property_assignment import PropertyAssignment
from models.property import Property
from models.florist import Florist
from schemas.domain import PropertyAssignmentCreate

def create_assignment(db: Session, data: PropertyAssignmentCreate, request_id: str) -> PropertyAssignment:
    """Create a new property assignment, deactivating any existing active assignment."""
    # Validate property exists
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NOT_FOUND", "message": "Property not found", "request_id": request_id}}
        )
    
    # Validate florist exists
    florist = db.query(Florist).filter(Florist.id == data.florist_id).first()
    if not florist:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NOT_FOUND", "message": "Florist not found", "request_id": request_id}}
        )
    
    # Deactivate existing active assignment for this property
    db.query(PropertyAssignment).filter(
        PropertyAssignment.property_id == data.property_id,
        PropertyAssignment.active == True
    ).update({"active": False})
    
    # Create new assignment
    assignment = PropertyAssignment(
        property_id=data.property_id,
        florist_id=data.florist_id,
        active=True
    )
    db.add(assignment)
    
    try:
        db.commit()
        db.refresh(assignment)
        return assignment
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Failed to create assignment", "request_id": request_id}}
        )

def get_assignments(db: Session) -> list[PropertyAssignment]:
    """Get all property assignments."""
    return db.query(PropertyAssignment).all()
```


#### 11. Admin Routes (`apps/api/routes/admin.py` - extended)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4, UUID
from typing import List

from auth.dependencies import require_role
from db.database import get_db
from schemas.domain import (
    PropertyCreate, PropertyUpdate, PropertyResponse,
    FloristCreate, FloristResponse,
    PropertyAssignmentCreate, PropertyAssignmentResponse
)
from services import property_service, florist_service, assignment_service

router = APIRouter(prefix="/admin", tags=["admin"])

# Property endpoints
@router.post("/properties", response_model=PropertyResponse, status_code=201)
async def create_property(
    data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Create a new property (ADMIN only)."""
    return property_service.create_property(db, data)

@router.get("/properties", response_model=List[PropertyResponse])
async def list_properties(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all properties (ADMIN only)."""
    return property_service.get_properties(db)

@router.patch("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Update a property (ADMIN only)."""
    request_id = str(uuid4())
    return property_service.update_property(db, property_id, data, request_id)

# Florist endpoints
@router.post("/florists", response_model=FloristResponse, status_code=201)
async def create_florist(
    data: FloristCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Create a new florist (ADMIN only)."""
    return florist_service.create_florist(db, data)

@router.get("/florists", response_model=List[FloristResponse])
async def list_florists(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all florists (ADMIN only)."""
    return florist_service.get_florists(db)

# Assignment endpoints
@router.post("/property-assignments", response_model=PropertyAssignmentResponse, status_code=201)
async def create_assignment(
    data: PropertyAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Create a property-florist assignment (ADMIN only)."""
    request_id = str(uuid4())
    return assignment_service.create_assignment(db, data, request_id)

@router.get("/property-assignments", response_model=List[PropertyAssignmentResponse])
async def list_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all property assignments (ADMIN only)."""
    return assignment_service.get_assignments(db)
```

### Shared TypeScript Types

#### 12. Domain Types (`packages/shared/src/types/domain.ts`)

```typescript
/**
 * Property status lifecycle
 */
export enum PropertyStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACTIVE = 'ACTIVE',
}

/**
 * Florist status lifecycle
 */
export enum FloristStatus {
  ONBOARDING = 'ONBOARDING',
  READY = 'READY',
}

/**
 * Property entity
 */
export interface Property {
  id: string;
  name: string;
  address: string;
  status: PropertyStatus;
  delivery_cadence: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Florist entity
 */
export interface Florist {
  id: string;
  name: string;
  status: FloristStatus;
  created_at: string;
}

/**
 * Property-Florist assignment
 */
export interface PropertyAssignment {
  id: string;
  property_id: string;
  florist_id: string;
  active: boolean;
  created_at: string;
}

/**
 * Request types for creating entities
 */
export interface CreatePropertyRequest {
  name: string;
  address: string;
  delivery_cadence?: string;
}

export interface UpdatePropertyRequest {
  name?: string;
  address?: string;
  status?: PropertyStatus;
  delivery_cadence?: string;
}

export interface CreateFloristRequest {
  name: string;
}

export interface CreatePropertyAssignmentRequest {
  property_id: string;
  florist_id: string;
}
```

## Data Models

### Database Schema

```sql
-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    status propertystatus NOT NULL DEFAULT 'DRAFT',
    delivery_cadence VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Florists table
CREATE TABLE florists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status floriststatus NOT NULL DEFAULT 'ONBOARDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property assignments table
CREATE TABLE property_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    florist_id UUID NOT NULL REFERENCES florists(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one active assignment per property
CREATE UNIQUE INDEX ix_property_assignments_one_active_per_property 
ON property_assignments (property_id) 
WHERE active = true;
```

### API Response Examples

```json
// POST /admin/properties - 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Sunset Towers",
  "address": "123 Main St, San Francisco, CA 94102",
  "status": "DRAFT",
  "delivery_cadence": null,
  "created_at": "2025-12-28T10:00:00Z",
  "updated_at": "2025-12-28T10:00:00Z"
}

// POST /admin/florists - 201 Created
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Bay Area Blooms",
  "status": "ONBOARDING",
  "created_at": "2025-12-28T10:05:00Z"
}

// POST /admin/property-assignments - 201 Created
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "florist_id": "660e8400-e29b-41d4-a716-446655440001",
  "active": true,
  "created_at": "2025-12-28T10:10:00Z"
}
```

### Error Response Examples

```json
// 400 - Business rule violation (activating without assignment)
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot activate property without an active florist assignment",
    "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}

// 400 - Invalid status transition
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Invalid status transition from DRAFT to ACTIVE",
    "request_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}

// 400 - Referenced entity not found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Property not found",
    "request_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Entity Creation Defaults

*For any* newly created Property, Florist, or PropertyAssignment, the system SHALL set the correct default values:
- Property.status = DRAFT
- Florist.status = ONBOARDING  
- PropertyAssignment.active = true

**Validates: Requirements 1.3, 2.3, 3.3**

### Property 2: Timestamp Initialization and Update

*For any* newly created entity, created_at SHALL be set to a timestamp within 5 seconds of the request time. *For any* Property update, updated_at SHALL change to a timestamp later than the previous value.

**Validates: Requirements 1.4, 1.5, 2.4, 3.4**

### Property 3: Status Transition Rules

*For any* Property status transition:
- DRAFT → SUBMITTED is always allowed
- SUBMITTED → ACTIVE is allowed only when an active PropertyAssignment exists
- DRAFT → ACTIVE is never allowed (must go through SUBMITTED)

All invalid transitions SHALL return a 400 error with code "BUSINESS_RULE_VIOLATION".

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 4: Single Active Assignment Constraint

*For any* Property, at most one PropertyAssignment with active=true can exist at any time. When a new assignment is created for a property with an existing active assignment, the previous assignment SHALL be deactivated.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 5: Referential Integrity

*For any* PropertyAssignment creation with a non-existent property_id or florist_id, the system SHALL return a 400 error with code "NOT_FOUND". The database SHALL enforce foreign key constraints.

**Validates: Requirements 3.2, 10.5, 10.6**

### Property 6: Admin Endpoint Authorization

*For any* request to /admin/** endpoints:
- Requests without valid JWT SHALL return 401 Unauthorized
- Requests with valid JWT but non-ADMIN role SHALL return 403 Forbidden
- Requests with valid JWT and ADMIN role SHALL be processed

**Validates: Requirements 8.3, 8.4, 9.3, 9.4, 10.3, 10.4**

### Property 7: CRUD Round-Trip Consistency

*For any* entity created via POST endpoint, a subsequent GET request SHALL return the same entity with all fields matching the creation response.

**Validates: Requirements 8.1, 8.2, 9.1, 9.2, 10.1, 10.2**

### Property 8: Error Response Format Consistency

*For any* error response (400, 401, 403, 404), the response body SHALL contain an "error" object with "code" (string), "message" (string), and "request_id" (UUID string) fields.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

## Error Handling

### Backend Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request data failed validation |
| `BUSINESS_RULE_VIOLATION` | 400 | Business rule constraint violated |
| `NOT_FOUND` | 400/404 | Referenced entity does not exist |
| `INVALID_TOKEN` | 401 | JWT is missing, expired, or malformed |
| `FORBIDDEN` | 403 | User's role not authorized for resource |
| `SERVICE_UNAVAILABLE` | 503 | Database connection failed |

### Error Handling Strategy

1. **Validation Errors**: Pydantic validates request bodies; FastAPI returns 422 by default. The global exception handler wraps these in the standard `{ "error": { "code": "VALIDATION_ERROR", "message": "<details>", "request_id": "<uuid>" } }` envelope.
2. **Business Rule Violations**: Service layer checks rules and raises HTTPException with 400
3. **Not Found Errors**: Service layer checks entity existence before operations
4. **Auth Errors**: Handled by existing auth middleware (401/403)
5. **Database Errors**: Caught at service layer, wrapped in standard error format

> **Note**: PostgreSQL is the only supported database for this feature. The partial unique index and enum types depend on PostgreSQL-specific features.

## Testing Strategy

### Backend Testing (pytest + hypothesis)

**Unit Tests:**
- Model creation with default values
- Status transition validation logic
- Service layer business rules

**Property-Based Tests (Hypothesis):**
- Property 1: Entity creation defaults
- Property 2: Timestamp behavior
- Property 3: Status transition rules
- Property 4: Single active assignment constraint
- Property 5: Referential integrity
- Property 6: Admin endpoint authorization
- Property 7: CRUD round-trip consistency
- Property 8: Error response format

**Integration Tests:**
- Full API flow with real database
- Migration execution and rollback
- Concurrent assignment creation

### Test Configuration

- Backend: pytest with hypothesis, minimum 100 iterations per property
- Each property test tagged with: `Feature: core-data-model, Property N: <property_text>`
- Database tests use test database with transaction rollback

### Test Database Setup

```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base

TEST_DATABASE_URL = "postgresql://test:test@localhost:5432/bloom_test"

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.rollback()
    session.close()
    Base.metadata.drop_all(engine)
```

## AWS Infrastructure

### RDS Configuration (Dev Environment)

- **Engine**: PostgreSQL 15
- **Instance Class**: db.t3.micro (dev)
- **Storage**: 20 GB gp3
- **Multi-AZ**: No (dev only)
- **Public Access**: No (VPC only)
- **Security Group**: Allow inbound 5432 from App Runner

### Environment Variables

```bash
# Option 1: Full connection URL
DATABASE_URL=postgresql://bloom_user:password@bloom-dev.xxxxx.us-east-1.rds.amazonaws.com:5432/bloom

# Option 2: Component variables
DB_HOST=bloom-dev.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=bloom
DB_USER=bloom_user
DB_PASSWORD=<from-secrets-manager>
```

### Secrets Management

- Database password stored in AWS Secrets Manager
- App Runner configured to inject secret as environment variable
- No credentials in code or config files
