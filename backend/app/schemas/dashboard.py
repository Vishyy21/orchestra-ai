"""Pydantic schemas for Dashboard Metrics and Health."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.schemas.task import TaskRead
from app.schemas.report import ReportRead


class SystemHealthInfo(BaseModel):
    """System health and hardware status."""

    status: str
    database: str
    memory_gb_total: float
    gpu_detected: bool
    gpu_model: Optional[str] = None
    gpu_vram_mb: Optional[int] = None
    uptime_seconds: float


class DashboardMetrics(BaseModel):
    """Real aggregated dashboard metrics."""

    total_tasks: int
    running_tasks: int
    completed_tasks: int
    failed_tasks: int
    pending_tasks: int
    available_agents: int
    total_agents: int
    system_health: SystemHealthInfo
    llm_connected: bool
    llm_model: str
    llm_model_available: bool
    llm_latency_ms: Optional[float] = None
    recent_tasks: List[TaskRead] = []
    recent_reports: List[ReportRead] = []
