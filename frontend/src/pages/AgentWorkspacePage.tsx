import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { OrchestrationFlow } from '../components/pipeline/OrchestrationFlow';
import { timeAgo } from '../lib/utils';
import {
  Network,
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
  FileText,
  Terminal,
  Activity,
} from 'lucide-react';

interface AgentProfile {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: string[];
  color: string;
  nodeId: string;
}

const AGENTS: AgentProfile[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    role: 'Decomposition & Task Strategy',
    description: 'Analyzes user prompts, breaks them down into subtasks, and generates the execution DAG.',
    icon: GitBranch,
    tools: ['DAG Compiler', 'Task Queue'],
    color: '#8B7CFF',
    nodeId: 'node-planner',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    role: 'Tavily Web & Vector Search',
    description: 'Queries live internet via Tavily and retrieves relevant chunks from local ChromaDB storage.',
    icon: Search,
    tools: ['Tavily Search API', 'ChromaDB Local'],
    color: '#55C7D9',
    nodeId: 'node-researcher',
  },
  {
    id: 'analyst',
    name: 'Analysis Agent',
    role: 'Synthesis & Code Computation',
    description: 'Synthesizes gathered research, computes solutions, and formats structured outputs via Qwen 3.5.',
    icon: Brain,
    tools: ['Qwen 3.5 4B Local', 'JSON Parser'],
    color: '#8B7CFF',
    nodeId: 'node-analyst',
  },
  {
    id: 'verifier',
    name: 'Verification Agent',
    role: 'Fact-Check & Guardrails',
    description: 'Audits answers against source citations, checks invariant safety constraints, and triggers approvals.',
    icon: ShieldCheck,
    tools: ['Citation Auditor', 'HITL Gatekeeper'],
    color: '#36B98A',
    nodeId: 'node-verifier',
  },
  {
    id: 'reporter',
    name: 'Reporter Agent',
    role: 'Markdown Compilation & Export',
    description: 'Compiles verified multi-agent insights into structured Markdown documents and saves to disk.',
    icon: FileText,
    tools: ['Markdown Engine', 'SQLite Store'],
    color: '#E6AA57',
    nodeId: 'node-reporter',
  },
];

export const AgentWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('planner');

  const { data: history } = useQuery({
    queryKey: ['agents-history'],
    queryFn: api.getAgentsHistory,
    refetchInterval: 10000,
  });

  const selectedAgent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[0];
  const SelectedIcon = selectedAgent.icon;

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#252B36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <Network className="w-5 h-5 text-[#8B7CFF]" />
            Agent Workspace &amp; Execution Topology
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Centerpiece multi-agent pipeline: Planner → Researcher → Analyst → Verifier → Reporter.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151922] border border-[#252B36] text-[#E5E7EB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#36B98A]" />
            5 Specialized Nodes Configured
          </span>
          {taskId && (
            <span className="px-2 py-1 rounded bg-[#181D27] text-[#55C7D9] border border-[#252B36] text-[11px]">
              Task: {taskId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Centerpiece: React Flow Interactive Visualization */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Interactive Workflow Architecture (React Flow)
          </span>
          <span className="text-[11px] font-mono text-[#9CA3AF]/60">
            Scroll to zoom • Drag to pan • Click node to inspect
          </span>
        </div>

        <OrchestrationFlow
          height="380px"
          activeNodeId={null} // Non-fabricated: animated only when genuine execution occurs
        />
      </div>

      {/* 5 Specialized Agent Profile Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#E5E7EB]">Agent Fleet Inspection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const isSelected = selectedAgentId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`p-3.5 rounded-lg bg-[#151922] border cursor-pointer transition-all select-none flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#8B7CFF] ring-1 ring-[#8B7CFF]/40 bg-[#181D27]'
                    : 'border-[#252B36] hover:border-[#343C4B]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded bg-[#11141B] border border-[#252B36] flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#8B7CFF]" />
                    </div>
                    <Badge variant="success">Ready</Badge>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-[#E5E7EB]">{agent.name}</h3>
                    <p className="text-[10px] text-[#9CA3AF] font-mono">{agent.role}</p>
                  </div>

                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                <div className="pt-2.5 mt-2 border-t border-[#252B36]/60 flex flex-wrap gap-1">
                  {agent.tools.map((tool, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#11141B] text-[#9CA3AF] border border-[#252B36]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Agent Inspector + Execution Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Agent Details (1/3) */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#252B36]">
            <SelectedIcon className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="text-xs font-semibold text-[#E5E7EB]">
              {selectedAgent.name} Specification
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#9CA3AF]">Core Role</span>
              <p className="font-medium text-[#E5E7EB] text-[11px]">{selectedAgent.role}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#9CA3AF]">Description</span>
              <p className="text-[#9CA3AF] text-[11px] leading-relaxed">{selectedAgent.description}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#9CA3AF]">Assigned Tools</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedAgent.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#11141B] text-[#55C7D9] border border-[#252B36]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#252B36] font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Status:</span>
                <span className="text-[#36B98A] font-semibold">Online / Ready</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Inference Target:</span>
                <span className="text-[#E5E7EB]">qwen3.5:4b (Local)</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Execution State:</span>
                <span className="text-[#9CA3AF]">Idle</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Execution Activity Feed (2/3) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#55C7D9]" />
              Recent Agent Execution History (Database Records)
            </h3>
            <span className="text-[10px] font-mono text-[#9CA3AF]">
              SQLite Log Stream
            </span>
          </div>

          <div className="rounded-lg bg-[#151922] border border-[#252B36] overflow-hidden text-xs">
            {history && history.length > 0 ? (
              <div className="divide-y divide-[#252B36]/60">
                {history.map((run) => (
                  <div key={run.id} className="p-3 hover:bg-[#181D27]/50 transition-colors space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-semibold text-[#E5E7EB]">{run.agent_name}</span>
                      <span className="text-[#9CA3AF]">{timeAgo(run.started_at || run.created_at || '')}</span>
                    </div>
                    {(run.output_data || run.output) && (
                      <p className="text-[11px] text-[#9CA3AF] font-mono truncate">
                        {run.output_data || run.output}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center space-y-1 text-xs text-[#9CA3AF]">
                <Activity className="w-5 h-5 text-[#9CA3AF]/40 mx-auto mb-1" />
                <p className="font-medium text-[#E5E7EB]">No agent execution events recorded yet</p>
                <p className="text-[11px]">
                  When a task runs through LangGraph, genuine execution events and steps appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
