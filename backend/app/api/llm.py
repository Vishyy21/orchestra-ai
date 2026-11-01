"""Ollama Local LLM API router for ORCHESTRA AI.

Provides robust status checks, explicit inference verification,
and diagnostic testing endpoints.
"""

from typing import Any
from fastapi import APIRouter, HTTPException, status
from app.config import settings
from app.llm.ollama_client import ollama_client, OllamaClientError
from app.schemas.llm import LLMStatusResponse, LLMTestRequest, LLMTestResponse
from app.services.llm_health import check_ollama_health, verify_ollama_inference

router = APIRouter(prefix="/llm", tags=["Local LLM Integration"])


@router.get("/status", response_model=LLMStatusResponse)
def get_llm_status():
    """GET /api/llm/status — Return reliable Ollama status with exact status enums and GPU info."""
    health = check_ollama_health()
    return LLMStatusResponse(
        connected=health.connected,
        status=health.status.value,
        service_running=health.service_running,
        base_url=health.base_url,
        target_model=health.configured_model,
        model_available=health.model_available,
        installed_models=health.installed_models,
        latency_ms=health.latency_ms,
        install_command=f"ollama run {health.configured_model}",
        error=health.error_message,
        action_instructions=health.action_instructions,
        last_checked_at=health.last_checked_at,
        last_inference_verified_at=health.last_inference_verified_at,
        gpu_available=health.gpu.available,
        gpu_name=health.gpu.name,
        gpu_vram_used_mb=health.gpu.vram_used_mb,
        gpu_vram_total_mb=health.gpu.vram_total_mb,
    )


@router.post("/verify-inference")
def verify_inference_endpoint(prompt: str = "Confirm Ollama inference online.") -> dict[str, Any]:
    """POST /api/llm/verify-inference — Execute explicit minimal inference test to verify operational status."""
    return verify_ollama_inference(prompt=prompt)


@router.post("/test", response_model=LLMTestResponse)
def test_llm_generation(payload: LLMTestRequest):
    """POST /api/llm/test — Test generation against local Ollama model."""
    try:
        result = ollama_client.generate(
            prompt=payload.prompt,
            model=payload.model or settings.ollama_model,
            temperature=payload.temperature,
            think=False,
        )
        return LLMTestResponse(
            success=True,
            model=result["model"],
            response=result["response"],
            latency_ms=result["latency_ms"],
            eval_count=result.get("eval_count"),
            eval_duration_ms=result.get("eval_duration_ms"),
            error=None,
        )
    except OllamaClientError as client_err:
        raise HTTPException(
            status_code=client_err.status_code,
            detail={
                "error": client_err.message,
                "details": client_err.details,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during inference: {str(exc)}",
        )
