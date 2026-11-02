"""Authentication API router for ORCHESTRA AI.

Provides password verification, session cookie delivery, and session status.
"""

from typing import Optional
from fastapi import APIRouter, Request, Response, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])


class LoginRequest(BaseModel):
    """Payload for operator login."""
    password: str = Field(..., min_length=1, description="Operator access password")


class LoginResponse(BaseModel):
    """Result of operator login attempt."""
    success: bool
    message: str
    expires_at: Optional[int] = None
    token: Optional[str] = None


class AuthStatusResponse(BaseModel):
    """Current authentication status for frontend synchronization."""
    auth_enabled: bool
    authenticated: bool
    expires_at: Optional[int] = None


class LogoutResponse(BaseModel):
    """Result of operator logout."""
    success: bool
    message: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, response: Response):
    """POST /api/auth/login — Authenticate with operator password and issue HttpOnly session cookie."""
    if not settings.auth_enabled:
        return LoginResponse(
            success=True,
            message="Authentication is disabled on this backend instance.",
            expires_at=None,
            token=None,
        )

    # Constant-time password verification
    if not auth_service.verify_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator access key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate token
    token, expires_at = auth_service.create_token(subject="operator")

    # Set secure HttpOnly cookie on response
    auth_service.set_session_cookie(response, token, request)

    return LoginResponse(
        success=True,
        message="Authentication successful. Session established.",
        expires_at=expires_at,
        token=token,
    )


@router.get("/status", response_model=AuthStatusResponse)
def get_auth_status(request: Request):
    """GET /api/auth/status — Check if authentication is active and if current request is authenticated."""
    if not settings.auth_enabled:
        return AuthStatusResponse(
            auth_enabled=False,
            authenticated=True,
            expires_at=None,
        )

    # Check cookie first
    token = request.cookies.get(settings.auth_cookie_name)

    # Check fallback header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return AuthStatusResponse(
            auth_enabled=True,
            authenticated=False,
            expires_at=None,
        )

    payload = auth_service.verify_token(token)
    if not payload:
        return AuthStatusResponse(
            auth_enabled=True,
            authenticated=False,
            expires_at=None,
        )

    return AuthStatusResponse(
        auth_enabled=True,
        authenticated=True,
        expires_at=payload.get("exp"),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(request: Request, response: Response):
    """POST /api/auth/logout — Explicitly invalidate browser session by purging HttpOnly cookie."""
    auth_service.clear_session_cookie(response, request)
    return LogoutResponse(
        success=True,
        message="Session successfully cleared.",
    )

