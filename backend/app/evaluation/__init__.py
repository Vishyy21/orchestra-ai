"""ORCHESTRA AI — Evaluation and Benchmarking Suite.
Provides single-agent baseline execution, controlled benchmark tasks, and deterministic evaluation metrics.
"""

from app.evaluation.baseline import SingleAgentBaseline, SingleAgentResult
from app.evaluation.benchmark_tasks import BENCHMARK_TASKS, BenchmarkTask
from app.evaluation.metrics import (
    EvaluationMetrics,
    compute_task_metrics,
    aggregate_metrics,
)
from app.evaluation.runner import BenchmarkRunner, TaskComparisonResult
from app.evaluation.reporter import generate_benchmark_report

__all__ = [
    "SingleAgentBaseline",
    "SingleAgentResult",
    "BENCHMARK_TASKS",
    "BenchmarkTask",
    "EvaluationMetrics",
    "compute_task_metrics",
    "aggregate_metrics",
    "BenchmarkRunner",
    "TaskComparisonResult",
    "generate_benchmark_report",
]
