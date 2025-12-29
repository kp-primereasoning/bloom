"""
Bloom API - FastAPI Backend Service
"""

import os
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from middleware.exceptions import http_exception_handler, validation_exception_handler
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.florist import router as florist_router
from routes.pm import router as pm_router
from routes.customer import router as customer_router


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


app = FastAPI(
    title="Bloom API",
    description="Backend API for the Bloom floral subscription platform",
    version="0.1.0",
)

# Register global exception handlers for consistent error format
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for debugging."""
    print(f"[ERROR] Unhandled exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": str(exc)}}
    )

# CORS configuration
allowed_origins = [
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

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(florist_router)
app.include_router(pm_router)
app.include_router(customer_router)


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {"status": "healthy"}


# Startup event - runs migrations and seeds dev data
@app.on_event("startup")
def startup_event():
    """Run migrations and seed on startup."""
    run_migrations()
    if os.environ.get("ENVIRONMENT") == "development":
        print("Seeding dev data...")
        run_seeding_sync()
        print("Dev data seeded.")
