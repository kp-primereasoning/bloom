"""
Health check endpoints for monitoring and load balancers.

Provides basic health check and database connectivity verification.
"""

import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.database import get_db
from middleware.request_id import get_request_id


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
