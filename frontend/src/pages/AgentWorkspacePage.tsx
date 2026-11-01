import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import type { AgentRunBrief, TaskStatus } from '../types';
import {
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
  FileText,
  Terminal,
  Activity,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  Copy,
  Check,
  ShieldAlert,
  Gavel,
  Database,
  ExternalLink,
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
}

const FIVE_AGENTS: AgentMeta[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    dbName: 'Planner Agent',
    role: 'Orchestration & Task Strategy',
    order: 1,
    icon: GitBranch,
    color: '#818CF8',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    dbName: 'Research Agent',
    role: 'ChromaDB & Tavily Grounding',
    order: 2,
    icon: Search,
    color: '#22D3EE',
  },
  {
    id: 'analyst',
    name: 'Analysis Agent',
    dbName: 'Analysis Agent',
    role: 'Synthesis & Tradeoff Analysis',
    order: 3,
    icon: Brain,
    color: '#A78BFA',
  },
  {
    id: 'verifier',
    name: 'Verification Agent',
    dbName: 'Verification Agent',
    role: 'Guardrails & Governance Audit',
    order: 4,
    icon: ShieldCheck,
    color: '#34D399',
  },
  {
    id: 'reporter',
    name: 'Reporter Agent',
    dbName: 'Reporter Agent',
    role: 'Executive Markdown Compilation',
    order: 5,
    icon: FileText,
    color: '#FBBF24',
  },
];

export const AgentWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTaskId = searchParams.get('taskId');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('planner');
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'output' | 'evidence' | 'details' | 'history'>('output');
  const [isDeciding, setIsDeciding] = useState<boolean>(false);

  // Fetch recent tasks for dropdown
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => api.getTasks({ limit: 20 }),
    refetchInterval: 5000,
  });

  const recentTasks = tasksData?.tasks || [];
  const effectiveTaskId = activeTaskId || (recentTasks.length > 0 ? recentTasks[0].id : null);

  // If no taskId in URL, auto-select first task
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

  const handleSelectTask = (taskId: string) => {
    setSearchParams({ taskId });
    setSelectedAgentId('planner');
  };

  const handleRerun = async () => {
    if (!effectiveTaskId) return;
    try {
      await api.executeTask(effectiveTaskId);
      await refetchTask();
      await refetchTasks();
    } catch (err) {
      console.error('Rerun failed:', err);
    }
  };

  const handleDecideApproval = async (decision: 'approved' | 'rejected') => {
    if (!pendingApproval) return;
    try {
      setIsDeciding(true);
      await api.decideApproval(
        pendingApproval.id,
        decision,
        decisionReason || undefined
      );
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

  const renderBadgeForAgentStatus = (status: DerivedAgentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 font-semibold tracking-wide">
            DONE
          </span>
        );
      case 'running':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/40 font-semibold animate-pulse tracking-wide">
            RUNNING
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-[#FBBF24] border border-amber-500/40 font-bold animate-pulse tracking-wide">
            APPROVAL GATE
          </span>
        );
      case 'rejected_at_gate':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/40 font-bold tracking-wide">
            REJECTED AT GATE
          </span>
        );
      case 'not_executed':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121624] text-[#64748B] border border-[#1E2638] tracking-wide">
            NOT EXECUTED
          </span>
        );
      case 'failed':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30 font-semibold tracking-wide">
            FAILED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101424] text-[#64748B] border border-[#1E2638] tracking-wide">
            STANDBY
          </span>
        );
    }
  };

  const renderTaskStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="cyan" pulse>Executing</Badge>;
      case 'awaiting_approval':
        return <Badge variant="warning" pulse>Awaiting Human Approval</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed / Rejected</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  // Helper to parse real sources from research/reporter output
  const extractedSources = React.useMemo(() => {
    const researchRun = task?.agent_runs?.find((r) => r.agent_name.toLowerCase().includes('research'));
    const reporterRun = task?.agent_runs?.find((r) => r.agent_name.toLowerCase().includes('report'));
    const combined = `${researchRun?.output_data || ''}\n${reporterRun?.output_data || ''}`;

    const webSources: { title: string; url: string; snippet?: string }[] = [];
    const docSources: { filename: string; excerpt?: string }[] = [];

    // Extract markdown web links: [Title](URL)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(combined)) !== null) {
      if (!webSources.some((s) => s.url === match![2])) {
        webSources.push({ title: match![1], url: match![2] });
      }
    }

    // Extract documents: **filename.pdf**
    const docRegex = /\*\*([a-zA-Z0-9_\-.]+\.(?:pdf|txt|md))\*\*/g;
    while ((match = docRegex.exec(combined)) !== null) {
      if (!docSources.some((d) => d.filename === match![1])) {
        docSources.push({ filename: match![1] });
      }
    }

    return { webSources, docSources };
  }, [task?.agent_runs]);

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header with Task Switcher & Mission Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101424] text-[#22D3EE] border border-[#1E2638] font-semibold">
              MISSION EXECUTION
            </span>
            {task && renderTaskStatusBadge(task.status)}
            {latestAttempt && (
              <span className="text-[10px] font-mono text-[#94A3B8]">
                Attempt {latestAttempt.attemptNumber} of {attempts.length} {latestAttempt.isLatest ? '(Latest)' : ''}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] truncate font-sans">
            {task ? task.title : 'Loading Task...'}
          </h1>
          {task?.description && (
            <p className="text-xs text-[#94A3B8] max-w-3xl line-clamp-1">
              {task.description}
            </p>
          )}
        </div>

        {/* Task Selector & Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {recentTasks.length > 0 && (
            <div className="relative">
              <select
                aria-label="Select task to inspect in workspace"
                value={effectiveTaskId || ''}
                onChange={(e) => handleSelectTask(e.target.value)}
                className="bg-[#0E1320] text-[#F1F5F9] text-xs font-mono px-3 py-2 pr-8 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6] cursor-pointer appearance-none shadow-sm"
              >
                {recentTasks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#07090E] text-[#F1F5F9]">
                    #{t.id.slice(0, 6)} - {t.title.slice(0, 32)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRerun}
            disabled={task?.status === 'running' || task?.status === 'awaiting_approval'}
            className="text-xs font-mono h-9 px-3 border-[#1E2638] bg-[#0E1320] hover:bg-[#121828] text-[#94A3B8]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Rerun</span>
          </Button>
        </div>
      </div>

      {/* 2. Prominent Human-in-the-Loop Governance Gate Banner if Awaiting Approval */}
      {task?.status === 'awaiting_approval' && pendingApproval && (
        <div className="p-5 rounded bg-[#181B25] border border-amber-500/40 amber-radiant-sheen space-y-3.5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2638]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-amber-500/20 text-[#FBBF24] border border-amber-500/40 flex items-center justify-center shrink-0">
                <Gavel className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#F1F5F9]">
                    Human-in-the-Loop Governance Gate Active
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#07090E] text-[#FBBF24] border border-amber-500/40 font-bold">
                    L3 AUTHORIZATION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Execution paused before the Verification &amp; Report stages. Review intermediate analysis payload below before resuming.
                </p>
              </div>
            </div>
          </div>

          {/* Intermediate Payload Snapshot */}
          {pendingApproval.payload && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                Intermediate Swarm Findings &amp; Analysis Output:
              </div>
              <div className="p-3.5 rounded bg-[#07090E] border border-[#1E2638] font-mono text-xs text-[#F1F5F9] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {pendingApproval.payload}
              </div>
            </div>
          )}

          {/* Decision Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <input
              type="text"
              placeholder="Optional operator justification notes..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="flex-1 bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2 rounded border border-[#1E2638] focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecideApproval('rejected')}
                isLoading={isDeciding}
                className="text-[#FB7185] hover:text-[#FB7185] border-[#F43F5E]/40 hover:border-[#F43F5E] bg-[#0E1320] font-mono text-xs h-9 px-4"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Reject</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDecideApproval('approved')}
                isLoading={isDeciding}
                className="bg-[#10B981] hover:bg-[#059669] text-[#07090E] font-bold border border-[#34D399] font-mono text-xs h-9 px-4 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                <span>Authorize &amp; Resume</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Five-Agent Workflow Visualization (Signature Centerpiece) */}
      <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8B5CF6]" />
            <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans">
              LangGraph Multi-Agent Execution Pipeline
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#64748B]">
            Click any agent to inspect runtime logs and outputs
          </span>
        </div>

        {/* Horizontal Pipeline Grid with Connected Nodes */}
        <div className="relative pt-2 pb-2">
          {/* Animated Connecting Line (Hidden on Mobile) */}
          <div className="hidden lg:block absolute top-[44px] left-[6%] right-[6%] h-[2px] bg-[#1E2638] z-0">
            <div className="h-full energy-line opacity-75" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 relative z-10">
            {executionStates.map((node, index) => {
              const Icon = node.meta.icon;
              const isSelected = node.meta.id === selectedAgentId;
              const isRunning = node.status === 'running';

              return (
                <div
                  key={node.meta.id}
                  onClick={() => setSelectedAgentId(node.meta.id)}
                  className={`p-4 rounded border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                    isSelected
                      ? 'bg-[#141A2B] border-[#8B5CF6] shadow-[0_0_16px_rgba(139,92,246,0.25)] ring-1 ring-[#8B5CF6]/50'
                      : 'bg-[#0E1320] border-[#1E2638] hover:border-[#2A354D] hover:bg-[#121828]'
                  }`}
                >
                  {/* Top Node Header: Order & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#07090E] text-[#64748B] border border-[#1E2638]">
                      Step #{index + 1}
                    </span>
                    {renderBadgeForAgentStatus(node.status)}
                  </div>

                  {/* Agent Identity & Accessible Heading */}
                  <div className="flex items-center gap-2.5 min-w-0 pt-1">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#181F33] text-[#A78BFA] border-[#8B5CF6]/60'
                          : 'bg-[#07090E] text-[#64748B] border-[#1E2638] group-hover:text-[#94A3B8]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isRunning ? 'animate-pulse text-[#22D3EE]' : ''}`} />
                    </div>

                    <div className="min-w-0">
                      <h3
                        role="heading"
                        aria-level={3}
                        className={`text-xs font-semibold truncate font-sans ${
                          isSelected ? 'text-[#F1F5F9]' : 'text-[#CBD5E1] group-hover:text-[#F1F5F9]'
                        }`}
                      >
                        {node.meta.name}
                      </h3>
                      <p className="text-[10px] font-mono text-[#64748B] truncate">
                        {node.meta.role.split('&')[0].trim()}
                      </p>
                    </div>
                  </div>

                  {/* Execution Duration / Timestamp Telemetry */}
                  <div className="pt-2 border-t border-[#1E2638] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                    <span>DURATION</span>
                    <span className="text-[#F1F5F9] font-medium tabular-nums">
                      {node.durationMs !== undefined ? `${(node.durationMs / 1000).toFixed(1)}s` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Lower Area: Runtime Inspector (7 cols) + Database Event Logs (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Runtime Inspector (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
          {/* Inspector Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2638]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#22D3EE]" />
              <h3 className="text-sm font-semibold text-[#F1F5F9] font-sans">
                Runtime Inspector: <span className="text-[#A78BFA]">{selectedState.meta.name}</span>
              </h3>
            </div>

            {/* Clean Tab Pills */}
            <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded border border-[#1E2638] text-xs font-mono">
              <button
                onClick={() => setInspectorTab('output')}
                className={`px-3 py-1.5 rounded transition-all ${
                  inspectorTab === 'output'
                    ? 'bg-[#141A2B] text-[#F1F5F9] font-medium border border-[#283652]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Agent Output
              </button>
              <button
                onClick={() => setInspectorTab('evidence')}
                className={`px-3 py-1.5 rounded transition-all ${
                  inspectorTab === 'evidence'
                    ? 'bg-[#141A2B] text-[#F1F5F9] font-medium border border-[#283652]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Evidence ({extractedSources.docSources.length + extractedSources.webSources.length})
              </button>
              <button
                onClick={() => setInspectorTab('details')}
                className={`px-3 py-1.5 rounded transition-all ${
                  inspectorTab === 'details'
                    ? 'bg-[#141A2B] text-[#F1F5F9] font-medium border border-[#283652]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Run Details
              </button>
            </div>
          </div>

          {/* Tab 1: Agent Output */}
          {inspectorTab === 'output' && (
            <div className="space-y-3">
              {/* Condition A: HITL Governance Rejection */}
              {selectedState.status === 'rejected_at_gate' && (
                <div className="p-4 rounded bg-[#18131A] border border-[#F43F5E]/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#FB7185] font-semibold text-xs font-mono">
                    <ShieldAlert className="w-4 h-4 text-[#FB7185]" />
                    <span>HUMAN-IN-THE-LOOP GOVERNANCE REJECTION</span>
                  </div>
                  <div className="text-xs font-mono text-[#F1F5F9] bg-[#07090E] p-3 rounded border border-[#1E2638]">
                    {extractRejectionReason(selectedState.outputData) || 'Data sources unverified - abort'}
                  </div>
                  <p className="text-[11px] font-mono text-[#94A3B8]">
                    Verification Model Execution Bypassed. Workflow halted at the approval gate before downstream synthesis.
                  </p>
                </div>
              )}

              {/* Condition B: Unexecuted Agent After Rejection */}
              {selectedState.status === 'not_executed' && (
                <div className="p-8 text-center rounded bg-[#07090E] border border-[#1E2638] space-y-2">
                  <Clock className="w-8 h-8 text-[#475569] mx-auto" />
                  <h4 className="text-sm font-semibold text-[#F1F5F9] font-sans">Agent Not Executed</h4>
                  <p className="text-xs font-mono text-[#64748B] max-w-md mx-auto leading-relaxed">
                    bypassed and never executed because workflow progression was halted by human governance rejection at the Verification checkpoint.
                  </p>
                </div>
              )}

              {/* Condition C: Waiting or Standby */}
              {selectedState.status === 'waiting' && (
                <div className="p-8 text-center rounded bg-[#07090E] border border-[#1E2638] space-y-2">
                  <Clock className="w-8 h-8 text-[#475569] mx-auto" />
                  <h4 className="text-sm font-semibold text-[#F1F5F9] font-sans">Standby / Awaiting Preceding Agent</h4>
                  <p className="text-xs font-mono text-[#64748B] max-w-md mx-auto">
                    This agent is scheduled to run after upstream nodes complete execution.
                  </p>
                </div>
              )}

              {/* Condition D: Completed or Normal Output */}
              {(selectedState.status === 'completed' || selectedState.status === 'running' || selectedState.status === 'failed') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span>SYNTHESIZED OUTPUT BUFFER</span>
                    {selectedState.outputData && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedState.outputData || '');
                          setCopiedReport(true);
                          setTimeout(() => setCopiedReport(false), 2000);
                        }}
                        className="text-[#22D3EE] hover:text-[#A78BFA] flex items-center gap-1 transition-colors"
                      >
                        {copiedReport ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedReport ? 'Copied' : 'Copy Output'}</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] font-mono text-xs text-[#F1F5F9] max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedState.outputData || (isTaskLoading ? 'Loading agent output...' : 'No output recorded for this agent run.')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Grounding & Evidence */}
          {inspectorTab === 'evidence' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document RAG Sources */}
                <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F5F9]">
                      <Database className="w-4 h-4 text-[#8B5CF6]" />
                      <span>Retrieved Documents</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#101424] text-[#8B5CF6] border border-[#1E2638]">
                      {extractedSources.docSources.length} Found
                    </span>
                  </div>

                  {extractedSources.docSources.length > 0 ? (
                    <div className="space-y-2">
                      {extractedSources.docSources.map((doc, i) => (
                        <div key={i} className="p-2.5 rounded bg-[#0E1320] border border-[#1E2638] text-xs font-mono text-[#F1F5F9] flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                          <span className="truncate">{doc.filename}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-[#64748B] py-3">
                      No document chunks retrieved for this task.
                    </p>
                  )}
                </div>

                {/* Web Sources (Tavily) */}
                <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F5F9]">
                      <Search className="w-4 h-4 text-[#22D3EE]" />
                      <span>Web Sources</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#101424] text-[#22D3EE] border border-[#1E2638]">
                      {extractedSources.webSources.length} Citations
                    </span>
                  </div>

                  {extractedSources.webSources.length > 0 ? (
                    <div className="space-y-2">
                      {extractedSources.webSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded bg-[#0E1320] border border-[#1E2638] hover:border-[#22D3EE]/40 text-xs font-mono text-[#F1F5F9] flex items-center justify-between gap-2 transition-colors group"
                        >
                          <span className="truncate group-hover:text-[#22D3EE]">{src.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#64748B] shrink-0 group-hover:text-[#22D3EE]" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-[#64748B] py-3">
                      No external web sources retrieved.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Execution Details */}
          {inspectorTab === 'details' && (
            <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] space-y-3 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#1E2638]">
                <div>
                  <span className="text-[#64748B] block text-[10px]">STARTED AT</span>
                  <span className="text-[#F1F5F9]">
                    {selectedState.startedAt ? formatDate(selectedState.startedAt) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">COMPLETED AT</span>
                  <span className="text-[#F1F5F9]">
                    {selectedState.completedAt ? formatDate(selectedState.completedAt) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">EXECUTION TIME</span>
                  <span className="text-[#22D3EE] font-medium tabular-nums">
                    {selectedState.durationMs !== undefined ? `${selectedState.durationMs} ms` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">STATUS</span>
                  <span className="text-[#34D399] uppercase">{selectedState.status}</span>
                </div>
              </div>

              {selectedState.run?.input_data && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-[#64748B] uppercase tracking-wider">
                    Input Directives / Payload Sent to Agent:
                  </span>
                  <div className="p-3 rounded bg-[#0E1320] border border-[#1E2638] text-[#94A3B8] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedState.run.input_data}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Database Event Logs & Swarm Execution Attempts (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2638]">
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Database Event Logs</span>
            </h2>
            <span className="text-[10px] font-mono text-[#22D3EE]">
              SQLite AgentRun Stream
            </span>
          </div>

          {attempts.length > 0 ? (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt.attemptNumber}
                  className="p-3.5 rounded bg-[#07090E] border border-[#1E2638] space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F1F5F9]">
                        Attempt #{attempt.attemptNumber}
                      </span>
                      {attempt.isLatest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 font-mono font-bold">
                          LATEST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#64748B]">
                      {attempt.runs.length} Agent Runs
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    {attempt.runs.map((r) => (
                      <div
                        key={r.id}
                        className="px-2.5 py-1.5 rounded bg-[#0E1320] border border-[#1E2638] flex items-center justify-between gap-2"
                      >
                        <span className="text-[#94A3B8] truncate">
                          {r.agent_name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 text-[10px]">
                          <span className={r.status === 'completed' ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                            {r.status}
                          </span>
                          <span className="text-[#64748B] tabular-nums">
                            {r.execution_time_ms ? `${(r.execution_time_ms / 1000).toFixed(1)}s` : '0s'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {attempt.rejectionReason && (
                    <div className="text-xs font-mono text-[#FB7185] bg-[#18131A] p-2.5 rounded border border-[#F43F5E]/30">
                      Rejection Note: {attempt.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-[#64748B] p-4 text-center">
              No prior attempts found in SQLite execution history.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
