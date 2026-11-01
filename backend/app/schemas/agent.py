"""Pydantic schemas for Agent definitions and runs."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class AgentCard(BaseModel):
    """Schema representing an available agent in the Orchestra workspace."""

    name: str
    role: str
    description: str
    capabilities: List[str]
    status: str  # idle, busy, offline, ready
    icon: str
    color: str
    order: int


class AgentRunRead(BaseModel):
    """Full schema for agent execution history."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    agent_name: str
    status: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_time_ms: Optional[int] = None
