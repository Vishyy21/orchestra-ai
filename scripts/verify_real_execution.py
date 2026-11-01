"""Empirical verification script for ORCHESTRA AI 5-agent execution."""

import sys
import time
import json
import httpx

API_BASE = "http://127.0.0.1:8000"

def main():
    print("=" * 70)
    print("ORCHESTRA AI — EMPIRICAL 5-AGENT EXECUTION VERIFICATION")
    print("=" * 70)

    # Step 1: Submit new task through the official FastAPI endpoint
    task_payload = {
        "title": "Autonomous Zero-Trust Multi-Agent Authorization Architecture",
        "description": "Design an RBAC and cryptographic token verification architecture for autonomous agent delegation, audit compliance, and ephemeral key exchanges.",
        "category": "architecture",
        "priority": "high",
    }

    print("\n1. Submitting task via POST /api/tasks...")
    with httpx.Client(timeout=30.0) as client:
        res = client.post(f"{API_BASE}/api/tasks", json=task_payload)
        if res.status_code != 201:
            print(f"FAILED to create task: {res.status_code} - {res.text}")
            sys.exit(1)
        created_task = res.json()
        task_id = created_task["id"]
        print(f"   [SUCCESS] Task created. ID: {task_id}")
        print(f"   Status: {created_task['status']}")

    # Step 2: Trigger execution endpoint (same wiring used by frontend)
    print("\n2. Initiating execution via POST /api/tasks/{id}/execute?sync=true...")
    t_start = time.time()
    with httpx.Client(timeout=300.0) as client:
        exec_res = client.post(f"{API_BASE}/api/tasks/{task_id}/execute?sync=true")
        if exec_res.status_code != 200:
            print(f"FAILED to execute task: {exec_res.status_code} - {exec_res.text}")
            sys.exit(1)
        exec_data = exec_res.json()
        print(f"   [SUCCESS] Execution finished in {time.time() - t_start:.2f}s")
        print(f"   Workflow status: {exec_data.get('status')}")

    # Step 3: Inspect database persistence
    sys.path.insert(0, "./backend")
    from app.database.session import SessionLocal
    from app.database.models import Task, AgentRun, Report

    print("\n3. Querying SQLite database for persisted artifacts...")
    with SessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        runs = db.query(AgentRun).filter(AgentRun.task_id == task_id).order_by(AgentRun.started_at.asc()).all()
        reports = db.query(Report).filter(Report.task_id == task_id).all()

        print(f"\nTask ID: {task.id}")
        print(f"Task Title: {task.title}")
        print(f"Task Status: {task.status}")
        print(f"Total Agent Runs Recorded: {len(runs)}")
        print(f"Total Reports Recorded: {len(reports)}")

        print("\n" + "-" * 70)
        print("AGENT EXECUTION RECORDS (EMPIRICAL TELEMETRY)")
        print("-" * 70)
        for i, run in enumerate(runs, 1):
            print(f"\n[{i}/5] Agent: {run.agent_name}")
            print(f"    Status: {run.status}")
            print(f"    Execution Time: {run.execution_time_ms} ms ({run.execution_time_ms / 1000.0:.2f}s)")
            print(f"    Started At: {run.started_at}")
            print(f"    Completed At: {run.completed_at}")
            print(f"    Input Snippet: {run.input_data[:140]}...")
            print(f"    Output Snippet: {run.output_data[:200]}...")

        print("\n" + "-" * 70)
        print("PERSISTED REPORT SUMMARY")
        print("-" * 70)
        for rep in reports:
            print(f"Report ID: {rep.id}")
            print(f"Report Title: {rep.title}")
            print(f"Report Category: {rep.category}")
            print(f"Content Length: {len(rep.content)} characters")
            print(f"First 300 characters:\n{rep.content[:300]}...\n")

if __name__ == "__main__":
    main()
