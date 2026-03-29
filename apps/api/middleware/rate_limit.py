"""
Simple in-memory rate limiting middleware.

Uses a sliding window counter per client IP. Good enough for a single
App Runner instance — if you scale to multiple instances, swap this
for a Redis-backed or API Gateway throttle.
"""

import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Default: 60 requests per minute per IP
DEFAULT_RATE_LIMIT = 60
DEFAULT_WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit: int = DEFAULT_RATE_LIMIT, window: int = DEFAULT_WINDOW_SECONDS):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window = window
        self._hits: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, key: str, now: float) -> None:
        cutoff = now - self.window
        self._hits[key] = [t for t in self._hits[key] if t > cutoff]

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and test environments
        import os
        if request.url.path in ("/health", "/health/db") or os.environ.get("TESTING") == "true":
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        now = time.time()
        self._cleanup(client_ip, now)

        if len(self._hits[client_ip]) >= self.rate_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please try again later.",
                    }
                },
                headers={"Retry-After": str(self.window)},
            )

        self._hits[client_ip].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.rate_limit - len(self._hits[client_ip]))
        )
        return response
