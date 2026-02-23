"""
AWS Lambda handler for scheduled delivery generation.

Triggered by CloudWatch Events on a daily schedule (e.g. cron(0 6 * * ? *)).
Connects to the same RDS database as the API and generates SCHEDULED
deliveries for all eligible properties.

Environment variables (same as the API):
  - DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
  - USE_AWS_SECRETS / DB_SECRET_NAME / AWS_REGION (optional)
"""

import asyncio
import json
import logging
import os
import sys

# Add the api root to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def handler(event, context):
    """Lambda entry point."""
    logger.info(f"Delivery generation triggered: {json.dumps(event)}")

    # Import here so the module-level DB connection only happens inside Lambda
    from db.database import SessionLocal
    from services.delivery_generation import run_delivery_generation

    db = SessionLocal()
    try:
        results = asyncio.get_event_loop().run_until_complete(
            run_delivery_generation(db)
        )

        summary = {
            "properties_processed": len(results),
            "total_deliveries_created": sum(r.get("created", 0) for r in results),
            "total_skipped": sum(r.get("skipped", 0) for r in results),
            "errors": [r for r in results if "error" in r],
            "details": results,
        }

        logger.info(f"Delivery generation complete: {json.dumps(summary)}")
        return {
            "statusCode": 200,
            "body": json.dumps(summary),
        }
    except Exception as e:
        logger.error(f"Delivery generation failed: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }
    finally:
        db.close()
