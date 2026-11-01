"""Tests for Document RAG, Text Extraction, Chunking, and ChromaDB Vector Store."""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.rag.extractor import (
    extract_text_from_file,
    chunk_text,
    DocumentExtractionError,
    ExtractedPage,
)
from app.rag.chroma_service import ChromaService
from app.graph.workflow import OrchestraAgentState, reporter_node


def test_plain_text_extraction(tmp_path: Path):
    """Test text extraction from valid plain text and markdown files."""
    txt_file = tmp_path / "sample.txt"
    txt_file.write_text("Orchestra AI is a multi-agent platform.", encoding="utf-8")

    pages = extract_text_from_file(txt_file)
    assert len(pages) == 1
    assert pages[0].page_number == 1
    assert "Orchestra AI is a multi-agent platform." in pages[0].text


def test_markdown_extraction(tmp_path: Path):
    """Test extraction from markdown files."""
    md_file = tmp_path / "notes.md"
    md_file.write_text("# Title\n\nThis is a test markdown document.", encoding="utf-8")

    pages = extract_text_from_file(md_file)
    assert len(pages) == 1
    assert "This is a test markdown document." in pages[0].text


def test_empty_file_extraction_error(tmp_path: Path):
    """Test that empty files raise DocumentExtractionError."""
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("", encoding="utf-8")

    with pytest.raises(DocumentExtractionError, match="empty"):
        extract_text_from_file(empty_file)


def test_pdf_extraction_real_or_mocked(tmp_path: Path):
    """Test PDF extraction using pypdf writer to generate a valid PDF."""
    import pypdf

    pdf_file = tmp_path / "generated.pdf"
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    with open(pdf_file, "wb") as f:
        writer.write(f)

    # Blank page contains no text, should raise extraction error about no extractable text
    with pytest.raises(DocumentExtractionError, match="no extractable text"):
        extract_text_from_file(pdf_file)


def test_chunking_logic():
    """Test that chunk_text respects chunk_size and chunk_overlap and preserves metadata."""
    sample_text = (
        "Fault-tolerant quantum computing relies on quantum error correction codes to suppress "
        "physical noise and preserve logical quantum information over extended execution times. "
        "Surface codes are currently the leading architecture due to their 2D nearest-neighbor "
        "connectivity and high fault-tolerance threshold of approximately one percent. "
        "Recent experimental demonstrations across superconducting and trapped-ion systems "
        "have validated logical qubit lifetimes exceeding physical component baselines."
    )
    pages = [
        ExtractedPage(page_number=1, text=sample_text),
        ExtractedPage(page_number=2, text="Additional details on topological braiding protocols."),
    ]

    chunks = chunk_text(
        pages=pages,
        doc_id="doc_abc123",
        filename="quantum_manual.pdf",
        chunk_size=150,
        chunk_overlap=20,
    )

    assert len(chunks) > 1
    # Verify metadata preservation
    for c in chunks:
        assert c["metadata"]["doc_id"] == "doc_abc123"
        assert c["metadata"]["filename"] == "quantum_manual.pdf"
        assert c["metadata"]["page_number"] in [1, 2]
        assert "chunk_index" in c["metadata"]
        assert len(c["content"]) > 0


def test_chroma_service_indexing_and_search(tmp_path: Path):
    """Test ChromaDB indexing, semantic search, deduplication, and vector purging."""
    chroma_dir = tmp_path / "chroma_test_store"
    service = ChromaService(persist_dir=chroma_dir, collection_name="unit_test_coll")

    # Mock embeddings to make unit test independent of model downloads and ultra-fast
    mock_emb = [[0.1] * 384, [0.2] * 384]
    with patch.object(service, "embed_texts", return_value=mock_emb):
        chunks = [
            {
                "chunk_id": "test_doc_p1_c0",
                "content": "Surface code architectures for superconducting qubits.",
                "metadata": {"doc_id": "doc_1", "filename": "qec.pdf", "page_number": 1, "chunk_index": 0},
            },
            {
                "chunk_id": "test_doc_p1_c1",
                "content": "Trapped ion quantum memory and shuttling protocols.",
                "metadata": {"doc_id": "doc_1", "filename": "qec.pdf", "page_number": 1, "chunk_index": 1},
            },
        ]

        indexed = service.index_chunks(doc_id="doc_1", filename="qec.pdf", chunks=chunks)
        assert indexed == 2
        assert service.count() == 2

    # Test query
    with patch.object(service, "embed_texts", return_value=[[0.1] * 384]):
        hits = service.search(query="surface code", n_results=2)
        assert len(hits) == 2
        assert hits[0]["filename"] == "qec.pdf"
        assert hits[0]["doc_id"] == "doc_1"

    # Test deduplication: re-indexing doc_1 replaces old vectors
    with patch.object(service, "embed_texts", return_value=[[0.3] * 384]):
        new_chunks = [
            {
                "chunk_id": "test_doc_p1_c0_v2",
                "content": "Updated color code thresholds in 2026.",
                "metadata": {"doc_id": "doc_1", "filename": "qec.pdf", "page_number": 1, "chunk_index": 0},
            }
        ]
        service.index_chunks(doc_id="doc_1", filename="qec.pdf", chunks=new_chunks)
        assert service.count() == 1

    # Test document deletion
    service.delete_document_vectors(doc_id="doc_1")
    assert service.count() == 0


def test_reporter_node_generates_document_references():
    """Verify that reporter_node appends ## Uploaded Document References with full traceability metadata."""
    state: OrchestraAgentState = {
        "task_id": "task_rag_test",
        "task_title": "Quantum Error Correction Analysis",
        "plan_steps": ["Review QEC documents"],
        "research_context": ["Verified local facts"],
        "analysis_summary": "Topological codes provide fault tolerance.",
        "verification_report": "### Supported Claims\n- Fault tolerance threshold.\n\n### Partially Supported Claims\n- None.\n\n### Unsupported or Conflicting Claims\n- None.",
        "citations": [],
        "search_status": "unconfigured",
        "document_references": [
            {
                "filename": "QEC_Whitepaper_2026.pdf",
                "page_number": 3,
                "chunk_index": 2,
                "excerpt": "Surface code threshold demonstrated at 0.7% physical error rate.",
                "doc_id": "doc_12345678",
            }
        ],
    }

    mock_llm_response = {
        "response": "# Quantum Error Correction Analysis\n\n## Executive Summary\n\nDetailed executive findings."
    }

    with patch("app.graph.workflow.ollama_client.generate", return_value=mock_llm_response), \
         patch("app.graph.workflow._persist_agent_run"):
        result = reporter_node(state)
        report = result.get("final_report", "")

        assert "## Uploaded Document References" in report
        assert "QEC_Whitepaper_2026.pdf" in report
        assert "Page 3" in report
        assert "Chunk #2" in report
        assert "Doc ID: `doc_1234...`" in report
        assert "Surface code threshold demonstrated at 0.7%" in report
        assert "## Retrieved Web Sources" in report
        assert "## Verification Notes" in report


def test_reporter_node_no_document_references_when_empty():
    """Verify that reporter_node does NOT invent document references when none were retrieved."""
    state: OrchestraAgentState = {
        "task_id": "task_no_rag",
        "task_title": "General Task Without Documents",
        "plan_steps": ["Execute"],
        "research_context": ["Web facts"],
        "analysis_summary": "General analysis.",
        "verification_report": "Verification passed.",
        "citations": [{"title": "Web Source", "url": "https://example.com", "snippet": "Example snippet"}],
        "search_status": "success",
        "document_references": [],
    }

    mock_llm_response = {
        "response": "# General Task\n\n## Executive Summary\n\nReport summary."
    }

    with patch("app.graph.workflow.ollama_client.generate", return_value=mock_llm_response), \
         patch("app.graph.workflow._persist_agent_run"):
        result = reporter_node(state)
        report = result.get("final_report", "")

        assert "## Uploaded Document References" in report
        assert "No uploaded document references retrieved for this task" in report
        assert "## Retrieved Web Sources" in report
        assert "https://example.com" in report
        assert "## Verification Notes" in report


# ============================================================================
# PHASE 3.1: EVIDENCE QUALITY & RAG RELIABILITY AUDIT TESTS
# ============================================================================

def test_irrelevant_tavily_results_excluded():
    """Requirement 1: Irrelevant web search results are excluded based on semantic similarity."""
    from app.graph.workflow import researcher_node
    from app.tools.tavily_search import TavilySearchResult, TavilySearchResponse

    rel_result = TavilySearchResult(
        title="Topological Surface Codes for Quantum Error Correction",
        url="https://arxiv.org/abs/quantum-surface-codes",
        content="Surface code quantum error correction requires physical error rate below 0.73 percent threshold with syndrome extraction cycles.",
    )
    irrel_result = TavilySearchResult(
        title="IMO Safety Code for Autonomous Ships at Sea",
        url="https://maritime.org/safety-code",
        content="International maritime code governing navigation and collision regulations for autonomous surface cargo vessels in international waters.",
    )

    mock_response = TavilySearchResponse(
        query="Topological surface code syndrome extraction",
        status="success",
        results=[rel_result, irrel_result],
    )

    state: OrchestraAgentState = {
        "task_id": "test_relevance_filter",
        "task_title": "Topological surface code syndrome extraction",
        "task_description": "Assess physical thresholds for 2D surface code lattices.",
        "plan_steps": ["Step 1"],
    }

    with patch("app.graph.workflow.tavily_search", return_value=mock_response), \
         patch("app.graph.workflow.ollama_client.generate", return_value={"response": "Research summary."}), \
         patch("app.graph.workflow._persist_agent_run"), \
         patch("app.graph.workflow.chroma_service.search", return_value=[]):
        output = researcher_node(state)

        citations = output.get("citations", [])
        assert len(citations) == 1, f"Expected 1 relevant citation, got {len(citations)}"
        # Requirement 2: Relevant results retain exact URL and title
        assert citations[0]["url"] == "https://arxiv.org/abs/quantum-surface-codes"
        assert citations[0]["title"] == "Topological Surface Codes for Quantum Error Correction"
        assert "0.73 percent threshold" in citations[0]["snippet"]
        assert output.get("search_status") == "success"


def test_empty_relevant_web_sources_reports_none_found():
    """Requirement 1: When no relevant web results remain, explicitly report that no relevant sources were found."""
    from app.graph.workflow import researcher_node
    from app.tools.tavily_search import TavilySearchResult, TavilySearchResponse

    irrel_result = TavilySearchResult(
        title="Delicious Chocolate Chip Cookie Recipe",
        url="https://baking.com/cookies",
        content="Combine flour, sugar, butter and chocolate chips and bake at 350 degrees F for 12 minutes.",
    )

    mock_response = TavilySearchResponse(
        query="Quantum error correction lattice",
        status="success",
        results=[irrel_result],
    )

    state: OrchestraAgentState = {
        "task_id": "test_no_rel_web",
        "task_title": "Quantum error correction lattice surgery",
        "task_description": "Analyze topological fault-tolerance.",
        "plan_steps": ["Step 1"],
    }

    with patch("app.graph.workflow.tavily_search", return_value=mock_response), \
         patch("app.graph.workflow.ollama_client.generate", return_value={"response": "Offline research summary."}), \
         patch("app.graph.workflow._persist_agent_run"), \
         patch("app.graph.workflow.chroma_service.search", return_value=[]):
        output = researcher_node(state)

        assert output.get("search_status") == "no_relevant_sources"
        assert output.get("citations") == []


def test_verifier_node_distinguishes_claim_categories():
    """Requirement 2: Verifier agent distinguishes supported, partially supported, and unsupported claims."""
    from app.graph.workflow import verifier_node

    state: OrchestraAgentState = {
        "task_id": "task_verify_audit",
        "task_title": "Quantum Error Correction Analysis",
        "analysis_summary": "Claims to verify: surface code threshold is 0.73%, and 1000 physical qubits equal 1 logical qubit.",
        "citations": [
            {
                "title": "Quantum Surface Codes",
                "url": "https://arxiv.org/abs/qec",
                "snippet": "Surface code threshold demonstrated at 0.73 percent physical error rate.",
            }
        ],
        "document_references": [
            {
                "filename": "QEC_Spec_2026.pdf",
                "page_number": 1,
                "chunk_index": 0,
                "excerpt": "Physical error threshold is bounded below 0.73%.",
            }
        ],
    }

    mock_verifier_output = (
        "### Supported by Uploaded Documents\n"
        "- Surface code threshold is 0.73% (corroborated by QEC_Spec_2026.pdf as internal specification).\n\n"
        "### Supported by Retrieved Web Sources\n"
        "- Subsystem code threshold validated by web literature.\n\n"
        "### Partially Supported Claims\n"
        "- 1000 physical qubits ratio is an extrapolation.\n\n"
        "### Unsupported or Conflicting Claims\n"
        "- None."
    )

    with patch("app.graph.workflow.ollama_client.generate", return_value={"response": mock_verifier_output}), \
         patch("app.graph.workflow._persist_agent_run"):
        result = verifier_node(state)

        assert result["verification_passed"] is True
        assert "### Supported by Uploaded Documents" in result["verification_report"]
        assert "### Supported by Retrieved Web Sources" in result["verification_report"]
        assert "### Partially Supported Claims" in result["verification_report"]
        assert "### Unsupported or Conflicting Claims" in result["verification_report"]
        assert "### Numerical Consistency Audit" in result["verification_report"]


def test_chromadb_distance_cutoff_excludes_irrelevant_chunks(tmp_path: Path):
    """Requirement 4: Semantic search excludes chunks with distance above max_distance cutoff."""
    chroma_dir = tmp_path / "distance_cutoff_store"
    service = ChromaService(persist_dir=chroma_dir, collection_name="cutoff_test_coll")

    # Mock embeddings: document chunk vector [1.0, 0, 0, ...]
    doc_vec = [1.0] + [0.0] * 383
    # Search query that is orthogonal (distance = 1.0 > 0.82)
    irrel_query_vec = [0.0, 1.0] + [0.0] * 382

    with patch.object(service, "embed_texts", return_value=[doc_vec]):
        service.index_chunks(
            doc_id="doc_qec",
            filename="qec.pdf",
            chunks=[{
                "chunk_id": "chunk_1",
                "content": "Quantum error correction surface code thresholds.",
                "metadata": {"doc_id": "doc_qec", "filename": "qec.pdf", "page_number": 1, "chunk_index": 0},
            }],
        )

    # Search with orthogonal query
    with patch.object(service, "embed_texts", return_value=[irrel_query_vec]):
        hits = service.search(query="pancake recipes", max_distance=0.82)
        # Cosine distance between orthogonal vectors is 1.0, which exceeds 0.82
        assert len(hits) == 0, f"Expected 0 hits due to distance cutoff, got {len(hits)}"


def test_chromadb_persistence_after_restart(tmp_path: Path):
    """Requirement 4: Verify ChromaDB vectors persist across service re-initialization."""
    chroma_dir = tmp_path / "restart_persist_store"
    service_a = ChromaService(persist_dir=chroma_dir, collection_name="persist_coll")

    mock_vec = [0.25] * 384
    with patch.object(service_a, "embed_texts", return_value=[mock_vec]):
        service_a.index_chunks(
            doc_id="doc_p1",
            filename="spec.pdf",
            chunks=[{
                "chunk_id": "chunk_p1",
                "content": "Fault tolerant quantum architecture.",
                "metadata": {"doc_id": "doc_p1", "filename": "spec.pdf", "page_number": 1, "chunk_index": 0},
            }],
        )
        assert service_a.count() == 1

    # Simulate restart by instantiating new ChromaService pointing to same folder
    service_b = ChromaService(persist_dir=chroma_dir, collection_name="persist_coll")
    assert service_b.count() == 1

    with patch.object(service_b, "embed_texts", return_value=[mock_vec]):
        hits = service_b.search(query="quantum architecture", n_results=1, max_distance=0.82)
        assert len(hits) == 1
        assert hits[0]["filename"] == "spec.pdf"
        assert hits[0]["doc_id"] == "doc_p1"


@pytest.mark.asyncio
async def test_failed_indexing_cleans_up_and_does_not_mark_indexed(tmp_path: Path):
    """Requirement 4 & 5: Failed extraction/indexing cleans up disk file and DB record."""
    from app.rag.document_service import DocumentService
    from app.database.session import SessionLocal
    from fastapi import UploadFile
    import io

    doc_svc = DocumentService(uploads_dir=tmp_path / "uploads")

    # Corrupted / unreadable PDF file content
    corrupted_content = b"%PDF-1.4\ncorrupted file bytes with no valid EOF"
    fake_upload = UploadFile(
        file=io.BytesIO(corrupted_content),
        filename="corrupted.pdf",
        headers={"content-type": "application/pdf"},
    )

    with SessionLocal() as db:
        with pytest.raises(DocumentExtractionError):
            await doc_svc.save_and_index_file(db=db, upload_file=fake_upload)

        # Verify no orphan file exists in uploads_dir
        saved_files = list((tmp_path / "uploads").glob("*"))
        assert len(saved_files) == 0, f"Expected 0 files on disk after failed indexing, found {saved_files}"

        # Verify no unindexed zombie row was left in database
        from app.database.models import Document
        doc_in_db = db.query(Document).filter(Document.filename == "corrupted.pdf").first()
        assert doc_in_db is None, "Failed indexing should not leave unindexed zombie row in DB."


@pytest.mark.asyncio
async def test_duplicate_upload_reuses_existing_indexed_document(tmp_path: Path):
    """Requirement 4: Duplicate upload of already indexed document reuses existing record."""
    from app.rag.document_service import DocumentService
    from app.database.session import SessionLocal
    from fastapi import UploadFile
    import io

    doc_svc = DocumentService(uploads_dir=tmp_path / "uploads")
    text_content = b"This is a valid test document for duplicate detection."

    with patch("app.rag.document_service.chroma_service.index_chunks", return_value=1):
        with SessionLocal() as db:
            upload1 = UploadFile(
                file=io.BytesIO(text_content),
                filename="duplicate_test.txt",
                headers={"content-type": "text/plain"},
            )
            doc1 = await doc_svc.save_and_index_file(db=db, upload_file=upload1)
            assert doc1.indexed is True

            # Attempt identical upload
            upload2 = UploadFile(
                file=io.BytesIO(text_content),
                filename="duplicate_test.txt",
                headers={"content-type": "text/plain"},
            )
            doc2 = await doc_svc.save_and_index_file(db=db, upload_file=upload2)

            # Must return the same document ID without creating duplicates
            assert doc2.id == doc1.id
            assert doc2.filename == doc1.filename

            # Cleanup test doc
            doc_svc.delete_document(db, doc1.id)


def test_deleted_documents_no_longer_appear_in_semantic_search(tmp_path: Path):
    """Requirement 4 & 5: Deleted documents do not appear in subsequent semantic search queries."""
    chroma_dir = tmp_path / "deletion_search_store"
    service = ChromaService(persist_dir=chroma_dir, collection_name="deletion_coll")

    mock_vec = [0.4] * 384
    with patch.object(service, "embed_texts", return_value=[mock_vec]):
        service.index_chunks(
            doc_id="doc_delete_me",
            filename="to_delete.txt",
            chunks=[{
                "chunk_id": "chunk_del_0",
                "content": "Secret information that will be purged.",
                "metadata": {"doc_id": "doc_delete_me", "filename": "to_delete.txt", "page_number": 1, "chunk_index": 0},
            }],
        )

        hits_before = service.search(query="secret information", n_results=2)
        assert len(hits_before) == 1
        assert hits_before[0]["doc_id"] == "doc_delete_me"

        # Delete document vectors
        service.delete_document_vectors(doc_id="doc_delete_me")

        hits_after = service.search(query="secret information", n_results=2)
        assert len(hits_after) == 0, f"Expected 0 hits after deletion, got {len(hits_after)}"


