"""Agents API router for ORCHESTRA AI."""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import AgentRun
from app.agents.registry import get_registered_agents
from app.schemas.agent import AgentCard, AgentRunRead

router = APIRouter(prefix="/agents", tags=["Agents Workspace"])


@router.get("", response_model=List[AgentCard])
def list_agents():
    """GET /api/agents — Retrieve the registered specialized agent profiles."""
    return get_registered_agents()


@router.get("/history", response_model=List[AgentRunRead])
def get_agents_execution_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """GET /api/agents/history — List recent agent execution runs across all tasks."""
    runs = db.query(AgentRun).order_by(AgentRun.started_at.desc()).limit(limit).all()
    return [AgentRunRead.model_validate(r) for r in runs]
