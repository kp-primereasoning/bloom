# Design Document

## Overview

This design describes the implementation of the Bloom monorepo scaffold with a role-based dashboard shell. The system consists of three main parts: a React frontend with role-gated routing, a minimal FastAPI backend, and a shared TypeScript package for type definitions.

The architecture prioritizes developer experience and clear separation of concerns, enabling rapid iteration on business features in future phases.

## Architecture

```mermaid
graph TB
    subgraph "Monorepo Root"
        README[README.md]
        subgraph "/apps/web"
            WebApp[Vite + React App]
            Router[React Router]
            DashboardLayout[Dashboard Layout]
            RoleSwitcher[Role Switcher]
            Pages[Placeholder Pages]
        end
        subgraph "/apps/api"
            FastAPI[FastAPI Service]
            HealthEndpoint[/health Endpoint]
        end
        subgraph "/packages/shared"
            Types[TypeScript Types]
            RoleEnum[UserRole Enum]
        end
    end
    
    WebApp --> Router
    Router --> DashboardLayout
    DashboardLayout --> RoleSwitcher
    DashboardLayout --> Pages
    WebApp --> Types
    RoleSwitcher -->|localStorage| Browser[(Browser Storage)]
```

## Components and Interfaces

### Shared Package (`/packages/shared`)

```typescript
// types/roles.ts
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  FLORIST = 'FLORIST',
  ADMIN = 'ADMIN'
}

// types/navigation.ts
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export interface RoleConfig {
  role: UserRole;
  namespace: string;
  defaultPath: string;
  navItems: NavItem[];
}
```

### Frontend Components

#### DashboardLayout Component

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Renders:
// - Left sidebar with role-based navigation
// - Top bar with app name and role switcher
// - Main content area with children
```

#### RoleSwitcher Component

```typescript
interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

// Renders dropdown in top bar
// Persists selection to localStorage
```

#### Sidebar Component

```typescript
interface SidebarProps {
  navItems: NavItem[];
  currentPath: string;
}

// Renders navigation items based on current role
// Highlights active route
```

### Sidebar Configuration

```typescript
const sidebarConfig: Record<UserRole, RoleConfig> = {
  [UserRole.CUSTOMER]: {
    role: UserRole.CUSTOMER,
    namespace: '/customer',
    defaultPath: '/customer/home',
    navItems: [
      { label: 'Home', path: '/customer/home' },
      { label: 'My Subscription', path: '/customer/subscription' },
      { label: 'Deliveries', path: '/customer/deliveries' },
      { label: 'Account', path: '/customer/account' }
    ]
  },
  [UserRole.PROPERTY_MANAGER]: {
    role: UserRole.PROPERTY_MANAGER,
    namespace: '/pm',
    defaultPath: '/pm/overview',
    navItems: [
      { label: 'Overview', path: '/pm/overview' },
      { label: 'Participation', path: '/pm/participation' },
      { label: 'Rewards', path: '/pm/rewards' },
      { label: 'Settings', path: '/pm/settings' }
    ]
  },
  [UserRole.FLORIST]: {
    role: UserRole.FLORIST,
    namespace: '/florist',
    defaultPath: '/florist/deliveries',
    navItems: [
      { label: 'Upcoming Deliveries', path: '/florist/deliveries' },
      { label: 'Product Mapping', path: '/florist/products' },
      { label: 'Availability', path: '/florist/availability' },
      { label: 'Settings', path: '/florist/settings' }
    ]
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    namespace: '/admin',
    defaultPath: '/admin/properties',
    navItems: [
      { label: 'Properties', path: '/admin/properties' },
      { label: 'Florists', path: '/admin/florists' },
      { label: 'Assignments', path: '/admin/assignments' },
      { label: 'Exceptions', path: '/admin/exceptions' }
    ]
  }
};
```

### Backend API

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Bloom API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

## Data Models

### Role Storage (localStorage)

```typescript
// Key: 'bloom_dev_role'
// Value: UserRole enum string
// Example: 'CUSTOMER' | 'PROPERTY_MANAGER' | 'FLORIST' | 'ADMIN'
```

### Route Structure

| Role | Namespace | Routes |
|------|-----------|--------|
| CUSTOMER | `/customer` | `/home`, `/subscription`, `/deliveries`, `/account` |
| PROPERTY_MANAGER | `/pm` | `/overview`, `/participation`, `/rewards`, `/settings` |
| FLORIST | `/florist` | `/deliveries`, `/products`, `/availability`, `/settings` |
| ADMIN | `/admin` | `/properties`, `/florists`, `/assignments`, `/exceptions` |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sidebar Configuration Correctness

*For any* valid UserRole, the sidebar configuration SHALL return exactly the nav items specified for that role, with correct labels and paths.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 2: Placeholder Page Completeness

*For any* navigation item in the sidebar configuration, there SHALL exist a corresponding placeholder page that renders both the page title and a "coming soon" description.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 3: Role Persistence Round-Trip

*For any* UserRole stored via the Role_Switcher, reloading the application SHALL restore that same role from localStorage.

**Validates: Requirements 5.3, 5.4**

### Property 4: Route Namespace Consistency

*For any* UserRole, all routes accessible to that role SHALL be prefixed with the role's designated namespace (/customer, /pm, /florist, /admin).

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 5: Unauthorized Route Redirect

*For any* UserRole and *for any* route outside that role's namespace, attempting to access that route SHALL redirect to the role's default landing page.

**Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9**

## Error Handling

### Frontend Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid role in localStorage | Default to CUSTOMER role |
| Route not found within namespace | Show 404 placeholder within dashboard layout |
| Route outside role namespace | Redirect to role's default landing page |

### Backend Error Handling

| Scenario | Response |
|----------|----------|
| Unknown endpoint | 404 Not Found |
| Server error | 500 Internal Server Error with JSON body |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

- Dashboard layout renders all three sections (sidebar, topbar, content)
- Role switcher dropdown contains all four role options
- Health endpoint returns 200 with correct JSON structure
- Shared package exports UserRole enum with correct values

### Property-Based Tests

Property-based tests will use Vitest with fast-check to verify universal properties:

- **Library**: fast-check (for Vitest)
- **Minimum iterations**: 100 per property test
- **Tag format**: `Feature: repo-scaffold-dashboard-shell, Property N: [description]`

Each correctness property will be implemented as a single property-based test that generates random inputs and verifies the property holds.

### Test Organization

```
/apps/web/src/
├── __tests__/
│   ├── sidebar-config.test.ts      # Property 1
│   ├── placeholder-pages.test.ts   # Property 2
│   ├── role-persistence.test.ts    # Property 3
│   ├── route-namespace.test.ts     # Property 4
│   └── route-redirect.test.ts      # Property 5
```

### Integration Tests

- Verify web app starts and renders dashboard
- Verify API responds to health check
- Verify shared package imports work in web app
