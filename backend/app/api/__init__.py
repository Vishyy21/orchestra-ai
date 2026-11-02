"""API routers package for ORCHESTRA AI."""

from app.api.health import router as health_router
from app.api.llm import router as llm_router
from app.api.tasks import router as tasks_router
from app.api.agents import router as agents_router
from app.api.reports import router as reports_router
from app.api.documents import router as documents_router
from app.api.approvals import router as approvals_router
from app.api.dashboard import router as dashboard_router
from app.api.integrations import router as integrations_router
from app.api.auth import router as auth_router

__all__ = [
    "auth_router",
    "health_router",
    "llm_router",
    "tasks_router",
    "agents_router",
    "reports_router",
    "documents_router",
    "approvals_router",
    "dashboard_router",
    "integrations_router",
]
