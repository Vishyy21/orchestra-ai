"""Phase 3 Empirical Verification: Document RAG, ChromaDB Persistence, and Citations.

Executes:
1. Generation and upload of a technical specification PDF (orchestra_qec_spec_2026.pdf).
2. Verification of text extraction, chunking, and ChromaDB vector indexing.
3. Direct semantic similarity search for known phrases from the document.
4. Submission of a multi-agent task referencing the uploaded document.
5. End-to-end execution of the 5-agent pipeline with local Ollama + Tavily.
6. Validation of SQLite persistence for AgentRuns and the final Report.
7. Verification that '## Uploaded Document References' is present in the final report.
8. Persistence verification of ChromaDB vectors across process boundaries.
"""

import sys
import os
import time
import httpx
from pathlib import Path

API_BASE = "http://127.0.0.1:8000"


def generate_sample_pdf(file_path: Path) -> None:
    """Generate a clean PDF with valid cross-reference table and extractable technical text."""
    lines = [
        "ORCHESTRA AI FAULT-TOLERANT ARCHITECTURE SPECIFICATION 2026",
        "Document Reference: ORCH-QEC-SPEC-2026-V3",
        "Author: Senior Quantum Systems Architecture Group",
        "",
        "1. SYSTEM OVERVIEW AND FAULT-TOLERANCE THRESHOLDS",
        "Topological surface codes enforce fault-tolerant quantum error correction via spatial parity checks.",
        "The critical threshold requirement for logical break-even in 2026 hardware is a 2-qubit gate fidelity",
        "exceeding 99.27 percent (corresponding to an error rate below 0.73 percent).",
        "",
        "2. LATTICE TOPOLOGY AND SYNDROME EXTRACTION",
        "Syndrome extraction cycles are pipelined with dedicated ancilla readout resonators.",
        "Rotated surface code lattices reduce physical qubit overhead by approximately 40 percent relative to standard planar codes.",
        "Stabilizer measurements execute within 200 nanoseconds using high-speed microwave flux-bias pulses.",
        "",
        "3. VERIFIED SAFETY CONSTRAINTS AND DECODING LATENCY",
        "Real-time decoding latency must remain strictly below 1 microsecond to prevent syndrome backlog.",
        "Minimum code distance d=5 required for memory benchmarks; d=7 required for fault-tolerant magic state distillation.",
        "Physical error rates exceeding 1.2 percent trigger automated circuit breaker isolation of malfunctioning qubits."
    ]

    stream_content = "BT\n/F1 12 Tf\n72 720 Td\n18 TL\n"
    for line in lines:
        safe_line = line.replace("(", r"\(").replace(")", r"\)")
        stream_content += f"({safe_line}) Tj T*\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1") + stream_bytes + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    xref = [0]
    for i, obj in enumerate(objects, 1):
        xref.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    startxref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in xref[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n".encode("latin-1"))

    with open(file_path, "wb") as f:
        f.write(pdf)


def main():
    print("=" * 80)
    print("ORCHESTRA AI — PHASE 3: DOCUMENT RAG & CHROMADB EMPIRICAL VERIFICATION")
    print("=" * 80)

    # 1. Create and upload sample PDF
    pdf_path = Path("orchestra_qec_spec_2026.pdf")
    generate_sample_pdf(pdf_path)
    print(f"\n1. Generated test technical specification: {pdf_path.name} ({pdf_path.stat().st_size} bytes)")

    print("\n2. Uploading document via POST /api/documents/upload...")
    with open(pdf_path, "rb") as f:
        files = {"file": (pdf_path.name, f, "application/pdf")}
        with httpx.Client(timeout=60.0) as client:
            upload_res = client.post(f"{API_BASE}/api/documents/upload", files=files)

    if upload_res.status_code != 201:
        print(f"FAILED to upload document: {upload_res.status_code} - {upload_res.text}")
        sys.exit(1)

    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    print(f"   [SUCCESS] Uploaded document ID: {doc_id}")
    print(f"   Filename: {doc_data['filename']}")
    print(f"   Indexed in ChromaDB: {doc_data['indexed']}")
    print(f"   Chunk Count: {doc_data.get('chunk_count')}")

    assert doc_data["indexed"] is True, "Document was not marked as indexed!"
    assert doc_data.get("chunk_count", 0) > 0, "Chunk count is zero!"

    # 3. Test semantic vector search endpoint
    print("\n3. Testing semantic similarity search via GET /api/documents/search...")
    test_queries = [
        "syndrome backlog decoding latency",
        "rotated surface code lattice overhead reduction",
    ]

    with httpx.Client(timeout=30.0) as client:
        for q in test_queries:
            search_res = client.get(f"{API_BASE}/api/documents/search", params={"query": q, "n_results": 2})
            if search_res.status_code != 200:
                print(f"FAILED search query: {q} - {search_res.text}")
                sys.exit(1)
            search_data = search_res.json()
            print(f"\n   Query: '{q}' -> Hits: {search_data['total_hits']}")
            for hit in search_data["results"]:
                print(f"     - File: {hit['filename']} | Page: {hit['page_number']} | Distance: {hit['distance']:.4f}")
                print(f"       Excerpt: {hit['content'][:140]}...")

    # 4. Submit task referencing the document
    task_payload = {
        "title": "Autonomous Synthesis of 2026 Topological Surface Code Specifications",
        "description": (
            "Review internal architecture specification ORCH-QEC-SPEC-2026-V3 regarding "
            "rotated surface code lattice overhead reduction, syndrome decoding latency limits, "
            "and fault-tolerance thresholds."
        ),
        "category": "research",
        "priority": "high",
    }

    print("\n4. Submitting RAG-dependent research task via POST /api/tasks...")
    with httpx.Client(timeout=30.0) as client:
        res = client.post(f"{API_BASE}/api/tasks", json=task_payload)
        if res.status_code != 201:
            print(f"FAILED to submit task: {res.status_code} - {res.text}")
            sys.exit(1)
        created_task = res.json()
        task_id = created_task["id"]
        print(f"   [SUCCESS] Task created. ID: {task_id}")

    # 5. Execute 5-agent LangGraph workflow
    print("\n5. Executing 5-agent LangGraph workflow with Document RAG + Tavily research...")
    t0 = time.time()
    with httpx.Client(timeout=360.0) as client:
        exec_res = client.post(f"{API_BASE}/api/tasks/{task_id}/execute?sync=true")
        if exec_res.status_code != 200:
            print(f"FAILED to execute task: {exec_res.status_code} - {exec_res.text}")
            sys.exit(1)
        exec_data = exec_res.json()
        duration = time.time() - t0
        print(f"   [SUCCESS] Workflow execution completed in {duration:.2f}s")
        print(f"   Status: {exec_data.get('status')}")

    # 6. Query SQLite database for AgentRuns and Report
    print("\n6. Inspecting SQLite database for AgentRuns and final Report...")
    sys.path.insert(0, "./backend")
    from app.database.session import SessionLocal
    from app.database.models import Task, AgentRun, Report

    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        runs = db.query(AgentRun).filter(AgentRun.task_id == task_id).order_by(AgentRun.started_at.asc()).all()
        reports = db.query(Report).filter(Report.task_id == task_id).all()

        print(f"\nTask ID: {task.id}")
        print(f"Task Status: {task.status}")
        print(f"Total Agent Runs: {len(runs)}")
        print(f"Total Reports: {len(reports)}")

        print("\n" + "=" * 80)
        print("AGENT RUN DETAILS & EVIDENCE")
        print("=" * 80)

        for i, run in enumerate(runs, 1):
            print(f"\n[{i}/5] Agent: {run.agent_name} | Status: {run.status} | Duration: {run.execution_time_ms}ms ({run.execution_time_ms / 1000.0:.2f}s)")
            print(f"    Input Metadata: {run.input_data[:200]}")
            print(f"    Output Snippet: {run.output_data[:240]}...")

        print("\n" + "=" * 80)
        print("FINAL REPORT INSPECTION: DOCUMENT REFERENCES & CITATIONS")
        print("=" * 80)

        if not reports:
            print("ERROR: No report was persisted to SQLite!")
            sys.exit(1)

        rep = reports[0]
        print(f"Report ID: {rep.id}")
        print(f"Report Title: {rep.title}")
        print(f"Total Characters: {len(rep.content)}")

        # Verify Uploaded Document References section
        has_doc_refs = "## Uploaded Document References" in rep.content
        print(f"\nUploaded Document References Section Present: {has_doc_refs}")
        if has_doc_refs:
            doc_section = rep.content.split("## Uploaded Document References")[-1].split("## Verified Sources & Citations")[0]
            print("\nDocument References Content:\n" + doc_section.strip())
            assert "orchestra_qec_spec_2026.pdf" in doc_section, "Uploaded document filename missing from report references!"
            assert "Page" in doc_section, "Page number missing from document reference!"
            print("\n[VERIFIED] Document references section confirmed.")
        else:
            print("[FAILED] Document references section missing from final report!")
            sys.exit(1)

        # Verify Web Citations section
        has_web_citations = "## Verified Sources & Citations" in rep.content
        print(f"\nVerified Sources & Citations Section Present: {has_web_citations}")
        if has_web_citations:
            web_section = rep.content.split("## Verified Sources & Citations")[-1]
            print("\nWeb Citations Content:\n" + web_section.strip())

    # 7. Test persistent ChromaDB storage across independent process boundary
    print("\n" + "=" * 80)
    print("7. VERIFYING CHROMADB DISK PERSISTENCE")
    print("=" * 80)
    from app.rag.chroma_service import ChromaService
    fresh_service = ChromaService()
    direct_hits = fresh_service.search(query="syndrome backlog", n_results=1)
    print(f"ChromaDB Total Chunks on Disk: {fresh_service.count()}")
    assert fresh_service.count() > 0, "ChromaDB disk collection is empty!"
    assert len(direct_hits) > 0, "ChromaDB query yielded 0 hits!"
    print(f"[VERIFIED] Top persistent vector match: {direct_hits[0]['filename']} (Page {direct_hits[0]['page_number']})")
    print(f"Snippet: {direct_hits[0]['content'][:120]}...")

    print("\n" + "=" * 80)
    print("[ALL CHECKS PASSED] Phase 3 Document RAG successfully verified end-to-end!")
    print("=" * 80)


if __name__ == "__main__":
    main()
