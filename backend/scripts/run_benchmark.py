"""Standalone Benchmark Evaluation Runner for ORCHESTRA AI.

Executes the 10 controlled benchmark tasks through both Single-Agent baseline
and Five-Agent multi-agent workflow, evaluates metrics, and generates
the final benchmark reports.
"""

import os
import sys
import json
import logging
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.llm.ollama_client import OllamaClient
from app.evaluation.benchmark_tasks import BENCHMARK_TASKS
from app.evaluation.runner import BenchmarkRunner
from app.evaluation.reporter import generate_benchmark_report, format_markdown_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("orchestra.benchmark")


def main():
    logger.info("Initializing ORCHESTRA AI Controlled Benchmark Suite...")
    client = OllamaClient()

    conn = client.check_connectivity()
    if not conn["connected"]:
        logger.error(f"Cannot connect to Ollama at {client.base_url}. Please ensure Ollama is running.")
        sys.exit(1)

    model_status = client.check_model_availability()
    if not model_status["available"]:
        logger.error(f"Model '{client.model}' not installed in local Ollama.")
        sys.exit(1)

    logger.info(f"Ollama connected successfully. Target model: {client.model}")
    logger.info(f"Evaluating {len(BENCHMARK_TASKS)} controlled benchmark tasks...")

    runner = BenchmarkRunner(client)
    comparison_results = []

    for idx, task in enumerate(BENCHMARK_TASKS, 1):
        logger.info(f"[{idx}/{len(BENCHMARK_TASKS)}] Running Task: {task.name} ({task.id})")
        res = runner.run_task(task)
        comparison_results.append(res)
        logger.info(
            f"  -> Single-Agent: {res.single_agent_metrics.execution_time_ms}ms, "
            f"Tokens: {res.single_agent_metrics.token_usage}, "
            f"Completeness: {res.single_agent_metrics.completeness_score*100:.0f}%, "
            f"Math Acc: {res.single_agent_metrics.numerical_accuracy*100:.0f}%"
        )
        logger.info(
            f"  -> Multi-Agent:  {res.multi_agent_metrics.execution_time_ms}ms, "
            f"Tokens: {res.multi_agent_metrics.token_usage}, "
            f"Completeness: {res.multi_agent_metrics.completeness_score*100:.0f}%, "
            f"Math Acc: {res.multi_agent_metrics.numerical_accuracy*100:.0f}%"
        )

    # Output directory
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "evaluation"))
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)

    report_data = generate_benchmark_report(
        results=comparison_results,
        output_dir=output_dir,
        model_name=client.model,
    )

    md_report = format_markdown_report(report_data)
    eval_doc_path = os.path.join(docs_dir, "EVALUATION.md")
    with open(eval_doc_path, "w", encoding="utf-8") as f:
        f.write(md_report)

    logger.info(f"Benchmark completed successfully!")
    logger.info(f"JSON Report: {os.path.join(output_dir, 'benchmark_report.json')}")
    logger.info(f"Markdown Documentation: {eval_doc_path}")


if __name__ == "__main__":
    main()
