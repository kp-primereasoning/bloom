"""
Pure computation functions for the PM Dashboard.

All functions are side-effect-free and operate on simple inputs
(primitives, dataclasses, or duck-typed objects with known attributes).
This makes them straightforward to test with property-based testing.
"""

from datetime import datetime


def compute_reward_tier(participation_rate: float) -> str:
    """
    Determine reward tier from participation rate.

    Thresholds:
      - Bronze: 0% to 49%  (rate < 50)
      - Silver: 50% to 74% (50 <= rate < 75)
      - Gold:   75% to 100% (rate >= 75)
    """
    if participation_rate >= 75.0:
        return "Gold"
    elif participation_rate >= 50.0:
        return "Silver"
    return "Bronze"


def compute_participation_rate(active: int, total: int) -> float:
    """
    Compute participation rate as a percentage.

    Returns 0.0 when total is 0 to avoid division by zero.
    """
    if total == 0:
        return 0.0
    return round((active / total) * 100, 2)


def compute_tier_progress(participation_rate: float, tier: str) -> dict:
    """
    Compute progress toward the next reward tier.

    Returns a dict with:
      - next_tier: str | None  (None when already Gold)
      - progress_to_next: float  (0.0–1.0, clamped; 1.0 for Gold)
      - threshold_for_next: int | None
    """
    if tier == "Gold":
        return {
            "next_tier": None,
            "progress_to_next": 1.0,
            "threshold_for_next": None,
        }
    elif tier == "Silver":
        progress = (participation_rate - 50.0) / 25.0
        return {
            "next_tier": "Gold",
            "progress_to_next": min(max(progress, 0.0), 1.0),
            "threshold_for_next": 75,
        }
    else:  # Bronze
        progress = participation_rate / 50.0
        return {
            "next_tier": "Silver",
            "progress_to_next": min(max(progress, 0.0), 1.0),
            "threshold_for_next": 50,
        }


def compute_delivery_summary(deliveries, cutoff_date: datetime) -> dict:
    """
    Count deliveries by status for records within the cutoff window.

    Each item in *deliveries* must expose `.status` (a string or enum
    whose `.value` is one of DELIVERED / SKIPPED / MISSED / SCHEDULED)
    and `.scheduled_for` (a datetime).

    Only deliveries with ``scheduled_for >= cutoff_date`` are counted.
    """
    summary = {"delivered": 0, "skipped": 0, "missed": 0, "scheduled": 0}
    for d in deliveries:
        if d.scheduled_for >= cutoff_date:
            status_val = d.status.value if hasattr(d.status, "value") else d.status
            key = status_val.lower()
            if key in summary:
                summary[key] += 1
    return summary


def compute_plan_distribution(residents) -> dict:
    """
    Count residents by subscription plan.

    Each item in *residents* must expose `.subscription_plan` (a string
    or enum whose `.value` is one of ESSENTIAL / SIGNATURE / STATEMENT,
    or None for unsubscribed residents).
    """
    distribution = {"essential": 0, "signature": 0, "statement": 0}
    for r in residents:
        plan = r.subscription_plan
        if plan is None:
            continue
        plan_val = plan.value if hasattr(plan, "value") else plan
        key = plan_val.lower()
        if key in distribution:
            distribution[key] += 1
    return distribution


def sort_deliveries_descending(deliveries: list) -> list:
    """
    Sort deliveries by scheduled_for in descending order (newest first).

    Each item must expose `.scheduled_for` (a datetime).
    Returns a new sorted list (does not mutate the input).
    """
    return sorted(deliveries, key=lambda d: d.scheduled_for, reverse=True)


def filter_deliveries_by_status(deliveries: list, status: str) -> list:
    """
    Filter deliveries to only those matching the given status string.

    Each item must expose `.status` (a string or enum with `.value`).
    Returns a new filtered list.
    """
    result = []
    for d in deliveries:
        status_val = d.status.value if hasattr(d.status, "value") else d.status
        if status_val == status:
            result.append(d)
    return result


def paginate_items(items: list, page: int, page_size: int) -> list:
    """
    Return a page slice of items.

    page is 1-indexed. Returns an empty list if page is out of range.
    """
    if page < 1 or page_size < 1:
        return []
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end]


def compute_upcoming_delivery_stats(deliveries, now: datetime) -> dict:
    """
    Compute upcoming delivery count and next delivery date.

    Filters deliveries to those with SCHEDULED status and
    ``scheduled_for > now``. Returns a dict with:
      - upcoming_delivery_count: int
      - next_delivery_date: datetime | None  (earliest future scheduled delivery)

    Each item in *deliveries* must expose `.status` (a string or enum
    whose `.value` is one of DELIVERED / SKIPPED / MISSED / SCHEDULED)
    and `.scheduled_for` (a datetime).
    """
    upcoming = []
    for d in deliveries:
        status_val = d.status.value if hasattr(d.status, "value") else d.status
        if status_val == "SCHEDULED" and d.scheduled_for > now:
            upcoming.append(d)

    if not upcoming:
        return {"upcoming_delivery_count": 0, "next_delivery_date": None}

    upcoming.sort(key=lambda d: d.scheduled_for)
    return {
        "upcoming_delivery_count": len(upcoming),
        "next_delivery_date": upcoming[0].scheduled_for,
    }
