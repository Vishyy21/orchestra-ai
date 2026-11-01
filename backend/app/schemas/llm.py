"""Pydantic schemas for LLM interactions and status."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class LLMStatusResponse(BaseModel):
    """Schema for Ollama status check."""

    connected: bool
    status: str = "SERVICE_STOPPED"  # CONNECTED, MODEL_MISSING, SERVICE_STOPPED, CONNECTION_ERROR, INFERENCE_FAILED
    service_running: bool = False
    base_url: str
    target_model: str
    model_available: bool
    installed_models: List[str] = []
    latency_ms: Optional[float] = None
    install_command: str
    error: Optional[str] = None
    action_instructions: Optional[str] = None
    last_checked_at: Optional[str] = None
    last_inference_verified_at: Optional[str] = None
    gpu_available: bool = False
    gpu_name: Optional[str] = None
    gpu_vram_used_mb: Optional[float] = None
    gpu_vram_total_mb: Optional[float] = None


class LLMTestRequest(BaseModel):
    """Schema for executing a test generation against local Ollama."""

    prompt: str = Field(
        default="Ping. State your identity and ready status in one short technical sentence.",
        description="Prompt to send to local model",
    )
    model: Optional[str] = None
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)


class LLMTestResponse(BaseModel):
    """Schema for LLM test execution response."""

    success: bool
    model: str
    response: str
    latency_ms: float
    eval_count: Optional[int] = None
    eval_duration_ms: Optional[float] = None
    error: Optional[str] = None
