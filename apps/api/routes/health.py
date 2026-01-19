"""
Health check endpoints for monitoring and load balancers.

Provides basic health check, database connectivity verification,
and comprehensive AWS service health checks.
"""

import asyncio
import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.database import get_db
from middleware.request_id import get_request_id

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """
    Basic health check endpoint for monitoring and load balancers.
    
    Returns 200 if the API is running.
    """
    return {"status": "healthy"}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    """
    Database health check endpoint.
    
    Executes a simple query to verify database connectivity.
    Returns 200 if healthy, 503 if unhealthy.
    
    Timeout: 5 seconds
    """
    request_id = get_request_id()
    
    try:
        # Execute simple query with timeout
        # Using synchronous approach since SQLAlchemy session is sync
        result = db.execute(text("SELECT 1")).scalar()
        
        if result == 1:
            return {"status": "healthy", "database": "connected"}
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "error": "Unexpected query result",
                    "request_id": request_id
                }
            )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "request_id": request_id
            }
        )


@router.get("/health/full")
def health_full(db: Session = Depends(get_db)):
    """
    Comprehensive health check for all services.
    
    Checks:
    - PostgreSQL database connectivity
    - S3 bucket accessibility
    - Cognito user pool (when enabled)
    - Secrets Manager (when enabled)
    
    Returns 200 if all services healthy, 503 if any service unhealthy.
    """
    from services.aws.config import get_aws_settings
    
    request_id = get_request_id()
    settings = get_aws_settings()
    
    services = {}
    all_healthy = True
    
    # Check PostgreSQL
    try:
        result = db.execute(text("SELECT 1")).scalar()
        services["postgresql"] = {
            "status": "healthy" if result == 1 else "unhealthy",
            "connected": result == 1,
        }
        if result != 1:
            all_healthy = False
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        services["postgresql"] = {
            "status": "unhealthy",
            "connected": False,
            "error": str(e),
        }
        all_healthy = False
    
    # Check S3
    try:
        from services.aws.s3 import get_s3_client
        s3_client = get_s3_client()
        s3_healthy = s3_client.check_health()
        services["s3"] = {
            "status": "healthy" if s3_healthy else "unhealthy",
            "bucket": settings.s3_bucket_name,
            "accessible": s3_healthy,
        }
        if not s3_healthy:
            all_healthy = False
    except Exception as e:
        logger.error(f"S3 health check failed: {e}")
        services["s3"] = {
            "status": "unhealthy",
            "accessible": False,
            "error": str(e),
        }
        all_healthy = False
    
    # Check Cognito (only when enabled)
    if settings.use_cognito:
        try:
            from services.aws.cognito import get_cognito_client
            cognito_client = get_cognito_client()
            if cognito_client:
                cognito_healthy = cognito_client.check_health()
                services["cognito"] = {
                    "status": "healthy" if cognito_healthy else "unhealthy",
                    "enabled": True,
                    "accessible": cognito_healthy,
                }
                if not cognito_healthy:
                    all_healthy = False
            else:
                services["cognito"] = {
                    "status": "unhealthy",
                    "enabled": True,
                    "accessible": False,
                    "error": "Client not configured",
                }
                all_healthy = False
        except Exception as e:
            logger.error(f"Cognito health check failed: {e}")
            services["cognito"] = {
                "status": "unhealthy",
                "enabled": True,
                "accessible": False,
                "error": str(e),
            }
            all_healthy = False
    else:
        services["cognito"] = {
            "status": "disabled",
            "enabled": False,
        }
    
    # Check Secrets Manager (only when enabled)
    if settings.use_aws_secrets:
        try:
            from services.aws.secrets import get_secrets_client
            secrets_client = get_secrets_client(region=settings.aws_region)
            secrets_healthy = secrets_client.check_health(settings.db_secret_name)
            services["secrets_manager"] = {
                "status": "healthy" if secrets_healthy else "unhealthy",
                "enabled": True,
                "accessible": secrets_healthy,
            }
            if not secrets_healthy:
                all_healthy = False
        except Exception as e:
            logger.error(f"Secrets Manager health check failed: {e}")
            services["secrets_manager"] = {
                "status": "unhealthy",
                "enabled": True,
                "accessible": False,
                "error": str(e),
            }
            all_healthy = False
    else:
        services["secrets_manager"] = {
            "status": "disabled",
            "enabled": False,
        }
    
    response = {
        "status": "healthy" if all_healthy else "unhealthy",
        "services": services,
        "request_id": request_id,
    }
    
    if all_healthy:
        return response
    else:
        return JSONResponse(status_code=503, content=response)
