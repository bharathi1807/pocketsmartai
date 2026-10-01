"""Authentication and user session routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user, get_optional_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
    SessionInfoResponse,
)

router = APIRouter(prefix="/api", tags=["Authentication & Session"])


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and return JWT access token."""
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email, "id": new_user.id, "name": new_user.name})
    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(new_user),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate email and password, returning JWT access token."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email, "id": user.id, "name": user.name})
    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Log out user session (client should discard the JWT token)."""
    return {"message": "Logged out successfully", "user_id": current_user.id}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Fetch the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.get("/session-info", response_model=SessionInfoResponse)
async def get_session_info(user: User = Depends(get_optional_user)):
    """Check application runtime status and current user authentication state."""
    return SessionInfoResponse(
        authenticated=bool(user),
        user=UserResponse.model_validate(user) if user else None,
        app_name=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
        gemini_configured=bool(settings.GEMINI_API_KEY)
    )


@router.get("/session-data")
async def get_session_data(user: User = Depends(get_optional_user)):
    """Return lightweight session metadata for frontend initialization."""
    return {
        "authenticated": bool(user),
        "user": {"id": user.id, "name": user.name, "email": user.email} if user else None,
        "capabilities": {
            "home_planner": True,
            "party_planner": True,
            "jewelry_planner": True,
            "image_analysis": True,
            "gemini_active": bool(settings.GEMINI_API_KEY),
        }
    }
