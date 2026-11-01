"""Deterministic Numerical Consistency and Unit Conversion Verifier for ORCHESTRA AI.

Provides lightweight, deterministic mathematical verification for:
1. Percentage-to-ppm conversions (e.g., 0.73% = 7,300 ppm, NOT 7.3 ppm).
2. Percentage-to-decimal conversions (e.g., 0.73% = 0.0073, NOT 0.073).
3. Explicit physical and computational unit conversions (time and memory).
4. Contradictory numerical values declared for identical metrics.
"""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("orchestra.rag.numerical_verifier")


@dataclass
class NumericalIssue:
    """Represents a flagged numerical discrepancy or incorrect unit conversion."""
    issue_type: str
    context: str
    expected: str
    found: str
    message: str


def parse_num(s: str) -> float:
    """Safely parse a numerical string with commas and optional whitespace."""
    return float(s.replace(",", "").strip())


def check_numerical_consistency(text: str) -> List[NumericalIssue]:
    """Audit text deterministically for mathematical and unit conversion discrepancies.
    
    Parameters:
    - text: Analysis summary, verification report, or executive report text.
    
    Returns:
    List of NumericalIssue objects detailing flagged errors.
    """
    if not text or not text.strip():
        return []

    issues: List[NumericalIssue] = []

    # -------------------------------------------------------------------------
    # 1. Percentage to PPM Conversions: 1% = 10,000 ppm
    # -------------------------------------------------------------------------
    # Matches patterns like: "0.73% (7.3 ppm)", "0.73% = 7.3 ppm", "0.73 percent (7.3 ppm)"
    pct_ppm_patterns = [
        r'(?i)(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:[\(\[\{]|\s+or\s+|\s+is\s+|\s+equal\s+to\s+|\s*=\s*|\s*,?\s*corresponding to\s+)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ppm|parts[- ]per[- ]million)[\)\]\}]?',
    ]
    for pattern in pct_ppm_patterns:
        for match in re.finditer(pattern, text):
            try:
                pct_val = parse_num(match.group(1))
                ppm_val = parse_num(match.group(2))
                expected_ppm = pct_val * 10000.0
                if expected_ppm > 0:
                    rel_diff = abs(ppm_val - expected_ppm) / expected_ppm
                    # Allow 5% tolerance for rounding in human reporting
                    if rel_diff > 0.05:
                        full_context = match.group(0).strip()
                        issues.append(NumericalIssue(
                            issue_type="Percentage to PPM conversion mismatch",
                            context=full_context,
                            expected=f"{expected_ppm:,.0f} ppm",
                            found=f"{ppm_val:g} ppm",
                            message=(
                                f"Discrepancy in '{full_context}': {pct_val:g}% equals {expected_ppm:,.0f} ppm, "
                                f"NOT {ppm_val:g} ppm (error factor: {expected_ppm / ppm_val:.1f}x)."
                            ),
                        ))
            except Exception as exc:
                logger.debug(f"Error parsing percentage-ppm match: {exc}")

    # Reverse pattern: "7.3 ppm (0.73%)" or "7.3 ppm = 0.73%"
    ppm_pct_pattern = r'(?i)(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ppm|parts[- ]per[- ]million)\s*(?:[\(\[\{]|\s+or\s+|\s+is\s+|\s+equal\s+to\s+|\s*=\s*|\s*,?\s*corresponding to\s+)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)[\)\]\}]?'
    for match in re.finditer(ppm_pct_pattern, text):
        try:
            ppm_val = parse_num(match.group(1))
            pct_val = parse_num(match.group(2))
            expected_pct = ppm_val / 10000.0
            if expected_pct > 0:
                rel_diff = abs(pct_val - expected_pct) / expected_pct
                if rel_diff > 0.05:
                    full_context = match.group(0).strip()
                    issues.append(NumericalIssue(
                        issue_type="PPM to Percentage conversion mismatch",
                        context=full_context,
                        expected=f"{expected_pct:g}%",
                        found=f"{pct_val:g}%",
                        message=(
                            f"Discrepancy in '{full_context}': {ppm_val:g} ppm equals {expected_pct:g}%, "
                            f"NOT {pct_val:g}%."
                        ),
                    ))
        except Exception as exc:
            logger.debug(f"Error parsing ppm-percentage match: {exc}")

    # -------------------------------------------------------------------------
    # 2. Percentage to Decimal Conversions: X% = X / 100
    # -------------------------------------------------------------------------
    pct_dec_pattern = r'(?i)(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:[\(\[]\s*(?:(?:decimal|ratio|fraction)\s*[:=]\s*)?|\s*(?:is|=|equal to)\s*)(0\.\d+)[\)\]]?'
    for match in re.finditer(pct_dec_pattern, text):
        try:
            pct_val = parse_num(match.group(1))
            dec_val = parse_num(match.group(2))
            expected_dec = pct_val / 100.0
            if expected_dec > 0:
                rel_diff = abs(dec_val - expected_dec) / expected_dec
                if rel_diff > 0.05:
                    full_context = match.group(0).strip()
                    issues.append(NumericalIssue(
                        issue_type="Percentage to Decimal conversion mismatch",
                        context=full_context,
                        expected=f"{expected_dec:g}",
                        found=f"{dec_val:g}",
                        message=(
                            f"Discrepancy in '{full_context}': {pct_val:g}% equals {expected_dec:g} in decimal, "
                            f"NOT {dec_val:g}."
                        ),
                    ))
        except Exception as exc:
            logger.debug(f"Error parsing percentage-decimal match: {exc}")

    # -------------------------------------------------------------------------
    # 3. Explicit Time Unit Conversions (s, ms, us/µs/μs, ns)
    # -------------------------------------------------------------------------
    time_units = {
        "s": 1.0, "sec": 1.0, "second": 1.0, "seconds": 1.0,
        "ms": 1e-3, "millisecond": 1e-3, "milliseconds": 1e-3,
        "us": 1e-6, "µs": 1e-6, "μs": 1e-6, "microsecond": 1e-6, "microseconds": 1e-6,
        "ns": 1e-9, "nanosecond": 1e-9, "nanoseconds": 1e-9,
    }
    unit_pattern = r'(?i)(\d+(?:,\d+)*(?:\.\d+)?)\s*(seconds?|sec|ms|milliseconds?|microseconds?|μs|µs|us|nanoseconds?|ns)\s*[\(\[]\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(seconds?|sec|ms|milliseconds?|microseconds?|μs|µs|us|nanoseconds?|ns)[\)\]]'
    for match in re.finditer(unit_pattern, text):
        try:
            v1 = parse_num(match.group(1))
            u1 = match.group(2).lower()
            v2 = parse_num(match.group(3))
            u2 = match.group(4).lower()

            if u1 in time_units and u2 in time_units and u1 != u2:
                sec1 = v1 * time_units[u1]
                sec2 = v2 * time_units[u2]
                if sec1 > 0:
                    rel_diff = abs(sec2 - sec1) / sec1
                    if rel_diff > 0.05:
                        expected_v2 = sec1 / time_units[u2]
                        full_context = match.group(0).strip()
                        issues.append(NumericalIssue(
                            issue_type="Time unit conversion mismatch",
                            context=full_context,
                            expected=f"{expected_v2:g} {u2}",
                            found=f"{v2:g} {u2}",
                            message=(
                                f"Discrepancy in '{full_context}': {v1:g} {u1} equals {expected_v2:g} {u2}, "
                                f"NOT {v2:g} {u2}."
                            ),
                        ))
        except Exception as exc:
            logger.debug(f"Error parsing time unit match: {exc}")

    # -------------------------------------------------------------------------
    # 4. Explicit Data Memory Unit Conversions (Bytes, KB, MB, GB, TB)
    # -------------------------------------------------------------------------
    data_units = {
        "b": 1.0, "bytes": 1.0, "byte": 1.0,
        "kb": 1024.0, "kilobytes": 1024.0,
        "mb": 1024.0 ** 2, "megabytes": 1024.0 ** 2,
        "gb": 1024.0 ** 3, "gigabytes": 1024.0 ** 3,
        "tb": 1024.0 ** 4, "terabytes": 1024.0 ** 4,
    }
    data_pattern = r'(?i)(\d+(?:,\d+)*(?:\.\d+)?)\s*(bytes?|kb|mb|gb|tb|gigabytes?|megabytes?|kilobytes?)\s*[\(\[]\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(bytes?|kb|mb|gb|tb|gigabytes?|megabytes?|kilobytes?)[\)\]]'
    for match in re.finditer(data_pattern, text):
        try:
            v1 = parse_num(match.group(1))
            u1 = match.group(2).lower()
            v2 = parse_num(match.group(3))
            u2 = match.group(4).lower()

            if u1 in data_units and u2 in data_units and u1 != u2:
                b1 = v1 * data_units[u1]
                b2 = v2 * data_units[u2]
                if b1 > 0:
                    rel_diff = abs(b2 - b1) / b1
                    # Allow 10% tolerance to accommodate 1000 vs 1024 bases
                    if rel_diff > 0.10:
                        expected_v2 = b1 / data_units[u2]
                        full_context = match.group(0).strip()
                        issues.append(NumericalIssue(
                            issue_type="Data memory unit conversion mismatch",
                            context=full_context,
                            expected=f"{expected_v2:g} {u2}",
                            found=f"{v2:g} {u2}",
                            message=(
                                f"Discrepancy in '{full_context}': {v1:g} {u1} equals approximately {expected_v2:g} {u2}, "
                                f"NOT {v2:g} {u2}."
                            ),
                        ))
        except Exception as exc:
            logger.debug(f"Error parsing data unit match: {exc}")

    # -------------------------------------------------------------------------
    # 5. Contradictory Metric Values Repeated Across Document
    # -------------------------------------------------------------------------
    metrics_to_track = [
        "physical error rate",
        "error threshold",
        "decoding latency",
        "code distance",
    ]
    for metric in metrics_to_track:
        pat = rf'(?i){metric}\s*(?:of|is|at|below|strictly below|<=|>=|=)?\s*(\d+(?:\.\d+)?)\s*(%|ppm|μs|µs|us|ns|ms|s)?'
        matches = list(re.finditer(pat, text))
        if len(matches) >= 2:
            seen_normalized = set()
            for m in matches:
                val = m.group(1)
                unit = (m.group(2) or "").lower()
                seen_normalized.add(f"{val}{unit}")
            # If the same metric is stated with conflicting values
            if len(seen_normalized) > 1:
                vals_str = ", ".join(sorted(seen_normalized))
                issues.append(NumericalIssue(
                    issue_type=f"Contradictory values for '{metric}'",
                    context=f"Metric stated with multiple values: {vals_str}",
                    expected="Consistent metric declaration",
                    found=vals_str,
                    message=f"Contradiction: {metric} is reported with differing values: {vals_str}.",
                ))

    return issues


def format_numerical_audit_section(issues: List[NumericalIssue]) -> str:
    """Format numerical audit findings into structured Markdown for Verification Notes."""
    if not issues:
        return (
            "### Numerical Consistency Audit\n"
            "- ✅ All explicit numerical conversions (percentages, ppm, and units) verified mathematically consistent.\n"
        )

    lines = ["### Numerical Consistency Audit"]
    for iss in issues:
        lines.append(f"- ⚠️ **Flagged Discrepancy [{iss.issue_type}]**: {iss.message}")

    return "\n".join(lines) + "\n"
