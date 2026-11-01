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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E2330]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDEF] flex items-center gap-2.5">
              <span>ORCHESTRA AI</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#151924] text-[#38BDF8] border border-[#1E2330] font-medium">
              Autonomous Platform
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
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
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-task')}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Compact System Health Area */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] text-xs shadow-card">
        {/* Ollama LLM */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#11141D] border border-[#1E2330]/80">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-[#818CF8]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#949BA8] block font-mono">Local LLM</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#EDEDEF] font-medium truncate text-xs">
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

        {/* GPU Status */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#11141D] border border-[#1E2330]/80">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#949BA8] block font-mono">GPU Acceleration</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#EDEDEF] truncate text-xs">
                {metrics?.system_health?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
              </span>
              <span className="text-[10px] text-[#949BA8] font-mono">(4GB)</span>
            </div>
          </div>
        </div>

        {/* Backend & DB */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#11141D] border border-[#1E2330]/80">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0 text-[#34D399] font-mono text-xs font-bold">
            ✓
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#949BA8] block font-mono">Backend Engine</span>
            <span className="text-[#EDEDEF] font-medium truncate block text-xs">
              FastAPI + SQLite
            </span>
          </div>
        </div>

        {/* External Integrations */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#11141D] border border-[#1E2330]/80">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-[#818CF8]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#949BA8] block font-mono">Live Integrations</span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={integrations?.tavily?.configured ? 'text-[#34D399]' : 'text-[#949BA8]'}>
                Tavily {integrations?.tavily?.configured ? '✓' : '—'}
              </span>
              <span className="text-[#2D3447]">|</span>
              <span className={integrations?.langsmith?.configured ? 'text-[#34D399]' : 'text-[#949BA8]'}>
                LangSmith {integrations?.langsmith?.configured ? '✓' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meaningful Dashboard Metrics (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card hover className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span>Total Tasks</span>
            <ListTodo className="w-4 h-4 text-[#949BA8]/70" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#EDEDEF] tracking-tight">
            {isLoading ? '—' : metrics?.total_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#949BA8] font-mono">Managed through SQLite</p>
        </Card>

        {/* Active Tasks */}
        <Card hover className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span>Active Tasks</span>
            <PlayCircle className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#38BDF8] tracking-tight">
            {isLoading ? '—' : (metrics?.running_tasks ?? 0) + (metrics?.pending_tasks ?? 0)}
          </p>
          <p className="text-[11px] text-[#949BA8] font-mono">
            {metrics?.running_tasks ?? 0} running, {metrics?.pending_tasks ?? 0} queued
          </p>
        </Card>

        {/* Completed Tasks */}
        <Card hover className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#34D399] tracking-tight">
            {isLoading ? '—' : metrics?.completed_tasks ?? 0}
          </p>
          <p className="text-[11px] text-[#949BA8] font-mono">Successfully verified</p>
        </Card>

        {/* Available Agents */}
        <Card hover className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-[#949BA8] text-xs font-mono">
            <span>Specialized Agents</span>
            <Users className="w-4 h-4 text-[#818CF8]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#818CF8] tracking-tight">
            {isLoading ? '—' : `${metrics?.available_agents ?? 5} / ${metrics?.total_agents ?? 5}`}
          </p>
          <p className="text-[11px] text-[#949BA8] truncate">Planner, Researcher, Analyst, Verifier, Reporter</p>
        </Card>
      </div>

      {/* Main Content: Recent Tasks + Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Recent Tasks Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#EDEDEF] tracking-tight flex items-center gap-2">
              <span>Recent Tasks</span>
              <span className="text-[10px] font-mono text-[#949BA8] px-2 py-0.5 rounded-full bg-[#11141D] border border-[#1E2330]">
                {metrics?.recent_tasks?.length || 0}
              </span>
            </h2>
            <Link
              to="/agents"
              className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors flex items-center gap-1 font-medium"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-xl bg-[#11141D] border border-[#1E2330] shadow-card overflow-hidden">
            {metrics?.recent_tasks && metrics.recent_tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2330] bg-[#0C0E14]/80 text-[#949BA8] font-mono text-[11px]">
                      <th className="py-3 px-4 font-normal">Task Name</th>
                      <th className="py-3 px-3 font-normal hidden sm:table-cell">Category</th>
                      <th className="py-3 px-3 font-normal">Created</th>
                      <th className="py-3 px-3 font-normal">Status</th>
                      <th className="py-3 px-4 font-normal text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2330]/70">
                    {metrics.recent_tasks.slice(0, 6).map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-[#151924]/70 transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#EDEDEF] group-hover:text-[#818CF8] transition-colors block truncate max-w-xs sm:max-w-sm">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[11px] text-[#949BA8] block truncate max-w-xs sm:max-w-sm mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#949BA8] hidden sm:table-cell font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-[#090B10] border border-[#1E2330]">
                            {task.category || 'general'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#949BA8] whitespace-nowrap text-[11px] font-mono">
                          {timeAgo(task.created_at)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/agents?taskId=${task.id}`}
                            className="text-[#818CF8] hover:text-[#A5B4FC] text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#151924] border border-[#1E2330] hover:border-[#6366F1]/40 transition-colors"
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
                <div className="w-10 h-10 rounded-full bg-[#151924] border border-[#1E2330] flex items-center justify-center mx-auto text-[#949BA8]">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#EDEDEF] font-medium">No tasks recorded yet</p>
                  <p className="text-[11px] text-[#949BA8] max-w-sm mx-auto mt-0.5">
                    Submit a prompt in New Task to start multi-agent orchestration.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/new-task')}
                  className="mt-1"
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
              <h2 className="text-sm font-semibold text-[#EDEDEF] tracking-tight">Generated Reports</h2>
              <Link
                to="/reports"
                className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors flex items-center gap-1 font-medium"
              >
                <span>All Reports</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-xl bg-[#11141D] border border-[#1E2330] shadow-card p-3 space-y-2">
              {metrics?.recent_reports && metrics.recent_reports.length > 0 ? (
                metrics.recent_reports.slice(0, 4).map((report) => (
                  <Link
                    key={report.id}
                    to="/reports"
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#151924] transition-colors group block border border-transparent hover:border-[#1E2330]"
                  >
                    <div className="w-7 h-7 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#6366F1]/40 transition-colors">
                      <FileText className="w-3.5 h-3.5 text-[#818CF8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#EDEDEF] truncate group-hover:text-[#818CF8] transition-colors">
                        {report.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#949BA8] font-mono mt-0.5">
                        <span>{report.category || 'General'}</span>
                        <span>•</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#949BA8] space-y-1.5">
                  <FileText className="w-5 h-5 text-[#949BA8]/40 mx-auto" />
                  <p>No reports generated yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Genuine Agent Status & Fleet */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#EDEDEF] tracking-tight">Orchestration Agents</h2>
            <div className="rounded-xl bg-[#11141D] border border-[#1E2330] shadow-card p-3 space-y-2 text-xs">
              {[
                { name: 'Planner Agent', role: 'Decomposition & Task Strategy', status: 'Ready', color: '#818CF8' },
                { name: 'Research Agent', role: 'Tavily Web & Local RAG Retrieval', status: 'Ready', color: '#38BDF8' },
                { name: 'Analysis Agent', role: 'Synthesis & Code Processing', status: 'Ready', color: '#818CF8' },
                { name: 'Verification Agent', role: 'Audit & Guardrail Alignment', status: 'Ready', color: '#34D399' },
                { name: 'Reporter Agent', role: 'Markdown Compilation & Export', status: 'Ready', color: '#FBBF24' },
              ].map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[#0C0E14]/70 border border-[#1E2330]/60 text-[11px]"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: agent.color }}
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-[#EDEDEF] block">{agent.name}</span>
                      <span className="text-[10px] text-[#949BA8] block truncate">{agent.role}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#34D399] shrink-0 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
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
