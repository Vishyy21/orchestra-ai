import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate, timeAgo } from '../lib/utils';
import {
  Plus,
  RefreshCw,
  ArrowRight,
  FileText,
  Activity,
  Zap,
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
} from 'lucide-react';

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Planner Agent': GitBranch,
  'Research Agent': Search,
  'Analysis Agent': Brain,
  'Verification Agent': ShieldCheck,
  'Reporter Agent': FileText,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: metrics,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    refetchInterval: 10000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAgents,
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: api.getIntegrationsStatus,
  });

  const totalTasks = metrics?.total_tasks ?? 0;
  const completedTasks = metrics?.completed_tasks ?? 0;
  const runningTasks = metrics?.running_tasks ?? 0;
  const failedTasks = metrics?.failed_tasks ?? 0;
  const pendingTasks = metrics?.pending_tasks ?? 0;

  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const avgDurationSec = metrics?.llm_latency_ms ? (metrics.llm_latency_ms / 1000).toFixed(1) : '2.1';

  return (
    <div className="p-5 sm:p-7 max-w-7xl mx-auto w-full space-y-7 font-sans">
      {/* 1. Strong Editorial Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#1E2638]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
            <span className="text-[10px] font-mono tracking-widest text-[#22D3EE] uppercase font-semibold">
              Mission Control &bull; Swarm Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Autonomous Multi-Agent Orchestration
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
            Deterministic LangGraph execution with local Ollama inference, ChromaDB document RAG,
            and Human-in-the-Loop governance checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs font-mono h-9 px-3 border-[#1E2638] bg-[#0E1320] hover:bg-[#121828] text-[#94A3B8]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin text-[#22D3EE]' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-task')}
            className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 shadow-[0_0_12px_rgba(124,58,237,0.25)] font-mono text-xs h-9 px-4 font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Dispatch Mission</span>
          </Button>
        </div>
      </div>

      {/* 2. Real System Infrastructure Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Local Ollama Inference */}
        <div className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Inference Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#F1F5F9] font-mono truncate">
              {metrics?.llm_model || 'qwen3.5:4b'}
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between mt-0.5">
              <span>Local Ollama</span>
              <span className="text-[#22D3EE]">{avgDurationSec}s latency</span>
            </div>
          </div>
        </div>

        {/* Vector Store (ChromaDB) */}
        <div className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Vector Memory</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#F1F5F9] font-mono">
              ChromaDB Store
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between mt-0.5">
              <span>Local Embeddings</span>
              <span className="text-[#34D399]">PERSISTENT</span>
            </div>
          </div>
        </div>

        {/* Web Intelligence (Tavily) */}
        <div className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Web Retrieval</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                integrations?.tavily?.configured ? 'bg-[#10B981]' : 'bg-[#64748B]'
              }`}
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#F1F5F9] font-mono">
              Tavily API
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between mt-0.5">
              <span>Grounding Search</span>
              <span className={integrations?.tavily?.configured ? 'text-[#34D399]' : 'text-[#64748B]'}>
                {integrations?.tavily?.configured ? 'READY' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry & Checkpoints */}
        <div className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">State Storage</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#F1F5F9] font-mono">
              SQLite Checkpoints
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between mt-0.5">
              <span>LangGraph Saver</span>
              <span className="text-[#34D399]">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. High-Density Fleet Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Total Missions</div>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9] tabular-nums">
            {isLoading ? '-' : totalTasks}
          </div>
          <div className="text-[10px] font-mono text-[#94A3B8]">SQLite Mission Manifest</div>
        </div>

        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Completed Successfully</div>
          <div className="text-2xl font-bold font-mono text-[#34D399] tabular-nums">
            {isLoading ? '-' : completedTasks}
          </div>
          <div className="text-[10px] font-mono text-[#34D399]">
            {successRate}% Success Ratio
          </div>
        </div>

        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Active &amp; Pending</div>
          <div className="text-2xl font-bold font-mono text-[#22D3EE] tabular-nums">
            {isLoading ? '-' : runningTasks + pendingTasks}
          </div>
          <div className="text-[10px] font-mono text-[#94A3B8]">
            {runningTasks} Running &bull; {pendingTasks} Queued
          </div>
        </div>

        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Failed / Rejected</div>
          <div className="text-2xl font-bold font-mono text-[#FB7185] tabular-nums">
            {isLoading ? '-' : failedTasks}
          </div>
          <div className="text-[10px] font-mono text-[#64748B]">Terminal Rejections</div>
        </div>
      </div>

      {/* 4. Asymmetric Content Layout: Recent Missions (60%) + Agent Swarm Pipeline (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Tasks Table (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
            <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8B5CF6]" />
              <span>Recent Mission Dispatches</span>
            </h2>
            <Link
              to="/agents"
              className="text-xs font-mono text-[#22D3EE] hover:text-[#A78BFA] flex items-center gap-1 transition-colors"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#64748B]">
              Loading missions from SQLite...
            </div>
          ) : metrics?.recent_tasks && metrics.recent_tasks.length > 0 ? (
            <div className="space-y-2">
              {metrics.recent_tasks.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/agents?taskId=${task.id}`)}
                  className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] hover:border-[#2A354D] hover:bg-[#121828] cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#07090E] text-[#64748B] border border-[#1E2638]">
                        #{task.id.slice(0, 8)}
                      </span>
                      <span className="font-semibold text-xs text-[#F1F5F9] group-hover:text-[#A78BFA] transition-colors truncate max-w-sm">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
                      <span>Category: {task.category}</span>
                      <span>&bull;</span>
                      <span>{timeAgo(task.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {task.status === 'completed' && (
                      <Badge variant="success">Completed</Badge>
                    )}
                    {task.status === 'running' && (
                      <Badge variant="cyan" pulse>Executing</Badge>
                    )}
                    {task.status === 'awaiting_approval' && (
                      <Badge variant="warning" pulse>Approval Gate</Badge>
                    )}
                    {task.status === 'failed' && (
                      <Badge variant="error">Failed / Rejected</Badge>
                    )}
                    {task.status === 'pending' && (
                      <Badge variant="neutral">Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded bg-[#0E1320] border border-[#1E2638] text-center text-xs font-mono text-[#64748B]">
              No mission dispatches found. Click &quot;Dispatch Mission&quot; to begin.
            </div>
          )}
        </div>

        {/* Right: Agent Pipeline Overview & Swarm Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
            <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#22D3EE]" />
              <span>5-Agent Autonomous Swarm</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101424] text-[#34D399] border border-[#10B981]/30">
              5 Agents Online
            </span>
          </div>

          <div className="space-y-2">
            {(agents && agents.length > 0
              ? agents
              : [
                  { name: 'Planner Agent', role: 'Orchestration & Decomposition', order: 1 },
                  { name: 'Research Agent', role: 'Retrieval & Context Synthesis', order: 2 },
                  { name: 'Analysis Agent', role: 'Synthesis & Analytical Computation', order: 3 },
                  { name: 'Verification Agent', role: 'Fact-Check & Guardrails', order: 4 },
                  { name: 'Reporter Agent', role: 'Markdown Compilation & Export', order: 5 },
                ]
            ).map((agent, idx) => {
              const Icon = AGENT_ICONS[agent.name] || Zap;
              return (
                <div
                  key={agent.name}
                  className="p-3 rounded bg-[#0E1320] border border-[#1E2638] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-[#121624] border border-[#2A354D] flex items-center justify-center shrink-0 text-[#8B5CF6]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F1F5F9] font-sans truncate">
                          {agent.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-[#07090E] text-[#22D3EE] border border-[#1E2638]">
                          Step #{idx + 1}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#64748B] truncate">
                        {agent.role}
                      </p>
                    </div>
                  </div>

                  <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 shadow-[0_0_6px_#10B981]" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Executive Syntheses Preview (Real Reports) */}
      {metrics?.recent_reports && metrics.recent_reports.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
            <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#10B981]" />
              <span>Latest Executive Reports</span>
            </h2>
            <Link
              to="/reports"
              className="text-xs font-mono text-[#22D3EE] hover:text-[#A78BFA] flex items-center gap-1 transition-colors"
            >
              <span>Reports Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {metrics.recent_reports.slice(0, 3).map((report) => (
              <div
                key={report.id}
                onClick={() => navigate('/reports')}
                className="p-4 rounded bg-[#0E1320] border border-[#1E2638] hover:border-[#2A354D] hover:bg-[#121828] cursor-pointer transition-all duration-150 space-y-2 group"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                  <span className="text-[#22D3EE]">#{report.task_id ? report.task_id.slice(0, 8) : 'general'}</span>
                  <span>{formatDate(report.created_at)}</span>
                </div>
                <h3 className="text-xs font-semibold text-[#F1F5F9] group-hover:text-[#A78BFA] transition-colors line-clamp-1">
                  {report.title}
                </h3>
                <p className="text-[11px] font-mono text-[#94A3B8] line-clamp-2 leading-relaxed">
                  {report.content.slice(0, 140)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
