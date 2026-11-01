"""Pydantic schemas for Task management in ORCHESTRA AI."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class TaskBase(BaseModel):
    """Base schema for tasks."""

    title: str = Field(..., min_length=3, max_length=255, description="Concise task title")
    description: str = Field(..., min_length=10, description="Detailed prompt or execution specification")
    category: str = Field(
        default="general",
        description="Category: general, research, code_generation, workflow_analysis, system_design, verification",
    )
    priority: str = Field(default="medium", description="Priority level: low, medium, high, critical")
    requires_approval: bool = Field(
        default=False,
        description="Whether workflow requires human-in-the-loop authorization before verification & publication",
    )


class TaskCreate(TaskBase):
    """Schema for creating a new task."""

    pass


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""

    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    status: Optional[str] = Field(None, description="pending, running, awaiting_approval, completed, failed")
    category: Optional[str] = None
    priority: Optional[str] = None
    requires_approval: Optional[bool] = None
    result_summary: Optional[str] = None
    error_message: Optional[str] = None


class AgentRunBrief(BaseModel):
    """Brief agent execution run representation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    agent_name: str
    status: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_time_ms: Optional[int] = None


class ApprovalBrief(BaseModel):
    """Brief approval representation attached to task."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    agent_name: str
    action_type: str
    description: str
    status: str
    payload: Optional[str] = None
    created_at: datetime
    decided_at: Optional[datetime] = None


class TaskRead(TaskBase):
    """Schema for reading a task."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    agent_runs: List[AgentRunBrief] = []
    approvals: List[ApprovalBrief] = []


class TaskListResponse(BaseModel):
    """Response envelope for tasks listing."""

    tasks: List[TaskRead]
    total: int
