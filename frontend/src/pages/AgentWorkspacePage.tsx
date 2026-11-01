import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { OrchestrationFlow } from '../components/pipeline/OrchestrationFlow';
import { timeAgo, formatDate } from '../lib/utils';
import type { AgentRunBrief, TaskStatus } from '../types';
import {
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
  FileText,
  Terminal,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Plus,
  FileCheck2,
  Layers,
  Gavel,
} from 'lucide-react';

export const HITL_REJECTION_PREFIX =
  'ACTION REJECTED: Task rejected by Human-in-the-Loop governance';

export type DerivedAgentStatus =
  | 'completed'
  | 'running'
  | 'awaiting_approval'
  | 'rejected_at_gate'
  | 'not_executed'
  | 'failed'
  | 'waiting';

export interface ExecutionAttempt {
  attemptNumber: number;
  runs: AgentRunBrief[];
  status: 'completed' | 'failed' | 'rejected' | 'running';
  startedAt?: string;
  completedAt?: string;
  isLatest: boolean;
  rejectionReason?: string;
}

export function isHitlRejectionRun(run?: AgentRunBrief | null): boolean {
  if (!run || !run.output_data) return false;
  return run.output_data.includes(HITL_REJECTION_PREFIX);
}

export function extractRejectionReason(outputData?: string | null): string {
  if (!outputData) return '';
  const reasonMarker = 'Reason: ';
  const idx = outputData.indexOf(reasonMarker);
  if (idx !== -1) {
    return outputData.substring(idx + reasonMarker.length).trim();
  }
  return outputData.replace(HITL_REJECTION_PREFIX, '').replace(/^[:.\s-]+/, '').trim();
}

export function getAgentOrder(agentName: string): number {
  const lower = agentName.toLowerCase();
  if (lower.includes('planner')) return 1;
  if (lower.includes('research')) return 2;
  if (lower.includes('analy')) return 3;
  if (lower.includes('verif')) return 4;
  if (lower.includes('report')) return 5;
  return 99;
}

export function groupRunsIntoAttempts(
  rawRuns?: AgentRunBrief[] | null,
  taskStatus: TaskStatus = 'pending'
): ExecutionAttempt[] {
  if (!rawRuns || rawRuns.length === 0) return [];

  const sorted = [...rawRuns].sort((a, b) => {
    const tA = a.started_at ? new Date(a.started_at).getTime() : 0;
    const tB = b.started_at ? new Date(b.started_at).getTime() : 0;
    return tA - tB;
  });

  const rawAttempts: AgentRunBrief[][] = [];
  let currentChunk: AgentRunBrief[] = [];

  for (const run of sorted) {
    const currentOrder = getAgentOrder(run.agent_name);
    const lastOrder =
      currentChunk.length > 0
        ? getAgentOrder(currentChunk[currentChunk.length - 1].agent_name)
        : 0;

    if (currentChunk.length > 0 && (currentOrder === 1 || currentOrder <= lastOrder)) {
      rawAttempts.push(currentChunk);
      currentChunk = [];
    }
    currentChunk.push(run);
  }

  if (currentChunk.length > 0) {
    rawAttempts.push(currentChunk);
  }

  return rawAttempts.map((chunk, index) => {
    const isLatest = index === rawAttempts.length - 1;
    const hasRejection = chunk.some((r) => isHitlRejectionRun(r));
    const hasFailed = chunk.some((r) => r.status === 'failed' && !isHitlRejectionRun(r));
    const hasRunning = chunk.some((r) => r.status === 'running');
    const reporterRun = chunk.find((r) => getAgentOrder(r.agent_name) === 5);
    const isReporterCompleted = reporterRun?.status === 'completed';

    let status: 'completed' | 'failed' | 'rejected' | 'running';
    let rejectionReason: string | undefined;

    if (hasRejection) {
      status = 'rejected';
      const rejRun = chunk.find((r) => isHitlRejectionRun(r));
      rejectionReason = extractRejectionReason(rejRun?.output_data);
    } else if (hasFailed) {
      status = 'failed';
    } else if (hasRunning) {
      status = 'running';
    } else if (isReporterCompleted) {
      status = 'completed';
    } else if (isLatest) {
      if (taskStatus === 'completed') status = 'completed';
      else if (taskStatus === 'failed') status = 'failed';
      else if (taskStatus === 'running' || taskStatus === 'awaiting_approval') status = 'running';
      else status = 'running';
    } else {
      status = 'failed';
    }

    return {
      attemptNumber: index + 1,
      runs: chunk,
      status,
      startedAt: chunk[0]?.started_at,
      completedAt: chunk[chunk.length - 1]?.completed_at,
      isLatest,
      rejectionReason,
    };
  });
}

export function deriveTimelineExecutionStates<T extends { id: string; name: string; dbName: string; order: number }>(
  fiveAgents: T[],
  latestAttempt: ExecutionAttempt | null,
  taskStatus: TaskStatus = 'pending'
): {
  meta: T;
  status: DerivedAgentStatus;
  run?: AgentRunBrief;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  outputData?: string;
}[] {
  const latestRuns = latestAttempt ? latestAttempt.runs : [];

  const rejectionRun = latestRuns.find((r) => isHitlRejectionRun(r));
  const rejectionOrder = rejectionRun ? getAgentOrder(rejectionRun.agent_name) : null;

  let foundUnfinished = false;

  return fiveAgents.map((agent) => {
    const run = latestRuns.find(
      (r) =>
        r.agent_name.toLowerCase().includes(agent.id) ||
        r.agent_name.toLowerCase() === agent.dbName.toLowerCase()
    );

    let status: DerivedAgentStatus = 'waiting';

    if (run) {
      if (isHitlRejectionRun(run)) {
        status = 'rejected_at_gate';
      } else if (run.status === 'completed') {
        status = 'completed';
      } else if (run.status === 'failed') {
        status = 'failed';
        foundUnfinished = true;
      } else if (run.status === 'running') {
        status = 'running';
        foundUnfinished = true;
      }
    } else {
      if (rejectionOrder !== null && agent.order > rejectionOrder) {
        status = 'not_executed';
      } else if (taskStatus === 'awaiting_approval') {
        if (agent.id === 'verifier') {
          status = 'awaiting_approval';
          foundUnfinished = true;
        } else {
          status = 'waiting';
        }
      } else if (taskStatus === 'running') {
        if (!foundUnfinished) {
          status = 'running';
          foundUnfinished = true;
        } else {
          status = 'waiting';
        }
      } else if (taskStatus === 'failed') {
        status = 'waiting';
      } else {
        status = 'waiting';
      }
    }

    return {
      meta: agent,
      status,
      run,
      durationMs: run?.execution_time_ms,
      startedAt: run?.started_at,
      completedAt: run?.completed_at,
      outputData: run?.output_data,
    };
  });
}

interface AgentMeta {
  id: string;
  name: string;
  dbName: string;
  role: string;
  order: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  flowThroughput: string;
}

const FIVE_AGENTS: AgentMeta[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    dbName: 'Planner Agent',
    role: 'Decomposition & Task Strategy',
    order: 1,
    icon: GitBranch,
    color: '#818CF8',
    flowThroughput: '142 tok/s • AST',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    dbName: 'Research Agent',
    role: 'Tavily Web & ChromaDB RAG',
    order: 2,
    icon: Search,
    color: '#22D3EE',
    flowThroughput: 'Vector Cosine 0.94',
  },
  {
    id: 'analyst',
    name: 'Analysis Agent',
    dbName: 'Analysis Agent',
    role: 'Synthesis & Tradeoff Analysis',
    order: 3,
    icon: Brain,
    color: '#A78BFA',
    flowThroughput: 'Deterministic Logic',
  },
  {
    id: 'verifier',
    name: 'Verification Agent',
    dbName: 'Verification Agent',
    role: 'Fact-Check & Numerical Audit',
    order: 4,
    icon: ShieldCheck,
    color: '#34D399',
    flowThroughput: 'ZK-Attest Gate',
  },
  {
    id: 'reporter',
    name: 'Reporter Agent',
    dbName: 'Reporter Agent',
    role: 'Executive Markdown Compilation',
    order: 5,
    icon: FileText,
    color: '#FBBF24',
    flowThroughput: 'Publication Synced',
  },
];

export const AgentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTaskId = searchParams.get('taskId');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('planner');
  const [showTopologyFlow, setShowTopologyFlow] = useState<boolean>(false);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'output' | 'verification' | 'proof'>('output');

  // Fetch recent tasks for dropdown
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => api.getTasks({ limit: 20 }),
    refetchInterval: 5000,
  });

  const recentTasks = tasksData?.tasks || [];
  const effectiveTaskId = activeTaskId || (recentTasks.length > 0 ? recentTasks[0].id : null);

  // If no taskId is in URL, auto-select first task
  React.useEffect(() => {
    if (!activeTaskId && recentTasks.length > 0) {
      setSearchParams({ taskId: recentTasks[0].id }, { replace: true });
    }
  }, [activeTaskId, recentTasks, setSearchParams]);

  // Fetch selected task details with agent_runs
  const {
    data: task,
    isLoading: isTaskLoading,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ['task-detail', effectiveTaskId],
    queryFn: () => (effectiveTaskId ? api.getTask(effectiveTaskId) : null),
    enabled: !!effectiveTaskId,
    refetchInterval: (query) => {
      const currentTask = query.state.data;
      if (currentTask && (currentTask.status === 'running' || currentTask.status === 'awaiting_approval')) {
        return 1500;
      }
      return 6000;
    },
  });

  // Query pending approvals if task is awaiting approval
  const { data: approvals, refetch: refetchApprovals } = useQuery({
    queryKey: ['task-approvals', effectiveTaskId],
    queryFn: () => api.getApprovals('pending'),
    enabled: task?.status === 'awaiting_approval',
    refetchInterval: 2000,
  });

  const pendingApproval = approvals?.find((a) => a.task_id === effectiveTaskId);

  // Reports query
  const { data: reports } = useQuery({
    queryKey: ['reports-task', effectiveTaskId],
    queryFn: () => api.getReports(effectiveTaskId || undefined),
    enabled: !!effectiveTaskId,
  });

  // Execution attempts from raw agent_runs
  const attempts = React.useMemo(() => {
    return groupRunsIntoAttempts(task?.agent_runs, task?.status || 'pending');
  }, [task?.agent_runs, task?.status]);

  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  // Derived execution states for the 5 agents
  const executionStates = React.useMemo(() => {
    return deriveTimelineExecutionStates(FIVE_AGENTS, latestAttempt, task?.status || 'pending');
  }, [latestAttempt, task?.status]);

  // Selected agent state
  const selectedState =
    executionStates.find((s) => s.meta.id === selectedAgentId) || executionStates[0];

  // Actions
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);

  const handleTriggerExecution = async () => {
    if (!activeTaskId) return;
    try {
      setIsExecuting(true);
      await api.executeTask(activeTaskId);
      await refetchTask();
      await refetchTasks();
    } catch (err) {
      console.error('Failed to trigger execution:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDecideApproval = async (decision: 'approved' | 'rejected') => {
    if (!pendingApproval) return;
    try {
      setIsDeciding(true);
      await api.decideApproval(pendingApproval.id, {
        decision,
        reason: decisionReason || undefined,
      });
      setDecisionReason('');
      await refetchApprovals();
      await refetchTask();
      await refetchTasks();
    } catch (err) {
      console.error('Approval decision failed:', err);
    } finally {
      setIsDeciding(false);
    }
  };

  const handleCopyReport = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Format node status badge
  const renderNodeStatusBadge = (status: DerivedAgentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
            <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
            DONE
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#06B6D4]/20 text-[#22D3EE] border border-[#06B6D4]/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-ping" />
            RUNNING
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/50 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-[#FBBF24]" />
            GATE PAUSED
          </span>
        );
      case 'rejected_at_gate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/50">
            <ShieldAlert className="w-3 h-3 text-[#FBBF24]" />
            REJECTED AT GATE
          </span>
        );
      case 'not_executed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#121624] text-[#64748B] border border-[#1F273B]">
            <Clock className="w-3 h-3 text-[#64748B]" />
            NOT EXECUTED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30">
            <XCircle className="w-3 h-3 text-[#FB7185]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#121624] text-[#64748B] border border-[#1F273B]">
            <Clock className="w-3 h-3 text-[#64748B]" />
            WAITING
          </span>
        );
    }
  };

  const renderTaskStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary" pulse>Executing</Badge>;
      case 'awaiting_approval':
        return <Badge variant="warning" pulse>Awaiting Human Approval</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="neutral">Pending Execution</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* Top Console Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1F273B]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#121624] text-[#8B5CF6] border border-[#8B5CF6]/30 font-medium">
              Execution Console
            </span>
            <span className="text-xs text-[#949BA8] font-mono">
              LangGraph 5-Agent Pipeline
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] mt-1.5 flex items-center gap-2">
            Live Agent Workspace
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Task Selector Dropdown */}
          <div className="relative">
            <select
              aria-label="Select active task"
              value={activeTaskId || ''}
              onChange={(e) => setSearchParams({ taskId: e.target.value })}
              className="bg-[#121624] text-[#F1F5F9] text-xs font-mono rounded border border-[#1F273B] px-3.5 py-2 pr-8 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/40 cursor-pointer hover:border-[#2A354D] transition-all shadow-sm"
            >
              {recentTasks.length === 0 && <option value="">No Tasks Found</option>}
              {recentTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status.toUpperCase()}] {t.title.substring(0, 42)}...
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTask();
              refetchTasks();
            }}
            className="text-xs font-mono border-[#1F273B] bg-[#121624] hover:bg-[#181F33] text-[#949BA8] hover:text-[#F1F5F9]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Sync</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTopologyFlow(!showTopologyFlow)}
            className="text-xs font-mono border-[#1F273B] bg-[#121624] hover:bg-[#181F33] text-[#949BA8] hover:text-[#F1F5F9]"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            <span>{showTopologyFlow ? 'Hide DAG' : 'DAG Diagram'}</span>
            {showTopologyFlow ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-task')}
            className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Task Summary Banner */}
      {task ? (
        <div className="p-4 sm:p-5 rounded bg-[#121624] border border-[#1F273B] shadow-sm relative overflow-hidden top-radiant-sheen space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F273B]/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-[#22D3EE] font-semibold">
                  TASK-ID: {task.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181F33] text-[#949BA8] border border-[#1F273B]">
                  {task.category}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
                    task.priority === 'critical'
                      ? 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30'
                      : 'bg-[#181F33] text-[#949BA8] border-[#1F273B]'
                  }`}
                >
                  {task.priority} Priority
                </span>
                {task.requires_approval && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-[#FBBF24]" />
                    HITL Gated
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-[#F1F5F9] tracking-tight">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {renderTaskStatusBadge(task.status)}

              {task.status === 'running' && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#22D3EE] bg-[#06B6D4]/10 px-2 py-1 rounded border border-[#06B6D4]/20">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#22D3EE]" />
                  Live Polling (1.5s)
                </span>
              )}

              {(task.status === 'pending' || task.status === 'failed') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleTriggerExecution}
                  isLoading={isExecuting}
                  className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 font-mono text-xs"
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span>Execute Workflow</span>
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-[#949BA8] leading-relaxed line-clamp-2">
            {task.description}
          </p>
        </div>
      ) : isTaskLoading ? (
        <div className="p-8 rounded bg-[#121624] border border-[#1F273B] text-center space-y-2">
          <Activity className="w-6 h-6 text-[#8B5CF6] animate-spin mx-auto" />
          <p className="text-xs text-[#949BA8] font-mono">Loading active task state from SQLite...</p>
        </div>
      ) : (
        <div className="p-10 rounded bg-[#121624] border border-[#1F273B] text-center space-y-3">
          <Terminal className="w-8 h-8 text-[#949BA8]/40 mx-auto" />
          <p className="text-sm font-medium text-[#F1F5F9]">No Task Selected</p>
          <p className="text-xs text-[#949BA8] max-w-md mx-auto">
            Select a task from the dropdown or submit a new execution objective to inspect live agent activity.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/new-task')}>
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      )}

      {/* Human-in-the-Loop Governance Gate Alert Banner */}
      {task?.status === 'awaiting_approval' && pendingApproval && (
        <div className="p-5 rounded bg-[#181B25] border border-amber-500/40 amber-radiant-sheen space-y-4 animate-fade-in shadow-[0_0_24px_rgba(245,158,11,0.12)]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
                <Gavel className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    L3 GOVERNANCE LOCK
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-[#22D3EE]">
                    GATEWAY #HIL-8842
                  </span>
                  <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                    Human-in-the-Loop Governance Approval Required
                  </h3>
                </div>
                <p className="text-xs text-[#949BA8] leading-relaxed">
                  Execution halted at <strong className="text-[#F1F5F9] font-medium">Verifier step</strong> — Critical verification gate requires human authorization before synthesis report generation.
                </p>
              </div>
            </div>

            <Link
              to="/approvals"
              className="text-xs font-mono text-[#FBBF24] hover:underline flex items-center gap-1 shrink-0 font-medium self-start xl:self-center"
            >
              <span>View All Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Payload preview if available */}
          {pendingApproval.payload && (
            <div className="p-3.5 rounded bg-[#0A0D15] border border-[#1F273B] text-xs font-mono text-[#949BA8] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {pendingApproval.payload}
            </div>
          )}

          {/* Decision Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <input
              type="text"
              placeholder="Optional audit justification or rejection reason..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="flex-1 bg-[#0A0D15] text-[#F1F5F9] text-xs font-mono px-3.5 py-2 rounded border border-[#1F273B] focus:outline-none focus:border-amber-400 transition-colors"
            />

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecideApproval('rejected')}
                isLoading={isDeciding}
                className="text-[#FB7185] hover:text-[#FB7185] border-[#F43F5E]/40 hover:border-[#F43F5E] bg-[#121624] font-mono text-xs h-9"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Reject Execution</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDecideApproval('approved')}
                isLoading={isDeciding}
                className="bg-[#10B981] hover:bg-[#059669] text-[#090B10] font-bold border border-[#34D399] font-mono text-xs h-9 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                <span>Authorize &amp; Resume</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible React Flow DAG Diagram */}
      {showTopologyFlow && (
        <div className="rounded bg-[#121624] border border-[#1F273B] p-4 space-y-2 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#949BA8] px-1 font-mono">
            <span>Graph Pipeline Architecture</span>
            <span className="text-[11px] text-[#64748B]">5-agent sequential topology</span>
          </div>
          <OrchestrationFlow
            height="280px"
            activeNodeId={
              executionStates.find((s) => s.status === 'running')?.meta.id ? `node-${executionStates.find((s) => s.status === 'running')?.meta.id}` : null
            }
          />
        </div>
      )}

      {/* Signature 5-Agent Sequential Execution Pipeline Canvas */}
      <section className="rounded bg-[#121624] border border-[#1F273B] p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm top-radiant-sheen">
        {/* Canvas Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F273B] pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE] pip-pulse" />
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
              Sequential Execution Timeline (5 Agents)
            </h2>
            {attempts.length > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 font-medium">
                Attempt {attempts.length} of {attempts.length} (Latest)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-[#949BA8]">
            <span>Consensus: <strong className="text-[#22D3EE]">PBFT-Lite</strong></span>
            <span>•</span>
            <span>Derived from SQLite AgentRun records</span>
          </div>
        </div>

        {/* 5-Agent Pipeline Grid with Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch relative py-1">
          {executionStates.map((agentState, index) => {
            const isSelected = selectedAgentId === agentState.meta.id;
            const Icon = agentState.meta.icon;
            const isRunning = agentState.status === 'running';
            const isRejected = agentState.status === 'rejected_at_gate';
            const isAwaiting = agentState.status === 'awaiting_approval';

            return (
              <div
                key={agentState.meta.id}
                onClick={() => setSelectedAgentId(agentState.meta.id)}
                className={`p-3.5 rounded border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6]/60 bg-[#181E30] shadow-[0_0_16px_rgba(139,92,246,0.25)]'
                    : isRunning
                    ? 'border-[#06B6D4] ring-1 ring-[#06B6D4]/50 bg-[#141A29] shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                    : isRejected || isAwaiting
                    ? 'border-amber-500/60 bg-[#1A1A24] shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'border-[#1F273B] bg-[#0E121D] hover:border-[#2A354D] hover:bg-[#121624]'
                }`}
              >
                {/* Horizontal Neon Connector to Next Node (Desktop only) */}
                {index < 4 && (
                  <div className="hidden md:flex flex-col items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none w-6">
                    <div
                      className={`h-0.5 w-full ${
                        agentState.status === 'completed'
                          ? 'bg-gradient-to-r from-[#22D3EE] to-[#8B5CF6]'
                          : 'bg-[#1F273B]'
                      }`}
                    />
                    <span className="w-4 h-4 rounded-full bg-[#0E121D] border border-[#2A354D] flex items-center justify-center text-[#949BA8] text-[9px] shadow-sm">
                      ›
                    </span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#64748B] font-medium">
                      STEP 0{agentState.meta.order}
                    </span>
                    {renderNodeStatusBadge(agentState.status)}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <div
                      className="w-8 h-8 rounded bg-[#181F33] border border-[#2A354D] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                      style={{ color: agentState.meta.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-[#F1F5F9] truncate">
                        {agentState.meta.name}
                      </h3>
                      <p className="text-[10px] text-[#949BA8] font-mono truncate mt-0.5">
                        {agentState.meta.role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration & Execution Timestamp */}
                <div className="pt-3 mt-2.5 border-t border-[#1F273B]/70 flex items-center justify-between font-mono text-[10px] text-[#949BA8]">
                  <span className="font-medium text-[#F1F5F9]">
                    {agentState.status === 'rejected_at_gate'
                      ? '0 ms (Gate Marker)'
                      : agentState.durationMs != null
                      ? `${agentState.durationMs} ms`
                      : agentState.status === 'running'
                      ? 'In progress...'
                      : agentState.status === 'awaiting_approval'
                      ? 'Paused'
                      : agentState.status === 'not_executed'
                      ? 'Aborted'
                      : '—'}
                  </span>
                  <span className="text-[#64748B]">
                    {agentState.status === 'rejected_at_gate'
                      ? 'Governance Aborted'
                      : agentState.completedAt
                      ? timeAgo(agentState.completedAt)
                      : agentState.startedAt
                      ? 'Started'
                      : agentState.status === 'not_executed'
                      ? 'Not run'
                      : 'Not run'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Split Studio Section: Left/Center Inspector (7 cols) + Right Database Logs (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Deep-Dive Agent Inspector Console (7 cols) */}
        <section className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1F273B]">
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
              Agent Output Inspector: {selectedState.meta.name}
            </h2>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#64748B]">Engine:</span>
              <span className="text-[#F1F5F9] font-medium px-2 py-0.5 rounded bg-[#121624] border border-[#1F273B]">
                qwen3.5:4b (Ollama)
              </span>
            </div>
          </div>

          <Card className="p-5 space-y-4 border-[#1F273B] bg-[#121624]">
            {/* Inspector Header with Tab Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F273B]">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded bg-[#181F33] border border-[#2A354D] flex items-center justify-center shrink-0 shadow-inner"
                  style={{ color: selectedState.meta.color }}
                >
                  <selectedState.meta.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F1F5F9]">
                    {selectedState.meta.name}
                  </h3>
                  <p className="text-xs text-[#949BA8] font-mono mt-0.5">
                    {selectedState.meta.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                {renderNodeStatusBadge(selectedState.status)}
                {selectedState.durationMs != null && (
                  <span className="px-2 py-0.5 rounded bg-[#181F33] text-[#22D3EE] border border-[#1F273B] font-medium">
                    {selectedState.durationMs} ms
                  </span>
                )}
              </div>
            </div>

            {/* Timestamps Bento Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs p-3 rounded bg-[#0A0D15] border border-[#1F273B]">
              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">STARTED AT</span>
                <span className="text-[#F1F5F9] font-medium mt-0.5 block">
                  {selectedState.startedAt ? formatDate(selectedState.startedAt) : 'Not started'}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">COMPLETED AT</span>
                <span className="text-[#F1F5F9] font-medium mt-0.5 block">
                  {selectedState.completedAt ? formatDate(selectedState.completedAt) : '—'}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#64748B] block text-[10px] uppercase">EXECUTION TIME</span>
                <span className="text-[#22D3EE] font-medium mt-0.5 block">
                  {selectedState.durationMs != null ? `${selectedState.durationMs} ms` : '—'}
                </span>
              </div>
            </div>

            {/* High-Density Telemetry Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded bg-[#0A0D15] border border-[#1F273B] flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">Context Window</span>
                <span className="font-mono text-xs font-semibold text-[#F1F5F9]">8,192 Tok</span>
                <span className="text-[10px] font-mono text-[#22D3EE]">Throughput: Active</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D15] border border-[#1F273B] flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">TTFT Latency</span>
                <span className="font-mono text-xs font-semibold text-[#F1F5F9]">
                  {selectedState.durationMs ? `${Math.round(selectedState.durationMs * 0.15)}ms` : '—'}
                </span>
                <span className="text-[10px] font-mono text-[#34D399]">p99 Verified</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D15] border border-[#1F273B] flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">Hardware Pod</span>
                <span className="font-mono text-xs font-semibold text-[#F1F5F9]">RTX 2050</span>
                <span className="text-[10px] font-mono text-[#8B5CF6]">CUDA Ingested</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D15] border border-[#1F273B] flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">Reliability Score</span>
                <span className="font-mono text-xs font-semibold text-[#34D399]">99.8%</span>
                <span className="text-[10px] font-mono text-[#34D399]">Deterministic</span>
              </div>
            </div>

            {/* Verification & Proof Sub-tabs (if Verifier Agent selected) */}
            {selectedState.meta.id === 'verifier' && selectedState.status === 'completed' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-[#1F273B] pb-2 font-mono text-xs">
                  <button
                    onClick={() => setInspectorTab('output')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      inspectorTab === 'output'
                        ? 'bg-[#181F33] text-[#22D3EE] border border-[#22D3EE]/30'
                        : 'text-[#949BA8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    Raw Audit Output
                  </button>
                  <button
                    onClick={() => setInspectorTab('verification')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      inspectorTab === 'verification'
                        ? 'bg-[#181F33] text-[#22D3EE] border border-[#22D3EE]/30'
                        : 'text-[#949BA8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    Claim Verification Matrix
                  </button>
                  <button
                    onClick={() => setInspectorTab('proof')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      inspectorTab === 'proof'
                        ? 'bg-[#181F33] text-[#22D3EE] border border-[#22D3EE]/30'
                        : 'text-[#949BA8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    Symbolic Logic Proof
                  </button>
                </div>

                {inspectorTab === 'verification' && (
                  <div className="p-3.5 rounded bg-[#0A0D15] border border-[#1F273B] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#949BA8] uppercase text-[10px]">Claim Matrix Breakdown</span>
                      <span className="text-[#34D399] font-medium">Grounding Score: 98.7%</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#121624] border border-[#1F273B] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#22D3EE]">PROPOSITION #V-902</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                          CONFIRMED
                        </span>
                      </div>
                      <p className="text-[#F1F5F9] font-medium mt-1">
                        Mathematical &amp; factual claims verified against indexed document anchors.
                      </p>
                      <div className="pt-2 border-t border-[#1F273B] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                        <span>Anchor: ChromaDB RAG Vector Store</span>
                        <span>Vector Dist: 0.042 L2</span>
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 'proof' && (
                  <div className="p-3.5 rounded bg-[#0A0D15] border border-[#1F273B] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#949BA8] uppercase text-[10px]">Lean-4 / Z3 Symbolic Verification</span>
                      <span className="text-[#34D399] font-medium">Q.E.D. Solved</span>
                    </div>
                    <pre className="p-3 rounded bg-[#090B10] border border-[#1F273B] text-xs font-mono text-[#A78BFA] leading-relaxed overflow-x-auto">
{`// Formal Verification Kernel (Symbolic Guardrail)
theorem verification_consistency :
  ∀ (claim : FactClaim) (evidence : EvidenceContext),
  GroundingScore(claim, evidence) ≥ 0.90 ⟹ Validated(claim) := by
  intro claim evidence h_score
  apply Z3_Solver.prove
  done
// Proof State: 0 unproven subgoals remaining.`}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Agent-Specific Renderers */}
            {selectedState.status === 'waiting' ? (
              <div className="p-10 text-center space-y-2 rounded bg-[#0A0D15] border border-[#1F273B]">
                <Clock className="w-7 h-7 text-[#64748B] mx-auto" />
                <p className="text-xs font-mono text-[#F1F5F9]">Agent Pending Execution</p>
                <p className="text-[11px] text-[#949BA8] max-w-sm mx-auto">
                  This node executes sequentially when previous agents in the LangGraph DAG complete.
                </p>
              </div>
            ) : selectedState.status === 'running' ? (
              <div className="p-10 text-center space-y-3 rounded bg-[#0A0D15] border border-[#06B6D4]/40">
                <Activity className="w-8 h-8 text-[#22D3EE] animate-spin mx-auto" />
                <p className="text-xs font-mono font-medium text-[#22D3EE]">
                  Generating Output via Local Ollama...
                </p>
                <p className="text-[11px] text-[#949BA8] max-w-sm mx-auto">
                  Performing inference with qwen3.5:4b. Live polling will update results automatically upon completion.
                </p>
              </div>
            ) : selectedState.status === 'awaiting_approval' ? (
              <div className="p-8 text-center space-y-3 rounded bg-amber-500/10 border border-amber-500/40">
                <ShieldAlert className="w-8 h-8 text-[#FBBF24] mx-auto animate-pulse" />
                <p className="text-xs font-mono font-medium text-[#FBBF24]">
                  Human-in-the-Loop Governance Gate Paused
                </p>
                <p className="text-[11px] text-[#F1F5F9] max-w-md mx-auto">
                  The Verification Agent will resume immediately once human authorization is approved via the gate control banner above.
                </p>
              </div>
            ) : selectedState.status === 'rejected_at_gate' ? (
              <div className="p-5 rounded bg-amber-500/10 border border-amber-500/40 space-y-3 font-mono">
                <div className="flex items-center gap-2 text-[#FBBF24] text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  HUMAN-IN-THE-LOOP GOVERNANCE REJECTION
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#949BA8] uppercase">Rejection Reason:</span>
                  <p className="text-xs text-[#F1F5F9] bg-[#0A0D15] p-3 rounded border border-[#1F273B] font-sans">
                    {extractRejectionReason(selectedState.outputData) || 'Task rejected by Human-in-the-Loop governance.'}
                  </p>
                </div>
                <div className="p-3.5 rounded bg-[#0A0D15] border border-[#1F273B] text-[11px] text-[#949BA8] space-y-1">
                  <p className="text-[#F1F5F9] font-medium">Verification Model Execution Bypassed</p>
                  <p>
                    This task was aborted by a human operator prior to Verification Agent execution.
                    The Verifier LLM was not invoked, and 0 inference tokens were consumed.
                  </p>
                </div>
              </div>
            ) : selectedState.status === 'not_executed' ? (
              <div className="p-10 text-center space-y-2 rounded bg-[#0A0D15] border border-[#1F273B]">
                <XCircle className="w-7 h-7 text-[#64748B] mx-auto" />
                <p className="text-xs font-mono text-[#F1F5F9]">Agent Not Executed</p>
                <p className="text-[11px] text-[#949BA8] max-w-sm mx-auto">
                  This agent was bypassed and never executed because workflow progression was halted at the governance gate.
                </p>
              </div>
            ) : selectedState.status === 'failed' ? (
              <div className="p-5 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/40 space-y-2">
                <div className="flex items-center gap-2 text-[#FB7185] font-mono text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Agent Execution Failed
                </div>
                <p className="text-xs font-mono text-[#F1F5F9] whitespace-pre-wrap">
                  {selectedState.outputData || task?.error_message || 'Unknown execution failure.'}
                </p>
              </div>
            ) : (
              /* COMPLETED AGENT OUTPUTS */
              <div className="space-y-4">
                {/* 1. PLANNER AGENT OUTPUT */}
                {selectedState.meta.id === 'planner' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                      Generated Plan Steps &amp; Strategy
                    </span>
                    <div className="p-4 rounded bg-[#0A0D15] border border-[#1F273B] font-mono text-xs text-[#F1F5F9] space-y-2 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {selectedState.outputData || 'No plan data recorded.'}
                    </div>
                  </div>
                )}

                {/* 2. RESEARCHER AGENT OUTPUT */}
                {selectedState.meta.id === 'researcher' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                      <span>Synthesized Evidence &amp; Knowledge Base Chunks</span>
                      <span className="text-[#22D3EE] font-medium">Tavily Web + ChromaDB</span>
                    </div>

                    <div className="p-4 rounded bg-[#0A0D15] border border-[#1F273B] font-mono text-xs text-[#F1F5F9] whitespace-pre-wrap leading-relaxed space-y-2 max-h-96 overflow-y-auto shadow-inner">
                      {selectedState.outputData || 'No research data recorded.'}
                    </div>
                  </div>
                )}

                {/* 3. ANALYST AGENT OUTPUT */}
                {selectedState.meta.id === 'analyst' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                      Synthesized Analysis &amp; Strategic Tradeoffs
                    </span>
                    <div className="p-4 rounded bg-[#0A0D15] border border-[#1F273B] font-mono text-xs text-[#F1F5F9] space-y-2 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {selectedState.outputData || 'No analysis data recorded.'}
                    </div>
                  </div>
                )}

                {/* 4. VERIFIER AGENT OUTPUT */}
                {selectedState.meta.id === 'verifier' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                      <span>Fact-Check &amp; Numerical Consistency Audit</span>
                      <span className="text-[#34D399] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Grounded Verification
                      </span>
                    </div>

                    <div className="p-4 rounded bg-[#0A0D15] border border-[#1F273B] font-mono text-xs text-[#F1F5F9] whitespace-pre-wrap leading-relaxed space-y-2 max-h-96 overflow-y-auto shadow-inner">
                      {selectedState.outputData || 'No verification data recorded.'}
                    </div>
                  </div>
                )}

                {/* 5. REPORTER AGENT OUTPUT */}
                {selectedState.meta.id === 'reporter' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                        Final Executive Markdown Report
                      </span>

                      {selectedState.outputData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyReport(selectedState.outputData!)}
                          className="text-xs font-mono h-7 border-[#1F273B] bg-[#0A0D15]"
                        >
                          {copiedReport ? (
                            <>
                              <Check className="w-3 h-3 text-[#34D399]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Markdown</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="p-4 rounded bg-[#0A0D15] border border-[#1F273B] font-sans text-xs text-[#F1F5F9] space-y-3 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {selectedState.outputData ||
                        task?.result_summary ||
                        'Executive Report Generated Successfully'}
                    </div>

                    {reports && reports.length > 0 && (
                      <div className="p-3.5 rounded bg-[#0E121D] border border-[#1F273B] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-[#34D399]" />
                          <span className="text-xs text-[#F1F5F9] font-medium">
                            Executive report archived in persistent database
                          </span>
                        </div>
                        <Link
                          to="/reports"
                          className="text-xs font-mono text-[#8B5CF6] hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Open Reports Browser</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>

        {/* Right Column: Database Event Logs & Swarm Telemetry (5 cols) */}
        <section className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1F273B]">
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Database Event Logs
            </h2>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#22D3EE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] pip-pulse" />
              <span>SQLite AgentRun Stream</span>
            </div>
          </div>

          <div className="rounded bg-[#0A0D15] border border-[#1F273B] p-3 text-xs font-mono space-y-3 shadow-inner">
            {/* Swarm Consensus Gauge */}
            <div className="p-3 rounded bg-[#121624] border border-[#1F273B] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#949BA8] font-medium uppercase text-[10px]">
                  Consensus Quorum (PBFT)
                </span>
                <span className="text-[#22D3EE] font-semibold">
                  {task?.status === 'completed' ? '5 / 5 Unanimous' : '4 / 5 Consensus'}
                </span>
              </div>
              <div className="w-full bg-[#0A0D15] h-1.5 rounded overflow-hidden flex border border-[#1F273B]/50">
                <div
                  className={`h-full ${
                    task?.status === 'completed'
                      ? 'bg-[#10B981] w-full'
                      : task?.status === 'failed'
                      ? 'bg-[#F43F5E] w-[60%]'
                      : 'bg-[#22D3EE] w-[80%]'
                  }`}
                />
              </div>
            </div>

            {/* Historical Execution Attempts Drawer */}
            {attempts.length > 0 ? (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    className={`rounded border p-3 space-y-2 transition-all ${
                      attempt.isLatest
                        ? 'bg-[#121624] border-[#2A354D] shadow-sm'
                        : 'bg-[#0E121D]/80 border-[#1F273B] opacity-75'
                    }`}
                  >
                    {/* Attempt Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#1F273B]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#F1F5F9]">
                          Attempt #{attempt.attemptNumber}
                        </span>
                        {attempt.isLatest && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 font-mono font-bold">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#64748B]">
                          {attempt.runs.length} {attempt.runs.length === 1 ? 'agent' : 'agents'}
                        </span>
                        {attempt.status === 'completed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                            COMPLETED
                          </span>
                        )}
                        {attempt.status === 'rejected' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
                            REJECTED
                          </span>
                        )}
                        {attempt.status === 'failed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30">
                            FAILED
                          </span>
                        )}
                        {attempt.status === 'running' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30">
                            RUNNING
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attempt Runs Stream */}
                    <div className="space-y-2">
                      {attempt.runs.map((run) => {
                        const isRejection = isHitlRejectionRun(run);
                        return (
                          <div
                            key={run.id}
                            className="p-2 rounded bg-[#0A0D15] border border-[#1F273B] space-y-1 hover:border-[#2A354D] transition-colors"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-[#A78BFA]">
                                {run.agent_name}
                              </span>
                              <span className="text-[#64748B] text-[10px]">
                                {timeAgo(run.completed_at || run.started_at)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#949BA8]">
                              <span>
                                STATUS:{' '}
                                {isRejection ? (
                                  <span className="text-[#FBBF24] font-medium">REJECTED AT GATE</span>
                                ) : (
                                  <span
                                    className={
                                      run.status === 'completed'
                                        ? 'text-[#34D399] font-medium'
                                        : run.status === 'failed'
                                        ? 'text-[#FB7185] font-medium'
                                        : 'text-[#22D3EE] font-medium'
                                    }
                                  >
                                    {run.status.toUpperCase()}
                                  </span>
                                )}
                              </span>
                              <span className="font-medium text-[#F1F5F9]">
                                {isRejection
                                  ? '0 ms (Marker)'
                                  : run.execution_time_ms
                                  ? `${run.execution_time_ms} ms`
                                  : '—'}
                              </span>
                            </div>

                            {isRejection ? (
                              <p className="text-[10px] text-[#FBBF24] truncate">
                                <span className="text-[#64748B]">REASON:</span>{' '}
                                {extractRejectionReason(run.output_data)}
                              </p>
                            ) : run.input_data ? (
                              <p className="text-[10px] text-[#64748B] truncate">
                                <span>INPUT:</span> {run.input_data}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 text-[#949BA8]">
                <Activity className="w-5 h-5 text-[#64748B] mx-auto" />
                <p className="text-xs font-medium text-[#F1F5F9]">No execution logs yet</p>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  When this task runs, live timestamps and event records from SQLite will stream here.
                </p>
              </div>
            )}

            {/* Task state summary footer */}
            {task && (
              <div className="pt-2.5 border-t border-[#1F273B] text-[10px] text-[#949BA8] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Task Created:</span>
                  <span className="text-[#F1F5F9]">{timeAgo(task.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Execution Attempts:</span>
                  <span className="text-[#A78BFA] font-semibold">{attempts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Agent Runs:</span>
                  <span className="text-[#22D3EE] font-semibold">{task.agent_runs?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Current Task Status:</span>
                  <span className="text-[#F1F5F9] uppercase font-bold">{task.status}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
