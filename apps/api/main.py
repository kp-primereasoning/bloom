"""
Bloom API - FastAPI Backend Service
"""

import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from middleware.exceptions import http_exception_handler, validation_exception_handler
from middleware.request_id import RequestIDMiddleware, get_request_id
from middleware.rate_limit import RateLimitMiddleware
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.florist import router as florist_router
from routes.pm import router as pm_router
from routes.customer import router as customer_router
from routes.health import router as health_router
from routes.properties import router as properties_router
from routes.me import router as me_router
from routes.public import router as public_router
from routes.deliveries import router as deliveries_router
from routes.florist_api import router as florist_api_router
from routes.payments import router as payments_router
from routes.webhooks import router as webhooks_router
from routes.admin_payouts import router as admin_payouts_router


# Initialize Sentry if configured
if sentry_dsn := os.environ.get("SENTRY_DSN"):
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
            environment=os.environ.get("ENVIRONMENT", "development"),
            send_default_pii=False,  # Don't send PII by default
        )
        print(f"Sentry initialized for environment: {os.environ.get('ENVIRONMENT', 'development')}")
    except ImportError:
        print("Sentry SDK not installed, skipping error tracking initialization")


def run_migrations():
    """Run Alembic migrations on startup using subprocess to avoid blocking."""
    import subprocess
    import sys
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        print("Running database migrations...")
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=base_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("Migrations complete.")
        else:
            print(f"Migration warning: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("Migration timeout (non-fatal)")
    except Exception as e:
        print(f"Migration error (non-fatal): {e}")


def run_seeding_sync():
    """Run database seeding synchronously."""
    from db.seed import seed_dev_users_sync
    seed_dev_users_sync()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    run_migrations()
    if os.environ.get("ENVIRONMENT") == "development":
        print("Seeding dev data...")
        run_seeding_sync()
        print("Dev data seeded.")
    yield
    # Shutdown (nothing needed currently)


is_production = os.environ.get("ENVIRONMENT") == "production"

app = FastAPI(
    title="Bloom API",
    description="Backend API for the Bloom floral subscription platform. "
    "Bloom orchestrates property-based floral subscriptions — connecting residents, "
    "property managers, florists, and admins.",
    version="0.1.0",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
    openapi_tags=[
        {"name": "health", "description": "Health checks and service status"},
        {"name": "auth", "description": "Authentication and registration"},
        {"name": "me", "description": "Customer self-service (profile, subscription, deliveries)"},
        {"name": "payments", "description": "Stripe payment methods, subscriptions, and invoices"},
        {"name": "customer", "description": "Customer dashboard endpoints"},
        {"name": "florist", "description": "Florist dashboard, deliveries, and availability"},
        {"name": "florist-api", "description": "Shopify app integration endpoints (API key auth)"},
        {"name": "pm", "description": "Property manager dashboard and settings"},
        {"name": "admin", "description": "Admin CRUD for properties, florists, users, assignments"},
        {"name": "admin-payouts", "description": "Admin florist payout generation and history"},
        {"name": "webhooks", "description": "Stripe and Shopify webhook handlers"},
        {"name": "properties", "description": "Public property listing"},
        {"name": "public", "description": "Public endpoints (FAQ, etc.)"},
        {"name": "deliveries", "description": "Delivery management (admin)"},
    ],
)

# Register global exception handlers for consistent error format
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for debugging and error tracking."""
    request_id = get_request_id()
    print(f"[ERROR] [{request_id}] Unhandled exception: {exc}")
    traceback.print_exc()
    
    # Report to Sentry if configured
    if os.environ.get("SENTRY_DSN"):
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("request_id", request_id)
                scope.set_context("request", {
                    "url": str(request.url),
                    "method": request.method,
                })
                sentry_sdk.capture_exception(exc)
        except ImportError:
            pass  # Sentry not installed
    
    # Never leak internal error details to clients in production
    is_prod = os.environ.get("ENVIRONMENT") == "production"
    message = "An internal error occurred. Please try again later." if is_prod else str(exc)
    
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": message, "request_id": request_id}}
    )

# CORS configuration — localhost only allowed outside production
allowed_origins: list[str] = []

if not is_production:
    allowed_origins += [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

# Add production domain if configured (WEB_DOMAIN for single domain)
if prod_domain := os.environ.get("WEB_DOMAIN"):
    allowed_origins.append(prod_domain)

# Add additional CORS origins (CORS_ORIGINS for comma-separated list)
if cors_origins := os.environ.get("CORS_ORIGINS"):
    for origin in cors_origins.split(","):
        origin = origin.strip()
        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # MLP: credentials=false
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],  # Explicitly allow Authorization
)

# Add request ID middleware for tracing
app.add_middleware(RequestIDMiddleware)

# Rate limiting: 60 requests/minute per IP
app.add_middleware(RateLimitMiddleware, rate_limit=60, window=60)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(florist_router)
app.include_router(pm_router)
app.include_router(customer_router)
app.include_router(health_router)
app.include_router(properties_router)
app.include_router(me_router)
app.include_router(public_router)
app.include_router(deliveries_router)
app.include_router(florist_api_router)
app.include_router(payments_router)
app.include_router(webhooks_router)
app.include_router(admin_payouts_router)
