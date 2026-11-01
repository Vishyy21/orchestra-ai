# ORCHESTRA AI — Live Demonstration Guide

> **A 5-to-7 Minute Executive & Technical Walkthrough**  
> *Demonstrating Autonomous Multi-Agent Orchestration, Persistent Human-in-the-Loop Governance, and Rigorous Empirical Verification on Consumer Hardware.*

---

## Demonstration Objectives
1. **Highlight the Core Problem**: Monolithic single-prompt LLMs hallucinate numbers, omit evidence, and lack governance.
2. **Showcase the Solution**: 5 specialized LangGraph agents running locally on consumer hardware with zero cloud API dependencies.
3. **Prove Enterprise Reliability**: Demonstrate live Human-in-the-Loop (HITL) pause, persistent SQLite checkpoint resumption across server reboots, and automated numerical verification.
4. **Present Honest Empirical Data**: Share quantitative benchmark results proving an 85.7% reduction in hallucinations alongside transparent trade-offs in token usage and latency.

---

## Pre-Demo Checklist (2 Minutes Before Demo)

| Component | Status Check | Command / URL |
| :--- | :--- | :--- |
| **Ollama Local Engine** | Running with `qwen3.5:4b` | `ollama list` (confirm `qwen3.5:4b` is present) |
| **FastAPI Backend** | Running on port 8000 | `http://127.0.0.1:8000/api/health` returns `healthy` |
| **Vite Frontend** | Running on port 5173 | `http://localhost:5173/` displays Command Dashboard |
| **Document RAG** | At least 1 document indexed | Check Knowledge Base tab (`/documents`) |

---

## Demonstration Script & Step-by-Step Flow

```
+─────────────────────────────────────────────────────────────────────────────+
|                               TIMELINE OVERVIEW                             |
|  [0:00-1:00] The Enterprise Problem: The Illusion of Monolithic Research   |
|  [1:00-2:00] Platform Architecture: Syntropic Command Dashboard             |
|  [2:00-3:30] Live Execution: The 5-Agent LangGraph Orchestration DAG        |
|  [3:30-4:45] Governance & Reliability: HITL Gate & Server Restart Recovery  |
|  [4:45-6:00] The Intelligence Artifact: Verification Audit & Numerical QA   |
|  [6:00-7:00] Empirical Evaluation: Single vs Multi-Agent Benchmark Data     |
+─────────────────────────────────────────────────────────────────────────────+
```

---

### [0:00 – 1:00] The Enterprise Problem: The Illusion of Monolithic Research

**Screen**: Split-screen showing a standard ChatGPT/Ollama single-prompt window vs Orchestra AI landing page.

**Presenter Talking Points**:
> *"If you ask a single prompt LLM to analyze the total cost of ownership between distributed vector databases and pgvector, it will generate a plausible-sounding paragraph in 15 seconds. But look closer:*
> 1. *It invents throughput numbers and storage costs out of thin air.*
> 2. *It hallucinates citations that don't exist.*
> 3. *It has no verification step to catch unit conversion errors (like confusing 0.73% with 7,300 ppm).*
> 4. *Most critically, it runs unchecked—committing answers directly without giving human operators a chance to review intermediate analysis before publishing.*
>
> *Orchestra AI was built to solve this problem. It is a multi-agent intelligence platform that replaces monolithic prompt engineering with a deterministic LangGraph state machine powered by local Ollama models on consumer hardware."*

---

### [1:00 – 2:00] Platform Architecture: Syntropic Command Dashboard

**Screen**: Navigate to `http://localhost:5173/` (Dashboard).

**Actions**:
1. Point to the **System Health & Telemetry** widgets (Top row).
   - Show `Ollama: qwen3.5:4b Connected`, `SQLite Checkpointer: Active`, `GPU: RTX 2050 (4GB)`.
2. Click **Knowledge Base** (`/documents`) in the sidebar.
   - Show pre-uploaded PDFs or technical whitepapers indexed in local ChromaDB using Sentence-Transformers.
3. Explain the local-first architecture:
   - *"Notice our operational constraints: this entire system runs locally on a laptop GPU (NVIDIA RTX 2050 with 4GB VRAM). Zero dollars spent on cloud LLM APIs. Zero data sent to third-party endpoints."*

---

### [2:00 – 3:30] Live Execution: The 5-Agent LangGraph Orchestration DAG

**Screen**: Navigate to **Tasks** -> Click **"New Research Task"**.

**Actions**:
1. Enter the demo task:
   - **Title**: `Comparative Analysis of Distributed Consensus Protocols for Edge IoT`
   - **Description**: `Evaluate Raft vs Paxos vs HoneyBadgerBFT for edge robotics under 25% packet drop. Require human approval before verification.`
   - **Category**: `Technical Research`
   - **Priority**: `High`
   - **Require Human Approval**: **CHECKED** (Toggle ON)
2. Click **Submit & Launch Task**.
3. The UI automatically transitions to the **Live Agent Workspace** (`/workspace/:id`).

**Presenter Talking Points**:
> *"Here is the live LangGraph execution DAG visualized in real time via React Flow:*
> - *Node 1: Planner Agent decomposes the prompt into sub-hypotheses and targeted queries.*
> - *Node 2: Researcher Agent executes dual-source retrieval—querying our local ChromaDB vector store and fetching real-world data via Tavily.*
> - *Node 3: Analyst Agent synthesizes the retrieved chunks, cross-correlates findings, and computes trade-off matrices.*
>
> *Notice in the live inspector pane: we can click any completed node to view its exact input, structured output, execution duration, and token usage. Everything is transparent and traceable."*

---

### [3:30 – 4:45] Governance & Reliability: HITL Gate & Server Restart Recovery

**Screen**: The DAG reaches the **HITL Gate** (between Analyst and Verifier). The task status turns to `Waiting for Approval` (Yellow pulsing glow).

**Actions**:
1. Show the **Human Approval Banner** at the top of the workspace.
2. Click **"Review Intermediate Analysis"** to open the slide-out Approval Drawer.
3. Review the intermediate synthesis:
   - Show the extracted claims, citations, and risk profile.
4. **Demonstrate Crash Resilience (The Killer Feature)**:
   - Open PowerShell and kill the FastAPI backend server (`Ctrl+C`).
   - Refresh the browser or show that the backend connection dropped.
   - Restart the backend: `python -m uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000`
   - Refresh the page: the task is still in `Waiting for Approval`!
   - *"In typical agent demos using in-memory savers, killing the server destroys the paused state. Because Orchestra AI uses `SqliteSaver` checkpoints in `data/checkpoints.db`, the entire execution frame is safely preserved on disk."*
5. Click **"Approve & Resume"** in the approval drawer.
6. Watch the graph immediately resume from the checkpoint, bypassing Planner, Researcher, and Analyst, and entering the **Verifier Agent**.

---

### [4:45 – 6:00] The Intelligence Artifact: Verification Audit & Numerical QA

**Screen**: Verifier completes; Reporter compiles; Task status switches to `Completed` (Emerald green). Click **"View Intelligence Report"** or navigate to `/reports`.

**Actions**:
1. Scroll through the generated Markdown Intelligence Report:
   - Show the **Executive Summary**, **Quantitative Trade-off Table**, and **Actionable Recommendations**.
2. Scroll to the **Verification Audit Section**:
   - Highlight the **Verification Table**:
     - *Verified Claims*: Grounded in retrieved chunks with clickable source links.
     - *Inferred Claims*: Marked with confidence intervals.
     - *Unsupported / Flagged Claims*: Highlighted in amber if not confirmed by evidence.
3. Demonstrate Numerical Accuracy:
   - Show how the Verifier checked unit conversions and numerical claims against raw citations, catching common LLM math hallucinations.
4. Show Disk Persistence:
   - Point out that the report was automatically exported to disk at `data/reports/report_task_<id>.md` for enterprise archiving.

---

### [6:00 – 7:00] Empirical Evaluation: Single vs Multi-Agent Benchmark Data

**Screen**: Open `docs/EVALUATION.md` or display the Evaluation Summary Slide.

**Presenter Talking Points**:
> *"We didn't just build this system—we measured it rigorously across 10 controlled benchmark tasks comparing a monolithic single-agent baseline against our 5-agent LangGraph pipeline on the exact same model (`qwen3.5:4b`):*
>
> - **Completeness**: Multi-agent achieved **94.2%** vs 78.4% (+15.8% increase).
> - **Source Traceability**: Multi-agent reached **91.0%** vs 64.0% (+27.0% increase).
> - **Hallucination Reduction**: Unsupported claims dropped from **7 to 1**—an **85.7% reduction**.
> - **Numerical Accuracy**: Multi-agent scored **95.0%** vs 82.5%, correctly catching subtle unit traps like `0.73%` vs `7,300 ppm`.
>
> *We also share honest trade-offs: multi-agent execution takes **3.5x more wall-clock latency** (204s vs 58s) and **5.1x more tokens**. In enterprise research, however, spending 3 minutes to produce a verified, auditable report is vastly superior to getting an unverified hallucination in 50 seconds.*
>
> *That is Orchestra AI: verifiable intelligence, resilient governance, running locally."*

---

## Demo Fallbacks & Troubleshooting

| Scenario | Symptom | Immediate Fallback |
| :--- | :--- | :--- |
| **Ollama Daemon Offline** | Red warning pill on Dashboard: `LLM Unreachable` | Run `ollama serve` in a new terminal, refresh page. |
| **GPU Inference Too Slow** | Task takes > 3 minutes during live talk | Have a pre-run Task (e.g., Task 1 or 2) already completed; switch tabs to show the pre-computed Workspace and Report immediately. |
| **Tavily Rate Limited** | Researcher logs show `Tavily API unavailable` | System automatically falls back to local ChromaDB RAG. The workflow continues smoothly without failure. |
| **Network Disconnected** | No internet access in conference venue | All core features (ChromaDB RAG, Ollama inference, SQLite checkpointing, Verifier, Reporter) function 100% offline. |

