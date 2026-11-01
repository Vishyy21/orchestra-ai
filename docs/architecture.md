# ORCHESTRA AI — Phase 1 System Architecture Specification

## 1. System Mission & Product Identity
- **Product Name**: ORCHESTRA AI
- **Tagline**: "Intelligence in Sync. Execution in Motion."
- **Category**: Autonomous Multi-Agent Intelligence Platform
- **Objective**: Provide a portfolio-grade, enterprise-ready orchestration platform capable of running specialized AI agents locally on consumer hardware (16 GB RAM + 4 GB NVIDIA GPU) with zero dependence on paid cloud APIs.

---

## 2. Hardware Architecture & Constraints

```
+-------------------------------------------------------------+
| HOST SYSTEM: Windows 11                                     |
| Physical RAM: 16.0 GB                                       |
| GPU: NVIDIA GeForce RTX 2050 (4096 MiB VRAM)                |
| Compute Platform: CUDA 12.9 / Driver 577.03                 |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| INFERENCE PROFILE: Serialized Concurrency                   |
| Model: Qwen 3.5 4B (Quantized ~2.5 - 3.2 GB VRAM footprint) |
| Server: Ollama Local Daemon (:11434)                        |
| Concurrency Limit: 1 Active Inference Worker at a time      |
+-------------------------------------------------------------+
```

### Rationale
Running large multi-agent networks concurrently on 16 GB host RAM with a 4 GB GPU can risk host memory thrashing or CUDA Out-Of-Memory (OOM) exceptions. Orchestra AI's architecture addresses this through:
1. **Serialized Agent Inference**: Each agent (Planner, Researcher, Coder, Verifier) accesses the local model sequentially or with strict token limits.
2. **Persistent Shared State**: Agent state is held in SQLite and in-memory Pydantic models rather than duplicated context windows.
3. **Structured Fallbacks**: If Ollama or `qwen3.5:4b` is not running, the system does not crash or mock fake responses; instead, it provides crisp diagnostics and exact installation commands.

---

## 3. Modular Backend Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application, CORS, lifespan, exception handler
│   ├── config.py            # Pydantic BaseSettings with directory auto-provisioning
│   ├── api/                 # Modular HTTP route handlers
│   │   ├── health.py        # /api/health (Database, GPU, RAM, Uptime)
│   │   ├── llm.py           # /api/llm/status, /api/llm/test
│   │   ├── tasks.py         # /api/tasks (CRUD, validation, pagination)
│   │   ├── agents.py        # /api/agents (Registry & run history)
│   │   ├── reports.py       # /api/reports (Markdown intelligence artifacts)
│   │   ├── documents.py     # /api/documents (File uploads & RAG metadata)
│   │   ├── approvals.py     # /api/approvals (Human-in-the-loop decisions)
│   │   └── dashboard.py     # /api/dashboard/metrics (Aggregated telemetry)
│   ├── agents/
│   │   └── registry.py      # Core agent definitions (Planner, Researcher, Coder, Verifier)
│   ├── graph/
│   │   └── __init__.py      # LangGraph state schema for multi-agent DAGs
│   ├── tools/
│   │   └── __init__.py      # Tool interface foundation for Phase 2
│   ├── rag/
│   │   └── document_service.py # Upload file handler and storage manager
│   ├── llm/
│   │   └── ollama_client.py # Reusable Ollama client with error isolation
│   ├── database/
│   │   ├── models.py        # SQLAlchemy models (Task, AgentRun, Report, Document, Approval)
│   │   └── session.py       # Engine, SessionLocal, init_db, get_db
│   ├── schemas/             # Pydantic validation schemas
│   └── services/            # Business logic and metric calculation
└── tests/                   # Pytest test suite (11 unit tests)
```

---

## 4. Frontend Architecture

The frontend is engineered with:
- **React 19 & Vite**: Ultra-fast hot-module reloading and optimized static asset packaging.
- **TypeScript**: Strict type boundaries with `verbatimModuleSyntax` and zero loose typing.
- **Tailwind CSS & Syntropic Control Design System**:
  - Dark-mode first palette inspired by Stitch MCP generations.
  - `#090B10` void canvas, `#141824` cards, `#8B5CF6` primary violet, `#06B6D4` telemetry cyan.
  - Zero childish emojis; high-density typography pairing Inter and JetBrains Mono.
- **@xyflow/react**: Interactive multi-agent orchestration canvas displaying the synchronized data flow between Planner, Researcher, Coder, and Verifier.
- **TanStack Query v5**: Automatic background cache invalidation and query polling.
- **Zustand**: Clean global UI state without Redux boilerplate.

---

## 5. Phase 2 Readiness

Phase 1 establishes all required infrastructure:
1. SQLite database tables and foreign key relations (`tasks`, `agent_runs`, `reports`, `documents`, `approvals`).
2. LangGraph state schema (`OrchestraAgentState`).
3. Registered agent profiles with capabilities and priority orders.
4. RAG document upload foundation and directories (`data/uploads`, `data/reports`, `data/chroma`).
5. Ollama client capable of structured JSON generation and error isolation.
6. Responsive command dashboard with live status telemetry.
