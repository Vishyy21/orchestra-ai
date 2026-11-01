"""Benchmark Runner for ORCHESTRA AI.

Executes both the Single-Agent baseline and the Five-Agent workflow across
the 10 controlled benchmark tasks, tracking real latency, token usage,
completeness, evidence coverage, numerical accuracy, and citations.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

from app.llm.ollama_client import OllamaClient
from app.rag.numerical_verifier import check_numerical_consistency
from app.evaluation.benchmark_tasks import BENCHMARK_TASKS, BenchmarkTask
from app.evaluation.baseline import SingleAgentBaseline, SingleAgentResult, format_evidence_context
from app.evaluation.metrics import (
    EvaluationMetrics,
    compute_task_metrics,
    aggregate_metrics,
)

logger = logging.getLogger("orchestra.evaluation.runner")


@dataclass
class MultiAgentRunResult:
    """Execution output and performance metrics for the five-agent workflow on a benchmark task."""
    task_id: str
    task_name: str
    report_text: str
    execution_time_ms: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    agent_latencies_ms: Dict[str, int] = field(default_factory=dict)
    agent_tokens: Dict[str, int] = field(default_factory=dict)
    numerical_issues: List[Any] = field(default_factory=list)
    success: bool = True
    error_message: Optional[str] = None


@dataclass
class TaskComparisonResult:
    """Side-by-side comparison result for a single benchmark task."""
    task_id: str
    task_name: str
    category: str
    single_agent_metrics: EvaluationMetrics
    multi_agent_metrics: EvaluationMetrics
    single_agent_report: str
    multi_agent_report: str
    numerical_trap_present: bool = False
    unsupported_claim_present: bool = False
    contradiction_present: bool = False


class FiveAgentEvaluator:
    """Executes the five-agent pipeline in evaluation mode with per-agent metrics tracking."""

    def __init__(self, ollama_client: Optional[OllamaClient] = None):
        self.client = ollama_client or OllamaClient()

    def execute(self, task: BenchmarkTask) -> MultiAgentRunResult:
        """Execute the 5-agent pipeline sequentially on a benchmark task."""
        t_start = time.perf_counter()
        agent_latencies: Dict[str, int] = {}
        agent_tokens: Dict[str, int] = {}
        total_prompt_tokens = 0
        total_completion_tokens = 0

        evidence_block = format_evidence_context(task)

        try:
            # -----------------------------------------------------------------
            # 1. PLANNER AGENT
            # -----------------------------------------------------------------
            t0 = time.perf_counter()
            planner_sys = (
                "You are the Planner Agent of Orchestra AI. "
                "Decompose the user directive into 3 to 5 concrete research, synthesis, and verification phases."
            )
            planner_prompt = (
                f"Create a focused execution plan for the following task:\n\n"
                f"Task: {task.name}\n"
                f"Category: {task.category}\n"
                f"Objective: {task.query}"
            )
            res_planner = self.client.generate(prompt=planner_prompt, system=planner_sys, temperature=0.2, num_predict=384)
            plan_text = res_planner.get("response", "").strip()
            elapsed_planner = int((time.perf_counter() - t0) * 1000)
            agent_latencies["Planner"] = elapsed_planner
            p_tok = res_planner.get("prompt_eval_count", 0)
            c_tok = res_planner.get("eval_count", 0)
            agent_tokens["Planner"] = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            # -----------------------------------------------------------------
            # 2. RESEARCH AGENT
            # -----------------------------------------------------------------
            t0 = time.perf_counter()
            researcher_sys = (
                "You are the Research Agent of Orchestra AI. "
                "Organize, filter, and extract core evidence chunks from available web and document sources."
            )
            researcher_prompt = (
                f"Extract and structure the critical evidence points for each phase of the plan:\n\n"
                f"Plan:\n{plan_text}\n\n"
                f"Available Sources:\n{evidence_block}"
            )
            res_researcher = self.client.generate(prompt=researcher_prompt, system=researcher_sys, temperature=0.2, num_predict=512)
            research_summary = res_researcher.get("response", "").strip()
            elapsed_researcher = int((time.perf_counter() - t0) * 1000)
            agent_latencies["Researcher"] = elapsed_researcher
            p_tok = res_researcher.get("prompt_eval_count", 0)
            c_tok = res_researcher.get("eval_count", 0)
            agent_tokens["Researcher"] = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            # -----------------------------------------------------------------
            # 3. ANALYSIS AGENT
            # -----------------------------------------------------------------
            t0 = time.perf_counter()
            analyst_sys = (
                "You are the Analysis Agent of Orchestra AI. "
                "Synthesize research evidence into deep technical analysis, evaluate strategic tradeoffs, and identify conflicting claims."
            )
            analyst_prompt = (
                f"Analyze the following evidence in depth according to the execution plan:\n\n"
                f"Task: {task.name}\n"
                f"Plan:\n{plan_text}\n\n"
                f"Evidence Findings:\n{research_summary}"
            )
            res_analyst = self.client.generate(prompt=analyst_prompt, system=analyst_sys, temperature=0.2, num_predict=512)
            analysis_text = res_analyst.get("response", "").strip()
            elapsed_analyst = int((time.perf_counter() - t0) * 1000)
            agent_latencies["Analyst"] = elapsed_analyst
            p_tok = res_analyst.get("prompt_eval_count", 0)
            c_tok = res_analyst.get("eval_count", 0)
            agent_tokens["Analyst"] = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            # -----------------------------------------------------------------
            # 4. VERIFICATION AGENT (Deterministic + LLM Fact-Checking)
            # -----------------------------------------------------------------
            t0 = time.perf_counter()
            # 4a. Deterministic mathematical check
            deterministic_issues = check_numerical_consistency(analysis_text)
            audit_notes = []
            for issue in deterministic_issues:
                audit_notes.append(f"- [NUMERICAL MISMATCH] {issue.message}")

            # 4b. LLM Claim verification
            verifier_sys = (
                "You are the Verification Agent of Orchestra AI. "
                "Rigidly audit assertions, mathematical calculations, and unit conversions against ground truth sources. "
                "Explicitly flag any unsupported assertions, mathematical errors (e.g. ppm vs percentage), or unverified claims."
            )
            verifier_prompt = (
                f"Perform a strict verification audit on the analysis below against the original source evidence:\n\n"
                f"Analysis Text:\n{analysis_text}\n\n"
                f"Source Evidence:\n{evidence_block}\n\n"
                f"Deterministic Math Audit:\n" + ("\n".join(audit_notes) if audit_notes else "No automated unit conversion discrepancies flagged.")
            )
            res_verifier = self.client.generate(prompt=verifier_prompt, system=verifier_sys, temperature=0.1, num_predict=384)
            verification_text = res_verifier.get("response", "").strip()
            elapsed_verifier = int((time.perf_counter() - t0) * 1000)
            agent_latencies["Verifier"] = elapsed_verifier
            p_tok = res_verifier.get("prompt_eval_count", 0)
            c_tok = res_verifier.get("eval_count", 0)
            agent_tokens["Verifier"] = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            # -----------------------------------------------------------------
            # 5. REPORTER AGENT
            # -----------------------------------------------------------------
            t0 = time.perf_counter()
            reporter_sys = (
                "You are the Reporter Agent of Orchestra AI. "
                "Compile a comprehensive, publication-grade executive markdown report incorporating verified findings, "
                "factual citations, numerical audit findings, and strategic recommendations."
            )
            reporter_prompt = (
                f"Compile the final executive research report for '{task.name}':\n\n"
                f"Analysis:\n{analysis_text}\n\n"
                f"Verification Audit:\n{verification_text}\n\n"
                f"Original Sources for Citation:\n{evidence_block}"
            )
            res_reporter = self.client.generate(prompt=reporter_prompt, system=reporter_sys, temperature=0.2, num_predict=768)
            final_report = res_reporter.get("response", "").strip()
            elapsed_reporter = int((time.perf_counter() - t0) * 1000)
            agent_latencies["Reporter"] = elapsed_reporter
            p_tok = res_reporter.get("prompt_eval_count", 0)
            c_tok = res_reporter.get("eval_count", 0)
            agent_tokens["Reporter"] = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            total_elapsed_ms = int((time.perf_counter() - t_start) * 1000)
            total_tokens = total_prompt_tokens + total_completion_tokens

            # Final report numerical check
            final_issues = check_numerical_consistency(final_report)

            return MultiAgentRunResult(
                task_id=task.id,
                task_name=task.name,
                report_text=final_report,
                execution_time_ms=total_elapsed_ms,
                prompt_tokens=total_prompt_tokens,
                completion_tokens=total_completion_tokens,
                total_tokens=total_tokens,
                agent_latencies_ms=agent_latencies,
                agent_tokens=agent_tokens,
                numerical_issues=final_issues,
                success=True,
                error_message=None,
            )

        except Exception as exc:
            total_elapsed_ms = int((time.perf_counter() - t_start) * 1000)
            logger.error(f"Five-agent evaluator failed for task {task.id}: {exc}")
            return MultiAgentRunResult(
                task_id=task.id,
                task_name=task.name,
                report_text="",
                execution_time_ms=total_elapsed_ms,
                prompt_tokens=total_prompt_tokens,
                completion_tokens=total_completion_tokens,
                total_tokens=total_prompt_tokens + total_completion_tokens,
                agent_latencies_ms=agent_latencies,
                agent_tokens=agent_tokens,
                numerical_issues=[],
                success=False,
                error_message=str(exc),
            )


class BenchmarkRunner:
    """Executes the complete evaluation benchmark comparing Single-Agent and Multi-Agent."""

    def __init__(self, ollama_client: Optional[OllamaClient] = None):
        self.client = ollama_client or OllamaClient()
        self.single_agent = SingleAgentBaseline(self.client)
        self.multi_agent = FiveAgentEvaluator(self.client)

    def run_task(self, task: BenchmarkTask) -> TaskComparisonResult:
        """Run single-agent and multi-agent workflows on a single task and compute metrics."""
        logger.info(f"Running benchmark on task: {task.name} ({task.id})")

        # 1. Run Single-Agent Baseline
        single_res = self.single_agent.execute(task)

        # 2. Run Multi-Agent Workflow
        multi_res = self.multi_agent.execute(task)

        # 3. Compute Metrics
        single_metrics = compute_task_metrics(
            report_text=single_res.report_text,
            task=task,
            execution_time_ms=single_res.execution_time_ms,
            total_tokens=single_res.total_tokens,
            prompt_tokens=single_res.prompt_tokens,
            completion_tokens=single_res.completion_tokens,
        )

        multi_metrics = compute_task_metrics(
            report_text=multi_res.report_text,
            task=task,
            execution_time_ms=multi_res.execution_time_ms,
            total_tokens=multi_res.total_tokens,
            prompt_tokens=multi_res.prompt_tokens,
            completion_tokens=multi_res.completion_tokens,
        )

        return TaskComparisonResult(
            task_id=task.id,
            task_name=task.name,
            category=task.category,
            single_agent_metrics=single_metrics,
            multi_agent_metrics=multi_metrics,
            single_agent_report=single_res.report_text,
            multi_agent_report=multi_res.report_text,
            numerical_trap_present=bool(task.numerical_trap),
            unsupported_claim_present=bool(task.unsupported_claim),
            contradiction_present=bool(task.contradiction_trap),
        )

    def run_all(self, tasks: Optional[List[BenchmarkTask]] = None) -> List[TaskComparisonResult]:
        """Execute the entire benchmark suite across all configured tasks."""
        target_tasks = tasks or BENCHMARK_TASKS
        results: List[TaskComparisonResult] = []

        for task in target_tasks:
            result = self.run_task(task)
            results.append(result)

        return results
