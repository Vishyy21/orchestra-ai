"""Phase 3.2 Tests: Verification Accuracy, Numerical Consistency & Data Integrity.

Covers:
1. Deterministic numerical conversion checks (0.73% to ppm, percentage-to-decimal, units, contradictions).
2. Incorrect numerical conversion detection (error factor ~1000x flagged).
3. Correct numerical conversion acceptance (within tolerance).
4. Stronger duplicate detection via SHA-256 (identical files with different filenames deduplicated).
5. Different files with identical filenames and sizes not deduplicated.
6. Non-destructive migration backfill and existing document accessibility.
7. Verification language distinguishing uploaded documents vs web sources, partially supported, and unsupported,
   with no scientific authority implication.
"""

import io
import os
import hashlib
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi import UploadFile

from app.rag.numerical_verifier import (
    check_numerical_consistency,
    format_numerical_audit_section,
    NumericalIssue,
)
from app.rag.document_service import DocumentService
from app.database.models import Document
from app.database.session import init_db
from app.graph.workflow import verifier_node, reporter_node, OrchestraAgentState


# =============================================================================
# 1. Numerical Consistency Tests
# =============================================================================

def test_ppm_conversion_0_73_percent_accepted():
    """Verify that 0.73% = 7,300 ppm is accepted as mathematically correct."""
    text_cases = [
        "The physical error rate is 0.73% (7,300 ppm) across the lattice.",
        "Measured error rate: 0.73% = 7,300 ppm in current superconducting tests.",
        "Error rate is 7,300 ppm (0.73%) in the experimental baseline.",
        "The threshold was stated as 0.73 percent (7300 ppm).",
    ]
    for text in text_cases:
        issues = check_numerical_consistency(text)
        assert len(issues) == 0, f"Expected 0 issues for correct text: {text}, found: {issues}"


def test_ppm_conversion_0_73_percent_incorrect_flagged():
    """Verify that 0.73% = 7.3 ppm is flagged with a 1000x error discrepancy."""
    incorrect_text = "The physical error rate is 0.73% (7.3 ppm) which satisfies the threshold."
    issues = check_numerical_consistency(incorrect_text)
    
    assert len(issues) >= 1
    issue = issues[0]
    assert "Percentage to PPM conversion mismatch" in issue.issue_type
    assert "7,300 ppm" in issue.expected
    assert "7.3 ppm" in issue.found
    assert "1000.0x" in issue.message or "error factor" in issue.message


def test_reverse_ppm_to_percentage_incorrect_flagged():
    """Verify that 7.3 ppm = 0.73% is flagged as incorrect."""
    incorrect_text = "The detected rate was 7.3 ppm (0.73%) across all cycles."
    issues = check_numerical_consistency(incorrect_text)
    
    assert len(issues) >= 1
    issue = issues[0]
    assert "PPM to Percentage conversion mismatch" in issue.issue_type
    assert "0.00073%" in issue.expected
    assert "0.73%" in issue.found


def test_percentage_to_decimal_conversion():
    """Verify that 0.73% = 0.0073 is accepted while 0.73% = 0.073 is flagged."""
    correct_text = "The error margin is 0.73% (decimal: 0.0073)."
    assert len(check_numerical_consistency(correct_text)) == 0

    incorrect_text = "The error margin is 0.73% (decimal: 0.073)."
    issues = check_numerical_consistency(incorrect_text)
    assert len(issues) == 1
    assert "Percentage to Decimal conversion mismatch" in issues[0].issue_type
    assert "0.0073" in issues[0].expected
    assert "0.073" in issues[0].found


def test_explicit_time_unit_conversion():
    """Verify time unit conversions: 10 ms = 10,000 us (valid) vs 10 ms = 100 us (flagged)."""
    valid_text = "Decoding latency is 10 ms (10,000 us) per round."
    assert len(check_numerical_consistency(valid_text)) == 0

    invalid_text = "Decoding latency is 10 ms (100 us) per round."
    issues = check_numerical_consistency(invalid_text)
    assert len(issues) >= 1
    assert "Time unit conversion mismatch" in issues[0].issue_type
    assert "10000 us" in issues[0].expected


def test_explicit_memory_unit_conversion():
    """Verify memory unit conversions: 1 GB = 1,024 MB (valid) vs 1 GB = 100 MB (flagged)."""
    valid_text = "Buffer capacity is 2 GB (2048 MB)."
    assert len(check_numerical_consistency(valid_text)) == 0

    invalid_text = "Buffer capacity is 2 GB (200 MB)."
    issues = check_numerical_consistency(invalid_text)
    assert len(issues) >= 1
    assert "Data memory unit conversion mismatch" in issues[0].issue_type


def test_contradictory_metric_values_flagged():
    """Verify that conflicting values stated for the same metric are flagged."""
    contradictory_text = (
        "In Section 1, the physical error rate is 0.73% for X-basis operations. "
        "Later in Section 4, the physical error rate is 0.12% for the same architecture."
    )
    issues = check_numerical_consistency(contradictory_text)
    assert any("physical error rate" in iss.issue_type.lower() for iss in issues)


def test_format_numerical_audit_section():
    """Verify markdown output formatting for clean and flagged cases."""
    # Clean case
    clean_md = format_numerical_audit_section([])
    assert "### Numerical Consistency Audit" in clean_md
    assert "✅ All explicit numerical conversions" in clean_md

    # Discrepancy case
    sample_issue = NumericalIssue(
        issue_type="Percentage to PPM conversion mismatch",
        context="0.73% (7.3 ppm)",
        expected="7,300 ppm",
        found="7.3 ppm",
        message="0.73% equals 7,300 ppm, NOT 7.3 ppm.",
    )
    flagged_md = format_numerical_audit_section([sample_issue])
    assert "### Numerical Consistency Audit" in flagged_md
    assert "⚠️ **Flagged Discrepancy" in flagged_md
    assert "7,300 ppm, NOT 7.3 ppm" in flagged_md


# =============================================================================
# 2. SHA-256 Duplicate Detection & Data Integrity Tests
# =============================================================================

@pytest.mark.asyncio
async def test_identical_files_different_filenames_deduplicated(tmp_path: Path, db_session):
    """Uploading identical content under different filenames reuses the existing record."""
    service = DocumentService(uploads_dir=tmp_path / "uploads")

    content = b"Surface code quantum error correction requires nearest-neighbor coupling."
    content_hash = hashlib.sha256(content).hexdigest()

    # Upload 1: original_spec.txt
    file1 = UploadFile(
        filename="original_spec.txt",
        file=io.BytesIO(content),
        headers={"content-type": "text/plain"},
    )
    with patch("app.rag.document_service.chroma_service.index_chunks", return_value=3):
        doc1 = await service.save_and_index_file(db=db_session, upload_file=file1)

    assert doc1.filename == "original_spec.txt"
    assert doc1.file_hash == content_hash
    assert doc1.indexed is True

    # Upload 2: renamed_copy.txt with identical content
    file2 = UploadFile(
        filename="renamed_copy.txt",
        file=io.BytesIO(content),
        headers={"content-type": "text/plain"},
    )
    with patch("app.rag.document_service.chroma_service.index_chunks") as mock_index:
        doc2 = await service.save_and_index_file(db=db_session, upload_file=file2)
        # Should not re-index in ChromaDB
        mock_index.assert_not_called()

    # Must return the existing document record
    assert doc2.id == doc1.id
    assert doc2.file_hash == content_hash

    # Database must contain exactly one document record
    total_docs = db_session.query(Document).count()
    assert total_docs == 1


@pytest.mark.asyncio
async def test_different_files_identical_filenames_and_sizes_not_deduplicated(tmp_path: Path, db_session):
    """Different files that share the exact same filename and byte length are NOT deduplicated."""
    service = DocumentService(uploads_dir=tmp_path / "uploads")

    content_a = b"AAAA_payload_123"  # 16 bytes
    content_b = b"BBBB_payload_456"  # 16 bytes, different content, same length
    assert len(content_a) == len(content_b)
    hash_a = hashlib.sha256(content_a).hexdigest()
    hash_b = hashlib.sha256(content_b).hexdigest()
    assert hash_a != hash_b

    # Upload 1: report.txt
    file1 = UploadFile(
        filename="report.txt",
        file=io.BytesIO(content_a),
        headers={"content-type": "text/plain"},
    )
    with patch("app.rag.document_service.chroma_service.index_chunks", return_value=2):
        doc1 = await service.save_and_index_file(db=db_session, upload_file=file1)

    # Upload 2: report.txt (same name and size, different content)
    file2 = UploadFile(
        filename="report.txt",
        file=io.BytesIO(content_b),
        headers={"content-type": "text/plain"},
    )
    with patch("app.rag.document_service.chroma_service.index_chunks", return_value=2):
        doc2 = await service.save_and_index_file(db=db_session, upload_file=file2)

    assert doc1.id != doc2.id
    assert doc1.file_hash == hash_a
    assert doc2.file_hash == hash_b
    assert doc2.filename == "report_1.txt"

    total_docs = db_session.query(Document).count()
    assert total_docs == 2


def test_existing_documents_accessible_after_migration(tmp_path: Path, db_session):
    """Existing documents without file_hash remain accessible and are safely backfilled."""
    # Create a physical file on disk
    file_path = tmp_path / "legacy_doc.txt"
    content = b"Legacy document content prior to Phase 3.2 schema update."
    file_path.write_bytes(content)
    expected_hash = hashlib.sha256(content).hexdigest()

    # Insert legacy record with file_hash = None
    legacy_doc = Document(
        filename="legacy_doc.txt",
        file_path=str(file_path),
        file_size=len(content),
        mime_type="text/plain",
        indexed=True,
        chunk_count=1,
        file_hash=None,
    )
    db_session.add(legacy_doc)
    db_session.commit()
    doc_id = legacy_doc.id

    # Simulate migration backfill logic
    unhashed_docs = db_session.query(Document).filter(
        (Document.file_hash == None) | (Document.file_hash == "")
    ).all()
    for doc in unhashed_docs:
        p = Path(doc.file_path)
        if p.exists():
            doc.file_hash = hashlib.sha256(p.read_bytes()).hexdigest()
    db_session.commit()

    # Verify document is still intact, accessible, and has backfilled hash
    retrieved = db_session.query(Document).filter(Document.id == doc_id).first()
    assert retrieved is not None
    assert retrieved.filename == "legacy_doc.txt"
    assert retrieved.file_hash == expected_hash
    assert retrieved.indexed is True


# =============================================================================
# 3. Verification Language and Claim Categorization Tests
# =============================================================================

def test_verifier_node_language_and_scientific_disclaimer():
    """Verify that verifier_node categorizes claims into the 4 sections and disclaims scientific authority."""
    state: OrchestraAgentState = {
        "task_id": "task_int_1",
        "task_title": "Quantum Error Correction Specification",
        "analysis_summary": (
            "Surface code physical error rate of 0.73% (7.3 ppm) meets fault-tolerant requirements. "
            "Internal spec claims logical qubit stability."
        ),
        "citations": [
            {"title": "Google Quantum AI 2023", "url": "https://example.com/qec", "snippet": "Surface code demonstrated"}
        ],
        "document_references": [
            {"filename": "quantum_spec.pdf", "page_number": 1, "chunk_index": 0, "excerpt": "Physical threshold 0.73%"}
        ],
    }

    mock_llm_response = {
        "response": (
            "### Supported by Uploaded Documents\n"
            "- Physical threshold constraint of 0.73% is specified in quantum_spec.pdf.\n\n"
            "### Supported by Retrieved Web Sources\n"
            "- Surface code fault-tolerance concepts backed by Google Quantum AI 2023 literature.\n\n"
            "### Partially Supported Claims\n"
            "- Scalability across 1,000 logical qubits requires further empirical study.\n\n"
            "### Unsupported or Conflicting Claims\n"
            "- None identified."
        )
    }

    with patch("app.graph.workflow.ollama_client.generate", return_value=mock_llm_response) as mock_gen, \
         patch("app.graph.workflow._persist_agent_run"):
        result = verifier_node(state)

        # Check prompt instructions
        prompt_args = mock_gen.call_args[1]
        system_prompt = prompt_args.get("system", "")
        assert "### Supported by Uploaded Documents" in system_prompt
        assert "### Supported by Retrieved Web Sources" in system_prompt
        assert "### Partially Supported Claims" in system_prompt
        assert "### Unsupported or Conflicting Claims" in system_prompt
        assert "Never imply that an uploaded document's claims are independently scientifically verified" in system_prompt
        assert "architecture constraints, NOT independent scientific proof" in system_prompt

        # Check output contains the 4 categories plus deterministic numerical audit
        report = result["verification_report"]
        assert "### Supported by Uploaded Documents" in report
        assert "### Supported by Retrieved Web Sources" in report
        assert "### Partially Supported Claims" in report
        assert "### Unsupported or Conflicting Claims" in report
        assert "### Numerical Consistency Audit" in report
        # The input analysis contained '0.73% (7.3 ppm)', which must be flagged!
        assert "Percentage to PPM conversion mismatch" in report
        assert "7,300 ppm, NOT 7.3 ppm" in report


def test_reporter_node_includes_audit_and_honest_citations():
    """Verify that reporter_node includes verification notes, numerical audit, and honest source labels."""
    state: OrchestraAgentState = {
        "task_id": "task_int_2",
        "task_title": "Quantum Benchmark Report",
        "plan_steps": ["Step 1: Ingest spec", "Step 2: Analyze error rate"],
        "research_context": ["Web source findings"],
        "analysis_summary": "Analysis states 0.73% is 7.3 ppm.",
        "verification_report": (
            "### Supported by Uploaded Documents\n- Internal spec constraints\n\n"
            "### Supported by Retrieved Web Sources\n- Published literature\n\n"
            "### Partially Supported Claims\n- Extrapolations\n\n"
            "### Unsupported or Conflicting Claims\n- None\n\n"
            "### Numerical Consistency Audit\n- ⚠️ Flagged: 0.73% equals 7,300 ppm, NOT 7.3 ppm."
        ),
        "citations": [
            {"title": "External Research", "url": "https://example.com/study", "snippet": "Research snippet"}
        ],
        "document_references": [
            {"filename": "spec.pdf", "doc_id": "doc_999", "page_number": 2, "chunk_index": 1, "excerpt": "Spec excerpt"}
        ],
    }

    mock_llm_response = {
        "response": "# Executive Summary\nQuantum computing report with verified findings."
    }

    with patch("app.graph.workflow.ollama_client.generate", return_value=mock_llm_response), \
         patch("app.graph.workflow._persist_agent_run"), \
         patch("app.graph.workflow.SessionLocal") as mock_session_local:
        
        mock_db = MagicMock()
        mock_session_local.return_value.__enter__.return_value = mock_db
        
        result = reporter_node(state)
        report = result["final_report"]

        # Check required sections
        assert "## Uploaded Document References" in report
        assert "## Retrieved Web Sources" in report
        assert "## Verification Notes" in report
        assert "### Supported by Uploaded Documents" in report
        assert "### Supported by Retrieved Web Sources" in report
        assert "### Numerical Consistency Audit" in report
        assert "7,300 ppm, NOT 7.3 ppm" in report
