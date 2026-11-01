# ORCHESTRA AI — Technical Interview Preparation Guide

> **Master Guide for Engineering, Systems, and AI/ML Technical Interviews**  
> *Architectural explanations, trade-off defenses, and 20 deep-dive questions and answers based on the production implementation of Orchestra AI.*

---

## 1. The 60-Second Elevator Pitch

> *"Orchestra AI is an autonomous multi-agent intelligence platform that replaces unreliable, monolithic LLM prompt engineering with a deterministic LangGraph state machine. Operating completely locally on consumer hardware—specifically an NVIDIA RTX 2050 with 4GB VRAM and Ollama's Qwen 3.5 4B—it coordinates five specialized agents: Planner, Researcher, Analyst, Verifier, and Reporter.*
>
> *Unlike standard agent demos that lose intermediate state on server crashes, Orchestra AI implements persistent SQLite checkpointing via LangGraph's `SqliteSaver`, allowing human-in-the-loop approval workflows to safely survive backend restarts without re-executing completed agents.*
>
> *In our empirical benchmarks across 10 controlled tasks, the multi-agent pipeline improved analytical completeness by 15.8%, increased source traceability by 27%, and reduced unsupported hallucinations by 85.7% compared to a single-agent baseline."*

---

## 2. The 2-Minute Technical Deep Dive

> *"Under the hood, Orchestra AI is architected as a hybrid stateful system combining FastAPI, LangGraph, ChromaDB, and local Ollama inference.*
>
> *The core orchestration engine models research workflows as a Directed Acyclic Graph (DAG). We define a strongly typed `OrchestraAgentState` that tracks task metadata, subtask plans, retrieved document chunks, web snippets, cross-source analysis, and verification claims. Each node represents a dedicated agent with strict prompt boundaries and specialized token budgets.*
>
> *Evidence retrieval is dual-sourced: local PDFs and documents are chunked into 500-character segments with 50-character overlap, embedded via `sentence-transformers/all-MiniLM-L6-v2`, and indexed in ChromaDB with a strict cosine distance threshold of 1.1 to filter irrelevant noise. Concurrently, real-world context is fetched via Tavily Web Search.*
>
> *Before the report is finalized, the graph reaches a Human-in-the-Loop (HITL) gate compiled with `interrupt_before=['verifier']`. Execution state is serialized to a local SQLite database (`data/checkpoints.db`) using LangGraph's `SqliteSaver`, keyed by task ID. If the server crashes or the operator steps away, the thread persists on disk. Upon human approval via our React 19 dashboard, execution resumes deterministically using LangGraph's `Command(resume=True)`.*
>
> *The resumed state enters the Verifier Agent, which cross-checks all quantitative claims and unit conversions against source citations, flagging unsupported statements before the Reporter Agent writes the final intelligence report to disk.*
>
> *To protect against CUDA OOM errors on our 4GB GPU, we enforced serialized inference with token caps between 384 and 768 tokens, achieving 100% execution stability across all 67 backend and 8 frontend tests."*

---

## 3. Key Architectural Decisions & Trade-Off Defenses

### Decision 1: Why LangGraph instead of AutoGen or CrewAI?
- **Defense**: AutoGen and CrewAI rely heavily on conversational multi-agent loops and agent-to-agent chatter. This chatter is non-deterministic, difficult to audit, and consumes excessive tokens—a critical flaw when running 4B models on local GPUs. LangGraph treats workflows as a deterministic state machine with explicit schema validation, conditional edge branching, and first-class persistent checkpointing. We get predictable state transitions and reproducible execution.

### Decision 2: Why 5 specialized agents instead of 1 monolithic prompt?
- **Defense**: A single prompt asking an LLM to "plan, research, analyze, verify, and write a report" suffers from prompt distraction and attention attenuation. By partitioning the task into five sequential nodes:
  1. Each agent operates with a focused prompt and a smaller context window.
  2. The Verifier acts as an adversarial check on the Analyst, catching hallucinations that the generator would otherwise reinforce.
  3. Intermediate outputs can be inspected, audited, or paused for human governance.

### Decision 3: Why local Ollama on consumer hardware instead of OpenAI / Anthropic APIs?
- **Defense**: Enterprise intelligence frequently handles sensitive, confidential, or proprietary internal documents that cannot leave the local network for legal or compliance reasons. Local execution also guarantees zero API cost, infinite scalability without rate limits, and full operational control.

### Decision 4: Why SQLite for checkpoints instead of Redis or Postgres?
- **Defense**: SQLite requires zero external daemon processes, has zero network latency, and stores the entire database as a single file on disk (`data/checkpoints.db`). For desktop and single-node enterprise deployments, SQLite handles high-throughput serialization with ACID compliance and eliminates infrastructure overhead.

### Decision 5: Why ChromaDB + Sentence-Transformers locally?
- **Defense**: Sentence-Transformers (`all-MiniLM-L6-v2`) runs efficiently on either host CPU or 4GB GPU with minimal memory overhead (under 300MB). ChromaDB provides a lightweight, embedded vector store with persistence to disk without requiring an external vector service or cloud subscription.

---

## 4. 20 Deep-Dive Technical Interview Q&As

### Q1: How does LangGraph handle state mutation across nodes?
**Answer**: LangGraph uses an append/update dictionary pattern defined by `OrchestraAgentState`. Each node function is pure with respect to the input state—it receives the current dictionary snapshot and returns a partial dictionary containing only the keys it wishes to update or append. LangGraph merges these updates into the shared thread state and automatically creates a new checkpoint commit in `data/checkpoints.db`.

### Q2: How does persistent checkpointing survive server reboots during an HITL pause?
**Answer**: When compiled with `checkpointer=SqliteSaver(conn)` and `interrupt_before=["verifier"]`, LangGraph pauses the execution loop when reaching the Verifier node and serializes the complete channel state, thread config, and next-node pointer into the SQLite `checkpoints` table. When the server restarts, the API receives a POST request to `/api/approvals/{id}/decide`. The service re-instantiates the graph with the same SQLite connection and calls `resume_task_workflow(task_id)`, which passes `Command(resume=True)` to the thread ID. LangGraph inspects the checkpoint, rehydrates the memory state, and executes `verifier` without rerunning earlier nodes.

### Q3: What happens when an operator rejects a task at the approval gate?
**Answer**: If rejected, `reject_task_workflow(task_id)` updates the `Approval` record to `rejected`, updates `Task.status` to `failed`, and appends an entry to the task's audit log. In the frontend, the Agent Workspace detects this governance event and displays an amber "Human Rejected" status badge while cleanly marking the Verifier and Reporter nodes as skipped with 0ms duration, guaranteeing no misleading execution logs.

### Q4: How do you prevent duplicate AgentRun records during task retries or resumptions?
**Answer**: If a task is retried after a failure or interrupted by an approval pause, multiple `AgentRun` records exist in SQLite for the same agent name. In the frontend `AgentWorkspacePage.tsx`, we implement `getLatestAttemptRuns()`: we sort runs by `started_at` ascending and group them into attempts based on Planner node executions. The workspace always displays the latest attempt's records for active metrics while providing a dropdown selector to inspect historical prior attempts.

### Q5: How does the Verifier Agent detect numerical discrepancies without a hardcoded math solver?
**Answer**: The Verifier uses an adversarial prompt design paired with deterministic regex-based metric extraction. It parses the Analyst's quantitative statements, extracts values and units (e.g., `7,300 ppm` vs `0.73%`), locates the corresponding raw evidence chunk in `state['research_results']`, and verifies whether the unit conversion is mathematically sound. In Task 3 of our benchmark, this caught a single-agent trap where `7,300 ppm` was falsely equated to `7.3%`.

### Q6: Why serialize LLM inference instead of running parallel async agent calls?
**Answer**: Our hardware environment is an NVIDIA RTX 2050 with 4096 MiB VRAM. Loading the `qwen3.5:4b` quantized model takes ~2.8 GB VRAM. If two agents executed concurrent inference prompts simultaneously, the Ollama daemon or CUDA driver would experience memory contention, host paging, or immediate CUDA OOM crashes. Serializing agent execution guarantees peak VRAM never exceeds 3.2 GB, yielding 100% stability.

### Q7: How does RAG chunking and similarity cutoff prevent context contamination?
**Answer**: In `backend/app/rag/chroma_service.py`, we apply a recursive character splitter with 500 characters and 50 character overlap. When querying ChromaDB, we enforce a distance threshold `distance <= 1.1`. Any vector matches beyond this cosine distance are discarded. This prevents the Researcher from injecting irrelevant chunks from other unrelated documents into the agent's context.

### Q8: What happens if external Tavily search fails or has no API key configured?
**Answer**: Orchestra AI follows a graceful degradation strategy in `backend/app/graph/nodes/researcher.py`. If the `TAVILY_API_KEY` is empty, expired, or rate-limited, the Researcher logs a diagnostic warning and proceeds using only local ChromaDB document retrieval. The pipeline never throws an unhandled exception or terminates early due to external web search failure.

### Q9: How did you design the Single-Agent baseline to ensure a fair benchmark?
**Answer**: In `backend/app/evaluation/baseline.py`, the Single-Agent baseline receives the exact same task prompt, task description, and identical retrieved evidence context from ChromaDB and Tavily as the multi-agent pipeline. It runs on the exact same model (`qwen3.5:4b`) and Ollama client. The only difference is architectural: the baseline attempts to plan, analyze, verify, and format the report in a single prompt pass, whereas Orchestra AI uses the 5-node LangGraph pipeline.

### Q10: How do you measure completeness and evidence coverage deterministically?
**Answer**: In `backend/app/evaluation/metrics.py`, each benchmark task defines an empirical `expected_subtopics` checklist and a set of `required_evidence_keys`. The evaluation suite computes:
- **Completeness**: Stemmed token matching between the generated report and the task's required subtopics.
- **Evidence Coverage**: The fraction of retrieved source citations actually referenced and synthesized in the report body.
- **Unsupported Claims**: Ratio of claims marked `flagged` by the verification audit.

### Q11: What are the latency and token overheads of the multi-agent system?
**Answer**: Multi-agent orchestration is not free. In our empirical testing:
- **Latency**: Multi-agent average latency was 204.6 seconds vs 58.4 seconds for single-agent (3.5x slower).
- **Tokens**: Multi-agent consumed 5,820 tokens on average vs 1,142 tokens for single-agent (5.1x higher).
This trade-off is optimal for enterprise compliance, legal research, and scientific analysis where accuracy and auditability supersede real-time speed.

### Q12: How are database transactions managed during long-running background tasks?
**Answer**: FastAPI uses SQLAlchemy with scoped sessions. The HTTP request triggers a background task and immediately returns a `201 Created` or `200 OK` response with task metadata. The background thread opens its own `SessionLocal` database context, records agent runs with explicit commit calls, and closes the session upon node completion. This prevents database connection leaks and long-held locks.

### Q13: How does the frontend stay in sync with background LangGraph execution?
**Answer**: We use TanStack Query v5 with an adaptive polling strategy. When a task has status `in_progress` or `waiting_approval`, the query polls `/api/tasks/{task_id}` every 2,000 milliseconds. As soon as the task transitions to `completed` or `failed`, polling halts automatically.

### Q14: How does the Agent Workspace visually represent the LangGraph DAG?
**Answer**: We use `@xyflow/react` (React Flow) with custom node components representing the 5 agents. Each node dynamically displays:
- Real-time status badges (`completed`, `in_progress`, `pending`, `skipped`).
- Execution duration in milliseconds.
- Animated active pulse borders during active execution.
- Click-to-inspect drawers displaying raw inputs and formatted JSON outputs.

### Q15: How does the platform isolate evaluation runs from production data?
**Answer**: In `backend/app/evaluation/runner.py`, the benchmark runner operates on mock task IDs or isolated test database fixtures without writing to the live `tasks` or `agent_runs` tables in `orchestra.db`. This ensures benchmark runs never pollute the user's dashboard history or metrics.

### Q16: How would you scale Orchestra AI to a multi-node cluster?
**Answer**:
1. Swap `SqliteSaver` for `PostgresSaver` in LangGraph for centralized, distributed checkpointing.
2. Replace local Ollama with a cluster of vLLM or TensorRT-LLM worker nodes behind an API load balancer.
3. Replace ChromaDB with a distributed vector database like Milvus or Qdrant.
4. Use Celery or Redis Streams for asynchronous queueing and multi-worker task distribution.

### Q17: What are the failure modes of the local 4B model (`qwen3.5:4b`)?
**Answer**: Small 4B parameter models are sensitive to prompt length. If a single prompt exceeds ~2,000 tokens, generation speed drops and the model may repeat phrases or drop early instructions. We mitigate this by:
1. Strict `num_predict` caps per agent node (384 to 768 tokens).
2. Truncating retrieved evidence chunks to the top 3 highest-similarity matches.
3. Enforcing structured markdown headers in system prompts.

### Q18: What is the benefit of saving reports to disk in addition to SQLite?
**Answer**: In `backend/app/graph/nodes/reporter.py`, reports are saved both as a relational record in SQLite and as a discrete Markdown file in `data/reports/report_task_<id>.md`. This allows external tools, static site generators, version control systems, or file viewers to consume reports directly without querying the database API.

### Q19: How did you fix the bug where the Agent Workspace showed the oldest execution attempt instead of the newest?
**Answer**: The API returns `AgentRun` records ordered by `started_at` ascending. Initially, the workspace used `runs.find(r => r.agent_name === name)`, which always returned the first (oldest) run. In Phase 4.3.1, we implemented attempt grouping: we slice runs by occurrences of the Planner node to identify distinct attempts, and select the runs from the latest attempt, accurately displaying updated outputs and durations after retries.

### Q20: What was the most technically challenging bug encountered in this project?
**Answer**: Persisting LangGraph checkpoints across process restarts on Windows with SQLite. In-memory savers lost all threads on restart. When switching to `langgraph-checkpoint-sqlite`, SQLite requires serialized thread access and connection management across async tasks. We had to configure the SQLite engine with proper timeout flags (`timeout=30.0`), handle checkpointer table initialization gracefully, and ensure that resumed tasks correctly received the resume command payload without re-triggering the interrupt condition.

