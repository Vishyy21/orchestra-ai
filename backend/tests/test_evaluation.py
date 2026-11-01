"""Tests for Phase 5: Single-Agent vs Multi-Agent Evaluation Suite.

Validates:
1. Baseline execution logic with mocked Ollama inference.
2. Evaluation isolation (no modification of production SQLite task records).
3. Metric calculations (completeness, evidence coverage, numerical accuracy, traceability).
4. Benchmark result persistence (JSON and Markdown output).
5. Baseline failure handling.
6. Benchmark tasks dataset integrity and schema consistency.
"""

import os
import json
import pytest
from unittest.mock import MagicMock, patch

from app.evaluation.benchmark_tasks import BENCHMARK_TASKS, BenchmarkTask
from app.evaluation.baseline import SingleAgentBaseline, SingleAgentResult, format_evidence_context
from app.evaluation.metrics import (
    calculate_completeness,
    calculate_evidence_coverage,
    calculate_unsupported_claims,
    calculate_numerical_accuracy,
    calculate_source_traceability,
    compute_task_metrics,
    aggregate_metrics,
    EvaluationMetrics,
)
from app.evaluation.runner import FiveAgentEvaluator, BenchmarkRunner, TaskComparisonResult
from app.evaluation.reporter import generate_benchmark_report, format_markdown_report
from app.database.session import SessionLocal
from app.database.models import Task, AgentRun


def test_benchmark_tasks_schema_and_dataset():
    """Verify that all 10 benchmark tasks are properly structured and meet coverage requirements."""
    assert len(BENCHMARK_TASKS) == 10

    categories = {t.category for t in BENCHMARK_TASKS}
    assert "general_research" in categories
    assert "multi_source" in categories
    assert "numerical_verification" in categories
    assert "contradictory_evidence" in categories
    assert "document_rag" in categories
    assert "claim_verification" in categories
    assert "hybrid_research" in categories

    for t in BENCHMARK_TASKS:
        assert t.id.startswith("eval-task-")
        assert len(t.name) > 10
        assert len(t.query) > 10
        assert len(t.expected_checklist) >= 4
        # Must have web sources, document sources, or both
        assert len(t.web_sources) > 0 or len(t.document_sources) > 0


def test_format_evidence_context():
    """Verify evidence block formatting for unified prompt generation."""
    task = BENCHMARK_TASKS[0]
    block = format_evidence_context(task)
    assert "=== RETRIEVED WEB SOURCES ===" in block
    assert "NVIDIA Blackwell" in block
    assert "https://" in block


def test_single_agent_baseline_execution_mocked():
    """Test successful single-agent baseline execution with mocked Ollama."""
    mock_client = MagicMock()
    mock_client.model = "qwen3.5:4b"
    mock_client.generate.return_value = {
        "model": "qwen3.5:4b",
        "response": (
            "# Executive Report: NVIDIA Blackwell Architecture\n\n"
            "The NVIDIA Blackwell B200 features 208 billion transistors on custom TSMC 4NP packaging. "
            "It connects dual dies via a 10 TB/s link. The second-generation Transformer Engine supports FP4 precision. "
            "The 5th gen NVLink provides 1.8 TB/s bidirectional bandwidth per GPU. "
            "Memory capacity includes 192GB HBM3e with 8 TB/s bandwidth [Source 1].\n\n"
            "## Citations\n[Source 1] https://developer.nvidia.com/blog/nvidia-blackwell-platform-arrives/"
        ),
        "prompt_eval_count": 320,
        "eval_count": 450,
        "latency_ms": 1500,
    }

    baseline = SingleAgentBaseline(mock_client)
    task = BENCHMARK_TASKS[0]

    result = baseline.execute(task)

    assert result.success is True
    assert result.task_id == task.id
    assert "Blackwell" in result.report_text
    assert result.prompt_tokens == 320
    assert result.completion_tokens == 450
    assert result.total_tokens == 770
    assert result.execution_time_ms >= 0


def test_single_agent_baseline_failure_handling():
    """Verify single-agent baseline handles Ollama failures gracefully without crashing."""
    mock_client = MagicMock()
    mock_client.model = "qwen3.5:4b"
    mock_client.generate.side_effect = RuntimeError("Ollama server connection refused")

    baseline = SingleAgentBaseline(mock_client)
    task = BENCHMARK_TASKS[0]

    result = baseline.execute(task)

    assert result.success is False
    assert result.report_text == ""
    assert "Ollama server connection refused" in result.error_message


def test_metric_calculations():
    """Test deterministic calculation of completeness, evidence coverage, math accuracy, and traceability."""
    task = BENCHMARK_TASKS[2]  # Task 3: Numerical verification (0.73% = 7,300 ppm)

    # 1. Report that correctly flags the trap
    good_report = (
        "## Cleanroom Contamination Audit & Warning\n\n"
        "Identification of particulate concentration measurement: particulate defect concentration was declared at 0.73%, but mistakenly labeled as 7.3 ppm. "
        "Mathematical verification reveals 0.73% corresponds to 7,300 ppm, NOT 7.3 ppm, representing a 1,000x error. "
        "Verification of memory conversion confirms 16 GB equals 16,384 MiB for syndrome storage [Source 1]. "
        "Verification of time conversion confirms 120 ms equals 0.12 seconds.\n\n"
        "## References\n[Source 1] https://www.semicon-cleanroom-standards.org/bulletin/2024-q3"
    )

    completeness = calculate_completeness(good_report, task.expected_checklist)
    assert completeness >= 0.75

    coverage = calculate_evidence_coverage(good_report)
    assert coverage >= 0.5

    unsupported = calculate_unsupported_claims(good_report, task)
    assert unsupported == 0

    math_acc = calculate_numerical_accuracy(good_report, task)
    assert math_acc == 1.0

    traceability = calculate_source_traceability(good_report, task)
    assert traceability == 1.0

    # 2. Flawed report that accepted 7.3 ppm uncritically
    bad_report = (
        "Particle contamination was measured at 0.73% (7.3 ppm). Everything is within normal limits."
    )
    bad_unsupported = calculate_unsupported_claims(bad_report, task)
    assert bad_unsupported >= 1

    bad_math = calculate_numerical_accuracy(bad_report, task)
    assert bad_math < 1.0


def test_evaluation_isolation_from_production_database():
    """Verify running baseline and benchmark does not insert or mutate production Task/AgentRun records."""
    with SessionLocal() as db:
        initial_task_count = db.query(Task).count()
        initial_run_count = db.query(AgentRun).count()

    mock_client = MagicMock()
    mock_client.model = "qwen3.5:4b"
    mock_client.generate.return_value = {
        "model": "qwen3.5:4b",
        "response": "Synthesized benchmark analysis report [Source 1].",
        "prompt_eval_count": 100,
        "eval_count": 100,
    }

    baseline = SingleAgentBaseline(mock_client)
    task = BENCHMARK_TASKS[0]
    result = baseline.execute(task)

    assert result.success is True

    # Assert production database remained untouched
    with SessionLocal() as db:
        final_task_count = db.query(Task).count()
        final_run_count = db.query(AgentRun).count()

    assert final_task_count == initial_task_count
    assert final_run_count == initial_run_count


def test_benchmark_report_generation(tmp_path):
    """Test generating JSON and Markdown benchmark reports from comparison results."""
    m_single = EvaluationMetrics(
        completeness_score=0.72,
        evidence_coverage=0.65,
        unsupported_claims=3,
        numerical_accuracy=0.75,
        source_traceability=0.60,
        execution_time_ms=5200,
        token_usage=1200,
        prompt_tokens=400,
        completion_tokens=800,
    )
    m_multi = EvaluationMetrics(
        completeness_score=0.94,
        evidence_coverage=0.91,
        unsupported_claims=0,
        numerical_accuracy=1.0,
        source_traceability=0.95,
        execution_time_ms=24800,
        token_usage=3800,
        prompt_tokens=1500,
        completion_tokens=2300,
    )

    comparison = TaskComparisonResult(
        task_id="eval-task-01",
        task_name="NVIDIA Blackwell Architecture",
        category="general_research",
        single_agent_metrics=m_single,
        multi_agent_metrics=m_multi,
        single_agent_report="Single agent text",
        multi_agent_report="Multi agent text",
    )

    report_data = generate_benchmark_report(
        results=[comparison],
        output_dir=str(tmp_path),
        model_name="qwen3.5:4b",
    )

    assert "metadata" in report_data
    assert "aggregate_summary" in report_data
    assert report_data["aggregate_summary"]["single_agent"]["avg_completeness"] == 0.72
    assert report_data["aggregate_summary"]["multi_agent"]["avg_completeness"] == 0.94

    json_file = tmp_path / "benchmark_report.json"
    assert json_file.exists()

    with open(json_file, "r") as f:
        loaded = json.load(f)
    assert loaded["metadata"]["model"] == "qwen3.5:4b"

    md_text = format_markdown_report(report_data)
    assert "# ORCHESTRA AI — Empirical Benchmark Evaluation" in md_text
    assert "Single-Agent Baseline" in md_text
    assert "Five-Agent Architecture" in md_text
