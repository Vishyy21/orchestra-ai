import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { OrchestrationFlow } from '../components/pipeline/OrchestrationFlow';
import { timeAgo, formatDate } from '../lib/utils';
import type { AgentRunBrief, TaskStatus } from '../types';
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
} from 'lucide-react';

interface AgentMeta {
  id: string;
  name: string;
  dbName: string;
  role: string;
  order: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  nodeId: string;
}

const FIVE_AGENTS: AgentMeta[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    dbName: 'Planner Agent',
    role: 'Decomposition & Task Strategy',
    order: 1,
    icon: GitBranch,
    color: '#8B7CFF',
    nodeId: 'node-planner',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    dbName: 'Research Agent',
    role: 'Tavily Web & ChromaDB RAG',
    order: 2,
    icon: Search,
    color: '#55C7D9',
    nodeId: 'node-researcher',
  },
  {
    id: 'analyst',
    name: 'Analysis Agent',
    dbName: 'Analysis Agent',
    role: 'Synthesis & Tradeoff Analysis',
    order: 3,
    icon: Brain,
    color: '#8B7CFF',
    nodeId: 'node-analyst',
  },
  {
    id: 'verifier',
    name: 'Verification Agent',
    dbName: 'Verification Agent',
    role: 'Fact-Check & Numerical Audit',
    order: 4,
    icon: ShieldCheck,
    color: '#36B98A',
    nodeId: 'node-verifier',
  },
  {
    id: 'reporter',
    name: 'Reporter Agent',
    dbName: 'Reporter Agent',
    role: 'Executive Markdown Compilation',
    order: 5,
    icon: FileText,
    color: '#E6AA57',
    nodeId: 'node-reporter',
  },
];

interface AgentExecutionState {
  meta: AgentMeta;
  status: DerivedAgentStatus;
  run?: AgentRunBrief;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  outputData?: string;
}

export const AgentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTaskId = searchParams.get('taskId');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('planner');
  const [showTopologyFlow, setShowTopologyFlow] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [isDeciding, setIsDeciding] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // 1. Fetch recent tasks list to populate selector and provide fallback if no taskId in URL
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks-selector-list'],
    queryFn: () => api.getTasks({ limit: 15 }),
    refetchInterval: 6000,
  });

  const recentTasks = tasksData?.tasks || [];

  // Determine active task ID
  const activeTaskId = useMemo(() => {
    if (urlTaskId) return urlTaskId;
    // Default to the first running/awaiting task, or first recent task
    const active = recentTasks.find(
      (t) => t.status === 'running' || t.status === 'awaiting_approval'
    );
    return active?.id || recentTasks[0]?.id || null;
  }, [urlTaskId, recentTasks]);

  // Synchronize URL if activeTaskId is found and not in URL
  React.useEffect(() => {
    if (!urlTaskId && activeTaskId) {
      setSearchParams({ taskId: activeTaskId }, { replace: true });
    }
  }, [urlTaskId, activeTaskId, setSearchParams]);

  // 2. Fetch the active task's live state with polling
  const {
    data: task,
    isLoading: isTaskLoading,
    refetch: refetchActiveTask,
    isRefetching: isTaskRefetching,
  } = useQuery({
    queryKey: ['active-task', activeTaskId],
    queryFn: () => api.getTask(activeTaskId!),
    enabled: Boolean(activeTaskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'running') return 1500; // Live 1.5s polling during active execution
      if (status === 'awaiting_approval') return 3000;
      return 10000;
    },
  });

  // 3. Fetch reports for the task if completed
  const { data: reports } = useQuery({
    queryKey: ['task-reports', activeTaskId],
    queryFn: () => api.getReports(activeTaskId!),
    enabled: Boolean(activeTaskId && task?.status === 'completed'),
  });

  // 1. Group historical runs into distinct execution attempts (BUG-03)
  const attempts: ExecutionAttempt[] = useMemo(() => {
    return groupRunsIntoAttempts(task?.agent_runs, task?.status);
  }, [task?.agent_runs, task?.status]);

  // 2. Select the latest execution attempt (BUG-01)
  const latestAttempt = useMemo(() => {
    return attempts.length > 0 ? attempts[attempts.length - 1] : null;
  }, [attempts]);

  // 3. Derive execution state for each of the 5 sequential agents strictly from the latest attempt
  const executionStates: AgentExecutionState[] = useMemo(() => {
    return deriveTimelineExecutionStates(FIVE_AGENTS, latestAttempt, task?.status);
  }, [latestAttempt, task?.status]);

  // Selected agent state
  const selectedState = useMemo(() => {
    return (
      executionStates.find((s) => s.meta.id === selectedAgentId) ||
      executionStates[0]
    );
  }, [executionStates, selectedAgentId]);

  // Pending approval record (if task is awaiting_approval)
  const pendingApproval = useMemo(() => {
    if (task?.status !== 'awaiting_approval' || !task.approvals) return null;
    return task.approvals.find((a) => a.status === 'pending') || task.approvals[0] || null;
  }, [task]);

  // Handle manual task execution trigger
  const handleTriggerExecution = async () => {
    if (!task) return;
    setIsExecuting(true);
    try {
      await api.executeTask(task.id, false, task.requires_approval);
      await refetchActiveTask();
      await refetchTasks();
    } catch (err) {
      console.error('Execution trigger failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle human approval decision
  const handleDecideApproval = async (decision: 'approved' | 'rejected') => {
    if (!pendingApproval) return;
    setIsDeciding(true);
    try {
      await api.decideApproval(
        pendingApproval.id,
        decision,
        decisionReason || (decision === 'approved' ? 'Authorized in Workspace' : 'Rejected in Workspace'),
        false
      );
      setDecisionReason('');
      await refetchActiveTask();
      await refetchTasks();
    } catch (err) {
      console.error('Approval decision error:', err);
    } finally {
      setIsDeciding(false);
    }
  };

  const handleCopyReport = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Format status badge for task
  const renderTaskStatusBadge = (status?: TaskStatus) => {
    switch (status) {
      case 'running':
        return (
          <Badge variant="cyan" pulse>
            Executing Workflow
          </Badge>
        );
      case 'awaiting_approval':
        return (
          <Badge variant="warning" pulse>
            Awaiting Human Approval
          </Badge>
        );
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="neutral">Pending Execution</Badge>;
    }
  };

  // Format node status badge
  const renderNodeStatusBadge = (status: DerivedAgentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#36B98A]/10 text-[#36B98A] border border-[#36B98A]/30">
            <CheckCircle2 className="w-3 h-3 text-[#36B98A]" />
            DONE
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#55C7D9]/15 text-[#55C7D9] border border-[#55C7D9]/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#55C7D9] animate-ping" />
            RUNNING
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E6AA57]/15 text-[#E6AA57] border border-[#E6AA57]/40 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-[#E6AA57]" />
            GATE PAUSED
          </span>
        );
      case 'rejected_at_gate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E6AA57]/15 text-[#E6AA57] border border-[#E6AA57]/40">
            <ShieldAlert className="w-3 h-3 text-[#E6AA57]" />
            REJECTED AT GATE
          </span>
        );
      case 'not_executed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1C222E] text-[#9CA3AF] border border-[#252B36]">
            <Clock className="w-3 h-3 text-[#9CA3AF]" />
            NOT EXECUTED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E16D78]/10 text-[#E16D78] border border-[#E16D78]/30">
            <XCircle className="w-3 h-3 text-[#E16D78]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1C222E] text-[#9CA3AF] border border-[#252B36]">
            <Clock className="w-3 h-3 text-[#9CA3AF]" />
            WAITING
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Top Console Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#252B36]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#1C222E] text-[#8B7CFF] border border-[#252B36]">
              Execution Console
            </span>
            <span className="text-xs text-[#9CA3AF] font-mono">
              LangGraph 5-Agent Pipeline
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] mt-1 flex items-center gap-2">
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
              className="bg-[#151922] text-[#E5E7EB] text-xs font-mono rounded-md border border-[#252B36] px-3 py-1.5 pr-8 focus:outline-none focus:border-[#8B7CFF] cursor-pointer hover:border-[#343C4B] transition-colors"
            >
              {recentTasks.length === 0 && <option value="">No Tasks Found</option>}
              {recentTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status.toUpperCase()}] {t.title.slice(0, 32)}...
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchActiveTask()}
            isLoading={isTaskRefetching}
            title="Refetch task execution state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTopologyFlow(!showTopologyFlow)}
            className="text-xs font-mono"
          >
            <Terminal className="w-3.5 h-3.5 text-[#55C7D9]" />
            <span>{showTopologyFlow ? 'Hide Diagram' : 'DAG Diagram'}</span>
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
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Task Summary Banner */}
      {task ? (
        <div className="p-4 rounded-lg bg-[#11141B] border border-[#252B36] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#252B36]/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-[#55C7D9] font-medium">
                  TASK-ID: {task.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181D27] text-[#9CA3AF] border border-[#252B36]">
                  {task.category}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                    task.priority === 'critical'
                      ? 'bg-[#E16D78]/10 text-[#E16D78] border-[#E16D78]/30'
                      : 'bg-[#181D27] text-[#9CA3AF] border-[#252B36]'
                  }`}
                >
                  {task.priority} Priority
                </span>
                {task.requires_approval && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6AA57]/10 text-[#E6AA57] border border-[#E6AA57]/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#E6AA57]" />
                    HITL Gated
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-[#E5E7EB] tracking-tight">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {renderTaskStatusBadge(task.status)}

              {task.status === 'running' && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-[#55C7D9]">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Live Polling (1.5s)
                </span>
              )}

              {(task.status === 'pending' || task.status === 'failed') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleTriggerExecution}
                  isLoading={isExecuting}
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span>Execute Workflow</span>
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed line-clamp-2">
            {task.description}
          </p>
        </div>
      ) : isTaskLoading ? (
        <div className="p-8 rounded-lg bg-[#11141B] border border-[#252B36] text-center space-y-2">
          <Activity className="w-6 h-6 text-[#8B7CFF] animate-spin mx-auto" />
          <p className="text-xs text-[#9CA3AF] font-mono">Loading active task state from SQLite...</p>
        </div>
      ) : (
        <div className="p-8 rounded-lg bg-[#11141B] border border-[#252B36] text-center space-y-3">
          <Terminal className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
          <p className="text-sm font-medium text-[#E5E7EB]">No Task Selected</p>
          <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
            Select a task from the dropdown or submit a new execution objective to inspect live agent activity.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/new-task')}>
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      )}

      {/* Human-in-the-Loop Governance Gate Banner (if awaiting approval) */}
      {task?.status === 'awaiting_approval' && pendingApproval && (
        <div className="p-4 rounded-lg bg-[#E6AA57]/10 border border-[#E6AA57]/40 space-y-3 animate-fade-in shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6AA57]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#E6AA57]/20 border border-[#E6AA57]/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-[#E6AA57]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#E6AA57] tracking-wider uppercase font-mono">
                  Human-in-the-Loop Governance Gate Active
                </h3>
                <p className="text-[11px] text-[#E5E7EB] mt-0.5">
                  Workflow paused before Verifier Agent. Review findings below to approve publication or reject.
                </p>
              </div>
            </div>

            <Link
              to="/approvals"
              className="text-xs font-mono text-[#E6AA57] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All Approvals</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Payload preview if available */}
          {pendingApproval.payload && (
            <div className="p-3 rounded bg-[#0B0D12] border border-[#252B36] text-xs font-mono text-[#9CA3AF] max-h-36 overflow-y-auto whitespace-pre-wrap">
              {pendingApproval.payload}
            </div>
          )}

          {/* Decision Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <input
              type="text"
              placeholder="Optional reasoning note for audit log..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="flex-1 bg-[#0B0D12] text-[#E5E7EB] text-xs font-mono px-3 py-1.5 rounded border border-[#252B36] focus:outline-none focus:border-[#E6AA57]"
            />

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecideApproval('rejected')}
                isLoading={isDeciding}
                className="text-[#E16D78] hover:text-[#E16D78] border-[#E16D78]/30 hover:border-[#E16D78]"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Execution</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDecideApproval('approved')}
                isLoading={isDeciding}
                className="bg-[#36B98A] hover:bg-[#2fa379] text-[#0B0D12] font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Authorize &amp; Resume</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible React Flow DAG Diagram */}
      {showTopologyFlow && (
        <div className="rounded-lg bg-[#11141B] border border-[#252B36] p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1 font-mono">
            <span>Graph Pipeline Architecture</span>
            <span className="text-[11px] text-[#9CA3AF]/60">5-agent sequential topology</span>
          </div>
          <OrchestrationFlow
            height="300px"
            activeNodeId={
              executionStates.find((s) => s.status === 'running')?.meta.nodeId || null
            }
          />
        </div>
      )}

      {/* SECTION 2: Five-Agent Sequential Execution Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#8B7CFF]" />
              Sequential Execution Timeline (5 Agents)
            </h2>
            {attempts.length > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">
                Attempt {attempts.length} of {attempts.length} (Latest)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-[#9CA3AF]">
            Derived from SQLite AgentRun records
          </span>
        </div>

        {/* Horizontal Sequential Agent Pipeline Track */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {executionStates.map((agentState, index) => {
            const isSelected = selectedAgentId === agentState.meta.id;
            const Icon = agentState.meta.icon;

            return (
              <div
                key={agentState.meta.id}
                onClick={() => setSelectedAgentId(agentState.meta.id)}
                className={`p-3 rounded-lg bg-[#151922] border cursor-pointer select-none transition-all flex flex-col justify-between relative group ${
                  isSelected
                    ? 'border-[#8B7CFF] ring-1 ring-[#8B7CFF]/50 bg-[#181D27]'
                    : 'border-[#252B36] hover:border-[#343C4B]'
                }`}
              >
                {/* Connecting arrow indicator between nodes for desktop */}
                {index < 4 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <span className="w-3 h-3 rounded-full bg-[#11141B] border border-[#252B36] flex items-center justify-center text-[#9CA3AF] text-[9px]">
                      ›
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#9CA3AF]">
                      STEP 0{agentState.meta.order}
                    </span>
                    {renderNodeStatusBadge(agentState.status)}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className="w-7 h-7 rounded bg-[#11141B] border border-[#252B36] flex items-center justify-center shrink-0"
                      style={{ color: agentState.meta.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-[#E5E7EB] truncate">
                        {agentState.meta.name}
                      </h3>
                      <p className="text-[10px] text-[#9CA3AF] font-mono truncate">
                        {agentState.meta.role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration & Execution Timestamp */}
                <div className="pt-2.5 mt-2 border-t border-[#252B36]/60 flex items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                  <span>
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
                  <span>
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
      </div>

      {/* SECTION 3 & 4: Deep-Dive Agent Inspector Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Agent Specific Execution Output Console */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#55C7D9]" />
              Agent Output Inspector: {selectedState.meta.name}
            </h2>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#9CA3AF]">Model:</span>
              <span className="text-[#E5E7EB] font-medium">qwen3.5:4b (Ollama)</span>
            </div>
          </div>

          <Card className="space-y-4">
            {/* Inspector Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#252B36]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md bg-[#11141B] border border-[#252B36] flex items-center justify-center shrink-0"
                  style={{ color: selectedState.meta.color }}
                >
                  <selectedState.meta.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#E5E7EB]">
                    {selectedState.meta.name}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] font-mono">
                    {selectedState.meta.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                {renderNodeStatusBadge(selectedState.status)}
                {selectedState.durationMs != null && (
                  <span className="px-2 py-0.5 rounded bg-[#181D27] text-[#55C7D9] border border-[#252B36]">
                    {selectedState.durationMs} ms
                  </span>
                )}
              </div>
            </div>

            {/* Timestamps Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] p-2.5 rounded bg-[#11141B] border border-[#252B36]">
              <div>
                <span className="text-[#9CA3AF] block text-[10px]">STARTED AT</span>
                <span className="text-[#E5E7EB]">
                  {selectedState.startedAt ? formatDate(selectedState.startedAt) : 'Not started'}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[10px]">COMPLETED AT</span>
                <span className="text-[#E5E7EB]">
                  {selectedState.completedAt ? formatDate(selectedState.completedAt) : '—'}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#9CA3AF] block text-[10px]">EXECUTION TIME</span>
                <span className="text-[#55C7D9]">
                  {selectedState.durationMs != null ? `${selectedState.durationMs} ms` : '—'}
                </span>
              </div>
            </div>

            {/* Agent-Specific Renderers */}
            {selectedState.status === 'waiting' ? (
              <div className="p-8 text-center space-y-2 rounded bg-[#11141B] border border-[#252B36]">
                <Clock className="w-6 h-6 text-[#9CA3AF]/40 mx-auto" />
                <p className="text-xs font-mono text-[#E5E7EB]">Agent Pending Execution</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  This node executes sequentially when previous agents in the LangGraph DAG complete.
                </p>
              </div>
            ) : selectedState.status === 'running' ? (
              <div className="p-8 text-center space-y-3 rounded bg-[#11141B] border border-[#55C7D9]/30">
                <Activity className="w-7 h-7 text-[#55C7D9] animate-spin mx-auto" />
                <p className="text-xs font-mono font-medium text-[#55C7D9]">
                  Generating Output via Local Ollama...
                </p>
                <p className="text-[11px] text-[#9CA3AF] max-w-sm mx-auto">
                  Performing inference with qwen3.5:4b. Live polling will update results automatically upon completion.
                </p>
              </div>
            ) : selectedState.status === 'awaiting_approval' ? (
              <div className="p-6 text-center space-y-3 rounded bg-[#E6AA57]/10 border border-[#E6AA57]/40">
                <ShieldAlert className="w-7 h-7 text-[#E6AA57] mx-auto animate-pulse" />
                <p className="text-xs font-mono font-medium text-[#E6AA57]">
                  Human-in-the-Loop Governance Gate Paused
                </p>
                <p className="text-[11px] text-[#E5E7EB] max-w-md mx-auto">
                  The Verification Agent will resume immediately once human authorization is approved via the gate control banner above.
                </p>
              </div>
            ) : selectedState.status === 'rejected_at_gate' ? (
              <div className="p-5 rounded bg-[#E6AA57]/10 border border-[#E6AA57]/40 space-y-3 font-mono">
                <div className="flex items-center gap-2 text-[#E6AA57] text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  HUMAN-IN-THE-LOOP GOVERNANCE REJECTION
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#9CA3AF] uppercase">Rejection Reason:</span>
                  <p className="text-xs text-[#E5E7EB] bg-[#0B0D12] p-3 rounded border border-[#252B36] font-sans">
                    {extractRejectionReason(selectedState.outputData) || 'Task rejected by Human-in-the-Loop governance.'}
                  </p>
                </div>
                <div className="p-3 rounded bg-[#0B0D12] border border-[#252B36] text-[11px] text-[#9CA3AF] space-y-1">
                  <p className="text-[#E5E7EB] font-medium">Verification Model Execution Bypassed</p>
                  <p>
                    This task was aborted by a human operator prior to Verification Agent execution.
                    The Verifier LLM was not invoked, and 0 inference tokens were consumed.
                  </p>
                </div>
              </div>
            ) : selectedState.status === 'not_executed' ? (
              <div className="p-8 text-center space-y-2 rounded bg-[#11141B] border border-[#252B36]">
                <XCircle className="w-6 h-6 text-[#9CA3AF]/40 mx-auto" />
                <p className="text-xs font-mono text-[#E5E7EB]">Agent Not Executed</p>
                <p className="text-[11px] text-[#9CA3AF] max-w-sm mx-auto">
                  This agent was bypassed and never executed because workflow progression was halted at the governance gate.
                </p>
              </div>
            ) : selectedState.status === 'failed' ? (
              <div className="p-4 rounded bg-[#E16D78]/10 border border-[#E16D78]/40 space-y-2">
                <div className="flex items-center gap-2 text-[#E16D78] font-mono text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Agent Execution Failed
                </div>
                <p className="text-xs font-mono text-[#E5E7EB] whitespace-pre-wrap">
                  {selectedState.outputData || task?.error_message || 'Unknown execution failure.'}
                </p>
              </div>
            ) : (
              /* COMPLETED AGENT OUTPUTS */
              <div className="space-y-4">
                {/* 1. PLANNER AGENT OUTPUT */}
                {selectedState.meta.id === 'planner' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                      Generated Plan Steps &amp; Strategy
                    </span>
                    <div className="p-3.5 rounded-md bg-[#0B0D12] border border-[#252B36] font-mono text-xs text-[#E5E7EB] space-y-2 whitespace-pre-wrap leading-relaxed">
                      {selectedState.outputData || 'No plan data recorded.'}
                    </div>
                  </div>
                )}

                {/* 2. RESEARCHER AGENT OUTPUT */}
                {selectedState.meta.id === 'researcher' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                      <span>Synthesized Evidence &amp; Knowledge Base Chunks</span>
                      <span className="text-[#55C7D9]">Tavily Web + ChromaDB</span>
                    </div>

                    <div className="p-3.5 rounded-md bg-[#0B0D12] border border-[#252B36] font-mono text-xs text-[#E5E7EB] whitespace-pre-wrap leading-relaxed space-y-2 max-h-96 overflow-y-auto">
                      {selectedState.outputData || 'No research data recorded.'}
                    </div>
                  </div>
                )}

                {/* 3. ANALYST AGENT OUTPUT */}
                {selectedState.meta.id === 'analyst' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                      Synthesized Analysis &amp; Strategic Tradeoffs
                    </span>
                    <div className="p-3.5 rounded-md bg-[#0B0D12] border border-[#252B36] font-mono text-xs text-[#E5E7EB] space-y-2 whitespace-pre-wrap leading-relaxed">
                      {selectedState.outputData || 'No analysis data recorded.'}
                    </div>
                  </div>
                )}

                {/* 4. VERIFIER AGENT OUTPUT */}
                {selectedState.meta.id === 'verifier' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                      <span>Fact-Check &amp; Numerical Consistency Audit</span>
                      <span className="text-[#36B98A] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Grounded Verification
                      </span>
                    </div>

                    <div className="p-3.5 rounded-md bg-[#0B0D12] border border-[#252B36] font-mono text-xs text-[#E5E7EB] whitespace-pre-wrap leading-relaxed space-y-2 max-h-96 overflow-y-auto">
                      {selectedState.outputData || 'No verification data recorded.'}
                    </div>
                  </div>
                )}

                {/* 5. REPORTER AGENT OUTPUT */}
                {selectedState.meta.id === 'reporter' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                        Final Executive Markdown Report
                      </span>

                      {selectedState.outputData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyReport(selectedState.outputData!)}
                          className="text-xs font-mono"
                        >
                          {copiedReport ? (
                            <>
                              <Check className="w-3 h-3 text-[#36B98A]" />
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

                    <div className="p-4 rounded-md bg-[#0B0D12] border border-[#252B36] font-sans text-xs text-[#E5E7EB] space-y-3 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedState.outputData ||
                        task?.result_summary ||
                        'No executive report recorded.'}
                    </div>

                    {reports && reports.length > 0 && (
                      <div className="p-3 rounded bg-[#11141B] border border-[#252B36] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-[#36B98A]" />
                          <span className="text-xs text-[#E5E7EB]">
                            Executive report archived in persistent database
                          </span>
                        </div>
                        <Link
                          to="/reports"
                          className="text-xs font-mono text-[#8B7CFF] hover:underline flex items-center gap-1"
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
        </div>

        {/* Right Column (1/3): Execution Event Stream Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#8B7CFF]" />
              Database Event Logs
            </h2>
            <span className="text-[10px] font-mono text-[#9CA3AF]">
              SQLite AgentRun Stream
            </span>
          </div>

          <div className="rounded-lg bg-[#0B0D12] border border-[#252B36] p-3 text-xs font-mono space-y-3 max-h-[520px] overflow-y-auto">
            {attempts.length > 0 ? (
              <div className="space-y-4">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    className={`rounded-lg border p-3 space-y-2.5 ${
                      attempt.isLatest
                        ? 'bg-[#151922] border-[#343C4B]'
                        : 'bg-[#11141B]/80 border-[#252B36] opacity-85'
                    }`}
                  >
                    {/* Attempt Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#252B36]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#E5E7EB]">
                          Attempt #{attempt.attemptNumber}
                        </span>
                        {attempt.isLatest && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40 font-mono">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#9CA3AF]">
                          {attempt.runs.length} {attempt.runs.length === 1 ? 'agent' : 'agents'}
                        </span>
                        {attempt.status === 'completed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#36B98A]/15 text-[#36B98A] border border-[#36B98A]/30">
                            COMPLETED
                          </span>
                        )}
                        {attempt.status === 'rejected' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E6AA57]/15 text-[#E6AA57] border border-[#E6AA57]/30">
                            REJECTED
                          </span>
                        )}
                        {attempt.status === 'failed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E16D78]/15 text-[#E16D78] border border-[#E16D78]/30">
                            FAILED
                          </span>
                        )}
                        {attempt.status === 'running' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#55C7D9]/15 text-[#55C7D9] border border-[#55C7D9]/30">
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
                            className="p-2 rounded bg-[#0B0D12] border border-[#252B36]/80 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-[#8B7CFF]">
                                {run.agent_name}
                              </span>
                              <span className="text-[#9CA3AF] text-[10px]">
                                {timeAgo(run.completed_at || run.started_at)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
                              <span>
                                STATUS:{' '}
                                {isRejection ? (
                                  <span className="text-[#E6AA57]">REJECTED AT GATE</span>
                                ) : (
                                  <span
                                    className={
                                      run.status === 'completed'
                                        ? 'text-[#36B98A]'
                                        : run.status === 'failed'
                                        ? 'text-[#E16D78]'
                                        : 'text-[#55C7D9]'
                                    }
                                  >
                                    {run.status.toUpperCase()}
                                  </span>
                                )}
                              </span>
                              <span>
                                {isRejection
                                  ? '0 ms (Marker)'
                                  : run.execution_time_ms
                                  ? `${run.execution_time_ms} ms`
                                  : '—'}
                              </span>
                            </div>

                            {isRejection ? (
                              <p className="text-[10px] text-[#E6AA57] truncate">
                                <span className="text-[#9CA3AF]/60">REASON:</span>{' '}
                                {extractRejectionReason(run.output_data)}
                              </p>
                            ) : run.input_data ? (
                              <p className="text-[10px] text-[#9CA3AF] truncate">
                                <span className="text-[#9CA3AF]/60">INPUT:</span> {run.input_data}
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
              <div className="p-6 text-center space-y-2 text-[#9CA3AF]">
                <Activity className="w-5 h-5 text-[#9CA3AF]/40 mx-auto" />
                <p className="text-xs font-medium text-[#E5E7EB]">No execution logs yet</p>
                <p className="text-[11px]">
                  When this task runs, live timestamps and event records from SQLite will stream here.
                </p>
              </div>
            )}

            {/* Task state summary footer */}
            {task && (
              <div className="pt-2 border-t border-[#252B36] text-[10px] text-[#9CA3AF] space-y-1">
                <div className="flex justify-between">
                  <span>Task Created:</span>
                  <span className="text-[#E5E7EB]">{timeAgo(task.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution Attempts:</span>
                  <span className="text-[#8B7CFF] font-semibold">{attempts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Agent Runs:</span>
                  <span className="text-[#55C7D9]">{task.agent_runs?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Task Status:</span>
                  <span className="text-[#E5E7EB] uppercase font-bold">{task.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
