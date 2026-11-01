# ORCHESTRA AI

> **"Intelligence in Sync. Execution in Motion."**

![Orchestra AI Banner](/logo.svg)

**Orchestra AI** is an enterprise-grade autonomous multi-agent intelligence platform where specialized AI agents collaborate to plan, research, analyze, verify, and execute complex workflows. Designed for local execution with zero paid API dependencies, Orchestra AI leverages local Ollama instances (`qwen3.5:4b`), SQLite persistence, and an executive dark-themed command dashboard.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │             ORCHESTRA AI             │
                      │         Autonomous Executive         │
                      └──────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
         ┌──────────────────┐                        ┌──────────────────┐
         │  Planner Agent   │                        │ Researcher Agent │
         │  DAG Breakdown   │◄──────────────────────►│  ChromaDB / RAG  │
         └─────────┬────────┘                        └─────────┬────────┘
                   │                                           │
                   ▼                                           ▼
         ┌──────────────────┐                        ┌──────────────────┐
         │   Coder Agent    │                        │  Verifier Agent  │
         │ Qwen 3.5 Engine  │◄──────────────────────►│ Security & AST QA│
         └──────────────────┘                        └──────────────────┘
```

### Specialized Autonomous Agent Nodes
1. **Planner Agent**: Decomposes user goals into structured Directed Acyclic Graphs (DAGs) and sequences subtasks.
2. **Researcher Agent**: Performs semantic retrieval across indexed local corpuses using Sentence-Transformers and ChromaDB.
3. **Coder Agent**: Synthesizes clean, typed production modules via local Ollama inference (`qwen3.5:4b`).
4. **Verifier Agent**: Executes test suites, audits AST vulnerabilities, and validates invariant correctness before completion.

---

## System Hardware & Requirements

- **Operating System**: Windows 10/11
- **Host Memory**: 16 GB RAM (Serialized inference profile to prevent OOM)
- **GPU Acceleration**: NVIDIA GeForce RTX 2050 (4 GB VRAM, Driver 577.03, CUDA 12.9)
- **Local LLM Engine**: Ollama with `qwen3.5:4b`
- **Runtimes**: Python 3.11+ / Node.js 20+

---

## Quick Start & Running Locally

### 1. Ollama Local LLM Setup
Ensure Ollama is installed and run the Qwen 3.5 4B model:
```bash
# If Ollama is not yet installed, download from https://ollama.com
# Pull and start the local model:
ollama run qwen3.5:4b
```

### 2. Backend Initialization
The backend is built with FastAPI, SQLAlchemy, and LangGraph.

```bash
# Navigate to the workspace root
cd "Orchestra AI"

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r backend/requirements.txt

# Start the FastAPI server
python -m uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### 3. Frontend Dashboard Initialization
The frontend is built with React 19, Vite, TypeScript, Tailwind CSS, `@xyflow/react`, and TanStack Query.

```bash
# In a separate terminal, navigate to the frontend directory
cd "Orchestra AI/frontend"

# Install dependencies
npm install

# Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Verification Tests

### Backend Unit Tests (Pytest)
```bash
.\.venv\Scripts\pytest.exe backend/tests -v
```

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm test
```

### Production Build Validation
```bash
cd frontend
npm run build
```

---

## API Surface

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Platform metadata and live service status |
| `/api/health` | `GET` | System health, database connection, and GPU metrics |
| `/api/llm/status` | `GET` | Ollama connection probe, latency, and model availability |
| `/api/llm/test` | `POST` | Execute diagnostic test prompt against local Ollama model |
| `/api/tasks` | `GET` | List tasks with category, status, and pagination filters |
| `/api/tasks` | `POST` | Submit a new task into the orchestration queue |
| `/api/tasks/{id}` | `GET` | Retrieve task details and agent execution runs |
| `/api/agents` | `GET` | List registered agent nodes, capabilities, and orders |
| `/api/agents/history` | `GET` | List recent agent execution runs |
| `/api/reports` | `GET` | List generated intelligence reports |
| `/api/documents` | `GET` | List knowledge base documents |
| `/api/documents/upload`| `POST` | Upload document to local RAG storage |
| `/api/approvals` | `GET` | List human-in-the-loop action requests |
| `/api/approvals/{id}/decide` | `POST` | Approve or reject agent action |
| `/api/dashboard/metrics` | `GET` | Aggregated metrics computed from live database |

---

## Design System: Syntropic Control
Engineered with Stitch MCP inspiration:
- **Canvas Base**: `#090B10`
- **Surface Elevation**: `#0E121B` (Shell), `#141824` (Cards), `#1C2233` (Overlays)
- **Primary Accent**: Electric Violet `#7C3AED` / `#8B5CF6`
- **Telemetry Accent**: Cyan `#06B6D4` / `#22D3EE`
- **Quality Indicators**: Emerald `#10B981`, Amber `#F59E0B`, Rose `#F43F5E`
- **Typography**: Inter (UI Sans) + JetBrains Mono (Metrics & Telemetry)

---

## License
Proprietary — Orchestra AI Platform.
