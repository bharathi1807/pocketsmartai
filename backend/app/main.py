"""PocketSmart AI - FastAPI Main Application.

Entry point for the backend REST API with routers, CORS, database lifecycle,
and global error handlers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.database.database import init_db
from app.routes import (
    auth as auth_router,
    home as home_router,
    party as party_router,
    jewelry as jewelry_router,
    recommendations as rec_router,
    history as history_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initialize database tables upon startup."""
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Your Smart Budget & Recommendation Assistant. Powered by Google Gemini AI.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router.router)
app.include_router(home_router.router)
app.include_router(party_router.router)
app.include_router(jewelry_router.router)
app.include_router(rec_router.router)
app.include_router(history_router.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Normalize Pydantic validation errors for readable frontend consumption."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error in request parameters", "errors": errors},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Prevent raw Python stack traces from leaking to end users."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later or check input constraints.",
            "error_type": exc.__class__.__name__
        }
    )


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "endpoints": {
            "auth": "/api/auth/login",
            "home": "/api/planners/home",
            "party": "/api/planners/party",
            "jewelry": "/api/planners/jewelry",
            "history": "/api/history"
        }
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "gemini_configured": bool(settings.GEMINI_API_KEY)}
