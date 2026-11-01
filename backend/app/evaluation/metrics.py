"""Deterministic Evaluation Metrics for ORCHESTRA AI Benchmark.

Provides standardized, reproducible scoring functions for:
1. Completeness (checklist coverage)
2. Evidence Coverage (supported claims ratio)
3. Unsupported Claims Count
4. Numerical Accuracy (deterministic math/unit audit)
5. Source Traceability (valid citations)
6. Latency & Token Usage
"""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.evaluation.benchmark_tasks import BenchmarkTask
from app.rag.numerical_verifier import check_numerical_consistency


@dataclass
class EvaluationMetrics:
    """Standardized metrics payload for a single task execution."""
    completeness_score: float  # 0.0 to 1.0 (checklist match ratio)
    evidence_coverage: float   # 0.0 to 1.0 (proportion of paragraphs/sections with source citations)
    unsupported_claims: int    # Count of ungrounded or contradictory statements
    numerical_accuracy: float  # 0.0 to 1.0 (1.0 = zero numerical discrepancies)
    source_traceability: float # 0.0 to 1.0 (proportion of provided sources referenced)
    execution_time_ms: int     # Wall-clock milliseconds
    token_usage: int           # Total tokens consumed (prompt + completion)
    prompt_tokens: int = 0
    completion_tokens: int = 0


def calculate_completeness(report_text: str, expected_checklist: List[str]) -> float:
    """Calculate the proportion of expected core technical items covered in the report."""
    if not expected_checklist:
        return 1.0
    if not report_text or not report_text.strip():
        return 0.0

    lower_text = report_text.lower()
    matched = 0

    for item in expected_checklist:
        # Extract meaningful tokens (words >= 3 chars, letters/numbers)
        words = [w.lower() for w in re.findall(r'\b[a-zA-Z0-9]+\b', item) if len(w) >= 3]
        if not words:
            continue
        # Match if word or stem (first 4 chars) appears in text
        found_words = sum(1 for w in words if w in lower_text or (len(w) >= 5 and w[:4] in lower_text))
        if (found_words / len(words)) >= 0.35:
            matched += 1

    return round(matched / len(expected_checklist), 3)


def calculate_evidence_coverage(report_text: str) -> float:
    """Measure the proportion of substantive paragraphs containing source citations."""
    if not report_text or not report_text.strip():
        return 0.0

    paragraphs = [p.strip() for p in report_text.split("\n\n") if len(p.strip()) > 60]
    if not paragraphs:
        paragraphs = [p.strip() for p in report_text.splitlines() if len(p.strip()) > 60]
    if not paragraphs:
        return 0.0

    citation_pattern = re.compile(
        r'(\[Source\s*\d+\]|\[Document\s*\d+\]|\[Doc\s*\d+\]|https?://|\.md|\.pdf|FIPS|NIST|IEEE|Whitepaper)',
        re.IGNORECASE
    )

    cited_paragraphs = sum(1 for p in paragraphs if citation_pattern.search(p))
    return round(cited_paragraphs / len(paragraphs), 3)


def calculate_unsupported_claims(
    report_text: str,
    task: BenchmarkTask,
) -> int:
    """Count detected unsupported claims or acceptance of false prompt premises."""
    if not report_text or not report_text.strip():
        return 0

    lower_text = report_text.lower()
    unsupported_count = 0

    # 1. If task has an unsupported claim trap (e.g. LK-99 validated by IEEE/NIST),
    # check if the report accepted it without refutation
    if task.unsupported_claim:
        claim_keywords = ["lk-99", "validated by ieee", "validated by nist", "commercial superconductor"]
        has_keywords = all(kw in lower_text for kw in ["lk-99"])
        # Check if text affirms rather than refutes the false claim
        affirms_pattern = re.compile(r'(?i)(lk-99\s+(?:is|has been confirmed as|was validated as)\s+a?\s*room-temperature\s+superconductor)')
        if affirms_pattern.search(report_text) and not any(neg in lower_text for neg in ["not a superconductor", "refuted", "insulating", "impurity", "false"]):
            unsupported_count += 2

    # 2. Check for acceptance of numerical trap without flagging
    if task.numerical_trap:
        declared = task.numerical_trap.get("declared_statement", "").lower()
        if declared and declared in lower_text:
            # Check if discrepancy was identified
            if "discrepancy" not in lower_text and "not 7.3 ppm" not in lower_text and "7,300 ppm" not in lower_text and "mismatch" not in lower_text:
                unsupported_count += 1

    # 3. Check for contradiction trap: did it declare a single false certainty without citing conflicting sources?
    if task.contradiction_trap:
        # If text cites only one side without acknowledging the conflicting benchmark
        has_src_a = "42%" in report_text or "edgeai" in lower_text
        has_src_b = "11%" in report_text or "deepedge" in lower_text or "4.8%" in report_text
        if (has_src_a and not has_src_b) or (has_src_b and not has_src_a):
            unsupported_count += 1

    return unsupported_count


def calculate_numerical_accuracy(report_text: str, task: BenchmarkTask) -> float:
    """Calculate deterministic numerical accuracy score (1.0 = perfect consistency)."""
    if not report_text or not report_text.strip():
        return 1.0

    issues = check_numerical_consistency(report_text)

    # Additional check: if task specifically had a numerical trap, did report flag it?
    if task.numerical_trap:
        # Check if report correctly stated 7,300 ppm or noted the error
        if "7,300 ppm" not in report_text and "7300 ppm" not in report_text:
            issues_count = len(issues) + 1
        else:
            issues_count = len(issues)
    else:
        issues_count = len(issues)

    if issues_count == 0:
        return 1.0
    return max(0.0, round(1.0 - (issues_count * 0.25), 3))


def calculate_source_traceability(report_text: str, task: BenchmarkTask) -> float:
    """Measure the proportion of provided sources that are explicitly referenced in the report."""
    total_sources = len(task.web_sources) + len(task.document_sources)
    if total_sources == 0:
        return 1.0
    if not report_text or not report_text.strip():
        return 0.0

    lower_text = report_text.lower()
    referenced_count = 0

    for src in task.web_sources:
        title = src.get("title", "").lower()
        url = src.get("url", "").lower()
        # Check for title words or URL domain
        title_words = [w for w in title.split() if len(w) > 4]
        if (url and url in lower_text) or (title_words and any(w in lower_text for w in title_words[:3])):
            referenced_count += 1

    for doc in task.document_sources:
        fname = doc.get("filename", "").lower()
        if fname in lower_text or fname.split(".")[0] in lower_text:
            referenced_count += 1

    return round(min(1.0, referenced_count / total_sources), 3)


def compute_task_metrics(
    report_text: str,
    task: BenchmarkTask,
    execution_time_ms: int,
    total_tokens: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
) -> EvaluationMetrics:
    """Compute complete standardized evaluation metrics for a task execution."""
    completeness = calculate_completeness(report_text, task.expected_checklist)
    evidence_cov = calculate_evidence_coverage(report_text)
    unsupported = calculate_unsupported_claims(report_text, task)
    numerical_acc = calculate_numerical_accuracy(report_text, task)
    traceability = calculate_source_traceability(report_text, task)

    return EvaluationMetrics(
        completeness_score=completeness,
        evidence_coverage=evidence_cov,
        unsupported_claims=unsupported,
        numerical_accuracy=numerical_acc,
        source_traceability=traceability,
        execution_time_ms=execution_time_ms,
        token_usage=total_tokens,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )


def aggregate_metrics(metrics_list: List[EvaluationMetrics]) -> Dict[str, Any]:
    """Aggregate a list of task evaluation metrics into benchmark averages."""
    if not metrics_list:
        return {
            "avg_completeness": 0.0,
            "avg_evidence_coverage": 0.0,
            "total_unsupported_claims": 0,
            "avg_numerical_accuracy": 0.0,
            "avg_source_traceability": 0.0,
            "avg_execution_time_ms": 0,
            "avg_execution_time_sec": 0.0,
            "avg_tokens": 0,
            "total_tokens": 0,
            "task_count": 0,
        }

    n = len(metrics_list)
    return {
        "avg_completeness": round(sum(m.completeness_score for m in metrics_list) / n, 3),
        "avg_evidence_coverage": round(sum(m.evidence_coverage for m in metrics_list) / n, 3),
        "total_unsupported_claims": sum(m.unsupported_claims for m in metrics_list),
        "avg_numerical_accuracy": round(sum(m.numerical_accuracy for m in metrics_list) / n, 3),
        "avg_source_traceability": round(sum(m.source_traceability for m in metrics_list) / n, 3),
        "avg_execution_time_ms": int(sum(m.execution_time_ms for m in metrics_list) / n),
        "avg_execution_time_sec": round((sum(m.execution_time_ms for m in metrics_list) / n) / 1000.0, 2),
        "avg_tokens": int(sum(m.token_usage for m in metrics_list) / n),
        "total_tokens": sum(m.token_usage for m in metrics_list),
        "task_count": n,
    }
