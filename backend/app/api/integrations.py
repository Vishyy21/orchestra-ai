"""Integrations API routes for Tavily Web Search and LangSmith Observability.

Exposes connection status, live health testing, and test search capabilities.
Strictly safeguards all secret API keys; keys are never exposed in responses.
"""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.tools.tavily_search import (
    tavily_search,
    test_tavily_connection,
    TavilySearchResponse,
)
from app.services.observability import (
    test_langsmith_connection,
)

router = APIRouter(prefix="/integrations", tags=["Integrations"])


def _mask_key(key: str | None) -> str | None:
    """Mask sensitive API keys for safe display (e.g., tvly-***...12ab)."""
    if not key or not key.strip():
        return None
    cleaned = key.strip()
    if len(cleaned) <= 8:
        return "****"
    return f"{cleaned[:4]}...{cleaned[-4:]}"


class IntegrationStatusItem(BaseModel):
    name: str
    role: str
    configured: bool
    status: str
    masked_key: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    message: str


class IntegrationsOverviewResponse(BaseModel):
    primary_llm: dict[str, Any]
    tavily: IntegrationStatusItem
    langsmith: IntegrationStatusItem


class TestSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Web search query")
    max_results: int = Field(default=3, ge=1, le=10)
    search_depth: str = Field(default="basic")


@router.get("/status", response_model=IntegrationsOverviewResponse)
def get_integrations_status() -> IntegrationsOverviewResponse:
    """Get the current configuration and operational status of all external integrations.
    Never reveals sensitive keys.
    """
    tavily_configured = settings.is_tavily_configured
    langsmith_configured = settings.is_langsmith_configured

    return IntegrationsOverviewResponse(
        primary_llm={
            "provider": "Ollama (Local)",
            "model": settings.ollama_model,
            "endpoint": settings.ollama_base_url,
            "is_primary": True,
            "description": "Primary local LLM running Qwen3.5 4B offline on your hardware.",
        },
        tavily=IntegrationStatusItem(
            name="Tavily Web Search",
            role="Research Agent Web Search Tool",
            configured=tavily_configured,
            status="configured" if tavily_configured else "unconfigured",
            masked_key=_mask_key(settings.tavily_api_key),
            details={
                "search_depth": settings.tavily_search_depth,
                "max_results": settings.tavily_max_results,
            },
            message=(
                "Tavily API key is loaded. Ready for web research."
                if tavily_configured
                else "Add TAVILY_API_KEY to backend/.env to enable live web research."
            ),
        ),
        langsmith=IntegrationStatusItem(
            name="LangSmith Observability",
            role="LangGraph Execution Tracing & Debugging",
            configured=langsmith_configured,
            status="configured" if langsmith_configured else "unconfigured",
            masked_key=_mask_key(settings.effective_langsmith_api_key),
            details={
                "project": settings.effective_langsmith_project,
                "endpoint": settings.langsmith_endpoint,
                "tracing_enabled": settings.langsmith_tracing,
            },
            message=(
                f"LangSmith tracing active for project '{settings.effective_langsmith_project}'."
                if langsmith_configured
                else "Add LANGSMITH_API_KEY to backend/.env to enable execution tracing."
            ),
        ),
    )


@router.post("/test/tavily")
def test_tavily_endpoint() -> dict[str, Any]:
    """Execute a live connectivity check against Tavily."""
    return test_tavily_connection()


@router.post("/test/langsmith")
def test_langsmith_endpoint(project: str | None = None) -> dict[str, Any]:
    """Execute a live connectivity and project check against LangSmith."""
    return test_langsmith_connection(project_name=project)


@router.post("/search", response_model=TavilySearchResponse)
def execute_test_search(payload: TestSearchRequest) -> TavilySearchResponse:
    """Execute a test web search with Tavily and return structured results."""
    if not settings.is_tavily_configured:
        raise HTTPException(
            status_code=400,
            detail="Tavily is not configured. Please add TAVILY_API_KEY to backend/.env.",
        )
    return tavily_search(
        query=payload.query,
        max_results=payload.max_results,
        search_depth=payload.search_depth,
        include_answer=True,
    )
