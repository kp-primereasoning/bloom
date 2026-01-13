"""
Request ID middleware for request tracing.

Generates or propagates a unique request ID for each API request,
enabling correlation of logs and error responses.
"""

import uuid
from contextvars import ContextVar
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable for thread-safe request ID storage
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates/propagates request IDs for tracing.
    
    - If client provides X-Request-ID header, use that value
    - Otherwise, generate a new UUID
    - Store in contextvars for access throughout request lifecycle
    - Add X-Request-ID to response headers
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Use client-provided ID or generate new one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Store in context for access by other components
        request_id_var.set(request_id)
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


def get_request_id() -> str:
    """
    Get current request ID from context.
    
    Returns the request ID for the current request, or generates
    a new UUID if called outside of a request context.
    """
    return request_id_var.get() or str(uuid.uuid4())
