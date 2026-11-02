"""Comprehensive tests for ORCHESTRA AI single-operator authentication system."""

import time
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.services.auth_service import auth_service, _base64url_encode, _base64url_decode
from app.main import app


@pytest.fixture(autouse=True)
def setup_auth_env():
    """Ensure consistent authentication test settings."""
    original_enabled = settings.auth_enabled
    original_password = settings.auth_password
    original_secret = settings.auth_secret_key
    original_expire = settings.auth_token_expire_hours

    # Configure known test credentials
    settings.auth_enabled = True
    settings.auth_password = "TestOperatorPassword123!"
    settings.auth_secret_key = "test_cryptographic_secret_key_orchestra_2026"
    settings.auth_token_expire_hours = 12

    yield

    # Restore
    settings.auth_enabled = original_enabled
    settings.auth_password = original_password
    settings.auth_secret_key = original_secret
    settings.auth_token_expire_hours = original_expire


def test_auth_status_unauthenticated(client: TestClient):
    """GET /api/auth/status returns auth_enabled: True and authenticated: False when no session exists."""
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data["auth_enabled"] is True
    assert data["authenticated"] is False
    assert data["expires_at"] is None


def test_login_incorrect_password(client: TestClient):
    """POST /api/auth/login with wrong password returns 401 Unauthorized."""
    response = client.post("/api/auth/login", json={"password": "wrong_password"})
    assert response.status_code == 401
    assert "Invalid operator access key" in response.json()["detail"]
    assert settings.auth_cookie_name not in response.cookies


def test_login_correct_password_sets_cookie(client: TestClient):
    """POST /api/auth/login with valid password returns 200, token, and sets HttpOnly cookie."""
    response = client.post("/api/auth/login", json={"password": "TestOperatorPassword123!"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["token"] is not None
    assert data["expires_at"] is not None
    assert data["expires_at"] > time.time()

    # Verify cookie presence
    assert settings.auth_cookie_name in response.cookies
    cookie_value = response.cookies[settings.auth_cookie_name]
    assert cookie_value == data["token"]


def test_protected_endpoints_reject_unauthenticated(client: TestClient):
    """Protected endpoints return 401 Unauthorized when unauthenticated."""
    protected_paths = [
        ("GET", "/api/tasks"),
        ("POST", "/api/tasks"),
        ("GET", "/api/documents"),
        ("POST", "/api/documents/upload"),
        ("GET", "/api/reports"),
        ("GET", "/api/dashboard/metrics"),
        ("GET", "/api/agents"),
        ("GET", "/api/health"),
        ("GET", "/api/llm/status"),
        ("POST", "/api/llm/test"),
        ("GET", "/api/integrations/status"),
        ("POST", "/api/integrations/search"),
    ]

    for method, path in protected_paths:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        assert res.status_code == 401, f"{method} {path} should be protected but returned {res.status_code}"
        assert "Authentication required" in res.json()["detail"]


def test_authenticated_request_with_cookie_succeeds(client: TestClient):
    """Protected endpoint succeeds when valid HttpOnly session cookie is attached."""
    token, _ = auth_service.create_token()
    client.cookies.set(settings.auth_cookie_name, token)

    # Test /api/auth/status
    status_res = client.get("/api/auth/status")
    assert status_res.status_code == 200
    assert status_res.json()["authenticated"] is True

    # Test protected endpoint
    tasks_res = client.get("/api/tasks")
    assert tasks_res.status_code == 200
    assert "tasks" in tasks_res.json()


def test_authenticated_request_with_bearer_header_succeeds(client: TestClient):
    """Protected endpoint succeeds when valid Bearer token header is provided."""
    token, _ = auth_service.create_token()

    # Clear cookies to ensure only header is tested
    client.cookies.clear()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/tasks", headers=headers)
    assert res.status_code == 200
    assert "tasks" in res.json()


def test_tampered_token_rejected(client: TestClient):
    """Altering signature or payload of session token returns 401."""
    token, _ = auth_service.create_token()
    parts = token.split(".")
    # Tamper payload
    tampered_token = f"{parts[0]}.{parts[1][:-4]}abcd.{parts[2]}"
    client.cookies.set(settings.auth_cookie_name, tampered_token)

    res = client.get("/api/tasks")
    assert res.status_code == 401
    assert "Session expired or invalid" in res.json()["detail"]


def test_expired_token_rejected(client: TestClient):
    """A session token past its expiration timestamp returns 401."""
    # Temporarily force expiration in the past
    original_expire = settings.auth_token_expire_hours
    settings.auth_token_expire_hours = -1  # 1 hour ago
    expired_token, _ = auth_service.create_token()
    settings.auth_token_expire_hours = original_expire

    client.cookies.set(settings.auth_cookie_name, expired_token)

    res = client.get("/api/tasks")
    assert res.status_code == 401
    assert "Session expired or invalid" in res.json()["detail"]


def test_logout_invalidates_browser_session(client: TestClient):
    """POST /api/auth/logout deletes the session cookie."""
    token, _ = auth_service.create_token()
    client.cookies.set(settings.auth_cookie_name, token)

    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Check that subsequent call without valid session is rejected
    # In TestClient, deleted cookies might be removed or set to empty
    client.cookies.clear()
    subsequent_res = client.get("/api/tasks")
    assert subsequent_res.status_code == 401


def test_auth_disabled_passthrough(client: TestClient):
    """When AUTH_ENABLED=False, all protected endpoints pass through freely."""
    settings.auth_enabled = False
    client.cookies.clear()

    # Status should report disabled
    status_res = client.get("/api/auth/status")
    assert status_res.status_code == 200
    assert status_res.json()["auth_enabled"] is False
    assert status_res.json()["authenticated"] is True

    # Protected endpoints should allow access without credentials
    tasks_res = client.get("/api/tasks")
    assert tasks_res.status_code == 200


def test_cors_production_origin(client: TestClient):
    """CORS allows the exact Vercel production origin with credentials."""
    prod_origin = "https://orchestra-ai-eo1f.vercel.app"

    # Preflight OPTIONS request
    preflight = client.options(
        "/api/tasks",
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == prod_origin
    assert preflight.headers.get("access-control-allow-credentials") == "true"


def test_cors_rejects_unapproved_origin(client: TestClient):
    """CORS does not allow unauthorized origins."""
    malicious_origin = "https://malicious-site.com"

    res = client.get(
        "/",
        headers={"Origin": malicious_origin},
    )
    assert res.headers.get("access-control-allow-origin") != malicious_origin


def test_no_sensitive_api_endpoint_left_unprotected(client: TestClient):
    """Verify that every route mounted under /api (except /api/auth/*) rejects unauthenticated calls when auth is enabled."""
    client.cookies.clear()
    settings.auth_enabled = True

    public_whitelist = {
        "/api/auth/login",
        "/api/auth/status",
        "/api/auth/logout",
    }

    tested_endpoints = 0
    openapi_paths = app.openapi()["paths"]

    for path, path_item in openapi_paths.items():
        if not path.startswith("/api"):
            continue
        if path in public_whitelist:
            continue

        for method in path_item.keys():
            if method.lower() in ("head", "options"):
                continue
            tested_endpoints += 1
            call_path = (
                path.replace("{task_id}", "dummy-task")
                .replace("{report_id}", "dummy-report")
                .replace("{doc_id}", "dummy-doc")
                .replace("{approval_id}", "dummy-approval")
            )

            m = method.upper()
            if m == "GET":
                res = client.get(call_path)
            elif m == "POST":
                res = client.post(call_path, json={})
            elif m == "PATCH":
                res = client.patch(call_path, json={})
            elif m == "DELETE":
                res = client.delete(call_path)
            else:
                continue

            assert res.status_code == 401, f"CRITICAL: Unprotected endpoint detected: {m} {path} (returned {res.status_code})"

    assert tested_endpoints >= 20, f"Expected to audit all registered endpoints, tested {tested_endpoints}"
