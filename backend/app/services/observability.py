"""LangSmith Observability, Tracing, and Monitoring Service for ORCHESTRA AI.

Configures LangGraph and LangChain agent run tracing, monitors project metrics,
and provides live connectivity verification. Handles missing credentials gracefully.
"""

import os
import time
import logging
from typing import Any
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("orchestra.services.observability")


class ObservabilityStatus(BaseModel):
    """Status summary of LangSmith tracing configuration."""

    configured: bool
    connected: bool
    tracing_enabled: bool
    project: str
    endpoint: str
    latency_seconds: float | None = None
    error: str | None = None
    message: str


def init_tracing() -> None:
    """Initialize LangSmith tracing environment on application startup."""
    settings.setup_langsmith_environment()
    if settings.is_langsmith_configured:
        logger.info(
            f"LangSmith tracing configured for project '{settings.effective_langsmith_project}' "
            f"(endpoint: {settings.langsmith_endpoint})"
        )
    else:
        logger.info("LangSmith tracing is inactive (no API key configured in backend/.env).")


def get_langsmith_client(api_key: str | None = None) -> Any:
    """Retrieve an authenticated LangSmith Client instance, or None if unconfigured."""
    key = api_key if api_key is not None else settings.effective_langsmith_api_key
    if not key or not key.strip():
        return None
    try:
        from langsmith import Client
        return Client(
            api_key=key.strip(),
            api_url=settings.langsmith_endpoint,
            timeout_ms=10000,
        )
    except ImportError:
        logger.error("langsmith package is not installed.")
        return None
    except Exception as exc:
        logger.error(f"Failed to initialize LangSmith Client: {exc}")
        return None


def test_langsmith_connection(
    api_key: str | None = None,
    project_name: str | None = None,
) -> dict[str, Any]:
    """Verify LangSmith API connectivity, credentials, and project accessibility.

    Returns:
        dict containing configured (bool), connected (bool), error (str | None), message (str).
        NEVER returns or exposes the secret API key.
    """
    key = api_key if api_key is not None else settings.effective_langsmith_api_key
    proj = project_name or settings.effective_langsmith_project

    if not key or not key.strip():
        return {
            "configured": False,
            "connected": False,
            "tracing_enabled": False,
            "project": proj,
            "endpoint": settings.langsmith_endpoint,
            "error": "LANGSMITH_API_KEY is not configured in backend/.env",
            "message": "LangSmith tracing is disabled. Set LANGSMITH_API_KEY in backend/.env to enable agent tracing.",
        }

    client = get_langsmith_client(key)
    if client is None:
        return {
            "configured": True,
            "connected": False,
            "tracing_enabled": settings.langsmith_tracing,
            "project": proj,
            "endpoint": settings.langsmith_endpoint,
            "error": "langsmith package could not be initialized",
            "message": "LangSmith client initialization failed.",
        }

    try:
        start_time = time.perf_counter()
        
        # Verify access by checking or creating the target project
        project_exists = client.has_project(project_name=proj)
        if not project_exists:
            # Create the project if it doesn't exist yet
            try:
                client.create_project(
                    project_name=proj,
                    description="Autonomous multi-agent execution tracing for ORCHESTRA AI",
                )
            except Exception as create_exc:
                logger.debug(f"Project creation notice: {create_exc}")

        latency = time.perf_counter() - start_time

        return {
            "configured": True,
            "connected": True,
            "tracing_enabled": settings.langsmith_tracing,
            "project": proj,
            "endpoint": settings.langsmith_endpoint,
            "latency_seconds": round(latency, 3),
            "error": None,
            "message": f"LangSmith connection verified successfully for project '{proj}' (latency: {latency:.2f}s).",
        }
    except Exception as exc:
        err_msg = str(exc)
        logger.warning(f"LangSmith connection test failed: {err_msg}")
        # Redact the secret key if it appears anywhere in exception output
        safe_err = err_msg.replace(key, "[REDACTED]") if key in err_msg else err_msg
        return {
            "configured": True,
            "connected": False,
            "tracing_enabled": settings.langsmith_tracing,
            "project": proj,
            "endpoint": settings.langsmith_endpoint,
            "error": safe_err,
            "message": f"LangSmith connection failed: {safe_err}",
        }


def get_langchain_tracer(project_name: str | None = None) -> Any:
    """Get a LangChainTracer callback for direct use in LangGraph execution."""
    if not settings.is_langsmith_configured or not settings.langsmith_tracing:
        return None
    try:
        from langchain_core.tracers import LangChainTracer
        proj = project_name or settings.effective_langsmith_project
        return LangChainTracer(project_name=proj)
    except Exception as exc:
        logger.warning(f"Could not initialize LangChainTracer: {exc}")
        return None
