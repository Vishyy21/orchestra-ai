"""Reliable Ollama LLM Health Check & Diagnostics Service.

Provides lightweight status polling, model availability inspection,
GPU telemetry integration, and explicit on-demand inference verification.
Adheres strictly to standard status enums:
CONNECTED, MODEL_MISSING, SERVICE_STOPPED, CONNECTION_ERROR, INFERENCE_FAILED.
"""

import time
import subprocess
import logging
from enum import Enum
from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field
import httpx

from app.config import settings

logger = logging.getLogger("orchestra.services.llm_health")


class OllamaHealthStatus(str, Enum):
    CONNECTED = "CONNECTED"
    MODEL_MISSING = "MODEL_MISSING"
    SERVICE_STOPPED = "SERVICE_STOPPED"
    CONNECTION_ERROR = "CONNECTION_ERROR"
    INFERENCE_FAILED = "INFERENCE_FAILED"


class GPUInfo(BaseModel):
    available: bool = False
    name: Optional[str] = None
    vram_used_mb: Optional[float] = None
    vram_total_mb: Optional[float] = None
    vram_free_mb: Optional[float] = None
    temperature_c: Optional[float] = None


class OllamaDetailedHealthResponse(BaseModel):
    status: OllamaHealthStatus
    connected: bool
    service_running: bool
    model_available: bool
    configured_model: str
    installed_models: list[str] = Field(default_factory=list)
    latency_ms: Optional[float] = None
    last_checked_at: str
    last_inference_verified_at: Optional[str] = None
    gpu: GPUInfo = Field(default_factory=GPUInfo)
    error_message: Optional[str] = None
    action_instructions: Optional[str] = None
    base_url: str


# Global cache for inference verification state to prevent expensive polling
_last_inference_verified_at: Optional[float] = None
_last_inference_success: bool = False
_last_inference_latency_ms: Optional[float] = None


def get_gpu_telemetry() -> GPUInfo:
    """Extract NVIDIA GPU metrics via nvidia-smi with graceful fallback."""
    try:
        cmd = [
            "nvidia-smi",
            "--query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu",
            "--format=csv,noheader,nounits",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
        if result.returncode == 0 and result.stdout.strip():
            parts = [p.strip() for p in result.stdout.strip().split(",")]
            if len(parts) >= 5:
                return GPUInfo(
                    available=True,
                    name=parts[0],
                    vram_total_mb=float(parts[1]),
                    vram_used_mb=float(parts[2]),
                    vram_free_mb=float(parts[3]),
                    temperature_c=float(parts[4]),
                )
    except Exception as exc:
        logger.debug("nvidia-smi not available or failed: %s", exc)

    return GPUInfo(available=False)


def check_ollama_health(timeout: float = 3.0) -> OllamaDetailedHealthResponse:
    """Execute a fast, lightweight diagnostic probe against Ollama.

    Does NOT execute expensive LLM generation on every poll.
    Combines socket/API status, model manifest verification, and GPU telemetry.
    """
    global _last_inference_verified_at, _last_inference_success

    now_iso = datetime.now(timezone.utc).isoformat()
    gpu = get_gpu_telemetry()
    base_url = settings.ollama_base_url.rstrip("/")
    target_model = settings.ollama_model

    start_time = time.perf_counter()

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f"{base_url}/api/tags")
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code != 200:
                return OllamaDetailedHealthResponse(
                    status=OllamaHealthStatus.CONNECTION_ERROR,
                    connected=False,
                    service_running=True,
                    model_available=False,
                    configured_model=target_model,
                    installed_models=[],
                    latency_ms=latency_ms,
                    last_checked_at=now_iso,
                    last_inference_verified_at=datetime.fromtimestamp(_last_inference_verified_at, timezone.utc).isoformat() if _last_inference_verified_at else None,
                    gpu=gpu,
                    error_message=f"Ollama returned HTTP status {response.status_code}",
                    action_instructions="Check Ollama service status and restart it.",
                    base_url=base_url,
                )

            data = response.json()
            raw_models = data.get("models", [])
            installed_names: list[str] = [m.get("name", "") for m in raw_models]

            # Match model name or tag
            target_base = target_model.split(":")[0]
            is_model_present = any(
                name == target_model
                or name.startswith(f"{target_base}:")
                or name == f"{target_model}:latest"
                for name in installed_names
            )

            if not is_model_present:
                return OllamaDetailedHealthResponse(
                    status=OllamaHealthStatus.MODEL_MISSING,
                    connected=True,
                    service_running=True,
                    model_available=False,
                    configured_model=target_model,
                    installed_models=installed_names,
                    latency_ms=latency_ms,
                    last_checked_at=now_iso,
                    last_inference_verified_at=None,
                    gpu=gpu,
                    error_message=f"Model '{target_model}' is not installed in local Ollama.",
                    action_instructions=f"Run 'ollama run {target_model}' in your terminal to download and initialize the model weights.",
                    base_url=base_url,
                )

            # Connected and model present
            return OllamaDetailedHealthResponse(
                status=OllamaHealthStatus.CONNECTED,
                connected=True,
                service_running=True,
                model_available=True,
                configured_model=target_model,
                installed_models=installed_names,
                latency_ms=latency_ms,
                last_checked_at=now_iso,
                last_inference_verified_at=datetime.fromtimestamp(_last_inference_verified_at, timezone.utc).isoformat() if _last_inference_verified_at else None,
                gpu=gpu,
                error_message=None,
                action_instructions=None,
                base_url=base_url,
            )

    except (httpx.ConnectError, httpx.ConnectTimeout) as conn_err:
        return OllamaDetailedHealthResponse(
            status=OllamaHealthStatus.SERVICE_STOPPED,
            connected=False,
            service_running=False,
            model_available=False,
            configured_model=target_model,
            installed_models=[],
            latency_ms=None,
            last_checked_at=now_iso,
            last_inference_verified_at=None,
            gpu=gpu,
            error_message=f"Cannot connect to Ollama at {base_url} (Port 11434 is closed or Ollama is not installed).",
            action_instructions="Start Ollama by running 'ollama serve' in PowerShell or launching the Ollama desktop app.",
            base_url=base_url,
        )
    except httpx.TimeoutException:
        return OllamaDetailedHealthResponse(
            status=OllamaHealthStatus.CONNECTION_ERROR,
            connected=False,
            service_running=False,
            model_available=False,
            configured_model=target_model,
            installed_models=[],
            latency_ms=None,
            last_checked_at=now_iso,
            last_inference_verified_at=None,
            gpu=gpu,
            error_message=f"Connection to Ollama timed out after {timeout}s.",
            action_instructions="Verify your host machine is not under heavy CPU/memory freeze.",
            base_url=base_url,
        )
    except Exception as exc:
        return OllamaDetailedHealthResponse(
            status=OllamaHealthStatus.CONNECTION_ERROR,
            connected=False,
            service_running=False,
            model_available=False,
            configured_model=target_model,
            installed_models=[],
            latency_ms=None,
            last_checked_at=now_iso,
            last_inference_verified_at=None,
            gpu=gpu,
            error_message=str(exc),
            action_instructions="Check system configuration and Ollama logs.",
            base_url=base_url,
        )


def verify_ollama_inference(prompt: str = "Respond with 'ORCHESTRA_ONLINE' to confirm inference.") -> dict[str, Any]:
    """Execute an explicit, minimal inference test to verify end-to-end model execution.

    Updates the global inference cache on success/failure.
    """
    global _last_inference_verified_at, _last_inference_success, _last_inference_latency_ms

    health = check_ollama_health()
    if health.status != OllamaHealthStatus.CONNECTED:
        return {
            "success": False,
            "status": health.status,
            "error": health.error_message or "Ollama is not ready for inference.",
            "action_instructions": health.action_instructions,
        }

    base_url = settings.ollama_base_url.rstrip("/")
    target_model = settings.ollama_model
    start_time = time.perf_counter()

    try:
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 100,
            },
        }

        with httpx.Client(timeout=settings.ollama_timeout_seconds) as client:
            resp = client.post(f"{base_url}/api/generate", json=payload)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                result = resp.json()
                _last_inference_verified_at = time.time()
                _last_inference_success = True
                _last_inference_latency_ms = elapsed_ms
                resp_text = result.get("response", "").strip() or result.get("thinking", "").strip()

                return {
                    "success": True,
                    "status": OllamaHealthStatus.CONNECTED,
                    "model": target_model,
                    "response": resp_text,
                    "latency_ms": elapsed_ms,
                    "eval_count": result.get("eval_count", 0),
                    "eval_duration_ms": round(result.get("eval_duration", 0) / 1e6, 2),
                    "verified_at": datetime.now(timezone.utc).isoformat(),
                }
            else:
                _last_inference_success = False
                return {
                    "success": False,
                    "status": OllamaHealthStatus.INFERENCE_FAILED,
                    "error": f"Inference failed with HTTP {resp.status_code}: {resp.text}",
                    "latency_ms": elapsed_ms,
                }

    except Exception as exc:
        _last_inference_success = False
        return {
            "success": False,
            "status": OllamaHealthStatus.INFERENCE_FAILED,
            "error": f"Inference execution crashed: {str(exc)}",
            "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
        }
