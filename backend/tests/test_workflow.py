"""Tests for LangGraph 5-Agent Workflow and Ollama LLM integration."""

import pytest
from app.graph.workflow import build_orchestra_graph, OrchestraAgentState
from app.llm.ollama_client import ollama_client


def test_orchestra_graph_compilation():
    """Verify that the 5-node LangGraph compiles successfully with all nodes."""
    graph = build_orchestra_graph()
    assert graph is not None
    # Verify node presence in graph structure
    nodes = list(graph.nodes.keys())
    for expected in ["planner", "researcher", "analyst", "verifier", "reporter"]:
        assert expected in nodes, f"Expected node '{expected}' in compiled graph"


def test_ollama_client_connectivity():
    """Verify Ollama client reports connected status."""
    connectivity = ollama_client.check_connectivity()
    assert connectivity["connected"] is True
    assert connectivity["base_url"] == "http://localhost:11434"


def test_ollama_model_availability():
    """Verify configured qwen3.5:4b model is present."""
    availability = ollama_client.check_model_availability()
    assert availability["connected"] is True
    assert availability["available"] is True
    assert "qwen3.5:4b" in availability["installed_models"]


def test_tavily_search_result_content_and_snippet():
    """Verify TavilySearchResult handles content and snippet attribute access without AttributeError."""
    from app.tools.tavily_search import TavilySearchResult

    item = TavilySearchResult(
        title="Zero Trust Architecture",
        url="https://example.com/zero-trust",
        content="Zero trust is a security model requiring strict verification.",
    )
    assert item.content == "Zero trust is a security model requiring strict verification."
    assert item.snippet == "Zero trust is a security model requiring strict verification."
    assert item.url == "https://example.com/zero-trust"


def test_reporter_node_sources_section_with_citations(monkeypatch):
    """Verify Reporter Agent appends retrieved web sources with real markdown links when citations exist."""
    from app.graph.workflow import reporter_node

    # Mock ollama_client.generate to avoid slow GPU calls in unit test
    monkeypatch.setattr(
        ollama_client,
        "generate",
        lambda **kwargs: {"response": "# Executive Report\n\n## Executive Summary\nAnalysis summary."},
    )

    dummy_state: OrchestraAgentState = {
        "task_id": "test-task-123",
        "task_title": "Quantum Error Correction",
        "plan_steps": ["Step 1", "Step 2"],
        "research_context": ["Grounded context on topological codes."],
        "analysis_summary": "Topological codes provide superior threshold resilience.",
        "verification_report": "### Supported Claims\n- Fault tolerance threshold.\n\n### Partially Supported Claims\n- None.\n\n### Unsupported or Conflicting Claims\n- None.",
        "citations": [
            {
                "title": "Surface Codes Literature",
                "url": "https://arxiv.org/abs/1234.5678",
                "snippet": "Topological surface code fault-tolerant threshold.",
            }
        ],
        "search_status": "success",
    }

    result = reporter_node(dummy_state)
    report = result["final_report"]

    assert "## Retrieved Web Sources" in report
    assert "[Surface Codes Literature](https://arxiv.org/abs/1234.5678)" in report
    assert "## Verification Notes" in report
    assert "### Supported Claims" in report


def test_reporter_node_honest_unconfigured_status(monkeypatch):
    """Verify Reporter Agent documents unconfigured search state transparently."""
    from app.graph.workflow import reporter_node

    monkeypatch.setattr(
        ollama_client,
        "generate",
        lambda **kwargs: {"response": "# Executive Report\n\n## Executive Summary\nOffline analysis."},
    )

    dummy_state: OrchestraAgentState = {
        "task_id": "test-task-456",
        "task_title": "Offline Synthesis",
        "plan_steps": ["Phase 1"],
        "research_context": ["Offline domain facts."],
        "analysis_summary": "Offline analysis.",
        "verification_report": "Verification passed.",
        "citations": [],
        "search_status": "unconfigured",
    }

    result = reporter_node(dummy_state)
    report = result["final_report"]

    assert "## Retrieved Web Sources" in report
    assert "TAVILY_API_KEY was not set" in report
    assert "## Verification Notes" in report
