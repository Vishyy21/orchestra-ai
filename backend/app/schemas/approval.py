"""Pydantic schemas for Human-in-the-Loop Approvals."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class ApprovalRead(BaseModel):
    """Schema for viewing pending or resolved approvals."""

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


class ApprovalDecision(BaseModel):
    """Schema for deciding an approval."""

    decision: Literal["approved", "rejected"] = Field(..., description="Decision result")
    reason: Optional[str] = Field(None, description="Optional reasoning for decision")
