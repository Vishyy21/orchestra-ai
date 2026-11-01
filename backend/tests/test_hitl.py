"""Focused unit & integration tests for Human-in-the-Loop (HITL) LangGraph SQLite checkpointing and approvals."""

import sqlite3
import pytest
from pathlib import Path
from tests.conftest import TestingSessionLocal
import app.graph.workflow
from app.config import settings
from app.database.models import Task, Approval, Report, AgentRun
from app.graph.workflow import (
    execute_task_workflow,
    resume_task_workflow,
    reject_task_workflow,
    build_orchestra_graph,
    get_workflow_checkpointer,
    close_checkpoint_connection,
)
from app.llm.ollama_client import ollama_client
from langgraph.checkpoint.sqlite import SqliteSaver


@pytest.fixture(autouse=True)
def bind_test_dependencies(monkeypatch, tmp_path):
    """Ensure workflow operations use isolated test database sessions and mock LLM."""
    monkeypatch.setattr(app.graph.workflow, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("app.graph.workflow.chroma_service.search", lambda *args, **kwargs: [])
    monkeypatch.setattr("app.graph.workflow.chroma_service.compute_similarity", lambda *args, **kwargs: 0.0)

    def fake_generate(prompt="", system="", **kwargs):
        if "Planner" in system:
            return {"response": "1. Analyze system constraints.\n2. Extract vector embeddings.\n3. Formulate report."}
        elif "Research" in system:
            return {"response": "- Fact 1: Surface codes provide fault tolerance.\n- Fact 2: Threshold fidelity is 99.27%."}
        elif "Analysis" in system:
            return {"response": "The architecture satisfies fault-tolerance requirements. Key tradeoff is ancilla qubit overhead."}
        elif "Verification" in system:
            return {"response": "### Supported by Uploaded Documents\n- Validated.\n\n### Supported by Retrieved Web Sources\n- None.\n\n### Partially Supported Claims\n- None.\n\n### Unsupported or Conflicting Claims\n- None."}
        elif "Reporter" in system:
            return {"response": "# Executive Report: Test Execution\n\n## Executive Summary\nAll constraints verified."}
        return {"response": "OK"}

    monkeypatch.setattr(ollama_client, "generate", fake_generate)


def test_normal_task_executes_all_agents_without_approval(db_session):
    """Verify that a task with requires_approval=False executes all 5 agents directly to completion."""
    task = Task(
        title="Direct Execution Task",
        description="Run automated analysis without governance gates.",
        category="general",
        priority="medium",
        requires_approval=False,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    result = execute_task_workflow(task.id, requires_approval=False)
    assert result["success"] is True
    assert result["status"] == "completed"
    assert result["report"] is not None

    db_session.refresh(task)
    assert task.status == "completed"

    # Verify no approval record was created
    approvals = db_session.query(Approval).filter(Approval.task_id == task.id).all()
    assert len(approvals) == 0

    # Verify all 5 agent runs were recorded
    runs = db_session.query(AgentRun).filter(AgentRun.task_id == task.id).all()
    agent_names = [r.agent_name for r in runs]
    assert "Planner Agent" in agent_names
    assert "Research Agent" in agent_names
    assert "Analysis Agent" in agent_names
    assert "Verification Agent" in agent_names
    assert "Reporter Agent" in agent_names


def test_hitl_task_pauses_before_verifier_and_creates_approval(db_session):
    """Verify that a task with requires_approval=True pauses right before Verifier and creates an Approval record."""
    task = Task(
        title="Governed Mission Task",
        description="Critical architecture evaluation requiring human sign-off.",
        category="general",
        priority="critical",
        requires_approval=True,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    result = execute_task_workflow(task.id, requires_approval=True)
    assert result["success"] is True
    assert result["status"] == "awaiting_approval"
    assert result["interrupted_node"] == "verifier"

    db_session.refresh(task)
    assert task.status == "awaiting_approval"

    # Verify approval record was created in SQLite
    approval = db_session.query(Approval).filter(Approval.task_id == task.id).first()
    assert approval is not None
    assert approval.status == "pending"
    assert approval.agent_name == "Verification Agent"
    assert "ANALYSIS SUMMARY" in approval.payload

    # Verify only Planner, Researcher, and Analyst have executed so far
    runs = db_session.query(AgentRun).filter(AgentRun.task_id == task.id).all()
    agent_names = [r.agent_name for r in runs]
    assert "Planner Agent" in agent_names
    assert "Research Agent" in agent_names
    assert "Analysis Agent" in agent_names
    assert "Verification Agent" not in agent_names
    assert "Reporter Agent" not in agent_names


def test_hitl_task_resumes_upon_approval_and_writes_disk_report(client, db_session, tmp_path, monkeypatch):
    """Verify that POST /api/approvals/{id}/decide with 'approved' resumes workflow and outputs disk report."""
    monkeypatch.setattr(settings, "reports_dir", tmp_path)

    task = Task(
        title="Approvable Task",
        description="Task designed to test successful human authorization resumption.",
        category="general",
        priority="high",
        requires_approval=True,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Initial run: pauses at verifier
    execute_task_workflow(task.id, requires_approval=True)
    approval = db_session.query(Approval).filter(Approval.task_id == task.id).first()
    assert approval is not None
    assert approval.status == "pending"

    # Decide via API with sync=True
    response = client.post(
        f"/api/approvals/{approval.id}/decide?sync=true",
        json={"decision": "approved", "reason": "Authorized by QA Lead"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"

    # Verify task state is now completed
    db_session.refresh(task)
    assert task.status == "completed"

    # Verify all 5 agents have now executed
    runs = db_session.query(AgentRun).filter(AgentRun.task_id == task.id).all()
    agent_names = [r.agent_name for r in runs]
    assert "Verification Agent" in agent_names
    assert "Reporter Agent" in agent_names

    # Verify disk report was generated in reports_dir
    report_files = list(tmp_path.glob("*.md"))
    assert len(report_files) >= 1
    content = report_files[0].read_text(encoding="utf-8")
    assert "Executive Report" in content


def test_hitl_task_rejection_terminates_cleanly(client, db_session):
    """Verify that POST /api/approvals/{id}/decide with 'rejected' halts workflow and fails task."""
    task = Task(
        title="Rejectable Task",
        description="Task intended to be rejected at the governance gate.",
        category="general",
        priority="critical",
        requires_approval=True,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    execute_task_workflow(task.id, requires_approval=True)
    approval = db_session.query(Approval).filter(Approval.task_id == task.id).first()
    assert approval is not None

    response = client.post(
        f"/api/approvals/{approval.id}/decide?sync=true",
        json={"decision": "rejected", "reason": "Safety constraint violated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"

    db_session.refresh(task)
    assert task.status == "failed"
    assert "Safety constraint violated" in task.error_message

    # Verifier and Reporter should NOT have generated completed runs
    runs = db_session.query(AgentRun).filter(AgentRun.task_id == task.id).all()
    completed_agent_names = [r.agent_name for r in runs if r.status == "completed"]
    assert "Verification Agent" not in completed_agent_names
    assert "Reporter Agent" not in completed_agent_names


def test_independent_checkpoints_for_multiple_concurrent_tasks(db_session):
    """Verify that multiple tasks interrupted at verifier maintain separate, isolated thread states."""
    task1 = Task(title="Task Alpha", description="Alpha prompt with distinct context.", status="pending", requires_approval=True)
    task2 = Task(title="Task Beta", description="Beta prompt with distinct context.", status="pending", requires_approval=True)
    db_session.add_all([task1, task2])
    db_session.commit()
    db_session.refresh(task1)
    db_session.refresh(task2)

    res1 = execute_task_workflow(task1.id, requires_approval=True)
    res2 = execute_task_workflow(task2.id, requires_approval=True)

    assert res1["status"] == "awaiting_approval"
    assert res2["status"] == "awaiting_approval"

    # Resume only task1
    resume_res1 = resume_task_workflow(task1.id)
    assert resume_res1["status"] == "completed"

    db_session.refresh(task1)
    db_session.refresh(task2)
    assert task1.status == "completed"
    assert task2.status == "awaiting_approval"  # task2 remains paused!


def test_checkpoint_records_persisted_to_sqlite_disk(db_session):
    """Verify that LangGraph checkpoint frames are actually written to the disk SQLite database."""
    task = Task(
        title="Disk Persistence Test Task",
        description="Verify checkpoints are stored in checkpoints.db file.",
        requires_approval=True,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    execute_task_workflow(task.id, requires_approval=True)

    # Inspect the actual SQLite checkpoint file on disk
    chk_path = settings.checkpoints_db_path
    assert chk_path.exists(), f"Expected checkpoint database at {chk_path}"

    conn = sqlite3.connect(str(chk_path))
    cur = conn.cursor()
    cur.execute("SELECT thread_id, checkpoint_id FROM checkpoints WHERE thread_id = ?", (task.id,))
    rows = cur.fetchall()
    conn.close()

    assert len(rows) > 0, f"Expected persisted checkpoint rows for thread_id {task.id}"
    assert rows[0][0] == task.id


def test_backend_restart_and_resumption_from_disk_checkpoint(db_session, monkeypatch, tmp_path):
    """Verify that a brand-new backend process/graph instance successfully reloads checkpoint from disk and resumes."""
    # Use a dedicated temp checkpoint DB for strict process-restart simulation
    restart_db = tmp_path / "restart_test_checkpoints.db"
    monkeypatch.setattr(settings, "checkpoints_db_path", restart_db)

    call_counts = {"planner": 0, "researcher": 0, "analyst": 0, "verifier": 0, "reporter": 0}

    def counting_generate(prompt="", system="", **kwargs):
        if "Planner" in system:
            call_counts["planner"] += 1
            return {"response": "1. Step 1\n2. Step 2\n3. Step 3"}
        elif "Research" in system:
            call_counts["researcher"] += 1
            return {"response": "- Fact A\n- Fact B"}
        elif "Analysis" in system:
            call_counts["analyst"] += 1
            return {"response": "Analysis tradeoffs computed."}
        elif "Verification" in system:
            call_counts["verifier"] += 1
            return {"response": "### Supported by Uploaded Documents\n- Validated."}
        elif "Reporter" in system:
            call_counts["reporter"] += 1
            return {"response": "# Executive Report\n\n## Executive Summary\nCompleted."}
        return {"response": "OK"}

    monkeypatch.setattr(ollama_client, "generate", counting_generate)

    task = Task(
        title="Restart Resilience Task",
        description="Task to prove persistent resume across independent processes.",
        requires_approval=True,
        status="pending",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # --- PROCESS 1: Run workflow until interrupt ---
    close_checkpoint_connection()
    proc1_saver = get_workflow_checkpointer(restart_db)
    proc1_graph = build_orchestra_graph(checkpointer=proc1_saver, interrupt_before=["verifier"])

    config = {"configurable": {"thread_id": task.id}}
    initial_state = {
        "task_id": task.id,
        "task_title": task.title,
        "task_description": task.description,
        "category": task.category,
        "priority": task.priority,
        "requires_approval": True,
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

    proc1_graph.invoke(initial_state, config=config)
    proc1_state = proc1_graph.get_state(config)
    assert proc1_state.next == ("verifier",)

    # Verify Process 1 executed only Planner, Researcher, and Analyst (1 call each)
    assert call_counts["planner"] == 1
    assert call_counts["researcher"] == 1
    assert call_counts["analyst"] == 1
    assert call_counts["verifier"] == 0
    assert call_counts["reporter"] == 0

    # --- SIMULATE PROCESS SHUTDOWN & COMPLETE RESTART ---
    close_checkpoint_connection()
    # Explicitly verify the file exists on disk
    assert restart_db.exists()

    # --- PROCESS 2: Re-open checkpoint DB in a completely new Saver and Graph instance ---
    proc2_saver = get_workflow_checkpointer(restart_db)
    proc2_graph = build_orchestra_graph(checkpointer=proc2_saver, interrupt_before=["verifier"])

    # Load state from disk
    proc2_loaded_state = proc2_graph.get_state(config)
    assert proc2_loaded_state.values.get("task_title") == task.title
    assert proc2_loaded_state.next == ("verifier",)

    # Resume from checkpoint
    resumed_result = proc2_graph.invoke(None, config=config)
    assert resumed_result.get("final_report") is not None

    # CRITICAL VERIFICATION: Completed agents (planner, researcher, analyst) were NOT executed again!
    assert call_counts["planner"] == 1, "Planner should not be executed twice!"
    assert call_counts["researcher"] == 1, "Researcher should not be executed twice!"
    assert call_counts["analyst"] == 1, "Analyst should not be executed twice!"
    assert call_counts["verifier"] == 1, "Verifier should execute on resume!"
    assert call_counts["reporter"] == 1, "Reporter should execute on resume!"

    # Verify total agent runs recorded for the task is exactly 5
    runs = db_session.query(AgentRun).filter(AgentRun.task_id == task.id).all()
    assert len(runs) == 5


def test_missing_or_corrupted_checkpoint_handled_gracefully(db_session):
    """Verify that attempting to resume a non-existent or corrupted thread fails gracefully without crashing."""
    task = Task(title="Ghost Task", description="Task with no checkpoint", status="awaiting_approval")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    result = resume_task_workflow(task.id)
    assert result["success"] is False
    assert "No valid saved checkpoint found" in result["error"]

    db_session.refresh(task)
    assert task.status == "failed"
    assert "No valid saved checkpoint found" in task.error_message
