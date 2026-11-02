"""Single-operator authentication service for ORCHESTRA AI.

Provides HMAC-SHA256 token generation, constant-time verification,
cookie handling, and session management using only Python standard library.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional, Tuple
from fastapi import Request, Response
from app.config import settings


def _base64url_encode(data: bytes) -> str:
    """Encode bytes into base64url string without trailing padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data_str: str) -> bytes:
    """Decode base64url string into bytes with normalized padding."""
    padding = "=" * (4 - (len(data_str) % 4)) if len(data_str) % 4 != 0 else ""
    return base64.urlsafe_b64decode((data_str + padding).encode("ascii"))


class AuthService:
    """Manages token issuance, HMAC-SHA256 verification, and cookie security."""

    def verify_password(self, provided_password: str) -> bool:
        """Constant-time password comparison to prevent timing attacks."""
        if not settings.auth_password or not provided_password:
            return False
        return secrets.compare_digest(provided_password.strip(), settings.auth_password.strip())

    def create_token(self, subject: str = "operator") -> Tuple[str, int]:
        """Issue an HMAC-SHA256 signed, expiring session token.

        Returns (token_str, expires_at_timestamp).
        """
        secret = settings.auth_secret_key or "ephemeral_development_secret"
        now = int(time.time())
        expires_at = now + (settings.auth_token_expire_hours * 3600)

        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "sub": subject,
            "iat": now,
            "exp": expires_at,
            "nonce": secrets.token_hex(8),
        }

        header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        payload_b64 = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        message = f"{header_b64}.{payload_b64}".encode("ascii")

        signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()
        signature_b64 = _base64url_encode(signature)

        token = f"{header_b64}.{payload_b64}.{signature_b64}"
        return token, expires_at

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify HMAC-SHA256 signature and expiration timestamp.

        Returns decoded payload dict if valid, or None if invalid/expired/tampered.
        """
        if not token or not isinstance(token, str):
            return None

        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts
        secret = settings.auth_secret_key or "ephemeral_development_secret"

        try:
            # Recompute expected signature
            message = f"{header_b64}.{payload_b64}".encode("ascii")
            expected_sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()
            actual_sig = _base64url_decode(signature_b64)

            # Timing-attack safe signature check
            if not hmac.compare_digest(actual_sig, expected_sig):
                return None

            # Decode payload
            payload_bytes = _base64url_decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            # Check expiration
            exp = payload.get("exp", 0)
            if time.time() >= exp:
                return None

            return payload
        except Exception:
            return None

    def get_cookie_params(self, request: Optional[Request] = None) -> Dict[str, Any]:
        """Determine secure cookie attributes based on protocol and environment."""
        is_https = False
        if request is not None:
            proto = request.headers.get("x-forwarded-proto", request.url.scheme).lower()
            is_https = (proto == "https")
        elif not settings.debug:
            is_https = True

        # In production or HTTPS cross-origin: SameSite=None and Secure=True
        # In local development HTTP: SameSite=Lax and Secure=False
        if settings.auth_cookie_secure is not None:
            secure = settings.auth_cookie_secure
            samesite = "none" if secure else "lax"
        elif is_https:
            secure = True
            samesite = "none"
        else:
            secure = False
            samesite = "lax"

        return {
            "key": settings.auth_cookie_name,
            "httponly": True,
            "secure": secure,
            "samesite": samesite,
            "path": "/",
        }

    def set_session_cookie(self, response: Response, token: str, request: Optional[Request] = None) -> None:
        """Set HttpOnly session cookie on the outgoing response."""
        params = self.get_cookie_params(request)
        max_age = settings.auth_token_expire_hours * 3600
        response.set_cookie(
            key=params["key"],
            value=token,
            max_age=max_age,
            expires=max_age,
            httponly=params["httponly"],
            secure=params["secure"],
            samesite=params["samesite"],
            path=params["path"],
        )

    def clear_session_cookie(self, response: Response, request: Optional[Request] = None) -> None:
        """Clear session cookie to log out the browser session."""
        params = self.get_cookie_params(request)
        response.delete_cookie(
            key=params["key"],
            path=params["path"],
            httponly=params["httponly"],
            secure=params["secure"],
            samesite=params["samesite"],
        )


auth_service = AuthService()

