from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (at least 6 characters)")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User registered email")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int
    user: UserResponse


class SessionInfoResponse(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None
    app_name: str
    environment: str
    gemini_configured: bool
