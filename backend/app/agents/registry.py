"""Agent registry defining core specialized autonomous agents in ORCHESTRA AI."""

from typing import List, Dict, Any
from app.schemas.agent import AgentCard

SPECIALIZED_AGENTS: List[Dict[str, Any]] = [
    {
        "name": "Planner Agent",
        "role": "Orchestration & Decomposition",
        "description": "Deconstructs complex user directives into structured Directed Acyclic Graphs (DAGs) and assigns discrete subtasks to domain agents.",
        "capabilities": [
            "Goal decomposition",
            "Dependency topological sorting",
            "Dynamic replanning",
            "Execution tree synthesis",
        ],
        "status": "ready",
        "icon": "GitBranch",
        "color": "#8B7CFF",  # Iris Purple
        "order": 1,
    },
    {
        "name": "Research Agent",
        "role": "Retrieval & Context Synthesis",
        "description": "Performs dense semantic vector retrieval over indexed knowledge base corpuses and live Tavily web intelligence.",
        "capabilities": [
            "Dense vector search",
            "Tavily web retrieval",
            "RAG corpus synthesis",
            "Cross-source entity extraction",
        ],
        "status": "ready",
        "icon": "Search",
        "color": "#55C7D9",  # Cyan
        "order": 2,
    },
    {
        "name": "Analysis Agent",
        "role": "Synthesis & Analytical Computation",
        "description": "Synthesizes gathered research, analyzes technical tradeoffs, computes code or quantitative solutions, and structures analytical insights.",
        "capabilities": [
            "Tradeoff analysis",
            "Quantitative synthesis",
            "Code and data computation",
            "Pattern recognition",
        ],
        "status": "ready",
        "icon": "Brain",
        "color": "#8B7CFF",  # Iris
        "order": 3,
    },
    {
        "name": "Verification Agent",
        "role": "Fact-Check & Guardrails",
        "description": "Audits answers against source citations, checks invariant safety, tests constraints, and gates human approval if required.",
        "capabilities": [
            "Citation cross-validation",
            "Invariant checking",
            "Security & safety audit",
            "Human approval gating",
        ],
        "status": "ready",
        "icon": "ShieldCheck",
        "color": "#36B98A",  # Emerald Green
        "order": 4,
    },
    {
        "name": "Reporter Agent",
        "role": "Markdown Compilation & Export",
        "description": "Compiles verified multi-agent insights into polished, publication-ready executive Markdown reports and stores artifacts.",
        "capabilities": [
            "Executive summary synthesis",
            "Markdown report generation",
            "Artifact archiving",
            "Structured export",
        ],
        "status": "ready",
        "icon": "FileText",
        "color": "#E6AA57",  # Amber / Gold
        "order": 5,
    },
]


def get_registered_agents() -> List[AgentCard]:
    """Retrieve the registered agent definitions."""
    return [AgentCard(**agent) for agent in SPECIALIZED_AGENTS]
