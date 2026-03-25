"""
CloudWatch custom metrics for Bloom platform monitoring.

Publishes key business metrics:
- bloom.deliveries.generated (count per run)
- bloom.deliveries.success_rate (delivered / total)
- bloom.payments.failed (count)
- bloom.subscriptions.active (gauge)

All metrics are fire-and-forget — failures are logged but never block.
"""

import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

NAMESPACE = "Bloom"


def _get_client():
    """Get CloudWatch client, returning None if unavailable."""
    try:
        return boto3.client("cloudwatch")
    except Exception as e:
        logger.debug(f"CloudWatch not available: {e}")
        return None


def put_metric(name: str, value: float, unit: str = "Count", dimensions: Optional[list] = None) -> None:
    """Publish a single metric data point to CloudWatch."""
    client = _get_client()
    if not client:
        return
    try:
        metric_data = {
            "MetricName": name,
            "Value": value,
            "Unit": unit,
        }
        if dimensions:
            metric_data["Dimensions"] = dimensions
        client.put_metric_data(Namespace=NAMESPACE, MetricData=[metric_data])
    except ClientError as e:
        logger.debug(f"Failed to publish metric {name}: {e}")
    except Exception as e:
        logger.debug(f"Metric publish error: {e}")


def record_deliveries_generated(count: int) -> None:
    """Record number of deliveries generated in a single run."""
    put_metric("deliveries.generated", float(count))


def record_delivery_success_rate(rate: float) -> None:
    """Record delivery success rate (0.0 to 1.0)."""
    put_metric("deliveries.success_rate", rate, unit="None")


def record_payment_failed() -> None:
    """Increment failed payment counter."""
    put_metric("payments.failed", 1.0)


def record_active_subscriptions(count: int) -> None:
    """Record current active subscription gauge."""
    put_metric("subscriptions.active", float(count), unit="Count")
