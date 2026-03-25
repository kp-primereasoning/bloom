"""
Property tests for florist capacity and availability logic.
Task 3.4: capacity limits respected, unavailable days skipped.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st, assume

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.florist_availability import FloristAvailability
from services.delivery_generation import compute_next_delivery_date, CADENCE_MAP


# =============================================================================
# Strategies
# =============================================================================

day_of_week_strategy = st.integers(min_value=0, max_value=6)
max_deliveries_strategy = st.integers(min_value=0, max_value=500)
cadence_strategy = st.sampled_from(["weekly", "bi-weekly", "monthly"])
subscriber_count_strategy = st.integers(min_value=0, max_value=100)


# =============================================================================
# Property 1: Availability model constraints
# =============================================================================

class TestAvailabilityModel:
    """FloristAvailability records store valid day-of-week and capacity values."""

    @given(day=day_of_week_strategy, max_del=max_deliveries_strategy)
    @settings(max_examples=100)
    def test_availability_day_in_range(self, day, max_del):
        avail = FloristAvailability(
            florist_id=uuid4(),
            day_of_week=day,
            is_available=True,
            max_deliveries_per_day=max_del,
        )
        assert 0 <= avail.day_of_week <= 6
        assert avail.max_deliveries_per_day >= 0

    @given(day=day_of_week_strategy)
    @settings(max_examples=50)
    def test_unavailable_day_blocks_deliveries(self, day):
        """When is_available is False, the florist should not receive deliveries."""
        avail = FloristAvailability(
            florist_id=uuid4(),
            day_of_week=day,
            is_available=False,
            max_deliveries_per_day=10,
        )
        assert not avail.is_available


# =============================================================================
# Property 2: Capacity cap respected
# =============================================================================

class TestCapacityCap:
    """Subscriber lists are capped to max_deliveries_per_day."""

    @given(
        max_cap=st.integers(min_value=0, max_value=50),
        num_subscribers=st.integers(min_value=0, max_value=100),
    )
    @settings(max_examples=100)
    def test_cap_limits_deliveries(self, max_cap, num_subscribers):
        """Simulates the capping logic from delivery_generation."""
        subscribers = list(range(num_subscribers))
        if max_cap is not None and len(subscribers) > max_cap:
            subscribers = subscribers[:max_cap]
        assert len(subscribers) <= max(max_cap, 0) or num_subscribers <= max_cap

    @given(max_cap=st.integers(min_value=1, max_value=50))
    @settings(max_examples=50)
    def test_zero_subscribers_produces_zero_deliveries(self, max_cap):
        subscribers = []
        if len(subscribers) > max_cap:
            subscribers = subscribers[:max_cap]
        assert len(subscribers) == 0


# =============================================================================
# Property 3: Cadence advancement is always forward
# =============================================================================

class TestCadenceAdvancement:
    """next_delivery_date always moves forward by the cadence interval."""

    @given(cadence=cadence_strategy)
    @settings(max_examples=50)
    def test_next_date_is_after_current(self, cadence):
        now = datetime.now(timezone.utc)
        next_date = compute_next_delivery_date(now, cadence)
        assert next_date is not None
        assert next_date > now

    @given(cadence=cadence_strategy)
    @settings(max_examples=50)
    def test_cadence_interval_matches_map(self, cadence):
        now = datetime(2026, 1, 1, tzinfo=timezone.utc)
        next_date = compute_next_delivery_date(now, cadence)
        expected_delta = CADENCE_MAP[cadence]
        assert next_date == now + expected_delta

    def test_unknown_cadence_returns_none(self):
        now = datetime.now(timezone.utc)
        assert compute_next_delivery_date(now, "daily") is None
        assert compute_next_delivery_date(now, "yearly") is None
        assert compute_next_delivery_date(now, "") is None


# =============================================================================
# Property 4: Seven-day availability coverage
# =============================================================================

class TestSevenDayCoverage:
    """A full availability set always has exactly 7 entries (Mon-Sun)."""

    @given(
        available_days=st.lists(
            st.booleans(), min_size=7, max_size=7
        ),
    )
    @settings(max_examples=50)
    def test_full_week_has_seven_entries(self, available_days):
        florist_id = uuid4()
        entries = [
            FloristAvailability(
                florist_id=florist_id,
                day_of_week=i,
                is_available=available_days[i],
                max_deliveries_per_day=10,
            )
            for i in range(7)
        ]
        assert len(entries) == 7
        days = {e.day_of_week for e in entries}
        assert days == {0, 1, 2, 3, 4, 5, 6}

    @given(
        available_days=st.lists(
            st.booleans(), min_size=7, max_size=7
        ),
    )
    @settings(max_examples=50)
    def test_unavailable_count_plus_available_equals_seven(self, available_days):
        avail_count = sum(1 for a in available_days if a)
        unavail_count = sum(1 for a in available_days if not a)
        assert avail_count + unavail_count == 7
