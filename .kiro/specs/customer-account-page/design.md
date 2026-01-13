# Design Document: Customer Account Page

## Overview

The Customer Account page is a read-only dashboard displaying profile information, building assignment, billing placeholder, and support links. It follows the established card-based layout pattern used in other customer pages (Subscriptions, Deliveries, Help).

The page fetches user data from the existing `GET /auth/me` endpoint which already returns `property_name` resolved server-side. No API changes are required.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DashboardLayout                          │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │   Sidebar   │  │         AccountPage                  │  │
│  │             │  │  ┌─────────────────────────────────┐ │  │
│  │  • Home     │  │  │      Profile Card               │ │  │
│  │  • Sub...   │  │  │  Email | user@example.com       │ │  │
│  │  • Deliv... │  │  │  Member since | Jan 1, 2025     │ │  │
│  │  • Account ←│  │  └─────────────────────────────────┘ │  │
│  │  • Help     │  │  ┌─────────────────────────────────┐ │  │
│  │             │  │  │      Building Card              │ │  │
│  │             │  │  │  Building | Sunset Apartments   │ │  │
│  │             │  │  │  [Change building]              │ │  │
│  │             │  │  └─────────────────────────────────┘ │  │
│  │             │  │  ┌─────────────────────────────────┐ │  │
│  │             │  │  │      Billing Card (Placeholder) │ │  │
│  │             │  │  │  Coming soon message            │ │  │
│  │             │  │  │  [Disabled buttons]             │ │  │
│  │             │  │  └─────────────────────────────────┘ │  │
│  │             │  │  ┌─────────────────────────────────┐ │  │
│  │             │  │  │      Support Card               │ │  │
│  │             │  │  │  FAQ link | Email link          │ │  │
│  │             │  │  └─────────────────────────────────┘ │  │
│  └─────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### AccountPage Component

Main page component at `apps/web/src/pages/customer/AccountPage.tsx`.

```typescript
// State
interface AccountPageState {
  userData: MeResponse | null;
  isLoading: boolean;
  error: string | null;
}

// Component structure
function AccountPage() {
  // Fetch user data on mount via getMe()
  // Render loading skeleton while fetching
  // Render error state if fetch fails
  // Render 4 cards: Profile, Building, Billing, Support
}
```

### Card Components

Reuse the Card wrapper pattern from HelpPage:

```typescript
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
```

### Profile Card

```typescript
// 2-column table layout
<Card className="p-6">
  <h1 className="text-2xl font-bold text-gray-900 mb-4">Account</h1>
  <table className="w-full">
    <tbody>
      <tr>
        <td className="py-2 text-gray-600">Email</td>
        <td className="py-2 text-gray-900">{userData.email}</td>
      </tr>
      <tr>
        <td className="py-2 text-gray-600">Member since</td>
        <td className="py-2 text-gray-900">{formatDate(userData.created_at)}</td>
      </tr>
    </tbody>
  </table>
</Card>
```

### Building Card

```typescript
<Card className="p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Building</h2>
  <table className="w-full">
    <tbody>
      <tr>
        <td className="py-2 text-gray-600">Building</td>
        <td className="py-2 text-gray-900">
          {userData.property_name || 'Not selected'}
        </td>
      </tr>
    </tbody>
  </table>
  
  {/* CTA based on property_id */}
  {userData.property_id ? (
    <Link to="/onboarding/property" className="text-blue-600 hover:underline mt-4 inline-block">
      Change building
    </Link>
  ) : (
    <button 
      onClick={() => navigate('/onboarding/property')}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Select your building
    </button>
  )}
</Card>
```

### Billing Card (Placeholder)

```typescript
<Card className="p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
  <p className="text-gray-600 mb-4">
    Billing is coming soon. You'll manage payment methods and invoices here.
  </p>
  <div className="flex gap-3">
    <button 
      disabled 
      className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
    >
      Update payment method
    </button>
    <button 
      disabled 
      className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
    >
      View invoices
    </button>
  </div>
</Card>
```

### Support Card

```typescript
<Card className="p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Support</h2>
  <div className="space-y-2">
    <Link to="/customer/help" className="text-blue-600 hover:underline block">
      Frequently Asked Questions
    </Link>
    <a 
      href="mailto:support@bloom.com?subject=Bloom%20Support" 
      className="text-blue-600 hover:underline block"
    >
      Email Support
    </a>
  </div>
</Card>
```

## Data Models

### Existing Types (No Changes Required)

The `MeResponse` type in `packages/shared/src/types/domain.ts` already includes all required fields:

```typescript
export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  property_name: string | null;  // Already resolved server-side
  subscription_status: SubscriptionStatus | null;
  created_at: string;
}
```

### API Client (No Changes Required)

The `getMe()` function in `apps/web/src/lib/api.ts` already exists and returns `MeResponse`.

## Routing Configuration

### Route Definition

Add to router configuration:

```typescript
{
  path: '/customer/account',
  element: <AccountPage />,
}
```

### Sidebar Configuration

The sidebar already includes Account link (verified in sidebarConfig.ts):

```typescript
{ label: 'Account', path: '/customer/account' },
```

### Route Protection

Uses existing `ProtectedRoute` and `RoleGuard` components:
- Unauthenticated → redirect to `/login`
- Non-CUSTOMER → redirect to role's default path

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, the following consolidations were made:
- Requirements 3.2 and 3.3 (email and date display) can be combined into a single property about profile data rendering
- Requirements 4.1 and 4.2 (property_name display) can be combined into a single property about building display
- Requirements 7.1, 7.2, 7.3 (no subscription UI) can be combined into a single property

### Properties

**Property 1: Non-CUSTOMER role redirect**
*For any* user with a role other than CUSTOMER, navigating to `/customer/account` should redirect them to their role's default landing page.
**Validates: Requirements 1.4**

**Property 2: Profile data display**
*For any* valid MeResponse with email and created_at, the Profile Card should display the email value and a formatted date string derived from created_at.
**Validates: Requirements 3.2, 3.3**

**Property 3: Building display based on property state**
*For any* MeResponse, the Building Card should display `property_name` when set, or "Not selected" when `property_id` is null.
**Validates: Requirements 4.1, 4.2**

**Property 4: No subscription UI elements**
*For any* rendered Account Page, there should be no elements containing subscription status text, subscription management buttons, or plan selection options.
**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### API Failure

When `getMe()` fails:
1. Set `error` state with error message
2. Display error card with message and "Try again" button
3. "Try again" reloads the page

### Loading State

While fetching data:
1. Display skeleton cards matching the layout
2. Use `animate-pulse` class for loading animation

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Route existence**: Verify `/customer/account` route renders AccountPage
2. **Loading state**: Verify skeleton displays during fetch
3. **Error state**: Verify error message and retry button on API failure
4. **Profile card content**: Verify email and date display
5. **Building card - no property**: Verify "Not selected" and CTA button
6. **Building card - with property**: Verify property name and change link
7. **Billing placeholder**: Verify text and disabled buttons
8. **Support links**: Verify FAQ and email links
9. **No subscription UI**: Verify absence of subscription elements

### Property-Based Tests

Property tests use Vitest with fast-check for randomized input testing:

1. **Role redirect property**: Generate non-CUSTOMER roles, verify redirect
2. **Profile data property**: Generate random emails/dates, verify display
3. **Building display property**: Generate MeResponse with/without property, verify correct display
4. **No subscription UI property**: Render with various MeResponse states, verify no subscription elements

Configuration:
- Minimum 100 iterations per property test
- Tag format: `Feature: customer-account-page, Property N: {property_text}`
