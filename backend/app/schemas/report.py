"""Pydantic schemas for Reports."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ReportCreate(BaseModel):
    """Schema for generating/saving a report."""

    task_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=10)
    category: str = "general"


class ReportRead(BaseModel):
    """Schema for reading reports."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: Optional[str] = None
    title: str
    content: str
    category: str
    created_at: datetime
