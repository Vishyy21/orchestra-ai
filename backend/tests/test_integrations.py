"""Tests for Tavily Web Search and LangSmith Observability Integrations."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.tools.tavily_search import (
    tavily_search,
    test_tavily_connection as check_tavily_connection,
    TavilySearchResponse,
)
from app.services.observability import (
    test_langsmith_connection as check_langsmith_connection,
    init_tracing,
)


@pytest.fixture
def client():
    """Create test client with fresh database and tracing."""
    with TestClient(app) as test_client:
        yield test_client


def test_integrations_status_endpoint(client: TestClient):
    """Verify the /api/integrations/status endpoint returns safe structured metadata."""
    response = client.get("/api/integrations/status")
    assert response.status_code == 200
    data = response.json()

    # Primary LLM check
    assert "primary_llm" in data
    assert data["primary_llm"]["model"] == "qwen3.5:4b"
    assert data["primary_llm"]["is_primary"] is True

    # Tavily metadata check
    assert "tavily" in data
    assert data["tavily"]["name"] == "Tavily Web Search"
    assert isinstance(data["tavily"]["configured"], bool)
    # Ensure sensitive credentials are never leaked
    if data["tavily"]["masked_key"]:
        assert "..." in data["tavily"]["masked_key"]
        assert len(data["tavily"]["masked_key"]) <= 15

    # LangSmith metadata check
    assert "langsmith" in data
    assert data["langsmith"]["name"] == "LangSmith Observability"
    assert isinstance(data["langsmith"]["configured"], bool)
    if data["langsmith"]["masked_key"]:
        assert "..." in data["langsmith"]["masked_key"]


def test_tavily_missing_key_graceful_handling():
    """Verify Tavily handles missing API keys without raising uncaught exceptions."""
    res = check_tavily_connection(api_key="")
    assert res["configured"] is False
    assert res["connected"] is False
    assert "TAVILY_API_KEY is not configured" in res["error"]

    search_res = tavily_search(query="Test query without key", api_key="")
    assert isinstance(search_res, TavilySearchResponse)
    assert search_res.status == "unconfigured"
    assert search_res.results == []
    assert "TAVILY_API_KEY is not configured" in search_res.error


def test_langsmith_missing_key_graceful_handling():
    """Verify LangSmith handles missing API keys gracefully."""
    res = check_langsmith_connection(api_key="", project_name="test-project")
    assert res["configured"] is False
    assert res["connected"] is False
    assert "LANGSMITH_API_KEY is not configured" in res["error"]


def test_tavily_test_endpoint(client: TestClient):
    """Verify POST /api/integrations/test/tavily returns diagnostic payload."""
    response = client.post("/api/integrations/test/tavily")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "connected" in data
    assert "message" in data


def test_langsmith_test_endpoint(client: TestClient):
    """Verify POST /api/integrations/test/langsmith returns diagnostic payload."""
    response = client.post("/api/integrations/test/langsmith")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "connected" in data
    assert "project" in data
    assert "message" in data


def test_tavily_search_endpoint_unconfigured(client: TestClient, monkeypatch):
    """Verify test search endpoint handles unconfigured state with clean 400."""
    monkeypatch.setattr(settings, "tavily_api_key", None)
    response = client.post(
        "/api/integrations/search",
        json={"query": "agentic AI 2026", "max_results": 3},
    )
    assert response.status_code == 400
    assert "Tavily is not configured" in response.json()["detail"]
