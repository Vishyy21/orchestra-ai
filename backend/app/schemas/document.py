from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    """Schema for document representation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    indexed: bool
    chunk_count: int = 0
    file_hash: Optional[str] = None
    uploaded_at: datetime
