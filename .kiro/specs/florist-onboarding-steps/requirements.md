# Requirements Document

## Introduction

This feature adds an onboarding steps section to the florist Settings page. The section displays three sequential setup steps as cards at the top of the page: Link a Store, Link Products, and Turn on Deliveries. Each card shows completion status and opens a modal when clicked to complete that step.

## Glossary

- **Onboarding_Steps_Section**: A UI component displaying three setup step cards at the top of the florist Settings page
- **Step_Card**: A clickable card representing one onboarding step with status indicator and action trigger
- **Step_Modal**: A modal dialog that opens when a step card is clicked, allowing the florist to complete that step
- **Florist**: A user with the florist role who fulfills flower deliveries for properties

## Requirements

### Requirement 1: Display Onboarding Steps Section

**User Story:** As a florist, I want to see my onboarding progress at the top of the Settings page, so that I know what steps I need to complete to start receiving deliveries.

#### Acceptance Criteria

1. WHEN a florist visits the Settings page, THE Onboarding_Steps_Section SHALL display three Step_Cards in a horizontal row at the top of the page
2. THE Onboarding_Steps_Section SHALL display the steps in this order: "Link a Store", "Link Products", "Turn on Deliveries"
3. WHEN the page loads, THE Onboarding_Steps_Section SHALL show before all other settings content
4. THE Onboarding_Steps_Section SHALL be responsive and stack vertically on mobile viewports

### Requirement 2: Step Card Display and Status

**User Story:** As a florist, I want to see the status of each onboarding step, so that I know which steps are complete and which need attention.

#### Acceptance Criteria

1. WHEN a step is incomplete, THE Step_Card SHALL display an empty circle indicator and muted styling
2. WHEN a step is complete, THE Step_Card SHALL display a checkmark indicator and success styling
3. THE Step_Card SHALL display a step number, title, and brief description
4. WHEN a florist hovers over a Step_Card, THE Step_Card SHALL show a hover state indicating it is clickable

### Requirement 3: Step Card Interaction

**User Story:** As a florist, I want to click on a step card to complete that step, so that I can progress through onboarding efficiently.

#### Acceptance Criteria

1. WHEN a florist clicks on a Step_Card, THE System SHALL open the corresponding Step_Modal
2. WHEN a Step_Modal is open, THE System SHALL display a backdrop overlay behind the modal
3. WHEN a florist clicks outside the Step_Modal or presses Escape, THE System SHALL close the modal
4. WHEN a florist completes a step in the modal, THE System SHALL update the Step_Card status to complete

### Requirement 4: Link a Store Step

**User Story:** As a florist, I want to connect my Shopify store to Bloom, so that my products can be synced to the platform.

#### Acceptance Criteria

1. WHEN the "Link a Store" Step_Modal opens, THE System SHALL display Shopify connection instructions
2. THE Step_Modal SHALL include a placeholder button for initiating Shopify OAuth (future implementation)
3. WHEN the store is successfully linked, THE System SHALL mark the "Link a Store" step as complete

### Requirement 5: Link Products Step

**User Story:** As a florist, I want to select which products from my store are available on Bloom, so that I can control my catalog.

#### Acceptance Criteria

1. WHEN the "Link Products" Step_Modal opens, THE System SHALL display product selection interface placeholder
2. IF the "Link a Store" step is incomplete, THEN THE Step_Modal SHALL show a message indicating the store must be linked first
3. WHEN products are successfully linked, THE System SHALL mark the "Link Products" step as complete

### Requirement 6: Turn on Deliveries Step

**User Story:** As a florist, I want to enable deliveries when I'm ready, so that I can start receiving orders from Bloom.

#### Acceptance Criteria

1. WHEN the "Turn on Deliveries" Step_Modal opens, THE System SHALL display a toggle or confirmation to enable deliveries
2. IF the "Link Products" step is incomplete, THEN THE Step_Modal SHALL show a message indicating products must be linked first
3. WHEN deliveries are enabled, THE System SHALL mark the "Turn on Deliveries" step as complete
4. WHEN all three steps are complete, THE Onboarding_Steps_Section SHALL display a success state indicating setup is complete
