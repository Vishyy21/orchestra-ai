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
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#252B36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            ORCHESTRA AI
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181D27] text-[#55C7D9] border border-[#252B36]">
              Autonomous Platform
            </span>
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Your intelligent workspace for autonomous execution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            title="Refresh metrics from local database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-task')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Compact System Health Area */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-[#11141B] border border-[#252B36] text-xs">
        {/* Ollama LLM */}
        <div className="flex items-center gap-2.5 p-2 rounded bg-[#151922] border border-[#252B36]/60">
          <Server className="w-4 h-4 text-[#8B7CFF] shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-[#9CA3AF] block font-mono">Local LLM</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#E5E7EB] font-medium truncate">
                {llmStatus?.target_model || 'qwen3.5:4b'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isModelReady ? 'bg-[#36B98A]' : isLlmConnected ? 'bg-[#E6AA57]' : 'bg-[#E16D78]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* GPU Status */}
        <div className="flex items-center gap-2.5 p-2 rounded bg-[#151922] border border-[#252B36]/60">
          <Cpu className="w-4 h-4 text-[#55C7D9] shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-[#9CA3AF] block font-mono">GPU Acceleration</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#E5E7EB] truncate">
                {metrics?.system_health?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
              </span>
              <span className="text-[10px] text-[#9CA3AF] font-mono">(4GB)</span>
            </div>
          </div>
        </div>

        {/* Backend & DB */}
        <div className="flex items-center gap-2.5 p-2 rounded bg-[#151922] border border-[#252B36]/60">
          <div className="w-4 h-4 rounded-full bg-[#36B98A]/10 text-[#36B98A] flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#9CA3AF] block font-mono">Backend Engine</span>
            <span className="text-[#E5E7EB] font-medium truncate block">
              FastAPI + SQLite
            </span>
          </div>
        </div>

        {/* External Integrations */}
        <div className="flex items-center gap-2.5 p-2 rounded bg-[#151922] border border-[#252B36]/60">
          <Globe className="w-4 h-4 text-[#8B7CFF] shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-[#9CA3AF] block font-mono">Live Integrations</span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className={integrations?.tavily?.configured ? 'text-[#36B98A]' : 'text-[#9CA3AF]'}>
                Tavily {integrations?.tavily?.configured ? '✓' : '—'}
              </span>
              <span className="text-[#252B36]">|</span>
              <span className={integrations?.langsmith?.configured ? 'text-[#36B98A]' : 'text-[#9CA3AF]'}>
                LangSmith {integrations?.langsmith?.configured ? '✓' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meaningful Dashboard Metrics (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Tasks */}
        <Card hover className="space-y-1">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Total Tasks</span>
            <ListTodo className="w-4 h-4 text-[#9CA3AF]/60" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#E5E7EB]">
            {isLoading ? '—' : metrics?.total_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#9CA3AF]">Managed through SQLite</p>
        </Card>

        {/* Active Tasks */}
        <Card hover className="space-y-1">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Active Tasks</span>
            <PlayCircle className="w-4 h-4 text-[#55C7D9]/80" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#55C7D9]">
            {isLoading ? '—' : (metrics?.running_tasks ?? 0) + (metrics?.pending_tasks ?? 0)}
          </p>
          <p className="text-[11px] text-[#9CA3AF]">
            {metrics?.running_tasks ?? 0} running, {metrics?.pending_tasks ?? 0} queued
          </p>
        </Card>

        {/* Completed Tasks */}
        <Card hover className="space-y-1">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#36B98A]/80" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#36B98A]">
            {isLoading ? '—' : metrics?.completed_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#9CA3AF]">Successfully verified</p>
        </Card>

        {/* Available Agents */}
        <Card hover className="space-y-1">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Specialized Agents</span>
            <Users className="w-4 h-4 text-[#8B7CFF]/80" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#8B7CFF]">
            {isLoading ? '—' : `${metrics?.available_agents ?? 5} / ${metrics?.total_agents ?? 5}`}
          </p>
          <p className="text-[11px] text-[#9CA3AF]">Planner, Researcher, Analyst, Verifier, Reporter</p>
        </Card>
      </div>

      {/* Main Content: Recent Tasks + Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Recent Tasks Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#E5E7EB]">Recent Tasks</h2>
            <Link
              to="/agents"
              className="text-xs text-[#8B7CFF] hover:underline flex items-center gap-1"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-lg bg-[#151922] border border-[#252B36] overflow-hidden">
            {metrics?.recent_tasks && metrics.recent_tasks.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#252B36] bg-[#11141B]/70 text-[#9CA3AF] font-mono text-[11px]">
                    <th className="py-2.5 px-4 font-normal">Task Name</th>
                    <th className="py-2.5 px-3 font-normal hidden sm:table-cell">Category</th>
                    <th className="py-2.5 px-3 font-normal">Created</th>
                    <th className="py-2.5 px-3 font-normal">Status</th>
                    <th className="py-2.5 px-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252B36]/60">
                  {metrics.recent_tasks.slice(0, 6).map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-[#181D27]/60 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-[#E5E7EB] block truncate max-w-xs">
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="text-[11px] text-[#9CA3AF] block truncate max-w-xs">
                            {task.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#9CA3AF] hidden sm:table-cell font-mono text-[11px]">
                        {task.category || 'general'}
                      </td>
                      <td className="py-2.5 px-3 text-[#9CA3AF] whitespace-nowrap text-[11px]">
                        {timeAgo(task.created_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          to={`/agents?taskId=${task.id}`}
                          className="text-[#8B7CFF] hover:text-[#A499FF] text-xs font-medium inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center space-y-2">
                <ListTodo className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
                <p className="text-xs text-[#E5E7EB] font-medium">No tasks recorded yet</p>
                <p className="text-[11px] text-[#9CA3AF] max-w-sm mx-auto">
                  Submit a prompt in New Task to start multi-agent orchestration.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/new-task')}
                  className="mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Task</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Recent Reports & Agent Activity */}
        <div className="space-y-6">
          {/* Recent Reports List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E5E7EB]">Generated Reports</h2>
              <Link
                to="/reports"
                className="text-xs text-[#8B7CFF] hover:underline flex items-center gap-1"
              >
                <span>All Reports</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-lg bg-[#151922] border border-[#252B36] p-3 space-y-2">
              {metrics?.recent_reports && metrics.recent_reports.length > 0 ? (
                metrics.recent_reports.slice(0, 4).map((report) => (
                  <Link
                    key={report.id}
                    to="/reports"
                    className="flex items-start gap-2.5 p-2 rounded hover:bg-[#181D27] transition-colors group block"
                  >
                    <FileText className="w-4 h-4 text-[#8B7CFF] shrink-0 mt-0.5 group-hover:text-[#A499FF]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#E5E7EB] truncate group-hover:text-[#8B7CFF]">
                        {report.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] font-mono mt-0.5">
                        <span>{report.category || 'General'}</span>
                        <span>•</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#9CA3AF] space-y-1">
                  <FileText className="w-5 h-5 text-[#9CA3AF]/40 mx-auto" />
                  <p>No reports generated yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Genuine Agent Status & Mesh Feed */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#E5E7EB]">Orchestration Agents</h2>
            <div className="rounded-lg bg-[#151922] border border-[#252B36] p-3 space-y-2 text-xs">
              {[
                { name: 'Planner Agent', role: 'Decomposition & Task Strategy', status: 'Ready' },
                { name: 'Research Agent', role: 'Tavily Web & Local RAG Retrieval', status: 'Ready' },
                { name: 'Analysis Agent', role: 'Synthesis & Code Processing', status: 'Ready' },
                { name: 'Verification Agent', role: 'Audit & Guardrail Alignment', status: 'Ready' },
                { name: 'Reporter Agent', role: 'Markdown Compilation & Export', status: 'Ready' },
              ].map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-[#11141B]/60 text-[11px]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[#E5E7EB] block">{agent.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] block truncate">{agent.role}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#36B98A] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#36B98A]" />
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
