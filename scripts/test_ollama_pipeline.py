"""Verification script for testing Ollama LLM integration, individual agents,
LangGraph 5-node workflow, and SQLite database persistence.
"""

import os
import sys
import time

# Ensure backend is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.llm.ollama_client import ollama_client
from app.services.llm_health import check_ollama_health, verify_ollama_inference
from app.graph.workflow import execute_task_workflow
from app.database.session import SessionLocal
from app.database.models import Task, AgentRun, Report


def run_verification():
    print("=" * 60)
    print("ORCHESTRA AI — OLLAMA & 5-AGENT PIPELINE VERIFICATION")
    print("=" * 60)

    # 1. Health and tags check
    print("\n[1/5] Checking Ollama Health & Model Manifest...")
    health = check_ollama_health()
    print(f"  - Health Status: {health.status.value}")
    print(f"  - Port 11434 Connected: {health.connected}")
    print(f"  - Target Model: {health.configured_model}")
    print(f"  - Installed Models: {health.installed_models}")
    print(f"  - GPU: {health.gpu.name} ({health.gpu.vram_used_mb}MB VRAM used)")
    assert health.connected, "Ollama must be connected on port 11434"

    # 2. Direct backend-to-Ollama inference
    print("\n[2/5] Testing Direct Backend-to-Ollama Inference...")
    t0 = time.time()
    inf_test = verify_ollama_inference("State that Orchestra AI is fully operational in one sentence.")
    latency = time.time() - t0
    print(f"  - Direct Inference Elapsed: {latency:.2f}s")
    print(f"  - Response: {inf_test.get('response')}")
    assert inf_test.get("success"), f"Inference failed: {inf_test.get('error')}"

    # 3. Create test task in SQLite
    print("\n[3/5] Inserting Real Task into SQLite Database...")
    with SessionLocal() as db:
        test_task = Task(
            title="Autonomous Microservice Resilience Audit",
            description="Evaluate circuit-breaking, retry budgets, and bulkhead patterns under network partition scenarios.",
            category="architecture",
            priority="high",
            status="pending",
        )
        db.add(test_task)
        db.commit()
        db.refresh(test_task)
        task_id = test_task.id
        print(f"  - Created Task ID: {task_id}")
        print(f"  - Initial Status: {test_task.status}")

    # 4. Execute 5-agent LangGraph workflow
    print("\n[4/5] Running End-to-End LangGraph 5-Agent Execution Workflow...")
    print("  Pipeline sequence: Planner -> Researcher -> Analyst -> Verifier -> Reporter")
    t_start = time.time()
    wf_res = execute_task_workflow(task_id)
    wf_duration = time.time() - t_start
    print(f"  - Workflow Completed in: {wf_duration:.2f}s")
    print(f"  - Workflow Status: {wf_res.get('status')}")
    assert wf_res.get("success"), f"Workflow execution failed: {wf_res.get('error')}"

    # 5. Verify database persistence
    print("\n[5/5] Verifying Database Persistence (Task, AgentRuns, Report)...")
    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        print(f"  - Task Final Status: {task.status}")
        print(f"  - Task Result Summary: {task.result_summary[:100]}...")
        assert task.status == "completed", "Task status must be completed"

        runs = (
            db.query(AgentRun)
            .filter(AgentRun.task_id == task_id)
            .order_by(AgentRun.started_at.asc())
            .all()
        )
        print(f"  - Recorded Agent Runs: {len(runs)} (Expected 5)")
        agent_names = [r.agent_name for r in runs]
        for idx, r in enumerate(runs, 1):
            out_len = len(r.output_data) if r.output_data else 0
            print(f"    [{idx}] {r.agent_name:<19} | Status: {r.status:<9} | {r.execution_time_ms:>5}ms | Output chars: {out_len}")

        expected_agents = ["Planner Agent", "Research Agent", "Analysis Agent", "Verification Agent", "Reporter Agent"]
        for expected in expected_agents:
            assert expected in agent_names, f"Missing run for {expected}"

        reports = db.query(Report).filter(Report.task_id == task_id).all()
        print(f"  - Generated Reports: {len(reports)}")
        for rep in reports:
            print(f"    * Report: {rep.title}")
            print(f"      Length: {len(rep.content)} chars")
            print(f"      Preview:\n{rep.content[:200]}...\n")
        assert len(reports) >= 1, "At least 1 report must be created"

    print("=" * 60)
    print("SUCCESS: ALL CHECKS PASSED EMPIRICALLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_verification()
