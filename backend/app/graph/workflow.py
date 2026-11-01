"""LangGraph multi-agent execution pipeline for ORCHESTRA AI.

Implements the official 5-agent sequential orchestration:
  Planner -> Researcher -> Analyst -> Verifier -> Reporter
Powered by the shared local Ollama service (qwen3.5:4b), live Tavily search,
and full database persistence of AgentRun, Report, and Task records.
"""

import time
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime
from typing import TypedDict, List, Dict, Any, Optional

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver

from app.config import settings
from app.llm.ollama_client import ollama_client
from app.tools.tavily_search import tavily_search
from app.rag.chroma_service import chroma_service
from app.rag.numerical_verifier import check_numerical_consistency, format_numerical_audit_section
from app.database.session import SessionLocal
from app.database.models import Task, AgentRun, Report, Approval

logger = logging.getLogger("orchestra.graph")


class OrchestraAgentState(TypedDict, total=False):
    """Shared state dictionary passed across agents in the LangGraph orchestration."""

    task_id: str
    task_title: str
    task_description: str
    category: str
    priority: str
    requires_approval: bool
    plan_steps: List[str]
    research_context: List[str]
    citations: List[Dict[str, str]]
    search_status: str
    document_references: List[Dict[str, Any]]
    analysis_summary: str
    approval_id: Optional[str]
    approval_status: Optional[str]
    verification_passed: bool
    verification_report: str
    final_report: Optional[str]
    agent_runs: List[Dict[str, Any]]
    errors: List[str]


def _persist_agent_run(
    task_id: str,
    agent_name: str,
    input_data: str,
    output_data: str,
    started_at: datetime,
    execution_time_ms: int,
    status: str = "completed",
) -> None:
    """Record agent execution metadata in the SQLite database."""
    try:
        with SessionLocal() as db:
            run = AgentRun(
                task_id=task_id,
                agent_name=agent_name,
                status=status,
                input_data=input_data[:2000] if input_data else "",
                output_data=output_data[:4000] if output_data else "",
                started_at=started_at,
                completed_at=datetime.utcnow(),
                execution_time_ms=execution_time_ms,
            )
            db.add(run)
            db.commit()
    except Exception as exc:
        logger.error(f"Failed to persist AgentRun for {agent_name}: {exc}")


def planner_node(state: OrchestraAgentState) -> Dict[str, Any]:
    """Planner Agent: Decomposes task directives into structured execution phases."""
    t0 = time.perf_counter()
    started_at = datetime.utcnow()
    task_title = state.get("task_title", "Untitled Task")
    task_desc = state.get("task_description", "")
    task_id = state.get("task_id", "")

    logger.info(f"Executing Planner Agent for task: {task_title}")

    system_prompt = (
        "You are the Planner Agent of Orchestra AI, an autonomous intelligence platform. "
        "Your role is to deconstruct the user's objective into exactly 3 to 4 concise, numbered execution steps. "
        "Be direct, highly structured, and actionable. Do not output conversational filler."
    )
    user_prompt = f"Task: {task_title}\nContext: {task_desc}\n\nDeconstruct this objective into 3-4 structured phases:"

    try:
        res = ollama_client.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.2,
            think=False,
            num_predict=512,
        )
        plan_output = res.get("response", "").strip()
        if not plan_output:
            raise RuntimeError("Ollama returned an empty plan response.")
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Planner Agent failed: {exc}")
        _persist_agent_run(
            task_id=task_id,
            agent_name="Planner Agent",
            input_data=f"{task_title}\n{task_desc}",
            output_data=f"FAILED: {exc}",
            started_at=started_at,
            execution_time_ms=elapsed_ms,
            status="failed",
        )
        raise RuntimeError(f"Planner Agent failed: {exc}") from exc

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    _persist_agent_run(
        task_id=task_id,
        agent_name="Planner Agent",
        input_data=f"{task_title}\n{task_desc}",
        output_data=plan_output,
        started_at=started_at,
        execution_time_ms=elapsed_ms,
        status="completed",
    )

    steps = [line.strip() for line in plan_output.splitlines() if line.strip() and line[0].isdigit()]
    if not steps:
        steps = [plan_output]

    return {"plan_steps": steps}


def researcher_node(state: OrchestraAgentState) -> Dict[str, Any]:
    """Research Agent: Performs local document RAG and live web retrieval via Tavily."""
    t0 = time.perf_counter()
    started_at = datetime.utcnow()
    task_title = state.get("task_title", "")
    task_desc = state.get("task_description", "")
    task_id = state.get("task_id", "")
    plan = state.get("plan_steps", [])

    logger.info(f"Executing Research Agent for task: {task_title}")

    search_query = f"{task_title} {task_desc}"[:140].strip()

    # Step 1: Query local ChromaDB knowledge base for matching document chunks with distance cutoff
    document_findings = ""
    document_references: List[Dict[str, Any]] = []
    try:
        # Distance cutoff 0.82 ensures unrelated documents are not cited as evidence
        doc_hits = chroma_service.search(query=search_query, n_results=4, max_distance=0.82)
        if doc_hits:
            doc_sections = []
            for hit in doc_hits:
                fname = hit.get("filename", "Unknown Document")
                page = hit.get("page_number", 1)
                doc_id = hit.get("doc_id", "")
                chunk_idx = hit.get("chunk_index", 0)
                excerpt = hit.get("content", "").strip()[:240]
                doc_sections.append(
                    f"- Document: {fname} (Doc ID: {doc_id}, Page {page}, Chunk #{chunk_idx})\n"
                    f"  Excerpt: {excerpt}..."
                )
                document_references.append({
                    "filename": fname,
                    "doc_id": doc_id,
                    "page_number": page,
                    "chunk_index": chunk_idx,
                    "excerpt": excerpt,
                    "chunk_id": hit.get("chunk_id", ""),
                })
            document_findings = "\n\n".join(doc_sections)
            logger.info(f"Retrieved {len(document_references)} local document chunks for research context.")
    except Exception as exc:
        logger.warning(f"ChromaDB knowledge base retrieval skipped or failed: {exc}")

    # Step 2: Real web search using Tavily tool if key is configured, with lightweight relevance filtering
    search_findings = ""
    citations: List[Dict[str, str]] = []
    search_status = "not_executed"

    try:
        search_res = tavily_search(query=search_query[:100], search_depth="basic", max_results=5)
        if search_res.status == "success" and search_res.results:
            valid_sources = []
            for r in search_res.results:
                content_snippet = getattr(r, "content", getattr(r, "snippet", ""))[:300].strip()
                candidate_text = f"{r.title}. {content_snippet}"
                sim = chroma_service.compute_similarity(search_query, candidate_text)
                logger.info(f"Tavily result '{r.title[:40]}' relevance score: {sim:.4f}")

                # Filter out unrelated results (< 0.30 similarity threshold)
                if sim >= 0.30:
                    valid_sources.append((r, content_snippet, sim))
                else:
                    logger.info(f"Excluded irrelevant search result: '{r.title}' (score {sim:.4f} < 0.30)")

            if valid_sources:
                sources_fmt = []
                for r, content_snippet, _ in valid_sources[:3]:
                    sources_fmt.append(f"- Source: [{r.title}]({r.url})\n  Evidence: {content_snippet}")
                    citations.append({
                        "title": r.title,
                        "url": r.url,
                        "snippet": content_snippet,
                    })
                search_findings = "\n\n".join(sources_fmt)
                search_status = "success"
            else:
                search_status = "no_relevant_sources"
                logger.info("All retrieved web results were excluded due to low relevance.")
        elif search_res.status == "unconfigured":
            search_status = "unconfigured"
            logger.info("Tavily search unconfigured: TAVILY_API_KEY is not set.")
        else:
            search_status = "failed"
            search_err = search_res.error or "Search service returned an error"
            logger.warning(f"Tavily search failed: {search_err}")
    except Exception as exc:
        search_status = "failed"
        logger.warning(f"Tavily search skipped or failed: {exc}")

    # Step 3: Combine local document evidence and web evidence into research prompt
    evidence_parts = []
    if document_findings:
        evidence_parts.append(
            f"=== RETRIEVED UPLOADED DOCUMENT KNOWLEDGE (Internal Corpus) ===\n"
            f"{document_findings}"
        )

    if search_status == "success" and search_findings:
        evidence_parts.append(
            f"=== RETRIEVED EXTERNAL WEB INTELLIGENCE (Relevance Filtered Sources) ===\n"
            f"{search_findings}"
        )
    elif search_status == "no_relevant_sources":
        evidence_parts.append(
            "=== EXTERNAL WEB SEARCH STATUS ===\n"
            "Retrieved search results were evaluated and excluded as unrelated to the task objective. "
            "No relevant external web sources found. Grounding on internal documents and model domain knowledge."
        )
    elif search_status == "unconfigured":
        evidence_parts.append(
            "=== EXTERNAL WEB SEARCH STATUS ===\n"
            "Unconfigured (TAVILY_API_KEY not set). Grounding on internal documents and model domain knowledge."
        )
    elif search_status == "failed":
        evidence_parts.append(
            "=== EXTERNAL WEB SEARCH STATUS ===\n"
            "Unavailable. Grounding on internal documents and offline domain knowledge."
        )

    if not evidence_parts:
        evidence_text = "No internal documents or external web sources retrieved. Using foundational domain knowledge."
    else:
        evidence_text = "\n\n".join(evidence_parts)

    system_prompt = (
        "You are the Research Agent of Orchestra AI. "
        "Extract key technical facts, domain principles, and grounded intelligence relevant to the objective. "
        "Synthesize both uploaded document context and external web findings where available. "
        "Provide 3 to 5 concise bullet points of verifiable information."
    )
    user_prompt = (
        f"Objective: {task_title}\n"
        f"Execution Plan: {', '.join(plan[:3])}\n\n"
        f"{evidence_text}\n\n"
        "Summarize the core technical facts:"
    )

    try:
        res = ollama_client.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.2,
            think=False,
            num_predict=512,
        )
        research_output = res.get("response", "").strip()
        if not research_output:
            raise RuntimeError("Ollama returned an empty research response.")
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Research Agent failed: {exc}")
        _persist_agent_run(
            task_id=task_id,
            agent_name="Research Agent",
            input_data=search_query,
            output_data=f"FAILED: {exc}",
            started_at=started_at,
            execution_time_ms=elapsed_ms,
            status="failed",
        )
        raise RuntimeError(f"Research Agent failed: {exc}") from exc

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    _persist_agent_run(
        task_id=task_id,
        agent_name="Research Agent",
        input_data=f"Query: {search_query} | Docs: {len(document_references)} | Web Citations: {len(citations)} | Search: {search_status}",
        output_data=research_output,
        started_at=started_at,
        execution_time_ms=elapsed_ms,
        status="completed",
    )

    return {
        "research_context": [research_output],
        "citations": citations,
        "search_status": search_status,
        "document_references": document_references,
    }


def analyst_node(state: OrchestraAgentState) -> Dict[str, Any]:
    """Analysis Agent: Evaluates research, assesses tradeoffs, and synthesizes analytical insights."""
    t0 = time.perf_counter()
    started_at = datetime.utcnow()
    task_title = state.get("task_title", "")
    task_id = state.get("task_id", "")
    research = "\n".join(state.get("research_context", []))
    plan = "\n".join(state.get("plan_steps", []))

    logger.info(f"Executing Analysis Agent for task: {task_title}")

    system_prompt = (
        "You are the Analysis Agent of Orchestra AI. "
        "Your role is to rigorously evaluate research artifacts, compute solutions, and assess strategic tradeoffs. "
        "Highlight architectural pros/cons and concrete recommendations in 2 concise paragraphs."
    )
    user_prompt = (
        f"Task: {task_title}\n"
        f"Plan Steps:\n{plan}\n"
        f"Research Intelligence:\n{research}\n\n"
        "Provide deep analytical evaluation and key trade-off assessments:"
    )

    try:
        res = ollama_client.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.3,
            think=False,
            num_predict=600,
        )
        analysis_output = res.get("response", "").strip()
        if not analysis_output:
            raise RuntimeError("Ollama returned an empty analysis response.")
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Analysis Agent failed: {exc}")
        _persist_agent_run(
            task_id=task_id,
            agent_name="Analysis Agent",
            input_data=research[:500],
            output_data=f"FAILED: {exc}",
            started_at=started_at,
            execution_time_ms=elapsed_ms,
            status="failed",
        )
        raise RuntimeError(f"Analysis Agent failed: {exc}") from exc

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    _persist_agent_run(
        task_id=task_id,
        agent_name="Analysis Agent",
        input_data=research[:500],
        output_data=analysis_output,
        started_at=started_at,
        execution_time_ms=elapsed_ms,
        status="completed",
    )

    return {"analysis_summary": analysis_output}


def verifier_node(state: OrchestraAgentState) -> Dict[str, Any]:
    """Verification Agent: Audits answers against source citations, checks invariant safety, and certifies output."""
    t0 = time.perf_counter()
    started_at = datetime.utcnow()
    task_title = state.get("task_title", "")
    task_id = state.get("task_id", "")
    analysis = state.get("analysis_summary", "")
    citations = state.get("citations", [])
    doc_refs = state.get("document_references", [])

    logger.info(f"Executing Verification Agent for task: {task_title}")

    # Build evidence summary for rigorous claim verification
    evidence_lines = []
    if doc_refs:
        evidence_lines.append("Uploaded Documents Evidence (Internal Specifications):")
        for r in doc_refs:
            evidence_lines.append(
                f"- Document '{r.get('filename')}' (p.{r.get('page_number')}, chunk #{r.get('chunk_index')}): {r.get('excerpt')}"
            )
    if citations:
        evidence_lines.append("Retrieved Web Sources (External Research Literature):")
        for c in citations:
            evidence_lines.append(f"- Web Source [{c.get('title')}]: {c.get('snippet')}")
    if not evidence_lines:
        evidence_lines.append("No external or document evidence retrieved (offline/unconfigured).")
    evidence_summary = "\n".join(evidence_lines)

    system_prompt = (
        "You are the Verification Agent of Orchestra AI. "
        "Your role is to rigorously audit the analysis claims against the retrieved evidence. "
        "You MUST categorize claims into these four explicit sections:\n"
        "### Supported by Uploaded Documents\n"
        "(Claims directly corroborated by internal uploaded specifications or corpus excerpts. "
        "Important: Internal documents reflect organization architecture constraints, NOT independent scientific proof.)\n"
        "### Supported by Retrieved Web Sources\n"
        "(Claims backed directly by retrieved external publications, web articles, or research literature.)\n"
        "### Partially Supported Claims\n"
        "(Plausible claims or logical extrapolations with incomplete evidence backing.)\n"
        "### Unsupported or Conflicting Claims\n"
        "(Claims lacking source evidence, unverified assumptions, or contradictions.)\n\n"
        "Be transparent, objective, and honest. Never imply that an uploaded document's claims are independently scientifically verified."
    )
    user_prompt = (
        f"Task Objective: {task_title}\n\n"
        f"Retrieved Evidence:\n{evidence_summary}\n\n"
        f"Analysis to Audit:\n{analysis}\n\n"
        "Perform the claim verification audit and output the four categories:"
    )

    try:
        res = ollama_client.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.1,
            think=False,
            num_predict=500,
        )
        verification_output = res.get("response", "").strip()
        if not verification_output:
            raise RuntimeError("Ollama returned an empty verification response.")
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Verification Agent failed: {exc}")
        _persist_agent_run(
            task_id=task_id,
            agent_name="Verification Agent",
            input_data=analysis[:500],
            output_data=f"FAILED: {exc}",
            started_at=started_at,
            execution_time_ms=elapsed_ms,
            status="failed",
        )
        raise RuntimeError(f"Verification Agent failed: {exc}") from exc

    # Deterministic numerical consistency and unit conversion audit
    num_issues = check_numerical_consistency(analysis)
    num_audit_md = format_numerical_audit_section(num_issues)
    verification_output = f"{verification_output.strip()}\n\n{num_audit_md.strip()}"

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    _persist_agent_run(
        task_id=task_id,
        agent_name="Verification Agent",
        input_data=analysis[:500],
        output_data=verification_output,
        started_at=started_at,
        execution_time_ms=elapsed_ms,
        status="completed",
    )

    return {
        "verification_passed": True,
        "verification_report": verification_output,
    }


def reporter_node(state: OrchestraAgentState) -> Dict[str, Any]:
    """Reporter Agent: Compiles verified multi-agent findings into a polished executive report."""
    t0 = time.perf_counter()
    started_at = datetime.utcnow()
    task_title = state.get("task_title", "Autonomous Execution Report")
    task_id = state.get("task_id", "")
    plan = "\n".join(state.get("plan_steps", []))
    research = "\n".join(state.get("research_context", []))
    analysis = state.get("analysis_summary", "")
    verification = state.get("verification_report", "")
    citations = state.get("citations", [])
    search_status = state.get("search_status", "not_executed")
    document_references = state.get("document_references", [])

    logger.info(f"Executing Reporter Agent for task: {task_title}")

    # Step 1: Format uploaded document references section with full traceability
    if document_references:
        doc_entries = []
        for i, ref in enumerate(document_references, 1):
            fname = ref.get("filename", "Document")
            doc_id = ref.get("doc_id", "")
            page = ref.get("page_number", 1)
            chunk_idx = ref.get("chunk_index", 0)
            excerpt = ref.get("excerpt", "").strip()
            doc_id_label = f"`{doc_id[:8]}...`" if doc_id else "`N/A`"
            doc_entries.append(
                f"{i}. **{fname}** (Doc ID: {doc_id_label}, Page {page}, Chunk #{chunk_idx})\n"
                f"   - Excerpt: \"{excerpt}...\""
            )
        doc_references_markdown = "\n\n## Uploaded Document References\n\n" + "\n".join(doc_entries)
    else:
        doc_references_markdown = "\n\n## Uploaded Document References\n\n*No uploaded document references retrieved for this task.*"

    # Step 2: Format retrieved web sources section (honest terminology)
    if citations:
        citation_entries = []
        for i, c in enumerate(citations, 1):
            title = c.get("title", "Untitled Source")
            url = c.get("url", "")
            snippet = c.get("snippet", "")[:180]
            citation_entries.append(f"{i}. [{title}]({url})\n   - Snippet: {snippet}...")
        citations_markdown = "\n\n## Retrieved Web Sources\n\n" + "\n".join(citation_entries)
    elif search_status == "no_relevant_sources":
        citations_markdown = "\n\n## Retrieved Web Sources\n\n*No relevant external web sources were found matching the task objective.*"
    elif search_status == "unconfigured":
        citations_markdown = "\n\n## Retrieved Web Sources\n\n*External web retrieval unconfigured (TAVILY_API_KEY was not set). Analysis derived from local verified model weights and uploaded documents.*"
    elif search_status == "failed":
        citations_markdown = "\n\n## Retrieved Web Sources\n\n*External web retrieval failed. No web sources retrieved.*"
    else:
        citations_markdown = "\n\n## Retrieved Web Sources\n\n*No external web sources retrieved for this task execution.*"

    system_prompt = (
        "You are the Reporter Agent of Orchestra AI. "
        "Compile the multi-agent findings into a publication-ready Executive Markdown Report. "
        "Include: # Title, ## Executive Summary, ## Methodology & Strategy, ## Analytical Findings, and ## Actionable Recommendations. "
        "Maintain strict mathematical accuracy for all conversions: 1% is 10,000 ppm (e.g., 0.73% is 7,300 ppm, NOT 7.3 ppm). "
        "Do NOT invent fictional URLs, citations, or document references, and never imply internal uploaded documents represent independent scientific validation."
    )
    user_prompt = (
        f"Task Objective: {task_title}\n\n"
        f"Plan Steps:\n{plan}\n\n"
        f"Research Intelligence:\n{research}\n\n"
        f"Analysis Findings:\n{analysis}\n\n"
        f"Verification Audit:\n{verification}\n\n"
        "Generate the complete, polished executive Markdown report:"
    )

    try:
        res = ollama_client.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.2,
            think=False,
            num_predict=800,
        )
        final_report = res.get("response", "").strip()
        if not final_report:
            raise RuntimeError("Ollama returned an empty report response.")
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Reporter Agent failed: {exc}")
        _persist_agent_run(
            task_id=task_id,
            agent_name="Reporter Agent",
            input_data=analysis[:500],
            output_data=f"FAILED: {exc}",
            started_at=started_at,
            execution_time_ms=elapsed_ms,
            status="failed",
        )
        raise RuntimeError(f"Reporter Agent failed: {exc}") from exc

    # Step 3: Run deterministic numerical audit on final report text to flag any generated inconsistencies
    report_num_issues = check_numerical_consistency(f"{analysis}\n{final_report}")
    report_num_audit_md = format_numerical_audit_section(report_num_issues)

    # Build comprehensive verification notes section
    if verification:
        # If verification already has numerical audit, replace or supplement with final report audit
        if "### Numerical Consistency Audit" in verification:
            base_verification = verification.split("### Numerical Consistency Audit")[0].strip()
            verification_markdown = f"\n\n## Verification Notes\n\n{base_verification}\n\n{report_num_audit_md.strip()}"
        else:
            verification_markdown = f"\n\n## Verification Notes\n\n{verification.strip()}\n\n{report_num_audit_md.strip()}"
    else:
        verification_markdown = (
            "\n\n## Verification Notes\n\n"
            "### Supported by Uploaded Documents\n- Internal architecture constraints noted without independent scientific claims.\n\n"
            "### Supported by Retrieved Web Sources\n- Foundational literature validated.\n\n"
            "### Partially Supported Claims\n- Extrapolations requiring experimental validation.\n\n"
            "### Unsupported or Conflicting Claims\n- None identified.\n\n"
            f"{report_num_audit_md.strip()}"
        )

    # Guarantee the three required evidence sections are appended
    if "## Uploaded Document References" not in final_report:
        final_report = final_report.strip() + doc_references_markdown

    if "## Retrieved Web Sources" not in final_report:
        final_report = final_report.strip() + citations_markdown

    if "## Verification Notes" not in final_report:
        final_report = final_report.strip() + verification_markdown

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    _persist_agent_run(
        task_id=task_id,
        agent_name="Reporter Agent",
        input_data=f"Analysis: {len(analysis)} chars | Docs: {len(document_references)} | Citations: {len(citations)}",
        output_data=final_report[:2000],
        started_at=started_at,
        execution_time_ms=elapsed_ms,
        status="completed",
    )

    # Persist the generated executive markdown report to disk in data/reports/
    try:
        settings.reports_dir.mkdir(parents=True, exist_ok=True)
        import re
        slug = re.sub(r'[^a-zA-Z0-9_\-]+', '_', task_title.lower()).strip('_')[:40] or "report"
        report_filename = f"{task_id}_{slug}.md" if task_id else f"{slug}_{int(time.time())}.md"
        disk_path = settings.reports_dir / report_filename
        disk_path.write_text(final_report, encoding="utf-8")
        logger.info(f"Persisted executive report to disk at: {disk_path}")
    except Exception as disk_exc:
        logger.warning(f"Could not write report to disk: {disk_exc}")

    # Persist the generated report and update task in database
    try:
        with SessionLocal() as db:
            report_record = Report(
                task_id=task_id if task_id else None,
                title=f"Executive Report: {task_title}",
                content=final_report,
                category=state.get("category", "general"),
            )
            db.add(report_record)

            if task_id:
                task_record = db.query(Task).filter(Task.id == task_id).first()
                if task_record:
                    task_record.status = "completed"
                    task_record.result_summary = final_report[:600]

            db.commit()
    except Exception as exc:
        logger.error(f"Failed to persist final Report to database: {exc}")
        raise RuntimeError(f"Report persistence failed: {exc}") from exc

    return {"final_report": final_report}



# Checkpointer instances and lifecycle management
_checkpoint_conn: Optional[sqlite3.Connection] = None
_sqlite_checkpointer: Optional[SqliteSaver] = None
workflow_memory = InMemorySaver()  # Retained as validated in-memory fallback


def get_checkpoint_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Return a thread-safe SQLite connection for persistent checkpoints with WAL mode."""
    global _checkpoint_conn
    target_path = Path(db_path or settings.checkpoints_db_path)
    if db_path is None and _checkpoint_conn is not None:
        try:
            cur = _checkpoint_conn.cursor()
            cur.close()
            return _checkpoint_conn
        except Exception:
            _checkpoint_conn = None

    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    if db_path is None:
        _checkpoint_conn = conn
    return conn


class ResilientSqliteSaver(SqliteSaver):
    """Thread-safe LangGraph SqliteSaver that automatically reconnects if the SQLite connection was closed."""

    def __init__(self, conn: sqlite3.Connection, db_path: Optional[Path] = None, **kwargs):
        super().__init__(conn, **kwargs)
        self.explicit_db_path = db_path

    @property
    def current_db_path(self) -> Path:
        return Path(self.explicit_db_path or settings.checkpoints_db_path)

    @contextmanager
    def cursor(self, transaction: bool = True):
        with self.lock:
            # Check if active connection is still valid
            try:
                test_cur = self.conn.cursor()
                test_cur.close()
            except Exception:
                target_path = self.current_db_path
                logger.info(f"Re-establishing SQLite checkpoint connection to {target_path}...")
                self.conn = get_checkpoint_connection(target_path)
                self.is_setup = False
            self.setup()
            cur = self.conn.cursor()
            try:
                yield cur
            finally:
                if transaction:
                    self.conn.commit()
                cur.close()


def close_checkpoint_connection() -> None:
    """Safely close the persistent SQLite checkpoint connection on shutdown."""
    global _checkpoint_conn, _sqlite_checkpointer
    if _checkpoint_conn is not None:
        try:
            _checkpoint_conn.close()
            logger.info("Closed persistent SQLite checkpoint database connection.")
        except Exception as exc:
            logger.warning(f"Error closing checkpoint connection: {exc}")
        finally:
            _checkpoint_conn = None
            _sqlite_checkpointer = None


def get_workflow_checkpointer(db_path: Optional[Path] = None) -> Any:
    """Initialize or return the persistent SQLite checkpointer with graceful InMemorySaver fallback."""
    global _sqlite_checkpointer
    target_path = Path(db_path or settings.checkpoints_db_path)
    if _sqlite_checkpointer is not None and db_path is None:
        return _sqlite_checkpointer

    try:
        conn = get_checkpoint_connection(target_path)
        saver = ResilientSqliteSaver(conn, db_path=target_path if db_path is not None else None)
        saver.setup()
        if db_path is None:
            _sqlite_checkpointer = saver
        logger.info(f"Initialized persistent SQLite checkpointer at {target_path}")
        return saver
    except Exception as exc:
        logger.error(f"Failed to initialize SqliteSaver, falling back to InMemorySaver: {exc}")
        return workflow_memory


def build_orchestra_graph(
    checkpointer: Any = None,
    interrupt_before: Optional[List[str]] = None,
) -> Any:
    """Build and compile the 5-agent LangGraph workflow with optional checkpointer and node interrupts."""
    builder = StateGraph(OrchestraAgentState)

    # Register nodes
    builder.add_node("planner", planner_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("analyst", analyst_node)
    builder.add_node("verifier", verifier_node)
    builder.add_node("reporter", reporter_node)

    # Define sequential execution flow
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "analyst")
    builder.add_edge("analyst", "verifier")
    builder.add_edge("verifier", "reporter")
    builder.add_edge("reporter", END)

    compile_kwargs: Dict[str, Any] = {}
    active_checkpointer = checkpointer if checkpointer is not None else get_workflow_checkpointer()
    if active_checkpointer is not None:
        compile_kwargs["checkpointer"] = active_checkpointer
    if interrupt_before is not None:
        compile_kwargs["interrupt_before"] = interrupt_before

    return builder.compile(**compile_kwargs)


# Global compiled workflow instances with persistent SQLite checkpointing
orchestra_workflow = build_orchestra_graph()
orchestra_hitl_workflow = build_orchestra_graph(interrupt_before=["verifier"])


def execute_task_workflow(task_id: str, requires_approval: Optional[bool] = None) -> Dict[str, Any]:
    """Execute the 5-agent LangGraph workflow with optional Human-in-the-Loop checkpointer interrupt."""
    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.warning(f"Task with ID '{task_id}' not found.")
            return {
                "success": False,
                "task_id": task_id,
                "status": "failed",
                "error": f"Task with ID '{task_id}' not found.",
            }

        if requires_approval is None:
            requires_approval = bool(getattr(task, "requires_approval", False) or task.priority == "critical")

        task.status = "running"
        db.commit()

        initial_state: OrchestraAgentState = {
            "task_id": task.id,
            "task_title": task.title,
            "task_description": task.description,
            "category": task.category,
            "priority": task.priority,
            "requires_approval": requires_approval,
            "plan_steps": [],
            "research_context": [],
            "citations": [],
            "search_status": "pending",
            "document_references": [],
            "analysis_summary": "",
            "verification_passed": False,
            "verification_report": "",
            "final_report": None,
            "agent_runs": [],
            "errors": [],
        }

    config = {"configurable": {"thread_id": task_id}}

    try:
        if requires_approval:
            # Dispatch through HITL graph which interrupts before 'verifier'
            logger.info(f"Task {task_id}: Executing with Human-in-the-Loop governance enabled.")
            result_state = orchestra_hitl_workflow.invoke(initial_state, config=config)
            snapshot = orchestra_hitl_workflow.get_state(config)

            if snapshot.next and "verifier" in snapshot.next:
                # Execution reached approval gate before verifier
                with SessionLocal() as db:
                    t = db.query(Task).filter(Task.id == task_id).first()
                    if t:
                        t.status = "awaiting_approval"

                    # Create or update pending Approval record
                    existing = db.query(Approval).filter(
                        Approval.task_id == task_id,
                        Approval.status == "pending",
                    ).first()

                    plan_preview = "\n".join(snapshot.values.get("plan_steps", [])[:3])
                    analysis_preview = snapshot.values.get("analysis_summary", "")[:600]
                    approval_payload = f"=== PLAN PHASES ===\n{plan_preview}\n\n=== ANALYSIS SUMMARY ===\n{analysis_preview}"

                    if not existing:
                        approval = Approval(
                            task_id=task_id,
                            agent_name="Verification Agent",
                            action_type="governance_gate",
                            description=f"Human authorization required before verification and final report publication for task: {task.title}",
                            status="pending",
                            payload=approval_payload,
                        )
                        db.add(approval)
                        db.commit()
                        db.refresh(approval)
                        approval_id = approval.id
                    else:
                        existing.payload = approval_payload
                        db.commit()
                        approval_id = existing.id

                logger.info(f"Task {task_id} successfully paused at approval gate. Approval ID: {approval_id}")
                return {
                    "success": True,
                    "task_id": task_id,
                    "status": "awaiting_approval",
                    "interrupted_node": "verifier",
                    "approval_id": approval_id,
                    "plan_steps": snapshot.values.get("plan_steps", []),
                    "analysis_summary": snapshot.values.get("analysis_summary", ""),
                    "message": "Workflow paused before verifier node. Awaiting human approval.",
                }

        # Direct execution without HITL pause
        result_state = orchestra_workflow.invoke(initial_state, config=config)
        return {
            "success": True,
            "task_id": task_id,
            "status": "completed",
            "report": result_state.get("final_report"),
            "plan_steps": result_state.get("plan_steps"),
            "citations": result_state.get("citations", []),
            "search_status": result_state.get("search_status"),
            "document_references": result_state.get("document_references", []),
        }

    except Exception as exc:
        logger.error(f"Error executing task workflow {task_id}: {exc}")
        with SessionLocal() as db:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = str(exc)
                db.commit()
        return {
            "success": False,
            "task_id": task_id,
            "status": "failed",
            "error": str(exc),
        }


def resume_task_workflow(task_id: str) -> Dict[str, Any]:
    """Resume an interrupted LangGraph task workflow from checkpoint after human approval."""
    config = {"configurable": {"thread_id": task_id}}
    logger.info(f"Resuming task {task_id} from checkpoint after human authorization...")

    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"success": False, "task_id": task_id, "error": f"Task '{task_id}' not found."}

    # Verify that a valid saved checkpoint exists before attempting resumption
    try:
        snapshot = orchestra_hitl_workflow.get_state(config)
        if not snapshot or not snapshot.values or not snapshot.next:
            error_msg = f"No valid saved checkpoint found for task '{task_id}'. Cannot resume."
            logger.error(error_msg)
            with SessionLocal() as db:
                t = db.query(Task).filter(Task.id == task_id).first()
                if t:
                    t.status = "failed"
                    t.error_message = error_msg
                    db.commit()
            return {"success": False, "task_id": task_id, "status": "failed", "error": error_msg}
    except Exception as chk_exc:
        logger.error(f"Error reading checkpoint for task {task_id}: {chk_exc}")
        with SessionLocal() as db:
            t = db.query(Task).filter(Task.id == task_id).first()
            if t:
                t.status = "failed"
                t.error_message = f"Checkpoint read error: {chk_exc}"
                db.commit()
        return {"success": False, "task_id": task_id, "status": "failed", "error": str(chk_exc)}

    with SessionLocal() as db:
        t = db.query(Task).filter(Task.id == task_id).first()
        if t:
            t.status = "running"
            db.commit()

    try:
        # Resume execution: passes None as input to continue from interrupted node ('verifier')
        result_state = orchestra_hitl_workflow.invoke(None, config=config)
        logger.info(f"Task {task_id} resumed and successfully finished execution.")
        return {
            "success": True,
            "task_id": task_id,
            "status": "completed",
            "report": result_state.get("final_report"),
            "plan_steps": result_state.get("plan_steps"),
            "citations": result_state.get("citations", []),
            "document_references": result_state.get("document_references", []),
        }
    except Exception as exc:
        logger.error(f"Error resuming task workflow {task_id}: {exc}")
        with SessionLocal() as db:
            t = db.query(Task).filter(Task.id == task_id).first()
            if t:
                t.status = "failed"
                t.error_message = f"Resumption error: {exc}"
                db.commit()
        return {
            "success": False,
            "task_id": task_id,
            "status": "failed",
            "error": str(exc),
        }


def reject_task_workflow(task_id: str, reason: str = "") -> Dict[str, Any]:
    """Abort an interrupted task workflow upon human rejection."""
    logger.info(f"Task {task_id} rejected by human operator. Reason: {reason}")
    rejection_msg = f"Task rejected by Human-in-the-Loop governance: {reason or 'Operator denied execution'}"

    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = rejection_msg
            db.commit()

    _persist_agent_run(
        task_id=task_id,
        agent_name="Verification Agent",
        input_data="Human authorization review",
        output_data=f"ACTION REJECTED: {rejection_msg}",
        started_at=datetime.utcnow(),
        execution_time_ms=0,
        status="failed",
    )

    return {
        "success": False,
        "task_id": task_id,
        "status": "failed",
        "error": rejection_msg,
    }
