"""
Global exception handlers for consistent error response format.
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from middleware.request_id import get_request_id


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Ensures all HTTP exceptions follow the standard error envelope format.
    
    Format: { "error": { "code": "...", "message": "...", "request_id": "..." } }
    """
    request_id = get_request_id()
    
    # If detail is already in our format, ensure request_id is present
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        exc.detail["error"]["request_id"] = request_id
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    
    # Otherwise, wrap in standard format
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "request_id": request_id
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Wraps FastAPI 422 validation errors in the standard error envelope format.
    
    Format: { "error": { "code": "VALIDATION_ERROR", "message": "...", "request_id": "..." } }
    """
    request_id = get_request_id()
    
    # Extract validation error details
    errors = exc.errors()
    
    # Build a human-readable message from validation errors
    error_messages = []
    for error in errors:
        loc = " -> ".join(str(l) for l in error["loc"])
        msg = error["msg"]
        error_messages.append(f"{loc}: {msg}")
    
    message = "; ".join(error_messages) if error_messages else "Validation failed"
    
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "request_id": request_id
            }
        }
    )
