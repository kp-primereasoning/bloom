# Design Document

## Overview

This design adds an onboarding steps section to the florist Settings page. The section consists of three clickable step cards displayed horizontally at the top of the page, each opening a modal when clicked. The feature uses React components with local state management and follows the existing UI patterns in the codebase.

## Architecture

The feature follows a component-based architecture with:
- A parent `OnboardingSteps` component managing step state
- Individual `StepCard` components for each step
- Three modal components for step completion flows
- Local state for step completion status (persisted via localStorage for MLP)

```
┌─────────────────────────────────────────────────────────────┐
│                    SettingsPage                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              OnboardingSteps Section                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │  │
│  │  │  StepCard   │ │  StepCard   │ │  StepCard   │      │  │
│  │  │ Link Store  │ │Link Products│ │Turn On Del. │      │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Existing Settings Content                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### OnboardingSteps Component

```typescript
interface OnboardingStep {
  id: 'link-store' | 'link-products' | 'turn-on-deliveries';
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
}

interface OnboardingStepsProps {
  onStepComplete: (stepId: string) => void;
}
```

### StepCard Component

```typescript
interface StepCardProps {
  step: OnboardingStep;
  onClick: () => void;
  disabled?: boolean;
}
```

### Modal Components

```typescript
interface StepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// LinkStoreModal - Shopify connection placeholder
// LinkProductsModal - Product selection placeholder  
// TurnOnDeliveriesModal - Enable deliveries toggle
```

## Data Models

### Step State (localStorage)

```typescript
interface FloristOnboardingState {
  storeLinked: boolean;
  productsLinked: boolean;
  deliveriesEnabled: boolean;
  completedAt?: string; // ISO timestamp when all steps complete
}

// localStorage key: 'florist_onboarding_state'
```

### Step Configuration

```typescript
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'link-store',
    number: 1,
    title: 'Link a Store',
    description: 'Connect your Shopify store to sync products',
    isComplete: false,
  },
  {
    id: 'link-products',
    number: 2,
    title: 'Link Products',
    description: 'Select which products to offer on Bloom',
    isComplete: false,
  },
  {
    id: 'turn-on-deliveries',
    number: 3,
    title: 'Turn on Deliveries',
    description: 'Start receiving delivery requests',
    isComplete: false,
  },
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Step Card Indicator Matches Completion State

*For any* step and any completion state (true or false), the StepCard component SHALL render a checkmark indicator when complete and an empty circle indicator when incomplete.

**Validates: Requirements 2.1, 2.2**

### Property 2: Step Card Contains Required Information

*For any* step configuration, the rendered StepCard SHALL contain the step number, title, and description text.

**Validates: Requirements 2.3**

### Property 3: Click Opens Corresponding Modal

*For any* step card, clicking it SHALL result in the corresponding modal being opened (link-store → LinkStoreModal, link-products → LinkProductsModal, turn-on-deliveries → TurnOnDeliveriesModal).

**Validates: Requirements 3.1**

### Property 4: Step Completion Updates State

*For any* step, when the onComplete callback is triggered from its modal, the step's completion state SHALL be updated to true and persisted.

**Validates: Requirements 3.4, 4.3, 5.3, 6.3**

### Property 5: Prerequisite Steps Block Dependent Steps

*For any* step with prerequisites (link-products requires link-store, turn-on-deliveries requires link-products), if the prerequisite is incomplete, the modal SHALL display a prerequisite message instead of the completion interface.

**Validates: Requirements 5.2, 6.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| localStorage unavailable | Fall back to in-memory state, warn user state won't persist |
| Invalid state in localStorage | Reset to default state (all steps incomplete) |
| Modal fails to open | Log error, show toast notification |

## Testing Strategy

### Unit Tests
- Verify three step cards render in correct order
- Verify onboarding section appears before other settings content
- Verify modal backdrop renders when modal is open
- Verify modal closes on Escape key and click outside
- Verify specific modal content (Shopify instructions, product placeholder, delivery toggle)
- Verify success state displays when all steps complete

### Property-Based Tests
- Use fast-check to generate random completion states and verify indicator rendering
- Test step card information rendering across all step configurations
- Test modal opening behavior for all step types
- Test state persistence round-trip (save → load → verify)
- Test prerequisite validation across all dependency combinations

