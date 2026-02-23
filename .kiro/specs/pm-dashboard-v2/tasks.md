# Implementation Plan: PM Dashboard V2

## Overview

Enhance the existing PM dashboard from basic stats/resident views to a production-ready experience with delivery visibility, participation insights, backend-persisted rewards, settings management, and comprehensive property-based tests. All backend work extends the existing `apps/api/routes/pm.py` and all frontend work extends the existing `apps/web/src/pages/pm/` pages.

## Tasks

- [x] 1. Create new database models and migration
  - [x] 1.1 Create `PropertyReward` SQLAlchemy model in `apps/api/models/property_reward.py`
    - Fields: id, property_id (FK to properties, unique), tier, participation_rate, created_at, updated_at
    - _Requirements: 3.1, 3.2_
  - [x] 1.2 Create `PMPreference` SQLAlchemy model in `apps/api/models/pm_preference.py`
    - Fields: id, user_id (unique), delivery_reminders, participation_updates, rewards_milestones, created_at, updated_at
    - _Requirements: 4.2_
  - [x] 1.3 Create Alembic migration for `property_rewards` and `pm_preferences` tables
    - _Requirements: 3.2, 4.2_

- [x] 2. Implement pure computation functions and their property tests
  - [x] 2.1 Create `apps/api/services/pm_computations.py` with pure functions
    - `compute_reward_tier(participation_rate: float) -> str`
    - `compute_participation_rate(active: int, total: int) -> float`
    - `compute_tier_progress(participation_rate: float, tier: str) -> dict` returning next_tier, progress_to_next, threshold_for_next
    - `compute_delivery_summary(deliveries, cutoff_date) -> DeliverySummary`
    - `compute_plan_distribution(residents) -> PlanDistribution`
    - _Requirements: 3.1, 3.3, 1.3, 2.1_
  - [x] 2.2 Write property test: Tier computation follows threshold rules
    - **Property 5: Tier computation follows threshold rules**
    - Generate random participation rates 0.0-100.0, verify tier matches threshold rules
    - **Validates: Requirements 3.1**
  - [x] 2.3 Write property test: Progress-to-next-tier computation is correct
    - **Property 7: Progress-to-next-tier computation is correct**
    - Generate random rates, verify progress fraction and next_tier values
    - **Validates: Requirements 3.3**
  - [x] 2.4 Write property test: Delivery summary counts match actual records
    - **Property 2: Delivery summary counts match actual records**
    - Generate random delivery lists with various statuses and dates, verify summary counts
    - **Validates: Requirements 1.3**
  - [x] 2.5 Write property test: Plan distribution sums match resident counts
    - **Property 3: Plan distribution sums match resident counts**
    - Generate random resident lists with various plans, verify distribution counts
    - **Validates: Requirements 2.1**

- [x] 3. Enhance existing PM backend endpoints
  - [x] 3.1 Enhance `GET /pm/stats` to include next_delivery_date, upcoming_delivery_count, and participation_rate
    - Query deliveries table for SCHEDULED deliveries with future dates scoped to PM's property
    - Add new fields to `PMStatsResponse` schema
    - _Requirements: 1.1, 6.2_
  - [x] 3.2 Enhance `GET /pm/residents` to include plan_distribution in response
    - Add `PlanDistribution` model and compute from resident data
    - Add to `PMResidentsResponse` schema
    - _Requirements: 2.1, 6.2_
  - [x] 3.3 Write property test: Upcoming delivery stats are accurate
    - **Property 1: Upcoming delivery stats are accurate**
    - Generate random delivery sets, verify upcoming count and next date
    - **Validates: Requirements 1.1**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement new PM deliveries endpoint
  - [x] 5.1 Add `GET /pm/deliveries` endpoint to `apps/api/routes/pm.py`
    - Query deliveries for PM's property with pagination (page, page_size params)
    - Optional status filter query param
    - Join with user data for resident_email and unit
    - Return sorted by scheduled_for descending
    - Include DeliverySummary for last 90 days
    - Add response schemas: PMDeliveryItem, DeliverySummary, PMDeliveriesResponse
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2_
  - [x] 5.2 Write property test: Delivery history sorted and complete
    - **Property 9: Delivery history is sorted descending and complete**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 5.3 Write property test: Status filter returns only matching deliveries
    - **Property 11: Status filter returns only matching deliveries**
    - **Validates: Requirements 5.4**
  - [x] 5.4 Write property test: Pagination covers all records without overlap
    - **Property 10: Pagination covers all records without overlap**
    - **Validates: Requirements 5.2**

- [x] 6. Implement rewards endpoint with persistence
  - [x] 6.1 Add `GET /pm/rewards` endpoint to `apps/api/routes/pm.py`
    - Compute current participation rate and tier using pure functions
    - Upsert `property_rewards` record with current tier and rate
    - Return RewardTierInfo with tier, benefits, progress, and tier_definitions
    - Add response schemas: RewardTierInfo, TierDefinition, PMRewardsResponse
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.2_
  - [x] 6.2 Write property test: Rewards persistence round-trip
    - **Property 6: Rewards persistence round-trip**
    - **Validates: Requirements 3.2**

- [x] 7. Implement settings endpoints
  - [x] 7.1 Add `GET /pm/settings` and `PATCH /pm/settings` endpoints to `apps/api/routes/pm.py`
    - GET returns PM profile info (email, property name/address) and notification preferences
    - PATCH updates notification preferences only (upsert pm_preferences record)
    - Add response schemas: PMSettingsResponse, NotificationPreferences, PMSettingsUpdate
    - _Requirements: 4.1, 4.2, 6.2_
  - [x] 7.2 Write property test: Notification preferences round-trip
    - **Property 8: Notification preferences round-trip**
    - **Validates: Requirements 4.2**

- [x] 8. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add frontend API client functions
  - [x] 9.1 Add API client functions in `apps/web/src/lib/api.ts`
    - `getPMDeliveries(params)` → GET /pm/deliveries
    - `getPMRewards()` → GET /pm/rewards
    - `getPMSettings()` → GET /pm/settings
    - `updatePMSettings(data)` → PATCH /pm/settings
    - Update `PMStatsResponse` type with new fields
    - Update `PMResidentsResponse` type with plan_distribution
    - _Requirements: 1.1, 2.1, 3.3, 4.1, 5.1_

- [x] 10. Enhance OverviewPage frontend
  - [x] 10.1 Update `apps/web/src/pages/pm/OverviewPage.tsx`
    - Add "Next Delivery" card showing next_delivery_date and upcoming_delivery_count from enhanced stats
    - Add "Delivery Summary" section showing delivered/skipped/missed counts (fetch from /pm/deliveries summary)
    - Handle empty state when no deliveries scheduled
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 11. Enhance ParticipationPage frontend
  - [x] 11.1 Update `apps/web/src/pages/pm/ParticipationPage.tsx`
    - Add plan distribution summary cards above the resident table
    - Add client-side sorting for resident table (by unit, status, plan)
    - Add sort controls to table headers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 11.2 Write property test: Resident sorting produces correct order
    - **Property 4: Resident sorting produces correct order**
    - Use fast-check to generate random resident arrays, verify sort correctness
    - **Validates: Requirements 2.4**

- [x] 12. Update RewardsPage to use backend data
  - [x] 12.1 Update `apps/web/src/pages/pm/RewardsPage.tsx`
    - Replace client-side tier computation with data from `GET /pm/rewards`
    - Display tier, benefits, and progress from API response
    - Keep existing tier card and benefits UI structure
    - _Requirements: 3.3, 3.5_

- [x] 13. Implement SettingsPage frontend
  - [x] 13.1 Create `apps/web/src/pages/pm/SettingsPage.tsx`
    - Profile section (read-only): email, property name, property address
    - Notification preferences section with toggle switches
    - Optimistic UI: toggle updates immediately, reverts on API error
    - Error banner on save failure
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 14. Wire up routing and navigation
  - [x] 14.1 Add SettingsPage route and update PM sidebar navigation
    - Add `/pm/settings` route pointing to SettingsPage
    - Ensure sidebar "Settings" link navigates correctly
    - _Requirements: 4.3_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Backend uses Python (FastAPI + SQLAlchemy + hypothesis for PBT)
- Frontend uses TypeScript (React + Vite + vitest + fast-check for PBT)
- All new endpoints follow existing PM route patterns (JWT auth, role check, property scoping)
- Checkpoints ensure incremental validation
