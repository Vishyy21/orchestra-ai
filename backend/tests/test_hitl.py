"""Focused unit & integration tests for Human-in-the-Loop (HITL) LangGraph checkpointing and approvals."""

import pytest
from tests.conftest import TestingSessionLocal
import app.graph.workflow
from app.database.models import Task, Approval, Report, AgentRun
from app.graph.workflow import (
    execute_task_workflow,
    resume_task_workflow,
    reject_task_workflow,
)
from app.llm.ollama_client import ollama_client


@pytest.fixture(autouse=True)
def bind_test_dependencies(monkeypatch):
    """Ensure workflow operations use the test database session and mock LLM."""
    monkeypatch.setattr(app.graph.workflow, "SessionLocal", TestingSessionLocal)

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
    from app.config import settings
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
