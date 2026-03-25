"""
Email notification service for the Bloom platform.

Wraps the SES client with business logic:
- Checks if user has email notifications enabled
- Respects PM notification preferences from pm_preferences table
- Fires and forgets (never blocks request processing)
- Logs failures but doesn't raise
"""

import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


def _get_ses():
    """Get SES client, returning None if unavailable."""
    try:
        from services.aws.ses import get_ses_client
        return get_ses_client()
    except Exception as e:
        logger.debug(f"SES not available: {e}")
        return None


async def _is_notifications_enabled(user_id: Optional[UUID] = None) -> bool:
    """Check if a user has email notifications enabled."""
    if user_id is None:
        return True
    try:
        from db.users import get_user_by_id
        user = await get_user_by_id(user_id)
        if user and hasattr(user, "email_notifications_enabled"):
            return user.email_notifications_enabled
    except Exception:
        pass
    return True  # Default to enabled


def _is_pm_pref_enabled(pm_user_id: UUID, pref_field: str) -> bool:
    """Check a specific PM notification preference from pm_preferences table.

    Args:
        pm_user_id: The PM's user ID.
        pref_field: One of 'delivery_reminders', 'participation_updates', 'rewards_milestones'.

    Returns True if the preference is enabled (or no record exists — defaults on).
    """
    try:
        from db.database import SessionLocal
        from models.pm_preference import PMPreference

        db = SessionLocal()
        try:
            pref = db.query(PMPreference).filter(PMPreference.user_id == pm_user_id).first()
            if pref:
                return getattr(pref, pref_field, True)
        finally:
            db.close()
    except Exception:
        pass
    return True


def send_welcome(to_email: str) -> None:
    """Send welcome email on registration. Always sends (no pref check)."""
    ses = _get_ses()
    if ses:
        ses.send_welcome(to_email)


def send_subscription_confirmed(to_email: str, property_name: str) -> None:
    """Send subscription confirmation email."""
    ses = _get_ses()
    if ses:
        ses.send_subscription_confirmation(to_email, property_name)


def send_delivery_scheduled(
    to_email: str, delivery_date: str, property_name: Optional[str] = None
) -> None:
    """Send delivery scheduled notification."""
    ses = _get_ses()
    if ses:
        ses.send_delivery_scheduled(to_email, delivery_date, property_name)


def send_delivery_completed(
    to_email: str, photo_url: Optional[str] = None, delivery_date: Optional[str] = None
) -> None:
    """Send delivery completed notification."""
    ses = _get_ses()
    if ses:
        ses.send_delivery_completed(to_email, photo_url, delivery_date)


def send_delivery_missed(to_email: str, delivery_date: Optional[str] = None) -> None:
    """Send delivery missed notification."""
    ses = _get_ses()
    if ses:
        ses.send_delivery_missed(to_email, delivery_date)


def send_payment_receipt(
    to_email: str, amount: str, plan: Optional[str] = None
) -> None:
    """Send payment receipt."""
    ses = _get_ses()
    if ses:
        ses.send_payment_receipt(to_email, amount, plan)


def send_payment_failed(to_email: str) -> None:
    """Send payment failed notification."""
    ses = _get_ses()
    if ses:
        ses.send_payment_failed(to_email)


# ── PM-specific helpers (respect pm_preferences) ────────────────────

def send_pm_delivery_reminder(
    pm_user_id: UUID, to_email: str, property_name: str, delivery_date: str
) -> None:
    """Send delivery reminder to PM, respecting their delivery_reminders preference."""
    if not _is_pm_pref_enabled(pm_user_id, "delivery_reminders"):
        return
    ses = _get_ses()
    if ses:
        try:
            ses.send_delivery_scheduled(to_email, delivery_date, property_name)
        except Exception as e:
            logger.debug(f"Failed to send PM delivery reminder: {e}")


def send_pm_participation_update(
    pm_user_id: UUID, to_email: str, property_name: str, rate: float
) -> None:
    """Send participation update to PM, respecting their participation_updates preference."""
    if not _is_pm_pref_enabled(pm_user_id, "participation_updates"):
        return
    ses = _get_ses()
    if ses:
        try:
            subject = f"Bloom — Participation update for {property_name}"
            body = f"The current participation rate at {property_name} is {rate:.0%}."
            ses.send_email(to_email, subject, body)
        except Exception as e:
            logger.debug(f"Failed to send PM participation update: {e}")


def send_pm_rewards_milestone(
    pm_user_id: UUID, to_email: str, property_name: str, tier: str
) -> None:
    """Send rewards milestone to PM, respecting their rewards_milestones preference."""
    if not _is_pm_pref_enabled(pm_user_id, "rewards_milestones"):
        return
    ses = _get_ses()
    if ses:
        try:
            subject = f"Bloom — New reward tier for {property_name}"
            body = f"Congratulations! {property_name} has reached the {tier} reward tier."
            ses.send_email(to_email, subject, body)
        except Exception as e:
            logger.debug(f"Failed to send PM rewards milestone: {e}")
