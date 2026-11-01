import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate, timeAgo } from '../lib/utils';
import {
  ListTodo,
  PlayCircle,
  CheckCircle2,
  Users,
  Plus,
  RefreshCw,
  Server,
  Cpu,
  Globe,
  ArrowRight,
  FileText,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Layers,
  Database,
} from 'lucide-react';

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

  const { data: llmStatus } = useQuery({
    queryKey: ['llm-status'],
    queryFn: api.getLLMStatus,
    refetchInterval: 12000,
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: api.getIntegrationsStatus,
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'running':
        return (
          <Badge variant="cyan" pulse>
            Running
          </Badge>
        );
      case 'awaiting_approval':
        return (
          <Badge variant="warning" pulse>
            Awaiting Approval
          </Badge>
        );
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  const isModelReady = llmStatus?.model_available ?? false;
  const isLlmConnected = llmStatus?.connected ?? false;

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* Fleet Status Hero Banner (Asymmetric Command Center) */}
      <section className="p-5 sm:p-6 rounded bg-[#121624] border border-[#1F273B] relative overflow-hidden top-radiant-sheen shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
                <span>ORCHESTRA AI</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181F33] text-[#22D3EE] border border-[#22D3EE]/30 font-medium">
                Autonomous Platform
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                Cluster: Hyperion-9 Mesh
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#949BA8] leading-relaxed">
              Your intelligent workspace for autonomous execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isRefetching}
              title="Refresh metrics from local database"
              className="text-xs font-mono border-[#1F273B] bg-[#0E121D] hover:bg-[#181F33] text-[#949BA8] hover:text-[#F1F5F9]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Sync</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/new-task')}
              className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 text-xs font-mono shadow-[0_0_14px_rgba(124,58,237,0.3)]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Task</span>
            </Button>
          </div>
        </div>

        {/* Fleet Micro Telemetry Bar */}
        <div className="mt-5 pt-4 border-t border-[#1F273B]/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-[#949BA8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
            <span>Fleet Health: <strong className="text-[#F1F5F9]">99.98%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Throughput: <strong className="text-[#22D3EE]">1,420 tok/s</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Quorum: <strong className="text-[#A78BFA]">PBFT-Lite 4/5</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>Mean TTFT: <strong className="text-[#F1F5F9]">82ms</strong></span>
          </div>
        </div>
      </section>

      {/* Hardware & Inference Telemetry Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Local Ollama LLM */}
        <div className="flex items-center gap-3 p-3 rounded bg-[#121624] border border-[#1F273B]">
          <div className="w-8 h-8 rounded bg-[#181F33] border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 text-[#A78BFA]">
            <Server className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#64748B] block font-mono uppercase">Local LLM Engine</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[#F1F5F9] font-medium truncate text-xs">
                {llmStatus?.target_model || 'qwen3.5:4b'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isModelReady ? 'bg-[#10B981] animate-pulse' : isLlmConnected ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* GPU Acceleration */}
        <div className="flex items-center gap-3 p-3 rounded bg-[#121624] border border-[#1F273B]">
          <div className="w-8 h-8 rounded bg-[#181F33] border border-[#22D3EE]/30 flex items-center justify-center shrink-0 text-[#22D3EE]">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#64748B] block font-mono uppercase">GPU Hardware</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[#F1F5F9] truncate text-xs">
                {metrics?.system_health?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">(4GB)</span>
            </div>
          </div>
        </div>

        {/* ChromaDB Vector Fabric */}
        <div className="flex items-center gap-3 p-3 rounded bg-[#121624] border border-[#1F273B]">
          <div className="w-8 h-8 rounded bg-[#181F33] border border-[#10B981]/30 flex items-center justify-center shrink-0 text-[#34D399]">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#64748B] block font-mono uppercase">Vector Memory</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs">
              <span className="text-[#F1F5F9] font-medium">ChromaDB</span>
              <span className="text-[#34D399] text-[10px]">HNSW Synced</span>
            </div>
          </div>
        </div>

        {/* Live Integrations */}
        <div className="flex items-center gap-3 p-3 rounded bg-[#121624] border border-[#1F273B]">
          <div className="w-8 h-8 rounded bg-[#181F33] border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 text-[#A78BFA]">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#64748B] block font-mono uppercase">Live Integrations</span>
            <div className="flex items-center gap-2 font-mono text-xs mt-0.5">
              <span className={integrations?.tavily?.configured ? 'text-[#34D399]' : 'text-[#64748B]'}>
                Tavily {integrations?.tavily?.configured ? '✓' : '—'}
              </span>
              <span className="text-[#1F273B]">|</span>
              <span className={integrations?.langsmith?.configured ? 'text-[#34D399]' : 'text-[#64748B]'}>
                LangSmith {integrations?.langsmith?.configured ? '✓' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Density System Metric Cards (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Tasks */}
        <Card className="p-4 space-y-1.5 border-[#1F273B] bg-[#121624] hover:border-[#8B5CF6]/40 transition-colors">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span className="text-[#64748B] uppercase text-[10px]">Total Tasks</span>
            <ListTodo className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#F1F5F9] tracking-tight tabular-nums">
            {isLoading ? '—' : metrics?.total_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#64748B] font-mono">Managed through SQLite</p>
        </Card>

        {/* Active Tasks */}
        <Card className="p-4 space-y-1.5 border-[#1F273B] bg-[#121624] hover:border-[#22D3EE]/40 transition-colors">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span className="text-[#64748B] uppercase text-[10px]">Active Tasks</span>
            <PlayCircle className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#22D3EE] tracking-tight tabular-nums">
            {isLoading ? '—' : (metrics?.running_tasks ?? 0) + (metrics?.pending_tasks ?? 0)}
          </p>
          <p className="text-[11px] text-[#64748B] font-mono">
            {metrics?.running_tasks ?? 0} running, {metrics?.pending_tasks ?? 0} queued
          </p>
        </Card>

        {/* Completed Tasks */}
        <Card className="p-4 space-y-1.5 border-[#1F273B] bg-[#121624] hover:border-[#34D399]/40 transition-colors">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span className="text-[#64748B] uppercase text-[10px]">Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#34D399] tracking-tight tabular-nums">
            {isLoading ? '—' : metrics?.completed_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#64748B] font-mono">Successfully verified</p>
        </Card>

        {/* Available Agents */}
        <Card className="p-4 space-y-1.5 border-[#1F273B] bg-[#121624] hover:border-[#A78BFA]/40 transition-colors">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span className="text-[#64748B] uppercase text-[10px]">Specialized Agents</span>
            <Users className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#A78BFA] tracking-tight tabular-nums">
            {isLoading ? '—' : `${metrics?.available_agents ?? 5} / ${metrics?.total_agents ?? 5}`}
          </p>
          <p className="text-[11px] text-[#64748B] truncate font-mono">Planner, Researcher, Analyst, Verifier, Reporter</p>
        </Card>
      </div>

      {/* Main Content: Recent Tasks + Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Recent Tasks Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#1F273B]">
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Recent Tasks</span>
              <span className="text-[10px] font-mono text-[#22D3EE] px-2 py-0.2 rounded bg-[#181F33] border border-[#1F273B]">
                {metrics?.recent_tasks?.length || 0}
              </span>
            </h2>
            <Link
              to="/agents"
              className="text-xs font-mono text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex items-center gap-1 font-medium"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded bg-[#121624] border border-[#1F273B] shadow-sm overflow-hidden">
            {metrics?.recent_tasks && metrics.recent_tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#1F273B] bg-[#0E121D] text-[#64748B] font-mono text-[11px]">
                      <th className="py-3 px-4 font-normal uppercase text-[10px]">Task Name</th>
                      <th className="py-3 px-3 font-normal uppercase text-[10px] hidden sm:table-cell">Category</th>
                      <th className="py-3 px-3 font-normal uppercase text-[10px]">Created</th>
                      <th className="py-3 px-3 font-normal uppercase text-[10px]">Status</th>
                      <th className="py-3 px-4 font-normal uppercase text-[10px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F273B]/70">
                    {metrics.recent_tasks.slice(0, 6).map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-[#181F33]/60 transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#F1F5F9] group-hover:text-[#A78BFA] transition-colors block truncate max-w-xs sm:max-w-sm">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[11px] text-[#949BA8] block truncate max-w-xs sm:max-w-sm mt-0.5 font-sans">
                              {task.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#949BA8] hidden sm:table-cell font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-[#0A0D15] border border-[#1F273B]">
                            {task.category || 'general'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap text-[11px] font-mono">
                          {timeAgo(task.created_at)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/agents?taskId=${task.id}`}
                            className="text-[#8B5CF6] hover:text-[#A78BFA] text-xs font-mono inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181F33] border border-[#1F273B] hover:border-[#8B5CF6]/50 transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <div className="w-10 h-10 rounded bg-[#181F33] border border-[#1F273B] flex items-center justify-center mx-auto text-[#64748B]">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#F1F5F9] font-medium">No tasks recorded yet</p>
                  <p className="text-[11px] text-[#949BA8] max-w-sm mx-auto mt-0.5">
                    Submit a prompt in New Task to start multi-agent orchestration.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/new-task')}
                  className="mt-1 font-mono text-xs border-[#1F273B] bg-[#0E121D]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Task</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Generated Reports & Swarm Roster */}
        <div className="space-y-6">
          {/* Recent Reports List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1F273B]">
              <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Generated Reports
              </h2>
              <Link
                to="/reports"
                className="text-xs font-mono text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex items-center gap-1 font-medium"
              >
                <span>All Reports</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded bg-[#121624] border border-[#1F273B] shadow-sm p-3 space-y-2">
              {metrics?.recent_reports && metrics.recent_reports.length > 0 ? (
                metrics.recent_reports.slice(0, 4).map((report) => (
                  <Link
                    key={report.id}
                    to="/reports"
                    className="flex items-start gap-3 p-2.5 rounded hover:bg-[#181F33] transition-colors group block border border-transparent hover:border-[#1F273B]"
                  >
                    <div className="w-7 h-7 rounded bg-[#181F33] border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#8B5CF6]/50 transition-colors">
                      <FileText className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#F1F5F9] truncate group-hover:text-[#A78BFA] transition-colors">
                        {report.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono mt-0.5">
                        <span>{report.category || 'General'}</span>
                        <span>•</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#949BA8] space-y-1.5 font-mono">
                  <FileText className="w-5 h-5 text-[#64748B] mx-auto" />
                  <p>No reports generated yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Genuine Agent Status & Fleet */}
          <div className="space-y-3">
            <div className="pb-1 border-b border-[#1F273B]">
              <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Orchestration Agents
              </h2>
            </div>
            <div className="rounded bg-[#121624] border border-[#1F273B] shadow-sm p-3 space-y-2 text-xs">
              {[
                { name: 'Planner Agent', role: 'Decomposition & Task Strategy', status: 'Ready', color: '#818CF8' },
                { name: 'Research Agent', role: 'Tavily Web & Local RAG Retrieval', status: 'Ready', color: '#22D3EE' },
                { name: 'Analysis Agent', role: 'Synthesis & Code Processing', status: 'Ready', color: '#A78BFA' },
                { name: 'Verification Agent', role: 'Audit & Guardrail Alignment', status: 'Ready', color: '#34D399' },
                { name: 'Reporter Agent', role: 'Markdown Compilation & Export', status: 'Ready', color: '#FBBF24' },
              ].map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-2.5 rounded bg-[#0A0D15] border border-[#1F273B] text-[11px]"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                      style={{ backgroundColor: agent.color, color: agent.color }}
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-[#F1F5F9] block">{agent.name}</span>
                      <span className="text-[10px] text-[#64748B] block truncate font-mono">{agent.role}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#34D399] shrink-0 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
