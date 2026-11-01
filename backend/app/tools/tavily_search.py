"""Tavily Web Search Tool for ORCHESTRA AI Research Agent.

Provides real-time web search, content extraction, and connectivity testing
using the Tavily API. Handles missing credentials and network errors gracefully.
"""

import time
import logging
from typing import Any
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("orchestra.tools.tavily")


class TavilySearchResult(BaseModel):
    """Individual search result item."""

    title: str = Field(..., description="Title of the search result")
    url: str = Field(..., description="URL source link")
    content: str = Field(..., description="Extracted snippet or content")
    score: float | None = Field(default=None, description="Relevance score if provided")

    @property
    def snippet(self) -> str:
        """Alias for content to ensure backward and defensive compatibility."""
        return self.content


class TavilySearchResponse(BaseModel):
    """Complete search response payload."""

    query: str
    results: list[TavilySearchResult] = Field(default_factory=list)
    answer: str | None = Field(default=None, description="Direct AI summary answer from Tavily if requested")
    total_results: int = 0
    search_depth: str = "basic"
    execution_time_seconds: float = 0.0
    status: str = "success"
    error: str | None = None


class TavilyNotConfiguredError(RuntimeError):
    """Raised when Tavily search is executed without an API key."""
    pass


def get_tavily_client(api_key: str | None = None) -> Any:
    """Get an initialized TavilyClient instance."""
    key = api_key if api_key is not None else settings.tavily_api_key
    if not key or not key.strip():
        return None
    try:
        from tavily import TavilyClient
        return TavilyClient(api_key=key.strip())
    except ImportError:
        logger.error("tavily-python is not installed in the environment.")
        return None


def test_tavily_connection(api_key: str | None = None) -> dict[str, Any]:
    """Verify Tavily API connectivity and credentials.

    Returns:
        dict containing configured (bool), connected (bool), error (str | None), message (str).
        NEVER returns or exposes the secret API key.
    """
    key = api_key if api_key is not None else settings.tavily_api_key
    if not key or not key.strip():
        return {
            "configured": False,
            "connected": False,
            "error": "TAVILY_API_KEY is not configured in backend/.env",
            "message": "Tavily web search is currently disabled. Add TAVILY_API_KEY to backend/.env to enable.",
        }

    client = get_tavily_client(key)
    if client is None:
        return {
            "configured": True,
            "connected": False,
            "error": "tavily-python package is not available",
            "message": "The tavily package could not be imported.",
        }

    try:
        start_time = time.perf_counter()
        # Perform a lightweight search test query
        response = client.search(
            query="test",
            search_depth="basic",
            max_results=1,
        )
        latency = time.perf_counter() - start_time

        if isinstance(response, dict) and "results" in response:
            return {
                "configured": True,
                "connected": True,
                "error": None,
                "message": f"Tavily connection verified successfully (latency: {latency:.2f}s).",
                "latency_seconds": round(latency, 3),
            }
        else:
            return {
                "configured": True,
                "connected": False,
                "error": "Unexpected response format from Tavily API",
                "message": "Received non-standard response from Tavily API.",
            }
    except Exception as exc:
        err_msg = str(exc)
        logger.warning(f"Tavily connection test failed: {err_msg}")
        # Sanitize error message to prevent accidental key leakage if included in exception string
        safe_err = err_msg.replace(key, "[REDACTED]") if key in err_msg else err_msg
        return {
            "configured": True,
            "connected": False,
            "error": safe_err,
            "message": f"Tavily connection failed: {safe_err}",
        }


def tavily_search(
    query: str,
    search_depth: str = "basic",
    max_results: int = 5,
    include_answer: bool = False,
    include_raw_content: bool = False,
    api_key: str | None = None,
) -> TavilySearchResponse:
    """Execute a real web search using Tavily.

    Args:
        query: Search term or question.
        search_depth: "basic" or "advanced".
        max_results: Max items to return (default 5).
        include_answer: Request Tavily's direct synthesized answer.
        include_raw_content: Include raw page HTML/markdown.
        api_key: Optional override for API key.

    Returns:
        TavilySearchResponse with structured results and sources.
    """
    key = api_key if api_key is not None else settings.tavily_api_key
    if not key or not key.strip():
        logger.warning("Attempted Tavily search without TAVILY_API_KEY configured.")
        return TavilySearchResponse(
            query=query,
            results=[],
            status="unconfigured",
            error="TAVILY_API_KEY is not configured in backend/.env",
        )

    client = get_tavily_client(key)
    if client is None:
        return TavilySearchResponse(
            query=query,
            results=[],
            status="error",
            error="Tavily client is unavailable in runtime",
        )

    start_time = time.perf_counter()
    try:
        raw_response = client.search(
            query=query,
            search_depth=search_depth,
            max_results=max_results,
            include_answer=include_answer,
            include_raw_content=include_raw_content,
        )
        elapsed = time.perf_counter() - start_time

        results: list[TavilySearchResult] = []
        for item in raw_response.get("results", []):
            results.append(
                TavilySearchResult(
                    title=item.get("title", "Untitled"),
                    url=item.get("url", ""),
                    content=item.get("content", ""),
                    score=item.get("score"),
                )
            )

        return TavilySearchResponse(
            query=query,
            results=results,
            answer=raw_response.get("answer"),
            total_results=len(results),
            search_depth=search_depth,
            execution_time_seconds=round(elapsed, 3),
            status="success",
        )
    except Exception as exc:
        elapsed = time.perf_counter() - start_time
        err_msg = str(exc)
        safe_err = err_msg.replace(key, "[REDACTED]") if key in err_msg else err_msg
        logger.error(f"Tavily search execution failed for query '{query}': {safe_err}")
        return TavilySearchResponse(
            query=query,
            results=[],
            status="error",
            error=safe_err,
            execution_time_seconds=round(elapsed, 3),
        )


# LangChain Tool Definition for Agent Integration
try:
    from langchain_core.tools import tool

    @tool("tavily_web_search")
    def tavily_search_tool(query: str) -> str:
        """Search the live web for recent news, facts, papers, and information using Tavily.
        Use this tool when you need accurate, up-to-date web research and sources.
        """
        response = tavily_search(query=query, max_results=5, include_answer=True)
        if response.status != "success":
            return f"Web search unavailable: {response.error or 'Unknown error'}"

        output_parts: list[str] = []
        if response.answer:
            output_parts.append(f"Summary Answer: {response.answer}\n")

        output_parts.append("Web Sources:")
        for idx, item in enumerate(response.results, 1):
            output_parts.append(f"[{idx}] {item.title}\n    URL: {item.url}\n    Content: {item.content}\n")

        return "\n".join(output_parts)

except ImportError:
    tavily_search_tool = None  # type: ignore
