# Requirements Document

## Introduction

This feature provides a read-only Help page for Bloom customers that displays FAQs in an accordion layout. FAQs are stored in a static JSON configuration file on the backend and rendered by the frontend. The page supports markdown formatting in answers and includes mailto links for support contact.

## Glossary

- **FAQ_Service**: The backend service responsible for serving FAQ content from the static JSON configuration
- **FAQ_Page**: The frontend Help page component that renders FAQs in an accordion layout
- **FAQ_Item**: A single FAQ entry containing an id, question, and markdown-formatted answer
- **Accordion_Component**: The UI component that displays FAQ items with expand/collapse functionality

## Requirements

### Requirement 1: Static FAQ Configuration

**User Story:** As a developer, I want to store FAQs in a static JSON configuration file, so that FAQ content can be updated through deployment without database changes.

#### Acceptance Criteria

1. THE FAQ_Service SHALL read FAQ content from a static JSON file located at `apps/api/config/faq.json`
2. WHEN the JSON file is loaded, THE FAQ_Service SHALL validate that it contains a version number and items array
3. THE FAQ_Item SHALL contain an id (string), question (string), and answer_markdown (string) field
4. THE FAQ_Service SHALL support markdown formatting in the answer_markdown field including bold text, links, and mailto links

### Requirement 2: Public FAQ Endpoint

**User Story:** As a customer, I want to access FAQ content without authentication, so that I can get help even before logging in.

#### Acceptance Criteria

1. THE FAQ_Service SHALL expose a GET endpoint at `/public/faq`
2. WHEN a request is made to `/public/faq`, THE FAQ_Service SHALL return the full contents of the faq.json file
3. THE FAQ_Service SHALL NOT require authentication for the `/public/faq` endpoint
4. WHEN the faq.json file is valid, THE FAQ_Service SHALL return a 200 status code with the FAQ content
5. THE FAQ_Service SHALL include at least one FAQ item with a mailto support link in the format `[support@bloom.com](mailto:support@bloom.com?subject=Bloom%20Support)`

### Requirement 3: Customer Help Page Route

**User Story:** As a customer, I want to access a Help page from my dashboard, so that I can find answers to common questions.

#### Acceptance Criteria

1. THE FAQ_Page SHALL be accessible at the route `/customer/help`
2. WHEN a user with CUSTOMER role navigates to `/customer/help`, THE FAQ_Page SHALL display the Help page
3. WHEN a user without CUSTOMER role navigates to `/customer/help`, THE FAQ_Page SHALL redirect them to their role-specific landing page
4. THE FAQ_Page SHALL display a page title of "Help"
5. THE FAQ_Page SHALL display a subtitle of "Frequently asked questions"

### Requirement 4: Accordion FAQ Display

**User Story:** As a customer, I want to view FAQs in an accordion format, so that I can easily browse questions and expand only the ones I'm interested in.

#### Acceptance Criteria

1. THE Accordion_Component SHALL render each FAQ_Item as an expandable card
2. WHEN a user clicks on a collapsed FAQ_Item, THE Accordion_Component SHALL expand that item to show the answer
3. WHEN a user expands an FAQ_Item, THE Accordion_Component SHALL collapse any previously expanded item (single-item expansion)
4. THE Accordion_Component SHALL animate expand/collapse transitions smoothly
5. THE Accordion_Component SHALL render answer_markdown content with proper markdown formatting (bold text, links, mailto links)

### Requirement 5: Mailto Link Support

**User Story:** As a customer, I want to click a support email link in the FAQ, so that I can easily contact support with my email client.

#### Acceptance Criteria

1. WHEN the answer_markdown contains a mailto link, THE Accordion_Component SHALL render it as a clickable link
2. WHEN a user clicks a mailto link, THE FAQ_Page SHALL open the user's default email client
3. THE mailto link SHALL include a pre-filled subject line

### Requirement 6: Shared Types

**User Story:** As a developer, I want shared TypeScript types for FAQ data, so that the frontend and backend have consistent type definitions.

#### Acceptance Criteria

1. THE FAQ_Item interface SHALL define id (string), question (string), and answer_markdown (string) properties
2. THE FAQResponse interface SHALL define version (number) and items (FAQItem array) properties
3. THE API client SHALL provide a getFAQ() function that returns Promise<FAQResponse>
