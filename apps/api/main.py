"""
Bloom API - FastAPI Backend Service
"""

import os

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from middleware.exceptions import http_exception_handler, validation_exception_handler
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.florist import router as florist_router
from routes.pm import router as pm_router
from routes.customer import router as customer_router

app = FastAPI(
    title="Bloom API",
    description="Backend API for the Bloom floral subscription platform",
    version="0.1.0",
)

# Register global exception handlers for consistent error format
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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


def run_migrations():
    """Run Alembic migrations on startup."""
    try:
        from alembic.config import Config
        from alembic import command
        import os
        
        # Get the directory where main.py is located
        base_dir = os.path.dirname(os.path.abspath(__file__))
        alembic_ini = os.path.join(base_dir, "alembic.ini")
        
        alembic_cfg = Config(alembic_ini)
        alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
        
        print("Running database migrations...")
        command.upgrade(alembic_cfg, "head")
        print("Migrations complete.")
    except Exception as e:
        print(f"Migration error (non-fatal): {e}")


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run migrations and seed dev users on startup."""
    # Run migrations first
    run_migrations()
    
    # Seed dev users in development mode
    if os.environ.get("ENVIRONMENT") == "development":
        from db.seed import seed_dev_users
        await seed_dev_users()

