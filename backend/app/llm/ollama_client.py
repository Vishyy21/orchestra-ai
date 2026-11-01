"""Reusable Ollama Client for ORCHESTRA AI with health checks and structured generation."""

import time
import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger("orchestra.llm")


class OllamaClientError(Exception):
    """Custom exception for Ollama client failures."""

    def __init__(self, message: str, status_code: int = 503, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class OllamaClient:
    """Client for managing interactions with a local Ollama server and models."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout_seconds
        self.health_timeout = settings.ollama_health_timeout_seconds

    def check_connectivity(self) -> Dict[str, Any]:
        """Verify whether Ollama server is running and reachable."""
        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.health_timeout) as client:
                response = client.get(f"{self.base_url}/api/tags")
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                if response.status_code == 200:
                    return {
                        "connected": True,
                        "latency_ms": latency_ms,
                        "base_url": self.base_url,
                        "error": None,
                    }
                return {
                    "connected": False,
                    "latency_ms": latency_ms,
                    "base_url": self.base_url,
                    "error": f"Ollama returned HTTP status {response.status_code}",
                }
        except httpx.ConnectError:
            return {
                "connected": False,
                "latency_ms": None,
                "base_url": self.base_url,
                "error": f"Cannot connect to Ollama at {self.base_url}. Ensure Ollama is installed and running (`ollama serve`).",
            }
        except httpx.TimeoutException:
            return {
                "connected": False,
                "latency_ms": None,
                "base_url": self.base_url,
                "error": f"Connection to Ollama timed out after {self.health_timeout}s.",
            }
        except Exception as exc:
            return {
                "connected": False,
                "latency_ms": None,
                "base_url": self.base_url,
                "error": str(exc),
            }

    def check_model_availability(self, target_model: Optional[str] = None) -> Dict[str, Any]:
        """Check whether the requested local model is installed and ready."""
        model_name = target_model or self.model
        connectivity = self.check_connectivity()

        if not connectivity["connected"]:
            return {
                "available": False,
                "target_model": model_name,
                "installed_models": [],
                "connected": False,
                "install_command": f"ollama run {model_name}",
                "error": connectivity["error"],
            }

        try:
            with httpx.Client(timeout=self.health_timeout) as client:
                response = client.get(f"{self.base_url}/api/tags")
                data = response.json()
                raw_models: List[Dict[str, Any]] = data.get("models", [])
                installed_names = [m.get("name", "") for m in raw_models]

                # Match exact name or base tag (e.g. qwen3.5:4b or qwen3.5:4b-latest)
                model_base = model_name.split(":")[0]
                is_available = any(
                    name == model_name or name.startswith(f"{model_base}:")
                    for name in installed_names
                )

                install_cmd = f"ollama run {model_name}"

                return {
                    "available": is_available,
                    "target_model": model_name,
                    "installed_models": installed_names,
                    "connected": True,
                    "latency_ms": connectivity["latency_ms"],
                    "install_command": install_cmd,
                    "error": None if is_available else f"Model '{model_name}' is not installed in local Ollama.",
                }
        except Exception as exc:
            return {
                "available": False,
                "target_model": model_name,
                "installed_models": [],
                "connected": True,
                "install_command": f"ollama run {model_name}",
                "error": f"Failed to list models: {str(exc)}",
            }

    def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        format_json: bool = False,
        think: bool = False,
        num_predict: int = 1024,
    ) -> Dict[str, Any]:
        """Execute inference synchronously against the local Ollama server."""
        target_model = model or self.model

        # Check availability first
        availability = self.check_model_availability(target_model)
        if not availability["connected"]:
            raise OllamaClientError(
                message=f"Ollama server is unreachable at {self.base_url}. Please start Ollama.",
                status_code=503,
                details={
                    "base_url": self.base_url,
                    "action_required": "Start the Ollama daemon via 'ollama serve' or open the Ollama desktop app.",
                },
            )

        if not availability["available"]:
            raise OllamaClientError(
                message=f"Model '{target_model}' is not installed.",
                status_code=404,
                details={
                    "model": target_model,
                    "installed_models": availability.get("installed_models", []),
                    "install_command": availability.get("install_command", f"ollama run {target_model}"),
                },
            )

        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "think": think,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        if system:
            payload["system"] = system

        if format_json:
            payload["format"] = "json"

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(f"{self.base_url}/api/generate", json=payload)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if response.status_code != 200:
                    raise OllamaClientError(
                        message=f"Ollama inference error (HTTP {response.status_code}): {response.text}",
                        status_code=response.status_code,
                    )

                result = response.json()
                response_text = result.get("response", "").strip()

                # Fallback if model placed output in thinking field
                if not response_text and result.get("thinking"):
                    response_text = result.get("thinking", "").strip()

                return {
                    "model": target_model,
                    "response": response_text,
                    "latency_ms": elapsed_ms,
                    "eval_count": result.get("eval_count", 0),
                    "eval_duration_ms": round(result.get("eval_duration", 0) / 1e6, 2),
                    "prompt_eval_count": result.get("prompt_eval_count", 0),
                }

        except httpx.TimeoutException:
            raise OllamaClientError(
                message=f"Inference request timed out after {self.timeout}s.",
                status_code=504,
                details={"timeout_seconds": self.timeout},
            )
        except httpx.RequestError as req_err:
            raise OllamaClientError(
                message=f"Inference network error: {str(req_err)}",
                status_code=502,
            )

    async def agenerate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        format_json: bool = False,
        think: bool = False,
        num_predict: int = 1024,
    ) -> Dict[str, Any]:
        """Execute inference asynchronously against the local Ollama server."""
        target_model = model or self.model

        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "think": think,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        if system:
            payload["system"] = system

        if format_json:
            payload["format"] = "json"

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if response.status_code != 200:
                    raise OllamaClientError(
                        message=f"Ollama async inference error (HTTP {response.status_code}): {response.text}",
                        status_code=response.status_code,
                    )

                result = response.json()
                response_text = result.get("response", "").strip()

                if not response_text and result.get("thinking"):
                    response_text = result.get("thinking", "").strip()

                return {
                    "model": target_model,
                    "response": response_text,
                    "latency_ms": elapsed_ms,
                    "eval_count": result.get("eval_count", 0),
                    "eval_duration_ms": round(result.get("eval_duration", 0) / 1e6, 2),
                    "prompt_eval_count": result.get("prompt_eval_count", 0),
                }

        except httpx.TimeoutException:
            raise OllamaClientError(
                message=f"Async inference request timed out after {self.timeout}s.",
                status_code=504,
                details={"timeout_seconds": self.timeout},
            )
        except httpx.RequestError as req_err:
            raise OllamaClientError(
                message=f"Async inference network error: {str(req_err)}",
                status_code=502,
            )

    async def achat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        format_json: bool = False,
        think: bool = False,
        num_predict: int = 1024,
    ) -> Dict[str, Any]:
        """Execute chat completion asynchronously against the local Ollama server."""
        target_model = model or self.model

        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "stream": False,
            "think": think,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        if format_json:
            payload["format"] = "json"

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if response.status_code != 200:
                    raise OllamaClientError(
                        message=f"Ollama chat error (HTTP {response.status_code}): {response.text}",
                        status_code=response.status_code,
                    )

                result = response.json()
                msg = result.get("message", {})
                content = msg.get("content", "").strip()

                if not content and msg.get("thinking"):
                    content = msg.get("thinking", "").strip()

                return {
                    "model": target_model,
                    "response": content,
                    "message": msg,
                    "latency_ms": elapsed_ms,
                    "eval_count": result.get("eval_count", 0),
                    "done_reason": result.get("done_reason"),
                }

        except httpx.TimeoutException:
            raise OllamaClientError(
                message=f"Async chat request timed out after {self.timeout}s.",
                status_code=504,
            )
        except httpx.RequestError as req_err:
            raise OllamaClientError(
                message=f"Async chat network error: {str(req_err)}",
                status_code=502,
            )

    def generate_structured(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        think: bool = False,
        num_predict: int = 1024,
    ) -> Dict[str, Any]:
        """Execute inference requesting structured JSON output and parsing it."""
        raw_result = self.generate(
            prompt=prompt,
            system=system,
            model=model,
            format_json=True,
            think=think,
            num_predict=num_predict,
        )

        try:
            parsed_data = json.loads(raw_result["response"])
            return {
                **raw_result,
                "parsed": parsed_data,
            }
        except json.JSONDecodeError as err:
            logger.warning(f"Failed to parse structured JSON: {err}")
            return {
                **raw_result,
                "parsed": None,
                "parse_error": str(err),
            }

    async def agenerate_structured(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        think: bool = False,
        num_predict: int = 1024,
    ) -> Dict[str, Any]:
        """Execute async inference requesting structured JSON output and parsing it."""
        raw_result = await self.agenerate(
            prompt=prompt,
            system=system,
            model=model,
            format_json=True,
            think=think,
            num_predict=num_predict,
        )

        try:
            parsed_data = json.loads(raw_result["response"])
            return {
                **raw_result,
                "parsed": parsed_data,
            }
        except json.JSONDecodeError as err:
            logger.warning(f"Failed to parse structured JSON: {err}")
            return {
                **raw_result,
                "parsed": None,
                "parse_error": str(err),
            }


# Global singleton instance
ollama_client = OllamaClient()
