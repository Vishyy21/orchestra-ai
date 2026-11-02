"""Shared API dependencies and route guards for ORCHESTRA AI."""

from fastapi import Request, HTTPException, status
from app.config import settings
from app.services.auth_service import auth_service


async def verify_authenticated(request: Request) -> bool:
    """Verify that the incoming request carries a valid authenticated session.

    Execution logic:
    1. Pass-through if AUTH_ENABLED=False (preserves local dev and test isolation).
    2. Read HttpOnly cookie `orchestra_session`.
    3. Check fallback `Authorization: Bearer <token>` header.
    4. Validate HMAC-SHA256 signature and expiration timestamp.
    """
    if not settings.auth_enabled:
        return True

    # 1. Read HttpOnly cookie
    token = request.cookies.get(settings.auth_cookie_name)

    # 2. Check fallback Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    # 3. Reject if missing
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid session cookie or token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Verify cryptographic signature & expiration
    payload = auth_service.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Store verified operator context on request state
    request.state.auth_user = payload.get("sub", "operator")
    return True

