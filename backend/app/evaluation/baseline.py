"""Single-Agent Baseline Execution for ORCHESTRA AI Evaluation.

Executes end-to-end technical research, analysis, and report generation in a
single monolithic LLM invocation using the same local model (qwen3.5:4b) and
the same retrieval evidence as the five-agent workflow.
"""

import time
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime

from app.llm.ollama_client import OllamaClient, OllamaClientError
from app.rag.numerical_verifier import check_numerical_consistency, NumericalIssue
from app.evaluation.benchmark_tasks import BenchmarkTask

logger = logging.getLogger("orchestra.evaluation.baseline")


@dataclass
class SingleAgentResult:
    """Execution output and performance metrics for a single-agent baseline run."""
    task_id: str
    task_name: str
    report_text: str
    execution_time_ms: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    model_name: str
    numerical_issues: List[NumericalIssue] = field(default_factory=list)
    success: bool = True
    error_message: Optional[str] = None
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


SINGLE_AGENT_SYSTEM_PROMPT = """You are a senior technical research analyst and intelligence agent.
Your objective is to conduct an end-to-end research investigation, analyze all available evidence, verify facts and numerical statements, and produce a structured executive report.

Requirements for your output:
1. Executive Summary: High-level synthesis of the primary findings.
2. Core Findings & In-Depth Analysis: Deep-dive technical or strategic analysis supported directly by the provided evidence.
3. Verification & Numerical Consistency Audit: Explicitly audit numbers, unit conversions, and verify claims against provided sources. Note any discrepancies or unsupported assertions.
4. Strategic Implications & Recommendations: Concrete, actionable takeaways.
5. Evidence & Citations: Reference the provided sources with title and URL/filename.

Ground your report strictly in the provided evidence. Do not fabricate facts, numbers, or citations."""


def format_evidence_context(task: BenchmarkTask) -> str:
    """Format web sources and document chunks into a unified evidence context block."""
    sections = []

    if task.web_sources:
        sections.append("=== RETRIEVED WEB SOURCES ===")
        for i, src in enumerate(task.web_sources, 1):
            sections.append(
                f"[Source {i}] {src.get('title', 'Web Document')}\n"
                f"URL: {src.get('url', 'N/A')}\n"
                f"Content: {src.get('content', '').strip()}\n"
            )

    if task.document_sources:
        sections.append("=== RETRIEVED DOCUMENT PASSAGES ===")
        for i, doc in enumerate(task.document_sources, 1):
            sections.append(
                f"[Document {i}] Filename: {doc.get('filename', 'document.md')}\n"
                f"Content: {doc.get('content', '').strip()}\n"
            )

    return "\n".join(sections)


class SingleAgentBaseline:
    """Single-Agent baseline orchestrator for controlled benchmark comparisons."""

    def __init__(self, ollama_client: Optional[OllamaClient] = None):
        self.client = ollama_client or OllamaClient()

    def execute(self, task: BenchmarkTask) -> SingleAgentResult:
        """Execute a single-agent baseline run for a given benchmark task."""
        started_at = datetime.utcnow().isoformat()
        t0 = time.perf_counter()

        evidence_block = format_evidence_context(task)
        user_prompt = (
            f"TASK OBJECTIVE: {task.name}\n"
            f"CATEGORY: {task.category}\n"
            f"QUERY: {task.query}\n\n"
            f"{evidence_block}\n\n"
            f"Synthesize a complete, rigorously verified executive report based on the evidence above."
        )

        try:
            res = self.client.generate(
                prompt=user_prompt,
                system=SINGLE_AGENT_SYSTEM_PROMPT,
                temperature=0.2,
                num_predict=768,
            )

            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            completed_at = datetime.utcnow().isoformat()

            report_text = res.get("response", "").strip()
            prompt_tokens = res.get("prompt_eval_count", 0)
            completion_tokens = res.get("eval_count", 0)
            total_tokens = prompt_tokens + completion_tokens

            # Apply identical deterministic numerical audit
            numerical_issues = check_numerical_consistency(report_text)

            return SingleAgentResult(
                task_id=task.id,
                task_name=task.name,
                report_text=report_text,
                execution_time_ms=elapsed_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                model_name=res.get("model", self.client.model),
                numerical_issues=numerical_issues,
                success=True,
                error_message=None,
                started_at=started_at,
                completed_at=completed_at,
            )

        except OllamaClientError as client_err:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            logger.error(f"Single-agent baseline failed for task {task.id}: {client_err}")
            return SingleAgentResult(
                task_id=task.id,
                task_name=task.name,
                report_text="",
                execution_time_ms=elapsed_ms,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                model_name=self.client.model,
                numerical_issues=[],
                success=False,
                error_message=str(client_err),
                started_at=started_at,
                completed_at=datetime.utcnow().isoformat(),
            )
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            logger.error(f"Unexpected error in single-agent baseline {task.id}: {exc}")
            return SingleAgentResult(
                task_id=task.id,
                task_name=task.name,
                report_text="",
                execution_time_ms=elapsed_ms,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                model_name=self.client.model,
                numerical_issues=[],
                success=False,
                error_message=str(exc),
                started_at=started_at,
                completed_at=datetime.utcnow().isoformat(),
            )
