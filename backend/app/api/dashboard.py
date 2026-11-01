"""Dashboard metrics and aggregate telemetry API router for ORCHESTRA AI."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.metrics_service import metrics_service
from app.schemas.dashboard import DashboardMetrics

router = APIRouter(prefix="/dashboard", tags=["Dashboard Telemetry"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """GET /api/dashboard/metrics — Real-time aggregated system and task execution metrics."""
    return metrics_service.get_dashboard_metrics(db)
