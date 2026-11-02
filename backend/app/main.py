"""ORCHESTRA AI — Master FastAPI Application Entrypoint.

Autonomous Multi-Agent Intelligence Platform.
Tagline: "Intelligence in Sync. Execution in Motion."
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.session import init_db
from app.api import (
    auth_router,
    health_router,
    llm_router,
    tasks_router,
    agents_router,
    reports_router,
    documents_router,
    approvals_router,
    dashboard_router,
    integrations_router,
)
from app.api.dependencies import verify_authenticated
from app.services.observability import init_tracing

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("orchestra.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database initialization and directory verification."""
    logger.info("Initializing ORCHESTRA AI infrastructure...")
    settings.validate_auth()
    settings.ensure_directories()
    init_db()
    init_tracing()
    from app.graph.workflow import get_workflow_checkpointer, close_checkpoint_connection
    get_workflow_checkpointer()
    logger.info("Database initialized successfully at %s", settings.database_url)
    logger.info("ORCHESTRA AI v%s is ready for execution.", settings.version)
    yield
    logger.info("Shutting down ORCHESTRA AI...")
    close_checkpoint_connection()


app = FastAPI(
    title=settings.app_name,
    description="Orchestra AI is an intelligent multi-agent platform where specialized AI agents collaborate to plan, research, analyze, verify and execute complex workflows.",
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = list(
    dict.fromkeys(
        [
            settings.frontend_origin,
            "https://orchestra-ai-eo1f.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global structured exception handler."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.debug else "An unexpected error occurred.",
            "path": request.url.path,
        },
    )


# Public Authentication Router
app.include_router(auth_router, prefix="/api")

# Protected Modular API Routers
app.include_router(health_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(llm_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(tasks_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(agents_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(reports_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(documents_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(approvals_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(dashboard_router, prefix="/api", dependencies=[Depends(verify_authenticated)])
app.include_router(integrations_router, prefix="/api", dependencies=[Depends(verify_authenticated)])


@app.get("/", tags=["Root"])
def root():
    """Root platform metadata endpoint."""
    return {
        "platform": settings.app_name,
        "tagline": settings.tagline,
        "version": settings.version,
        "status": "operational",
        "docs": "/docs",
        "api_endpoints": {
            "health": "/api/health",
            "llm_status": "/api/llm/status",
            "llm_test": "/api/llm/test",
            "tasks": "/api/tasks",
            "agents": "/api/agents",
            "reports": "/api/reports",
            "documents": "/api/documents",
            "approvals": "/api/approvals",
            "dashboard_metrics": "/api/dashboard/metrics",
            "integrations": "/api/integrations/status",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
