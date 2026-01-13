# Design Document: Property Selection Actions

## Overview

This design adds row selection and contextual actions to the admin Properties table. The implementation follows React patterns with local component state for selection, and leverages existing API endpoints where possible while adding minimal new functionality.

## Architecture

The feature is primarily frontend-focused, with one new backend endpoint needed for fetching property managers. The existing `PATCH /admin/properties/{id}` and `PATCH /admin/properties/{id}/assign-pm` endpoints will be used, along with the existing `POST /admin/property-assignments` endpoint for florist assignment.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PropertiesPage.tsx                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ State: selectedPropertyId, modals (edit/florist/pm)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌───────────────────────────┼───────────────────────────────┐ │
│  │                    Action Bar                              │ │
│  │  [Add Property] OR [Edit] [Assign Florist] [Assign PM]    │ │
│  └───────────────────────────┼───────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────┼───────────────────────────────┐ │
│  │              AdminTable (with selection)                   │ │
│  │  [☐] Name | Address | Users | Florist | PM | Status       │ │
│  │  [☑] Sunset Towers | 123 Main | 5 | Rosa's | pm@... | ... │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ EditModal   │ │ AssignFlorist   │ │ AssignPMModal   │       │
│  │             │ │ Modal           │ │                 │       │
│  └─────────────┘ └─────────────────┘ └─────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Updated AdminTable Component

The AdminTable component will be extended to support optional row selection:

```typescript
interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  error: string | null;
  keyField: keyof T;
  // New optional selection props
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}
```

### New Modal Components

#### AssignFloristModal

```typescript
interface AssignFloristModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  currentFloristId?: string;
  onSuccess: () => void;
}
```

#### AssignPMModal

```typescript
interface AssignPMModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  currentPMId?: string;
  onSuccess: () => void;
}
```

#### EditPropertyModal

Reuses the existing AddModal pattern but pre-populates with existing data:

```typescript
interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: EnrichedProperty;
  onSuccess: () => void;
}
```

### API Endpoints

#### Existing Endpoints Used

- `GET /admin/properties` - List enriched properties
- `PATCH /admin/properties/{id}` - Update property details
- `PATCH /admin/properties/{id}/assign-pm` - Assign property manager
- `POST /admin/property-assignments` - Create florist assignment
- `GET /admin/florists` - List available florists

#### New Endpoint Required

- `GET /admin/users?role=PROPERTY_MANAGER` - List users filtered by role

### Backend Changes

Add query parameter support to the users endpoint:

```python
@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List users, optionally filtered by role."""
    users = await get_all_users()
    if role:
        users = [u for u in users if u.role == role]
    return [UserResponse.model_validate(u) for u in users]
```

## Data Models

No new data models required. Uses existing:

- `EnrichedProperty` - Property with computed fields
- `FloristResponse` - Florist data
- `UserResponse` - User data including role

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Single Selection Invariant

*For any* sequence of selection actions on the Properties table, at most one property SHALL be selected at any time.

**Validates: Requirements 1.2, 1.3**

### Property 2: Action Bar State Consistency

*For any* selection state, the Action Bar SHALL display "Add Property" if and only if no property is selected, and SHALL display "Edit Property", "Assign Florist", "Assign PM" if and only if a property is selected.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Selection Toggle Idempotence

*For any* property, clicking its checkbox twice (select then deselect) SHALL return the UI to its initial state with no property selected.

**Validates: Requirements 1.3, 1.4**

### Property 4: Edit Modal Data Integrity

*For any* property, opening the Edit modal SHALL display the exact current values of name, address, and delivery_cadence from the selected property.

**Validates: Requirements 3.1, 3.2**

### Property 5: Assignment Updates Status

*For any* property, after successfully assigning a florist or PM, the property's status SHALL be recomputed according to the status computation rules (CREATED → PENDING_* → ACTIVE).

**Validates: Requirements 4.4, 5.4**

## Error Handling

### Frontend Error Handling

- API errors display in modal error state
- Network failures show user-friendly message
- Validation errors prevent form submission

### Backend Error Handling

- 404 if property/florist/user not found
- 400 if user doesn't have PROPERTY_MANAGER role (for PM assignment)
- 409 if assignment already exists (handled gracefully)

## Testing Strategy

### Unit Tests

- AdminTable selection behavior
- Action bar conditional rendering
- Modal open/close state management

### Property-Based Tests

- Selection state invariants (single selection)
- Action bar state consistency
- Modal data population correctness

### Integration Tests

- Full flow: select → assign florist → verify status update
- Full flow: select → assign PM → verify status update
- Full flow: select → edit → verify data persisted
