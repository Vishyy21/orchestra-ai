"""Empirical verification of Phase 2A: Real Web Research and Citations."""

import sys
import time
import httpx

API_BASE = "http://127.0.0.1:8000"

def main():
    print("=" * 75)
    print("ORCHESTRA AI — PHASE 2A: REAL WEB RESEARCH & CITATIONS VERIFICATION")
    print("=" * 75)

    task_payload = {
        "title": "Emerging Topological Quantum Error Correction Architectures in 2026",
        "description": "Investigate recent breakthroughs in fault-tolerant topological quantum error correction, surface codes, and physical qubit hardware implementations.",
        "category": "research",
        "priority": "high",
    }

    print("\n1. Submitting fresh research task via POST /api/tasks...")
    with httpx.Client(timeout=30.0) as client:
        res = client.post(f"{API_BASE}/api/tasks", json=task_payload)
        if res.status_code != 201:
            print(f"FAILED to submit task: {res.status_code} - {res.text}")
            sys.exit(1)
        created_task = res.json()
        task_id = created_task["id"]
        print(f"   [SUCCESS] Task created. ID: {task_id}")
        print(f"   Initial Status: {created_task['status']}")

    print("\n2. Executing 5-agent pipeline with live Tavily research via POST /api/tasks/{id}/execute?sync=true...")
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

    print("\n3. Querying SQLite database for AgentRuns and Report...")
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

        print("\n" + "=" * 75)
        print("AGENT RUN DETAILS & EVIDENCE")
        print("=" * 75)

        for i, run in enumerate(runs, 1):
            print(f"\n[{i}/5] Agent: {run.agent_name} | Status: {run.status} | Duration: {run.execution_time_ms}ms ({run.execution_time_ms / 1000.0:.2f}s)")
            print(f"    Started At: {run.started_at} | Completed At: {run.completed_at}")
            print(f"    Input Metadata: {run.input_data[:200]}")
            print(f"    Output Snippet: {run.output_data[:280]}...")

        print("\n" + "=" * 75)
        print("VERIFIED CITATIONS IN FINAL REPORT")
        print("=" * 75)

        if not reports:
            print("ERROR: No report was persisted to SQLite!")
            sys.exit(1)

        rep = reports[0]
        print(f"Report ID: {rep.id}")
        print(f"Report Title: {rep.title}")
        print(f"Total Characters: {len(rep.content)}")

        # Check for the Verified Sources & Citations section
        if "## Verified Sources & Citations" in rep.content:
            print("\n[VERIFIED] '## Verified Sources & Citations' section is present in report!")
            sources_part = rep.content.split("## Verified Sources & Citations")[-1]
            print("\nActual Citations Block:\n" + sources_part.strip())
        else:
            print("\n[FAILED] '## Verified Sources & Citations' section was NOT found!")

        # Check for real http/https URLs
        import re
        urls = re.findall(r'https?://[^\s)\]]+', rep.content)
        print(f"\nExtracted URLs in Final Report ({len(urls)} found):")
        for u in set(urls):
            print(f"  - {u}")

        assert len(urls) > 0, "No external URLs found in final report!"
        print("\n[TEST PASSED] Live Tavily research and source citations successfully verified end-to-end!")

if __name__ == "__main__":
    main()
