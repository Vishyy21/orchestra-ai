# ORCHESTRA AI

> **"Intelligence in Sync. Execution in Motion."**  
> *Production-grade autonomous multi-agent intelligence platform running locally on consumer hardware with zero cloud API dependencies.*

---

## Overview & Problem Statement

Monolithic Large Language Models (LLMs) struggle when tasked with long-horizon research, technical synthesis, and numerical verification in a single prompt. Across complex domains, single-agent architectures exhibit critical flaws:
- **Hallucinated Metrics**: Inaccurately generating numerical benchmarks, percentages, and financial metrics without mathematical verification.
- **Context Drift & Omission**: Losing track of core constraints in long prompts, resulting in superficial summaries.
- **Unverified Assertions**: Blending speculative claims with verified facts without explicit source attribution.
- **Zero Governance**: Committing answers directly without giving human operators a structured checkpoint to audit intermediate reasoning.

**Orchestra AI** solves these systemic challenges by replacing monolithic prompt engineering with a **stateful multi-agent Directed Acyclic Graph (DAG)** powered by **LangGraph**. The platform coordinates five specialized agents, grounds reasoning across **local ChromaDB vector RAG** and live **Tavily web search**, enforces deterministic **mathematical and source verification**, and persists execution state in **SQLite checkpoints** to guarantee resilience across server reboots.

The entire system is engineered to run locally on consumer-grade hardware—tested on an **NVIDIA GeForce RTX 2050 (4 GB VRAM)** with **Ollama (`qwen3.5:4b`)**.

---

## Key Capabilities

- **5-Agent LangGraph Pipeline**: Dedicated nodes for Planning, Research, Analysis, Verification, and Reporting.
- **Persistent SQLite Checkpointing**: Powered by `langgraph.checkpoint.sqlite.SqliteSaver`. Workflows paused for human review survive backend restarts with zero state loss.
- **Human-in-the-Loop (HITL) Governance**: Configurable approval gate before the Verification node allows operators to review, approve, or reject intermediate findings.
- **Dual-Source Grounding**: Blends local PDF/markdown document RAG via ChromaDB with live web search via Tavily.
- **Automated Verification**: Dedicated Verifier Agent cross-checks claims, resolves numerical traps (e.g., `0.73%` vs `7,300 ppm`), and flags unsupported assertions.
- **Interactive Live Workspace**: Visualized with `@xyflow/react`, providing real-time node state, duration telemetry, multi-attempt retry history, and intermediate output inspection.
- **Empirically Benchmarked**: 10 controlled tasks evaluated against a single-agent baseline with transparent latency and token metrics.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │             ORCHESTRA AI             │
                      │         Autonomous Executive         │
                      └──────────────────┬───────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │   1. Planner Agent  │                   │ 2. Researcher Agent │
         │   DAG Breakdown &   │──────────────────►│ ChromaDB Vector RAG │
         │   Targeted Queries  │                   │  + Tavily Web API   │
         └─────────────────────┘                   └──────────┬──────────┘
                                                              │
                                                              ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │   HITL Governance   │                   │   3. Analyst Agent  │
         │  SQLite Checkpoint  │◄──────────────────│ Cross-Source Matrix │
         │  Interrupt Gate     │                   │ Synthesis & Claims  │
         └──────────┬──────────┘                   └─────────────────────┘
                    │
         ┌──────────┴──────────┐
         │ (Operator Approval) │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  4. Verifier     │  │ Rejected Task    │
│  Math & Source   │  │ Clean Halt &     │
│  Integrity QA    │  │ Skipped Status   │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────┐
│   5. Reporter    │
│ Markdown Report  │──► Saved to Disk: data/reports/*.md
│ & Visual Metrics │──► Persisted to SQLite: orchestra.db
└──────────────────┘
```

### The 5 Specialized Autonomous Agents

1. **Planner Agent**: Decomposes complex user goals into structured subtasks and research hypotheses. Formulates analytical search queries.
2. **Researcher Agent**: Executes dual-source retrieval. Queries local ChromaDB vector collections (embedded with `all-MiniLM-L6-v2`) and live Tavily web search, filtering out irrelevant chunks with a strict distance cutoff (`<= 1.1`).
3. **Analyst Agent**: Synthesizes multi-source evidence into structured thematic categories, extracts quantitative metrics, and evaluates trade-offs.
4. **Verifier Agent**: Audits every factual assertion against source citations. Identifies numerical unit conversion traps, separates verified findings from inferences, and flags ungrounded claims.
5. **Reporter Agent**: Compiles the verified findings into a publication-grade Markdown intelligence report, including executive summaries, fact-checking tables, and citation links. Exports reports both to SQLite and disk (`data/reports/`).

---

## Empirical Benchmark Results (Single-Agent vs 5-Agent)

Orchestra AI includes a standardized benchmark suite evaluated across 10 controlled tasks using local `qwen3.5:4b` inference. Full methodology and per-task data are documented in [`docs/EVALUATION.md`](file:///c:/Users/vishe/OneDrive/New%20folder/Orchestra%20AI/docs/EVALUATION.md).

| Metric | Monolithic Single-Agent Baseline | Orchestra AI (5-Agent LangGraph) | Relative Delta | Significance |
| :--- | :---: | :---: | :---: | :--- |
| **Completeness** | 78.4% | **94.2%** | **+15.8%** | Multi-agent systematically covers all required subtopics |
| **Evidence Coverage** | 68.1% | **89.5%** | **+21.4%** | Multi-agent references a significantly higher fraction of retrieved data |
| **Source Traceability** | 64.0% | **91.0%** | **+27.0%** | Strict citation grounding across all factual claims |
| **Unsupported Claims** | 7 total | **1 total** | **-85.7%** | Verifier catches ungrounded assertions before report generation |
| **Numerical Accuracy** | 82.5% | **95.0%** | **+12.5%** | Catches subtle math traps (e.g., `0.73%` vs `7,300 ppm`) |
| **Avg Wall-Clock Latency** | **58.4 s** | 204.6 s | +3.5x | Cost of serialized multi-node inference on local GPU |
| **Avg Token Consumption** | **1,142** | 5,820 | +5.1x | Context overhead across 5 specialized prompts |

> [!NOTE]
> **The Engineering Trade-off**: The multi-agent pipeline is 3.5x slower and consumes 5.1x more tokens. However, in enterprise compliance, scientific analysis, and executive research, spending ~3 minutes on a verified, auditable report is vastly superior to getting an unverified hallucination in 50 seconds.

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, LangGraph, SQLAlchemy, SQLite, ChromaDB, Sentence-Transformers (`all-MiniLM-L6-v2`), Tavily Search API, Ollama (`qwen3.5:4b`).
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, `@xyflow/react` (React Flow), TanStack Query v5, Lucide Icons.
- **Testing**: Pytest (67 backend tests), Vitest (8 frontend tests).
- **Design System**: Syntropic Control dark theme (`#090B10` canvas, `#141824` cards, `#8B5CF6` violet accent, `#06B6D4` telemetry cyan).

---

## Prerequisites & Hardware Requirements

- **Operating System**: Windows 10/11 x64 (or Linux/macOS)
- **RAM**: 16 GB system memory
- **GPU**: NVIDIA GeForce RTX 2050 (4 GB VRAM) or equivalent CUDA GPU (also runs on CPU with increased latency)
- **Runtimes**:
  - Python 3.11+
  - Node.js 20+ and npm
  - [Ollama](https://ollama.com/) installed and added to PATH

---

## Quick Start (Windows PowerShell)

### 1. Start Ollama and Pull Model
```powershell
# In terminal 1:
ollama pull qwen3.5:4b
ollama run qwen3.5:4b
```

### 2. Configure Backend Environment
```powershell
# In terminal 2, navigate to project root:
cd "c:\Users\vishe\OneDrive\New folder\Orchestra AI"

# Activate Python virtual environment:
.\.venv\Scripts\Activate.ps1

# (Optional) Set Tavily API Key for live web search:
# $env:TAVILY_API_KEY = "tvly-your-key-here"

# Start FastAPI backend server:
python -m uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

### 3. Start Frontend Dashboard
```powershell
# In terminal 3, navigate to frontend:
cd "c:\Users\vishe\OneDrive\New folder\Orchestra AI\frontend"

# Install dependencies (first time only):
npm install

# Start Vite development server:
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Verification Tests

### Backend Unit & Integration Tests (67 Tests)
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```

### Frontend Tests (8 Tests)
```powershell
npm --prefix frontend test -- --run
```

### Frontend Production Build
```powershell
npm --prefix frontend run build
```

### Running the Evaluation Benchmark CLI
```powershell
# Run benchmark across tasks (e.g. Task 3):
.\.venv\Scripts\python.exe backend/scripts/run_benchmark.py --task-id 3
```

---

## API Surface

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/` | `GET` | Platform metadata and live system readiness |
| `/api/health` | `GET` | Database connectivity, GPU availability, and system metrics |
| `/api/llm/status` | `GET` | Ollama connection probe, latency, and loaded model |
| `/api/tasks` | `GET` | List all tasks with status, priority, and pagination |
| `/api/tasks` | `POST` | Submit a new research task into the orchestration queue |
| `/api/tasks/{id}` | `GET` | Retrieve task details, subtask plan, and agent execution runs |
| `/api/tasks/{id}/retry` | `POST` | Retry a failed task with clean execution attempt tracking |
| `/api/agents` | `GET` | List registered specialized agents and capabilities |
| `/api/agents/history` | `GET` | List recent agent execution runs with durations |
| `/api/reports` | `GET` | List generated intelligence reports |
| `/api/reports/{id}` | `GET` | Retrieve markdown content and metadata for a specific report |
| `/api/documents` | `GET` | List uploaded knowledge base documents |
| `/api/documents/upload`| `POST` | Upload PDF/markdown document to local ChromaDB RAG |
| `/api/approvals` | `GET` | List pending and decided Human-in-the-Loop approval requests |
| `/api/approvals/{id}/decide` | `POST` | Approve or reject paused workflow with persistent resumption |
| `/api/dashboard/metrics` | `GET` | Aggregated telemetry computed from live database |

---

## Project Structure

```
Orchestra AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint, lifespan, CORS
│   │   ├── config.py            # Application settings & directory setup
│   │   ├── api/                 # Modular API route controllers
│   │   │   ├── tasks.py         # Task creation, lifecycle, retry
│   │   │   ├── agents.py        # Agent registry & run history
│   │   │   ├── approvals.py     # HITL approval & resumption endpoints
│   │   │   ├── reports.py       # Intelligence report delivery
│   │   │   ├── documents.py     # Document upload & RAG indexing
│   │   │   └── health.py        # System health & telemetry
│   │   ├── graph/               # LangGraph multi-agent workflow
│   │   │   ├── workflow.py      # State machine definition & SqliteSaver
│   │   │   └── nodes/           # Individual agent nodes (Planner, etc.)
│   │   ├── evaluation/          # Benchmark suite & evaluation runner
│   │   │   ├── benchmark_tasks.py # 10 standardized research tasks
│   │   │   ├── baseline.py      # Monolithic single-agent baseline
│   │   │   ├── metrics.py       # Deterministic evaluation metrics
│   │   │   ├── runner.py        # Side-by-side benchmark runner
│   │   │   └── reporter.py      # Benchmark JSON & Markdown generator
│   │   ├── database/            # SQLAlchemy models & SQLite session
│   │   ├── rag/                 # ChromaDB vector store & chunking service
│   │   └── llm/                 # Ollama client with error isolation
│   ├── scripts/
│   │   └── run_benchmark.py     # CLI evaluation runner
│   └── tests/                   # 67 pytest unit & integration tests
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # System overview & telemetry
│   │   │   ├── TasksPage.tsx           # Task creation & management
│   │   │   ├── AgentWorkspacePage.tsx  # Live @xyflow DAG & inspector
│   │   │   ├── ReportsPage.tsx         # Report library & markdown view
│   │   │   ├── DocumentsPage.tsx       # Knowledge base upload & indexing
│   │   │   └── ApprovalsPage.tsx       # Human approval management
│   │   ├── components/                 # Reusable UI widgets & modals
│   │   └── lib/api.ts                  # Typed API client
│   └── package.json
├── data/
│   ├── checkpoints.db           # Persistent LangGraph SQLite checkpoints
│   ├── chroma/                  # ChromaDB persistent vector storage
│   ├── evaluation/              # Benchmark results JSON
│   ├── reports/                 # Exported Markdown intelligence reports
│   └── uploads/                 # Uploaded source documents
├── docs/
│   ├── ARCHITECTURE.md          # Comprehensive system architecture & Mermaid diagrams
│   ├── DEMO_GUIDE.md            # 5-7 minute presentation script & click path
│   ├── EVALUATION.md            # In-depth benchmark results & trade-off analysis
│   ├── INTERVIEW_PREPARATION.md # Technical pitch, trade-offs, and 20 Q&As
│   └── RESUME_BULLETS.md        # ATS-optimized resume bullet points
├── README.md                    # This document
└── requirements.txt
```

---

## Limitations & Honest Engineering Assessment

1. **Hardware-Bound Serialized Inference**: On consumer GPUs (such as 4GB VRAM), agent inference must run sequentially. Parallel agent execution is disabled to prevent CUDA Out-Of-Memory crashes.
2. **Context Window on 4B Models**: `qwen3.5:4b` has a finite effective context window. We cap agent outputs between 384 and 768 tokens and restrict RAG context chunks to the top 3 highest-similarity matches to maintain stability.
3. **Single-Node Execution**: Designed for local, privacy-first single-machine execution. Scaling to distributed multi-tenant workloads would require migrating from SQLite to PostgreSQL and Redis.

---

## Documentation Links

- [System Architecture Specification](docs/ARCHITECTURE.md)
- [Empirical Evaluation & Benchmark Report](docs/EVALUATION.md)
- [Live Demonstration Guide](docs/DEMO_GUIDE.md)
- [Technical Interview Preparation & 20 Q&As](docs/INTERVIEW_PREPARATION.md)
- [ATS Resume Bullets & Skill Matrix](docs/RESUME_BULLETS.md)

---

## License

Proprietary / Academic Portfolio Project — Orchestra AI Platform.
All rights reserved.
