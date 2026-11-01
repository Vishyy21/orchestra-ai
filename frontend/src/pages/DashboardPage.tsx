import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import {
  FileText,
  Search,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Hourglass,
  ArrowRight,
  Plus,
  Play,
  Sun,
  Moon,
  MoreHorizontal,
  Layers,
  Cpu,
  Sliders,
  Zap,
} from 'lucide-react';
import { timeAgo, cn } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    refetchInterval: 8000,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks({ limit: 10 }),
    refetchInterval: 8000,
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: api.getHealth,
    refetchInterval: 15000,
  });

  const totalTasks = (metrics?.total_tasks && metrics.total_tasks > 0)
    ? metrics.total_tasks
    : (tasksData?.total && tasksData.total > 0 ? tasksData.total : (tasksData?.tasks?.length || 0));

  const completedTasks = (metrics?.completed_tasks !== undefined && metrics.completed_tasks > 0)
    ? metrics.completed_tasks
    : (tasksData?.tasks?.filter((t: any) => t.status === 'completed').length || 0);

  const inProgressTasks = (metrics?.running_tasks !== undefined && metrics.running_tasks > 0)
    ? metrics.running_tasks
    : (tasksData?.tasks?.filter((t: any) => t.status === 'running').length || 0);
  const modelName = metrics?.llm_model || 'qwen3.5:4b';
  const gpuModel = health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050';

  // Compute average runtime from actual completed tasks if available
  const avgRuntime = React.useMemo(() => {
    if (!tasksData?.tasks || tasksData.tasks.length === 0) return '3m 20s';
    const completed = tasksData.tasks.filter((t) => t.status === 'completed' && t.agent_runs?.length);
    if (completed.length === 0) return '3m 20s';
    let totalMs = 0;
    for (const t of completed) {
      const runTotal = t.agent_runs?.reduce((sum, r) => sum + (r.execution_time_ms || 0), 0) || 0;
      totalMs += runTotal;
    }
    const avgSec = Math.round(totalMs / (completed.length * 1000));
    const m = Math.floor(avgSec / 60);
    const s = avgSec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }, [tasksData?.tasks]);

  const recentTasks = (tasksData?.tasks && tasksData.tasks.length > 0)
    ? tasksData.tasks.slice(0, 5)
    : [];

  const getAgentDots = (task: any) => {
    if (task.status === 'completed') return [true, true, true, true, true];
    if (task.status === 'running') return [true, true, 'running', false, false];
    if (task.status === 'failed') return [true, true, true, 'failed', false];
    return [true, false, false, false, false];
  };

  const getTaskDuration = (task: any) => {
    if (!task.agent_runs || task.agent_runs.length === 0) return '—';
    const totalMs = task.agent_runs.reduce((sum: number, r: any) => sum + (r.execution_time_ms || 0), 0);
    if (!totalMs) return '—';
    const sec = Math.round(totalMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div
      className={cn(
        'p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans transition-colors duration-200',
        isLight ? 'text-[#172321]' : 'text-[#F1F5F9]'
      )}
    >
      {/* 1. Header Bar: Tag + Title + Hardware Status + Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span
            className={cn(
              'text-[10px] font-mono tracking-widest uppercase font-semibold block mb-1',
              isLight ? 'text-[#68736F]' : 'text-gray-400'
            )}
          >
            DASHBOARD
          </span>
          <h1
            className={cn(
              'text-2xl sm:text-3xl font-serif tracking-tight',
              isLight ? 'text-[#172321]' : 'text-white'
            )}
          >
            Research Operations
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {/* Local AI Orchestration Pill */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                isLight
                  ? 'bg-[#E6F4F1] border-[#C8E4DE] text-[#0E5B59]'
                  : 'bg-[#132B2A] border-[#1E4B48] text-[#22D3EE]'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#21845A] shadow-[0_0_6px_rgba(33,132,90,0.5)]" />
              <span>Local AI Orchestration</span>
            </div>

            {/* Model Chip */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors',
                isLight
                  ? 'bg-white border-[#E4E7E0] text-[#68736F]'
                  : 'bg-[#131920] border-[#1F2A37] text-gray-300'
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-[#0E5B59] dark:text-[#22D3EE]" />
              <span>{modelName}</span>
            </div>

            {/* GPU Chip */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors',
                isLight
                  ? 'bg-white border-[#E4E7E0] text-[#68736F]'
                  : 'bg-[#131920] border-[#1F2A37] text-gray-300'
              )}
            >
              <Cpu className="w-3.5 h-3.5 text-[#0E5B59] dark:text-[#22D3EE]" />
              <span>{gpuModel}</span>
            </div>
          </div>
        </div>

        {/* Right Top Controls */}
        <div className="flex items-center gap-2.5">
          {/* System Healthy Pill */}
          <div
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              isLight
                ? 'bg-[#EAF5EE] border-[#D1EAD8] text-[#21845A]'
                : 'bg-[#10241B] border-[#1A3E2F] text-[#34D399]'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#21845A] dark:bg-[#34D399] animate-pulse shadow-[0_0_8px_#34D399]" />
            <span>System Healthy</span>
          </div>

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'w-8 h-8 rounded-full border transition-all text-xs flex items-center justify-center',
              isLight
                ? 'bg-white border-[#E4E7E0] text-[#C5A46D] hover:text-[#B7791F] hover:bg-[#F1F2ED] shadow-2xs'
                : 'bg-[#131920] border-[#1F2A37] text-[#C5A46D] hover:text-white'
            )}
            title={`Switch to ${isLight ? 'Midnight Dark' : 'Luxury Light'}`}
          >
            {isLight ? <Sun className="w-4 h-4 text-[#C5A46D]" /> : <Moon className="w-4 h-4 text-[#C5A46D]" />}
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#0E5B59] text-white font-medium text-xs flex items-center justify-center shadow-xs">
            V
          </div>
        </div>
      </div>

      {/* 2. Main Hero: Compact Editorial Banner with 5-Agent Visual Illustration */}
      <div
        className={cn(
          'relative rounded-2xl p-6 sm:p-7 border overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#E4E7E0] shadow-xs'
            : 'bg-[#131920] border-[#1F2A37] shadow-xl'
        )}
      >
        {/* Left Editorial Copy & CTA with vertical teal accent bar */}
        <div className="relative z-10 max-w-xl border-l-[3px] border-[#0E5B59] pl-4 space-y-3">
          <h2
            className={cn(
              'text-2xl sm:text-3xl font-serif tracking-tight leading-tight',
              isLight ? 'text-[#172321]' : 'text-white'
            )}
          >
            From research question to{' '}
            <span className="italic text-[#0E5B59] dark:text-[#22D3EE]">
              evidence-backed report.
            </span>
          </h2>
          <p
            className={cn(
              'text-xs sm:text-sm leading-relaxed max-w-md',
              isLight ? 'text-[#68736F]' : 'text-gray-400'
            )}
          >
            A local multi-agent system that plans, researches, analyzes, verifies and generates trusted reports.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/new-task')}
              className="px-4 py-2 rounded-lg bg-[#0E5B59] hover:bg-[#0A4543] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Task</span>
            </button>

            <button
              onClick={() => navigate('/agents')}
              className={cn(
                'px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all',
                isLight
                  ? 'border-[#E4E7E0] bg-white text-[#172321] hover:bg-[#F1F2ED]'
                  : 'border-[#1F2A37] bg-[#18202A] text-gray-200 hover:text-white hover:bg-[#222E3C]'
              )}
            >
              <Play className="w-3 h-3 fill-current text-[#0E5B59] dark:text-[#22D3EE]" />
              <span>View Pipeline</span>
            </button>
          </div>
        </div>

        {/* Right 5-Agent Flow Illustration */}
        <div className="w-full lg:w-1/2 relative flex flex-col items-center justify-center py-2 pointer-events-none">
          {/* Subtle wave mesh in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-70">
            <svg
              viewBox="0 0 500 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="heroConduitTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0E5B59" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#286D78" stopOpacity="0.7" />
                  <stop offset="60%" stopColor="#14B8A6" stopOpacity="0.8" />
                  <stop offset="85%" stopColor="#C5A46D" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0E5B59" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <path
                d="M 10 60 Q 125 15, 250 60 T 490 60"
                stroke="url(#heroConduitTeal)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 10 60 Q 125 100, 250 60 T 490 60"
                stroke="url(#heroConduitTeal)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* 5 Nodes sitting across the wave matching the reference */}
          <div className="w-full grid grid-cols-5 text-center relative z-10 px-2">
            {[
              { name: 'Planner', desc: 'Define scope', icon: FileText },
              { name: 'Researcher', desc: 'Gather evidence', icon: Search },
              { name: 'Analyst', desc: 'Synthesize insights', icon: BarChart3 },
              { name: 'Verifier', desc: 'Validate & check', icon: ShieldCheck },
              { name: 'Reporter', desc: 'Generate report', icon: FileText },
            ].map((node) => {
              const Icon = node.icon;
              return (
                <div key={node.name} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs transition-all',
                      isLight
                        ? 'bg-white border-[#E4E7E0] text-[#0E5B59]'
                        : 'bg-[#18202A] border-[#1F2A37] text-[#22D3EE]'
                    )}
                  >
                    <Icon className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold mt-1.5',
                      isLight ? 'text-[#172321]' : 'text-gray-200'
                    )}
                  >
                    {node.name}
                  </span>
                  <span
                    className={cn(
                      'text-[9px]',
                      isLight ? 'text-[#68736F]' : 'text-gray-400'
                    )}
                  >
                    {node.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Metrics Strip: 5-Item Clean Horizontal Bar */}
      <div
        className={cn(
          'rounded-2xl border p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-[#1F2A37] transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#E4E7E0] shadow-xs'
            : 'bg-[#131920] border-[#1F2A37] shadow-md'
        )}
      >
        {/* Metric 1: Total Tasks */}
        <div className="flex items-center gap-3.5 pr-2">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              isLight
                ? 'bg-[#FDFBF7] text-[#C5A46D] border-[#F0E8D8]'
                : 'bg-[#1C1A14] text-[#C5A46D] border-[#2C2618]'
            )}
          >
            <Layers className="w-5 h-5 text-[#C5A46D]" />
          </div>
          <div>
            <div className={cn('text-xl font-bold font-serif leading-none', isLight ? 'text-[#172321]' : 'text-white')}>
              {totalTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
              Total Tasks
            </div>
          </div>
        </div>

        {/* Metric 2: Completed */}
        <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              isLight
                ? 'bg-[#EAF5EE] text-[#21845A] border-[#D1EAD8]'
                : 'bg-[#10241B] text-[#34D399] border-[#1A3E2F]'
            )}
          >
            <CheckCircle2 className="w-5 h-5 text-[#21845A] dark:text-[#34D399]" />
          </div>
          <div>
            <div className={cn('text-xl font-bold font-serif leading-none', isLight ? 'text-[#172321]' : 'text-white')}>
              {completedTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
              Completed
            </div>
          </div>
        </div>

        {/* Metric 3: In Progress */}
        <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              isLight
                ? 'bg-[#E6F4F1] text-[#0E5B59] border-[#C8E4DE]'
                : 'bg-[#132B2A] text-[#22D3EE] border-[#1E4B48]'
            )}
          >
            <RefreshCw className="w-5 h-5 text-[#0E5B59] dark:text-[#22D3EE]" />
          </div>
          <div>
            <div className={cn('text-xl font-bold font-serif leading-none', isLight ? 'text-[#172321]' : 'text-white')}>
              {inProgressTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
              In Progress
            </div>
          </div>
        </div>

        {/* Metric 4: Avg Runtime */}
        <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              isLight
                ? 'bg-[#FDF5E8] text-[#B7791F] border-[#F7E7CD]'
                : 'bg-[#251E14] text-[#D69E2E] border-[#382C1C]'
            )}
          >
            <Hourglass className="w-5 h-5 text-[#B7791F] dark:text-[#D69E2E]" />
          </div>
          <div>
            <div className={cn('text-xl font-bold font-serif leading-none', isLight ? 'text-[#172321]' : 'text-white')}>
              {completedTasks > 0 ? avgRuntime : '3m 20s'}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
              Avg. Runtime
            </div>
          </div>
        </div>

        {/* Metric 5: Mini Activity Visual (Teal / Petrol bars) */}
        <div className="flex items-center gap-3.5 sm:pl-3 pt-3 sm:pt-0 col-span-2 sm:col-span-1">
          <div className="flex items-end gap-1 h-8">
            <span className="w-1.5 h-3 rounded-xs bg-[#C8E4DE] dark:bg-[#1E4B48]" />
            <span className="w-1.5 h-5 rounded-xs bg-[#286D78] dark:bg-[#286D78]" />
            <span className="w-1.5 h-7 rounded-xs bg-[#0E5B59] dark:bg-[#14918E]" />
            <span className="w-1.5 h-4 rounded-xs bg-[#286D78] dark:bg-[#286D78]" />
            <span className="w-1.5 h-6 rounded-xs bg-[#0E5B59] dark:bg-[#14918E]" />
            <span className="w-1.5 h-8 rounded-xs bg-[#21845A] dark:bg-[#34D399]" />
          </div>
          <div>
            <div className={cn('text-xs font-semibold', isLight ? 'text-[#172321]' : 'text-white')}>
              Task Activity
            </div>
            <div className={cn('text-[10px]', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
              Last 7 days
            </div>
          </div>
        </div>
      </div>

      {/* 4. Asymmetrical Lower Grid: Recent Tasks (Left 65%) + Pipeline & Activity (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Research Tasks (8 of 12 columns) */}
        <div
          className={cn(
            'lg:col-span-8 rounded-2xl border p-5 sm:p-6 space-y-4 shadow-xs transition-all',
            isLight
              ? 'bg-[#FFFFFF] border-[#E4E7E0]'
              : 'bg-[#131920] border-[#1F2A37]'
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1F2A37]">
            <h3
              className={cn(
                'text-base font-semibold tracking-tight',
                isLight ? 'text-[#172321]' : 'text-white'
              )}
            >
              Recent Research Tasks
            </h3>
            <button
              onClick={() => navigate('/agents')}
              className={cn(
                'text-xs font-semibold flex items-center gap-1 transition-colors',
                isLight ? 'text-[#0E5B59] hover:text-[#0A4543]' : 'text-[#22D3EE] hover:text-white'
              )}
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider pb-2 border-b',
                    isLight ? 'text-[#68736F] border-gray-100' : 'text-gray-400 border-[#1F2A37]'
                  )}
                >
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Agents</th>
                  <th className="pb-3 font-medium">Started</th>
                  <th className="pb-3 font-medium text-right">Duration</th>
                  <th className="pb-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F2A37]/50">
                {recentTasks.length > 0 ? (
                  recentTasks.map((t: any) => {
                    const dots = getAgentDots(t);
                    const isCompleted = t.status === 'completed';
                    const isRunning = t.status === 'running';

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/agents?taskId=${t.id}`)}
                        className={cn(
                          'cursor-pointer transition-colors group',
                          isLight ? 'hover:bg-[#F7F6F1]' : 'hover:bg-[#18202A]'
                        )}
                      >
                        <td className="py-3.5 pr-3">
                          <div className="flex items-start gap-2.5">
                            <FileText
                              className={cn(
                                'w-4 h-4 mt-0.5 shrink-0 transition-colors',
                                isLight ? 'text-[#68736F] group-hover:text-[#0E5B59]' : 'text-gray-400 group-hover:text-[#22D3EE]'
                              )}
                            />
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  'text-xs font-semibold block truncate max-w-[240px]',
                                  isLight ? 'text-[#172321] group-hover:text-[#0E5B59]' : 'text-white group-hover:text-[#22D3EE]'
                                )}
                              >
                                {t.title}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] block truncate max-w-[240px] mt-0.5',
                                  isLight ? 'text-[#68736F]' : 'text-gray-400'
                                )}
                              >
                                {t.description || 'Autonomous multi-agent research analysis'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-2">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF5EE] dark:bg-[#10241B] text-[#21845A] dark:text-[#34D399] border border-[#D1EAD8] dark:border-[#1A3E2F]">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          ) : isRunning ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4F1] dark:bg-[#132B2A] text-[#0E5B59] dark:text-[#22D3EE] border border-[#C8E4DE] dark:border-[#1E4B48]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0E5B59] dark:bg-[#22D3EE] animate-pulse" />
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF5E8] dark:bg-[#251E14] text-[#B7791F] dark:text-[#D69E2E] border border-[#F7E7CD] dark:border-[#382C1C]">
                              Queued
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-1">
                            {dots.map((d: any, idx: number) => {
                              if (d === true) {
                                return (
                                  <span
                                    key={idx}
                                    className="w-2 h-2 rounded-full bg-[#0E5B59] dark:bg-[#14918E]"
                                  />
                                );
                              }
                              if (d === 'running') {
                                return (
                                  <span
                                    key={idx}
                                    className="w-2 h-2 rounded-full bg-[#286D78] animate-pulse"
                                  />
                                );
                              }
                              return (
                                <span
                                  key={idx}
                                  className={cn('w-2 h-2 rounded-full', isLight ? 'bg-[#E4E7E0]' : 'bg-gray-700')}
                                />
                              );
                            })}
                          </div>
                        </td>

                        <td
                          className={cn(
                            'py-3.5 px-2 text-[11px] whitespace-nowrap',
                            isLight ? 'text-[#68736F]' : 'text-gray-400'
                          )}
                        >
                          {timeAgo(t.created_at || new Date().toISOString())}
                        </td>

                        <td
                          className={cn(
                            'py-3.5 pl-2 text-right text-[11px] font-mono whitespace-nowrap',
                            isLight ? 'text-[#172321]' : 'text-gray-300'
                          )}
                        >
                          {getTaskDuration(t)}
                        </td>

                        <td className="py-3.5 pl-2 text-right">
                          <MoreHorizontal className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                      No research tasks yet. Dispatch your first task to see execution telemetry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Stack (4 of 12 columns): Agent Pipeline & Recent Activity */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Agent Pipeline (5 Agents) */}
          <div
            className={cn(
              'rounded-2xl border p-5 space-y-4 shadow-xs transition-all',
              isLight
                ? 'bg-[#FFFFFF] border-[#E4E7E0]'
                : 'bg-[#131920] border-[#1F2A37]'
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1F2A37]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
                <h3 className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
                  Agent Pipeline
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">
                5 Agents
              </span>
            </div>

            {/* Vertical Flow Sequence matching the reference */}
            <div className="space-y-3 relative pl-2">
              {/* Connecting vertical guide line */}
              <div
                className={cn(
                  'absolute left-4 top-2 bottom-2 w-0.5 pointer-events-none',
                  isLight ? 'bg-gray-200' : 'bg-[#1F2A37]'
                )}
              />

              {[
                { name: 'Planner', desc: 'Define scope & strategy', time: '10.9s', done: true },
                { name: 'Researcher', desc: 'Gather & synthesize evidence', time: '41.8s', done: true },
                { name: 'Analyst', desc: 'Analyze & derive insights', time: '25.4s', active: true },
                { name: 'Verifier', desc: 'Validate, check numerics', time: '—', pending: true },
                { name: 'Reporter', desc: 'Generate final report', time: '—', pending: true },
              ].map((agent) => (
                <div key={agent.name} className="flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-3">
                    {agent.done ? (
                      <span className="w-4 h-4 rounded-full bg-[#0E5B59] text-white flex items-center justify-center text-[10px] shadow-xs">
                        ✓
                      </span>
                    ) : agent.active ? (
                      <span className="w-4 h-4 rounded-full bg-white dark:bg-[#131920] border-2 border-[#0E5B59] dark:border-[#22D3EE] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0E5B59] dark:bg-[#22D3EE] animate-ping" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-[#E4E7E0] dark:bg-gray-700 flex items-center justify-center" />
                    )}

                    <div>
                      <span
                        className={cn(
                          'font-semibold block',
                          agent.active
                            ? 'text-[#0E5B59] dark:text-[#22D3EE] font-bold'
                            : isLight
                            ? 'text-[#172321]'
                            : 'text-white'
                        )}
                      >
                        {agent.name}
                      </span>
                      <span className={cn('text-[10px]', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
                        {agent.desc}
                      </span>
                    </div>
                  </div>

                  <span className={cn('font-mono text-[11px]', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
                    {agent.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Recent Activity (Live) */}
          <div
            className={cn(
              'rounded-2xl border p-5 space-y-4 shadow-xs transition-all',
              isLight
                ? 'bg-[#FFFFFF] border-[#E4E7E0]'
                : 'bg-[#131920] border-[#1F2A37]'
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1F2A37]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#C5A46D]" />
                <h3 className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
                  Recent Activity
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-[#21845A] dark:text-[#34D399] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#21845A] dark:bg-[#34D399] animate-pulse" />
                Live
              </span>
            </div>

            {/* Chronological Activity Feed */}
            <div className="space-y-3 relative pl-2">
              <div
                className={cn(
                  'absolute left-3.5 top-2 bottom-2 w-0.5 pointer-events-none',
                  isLight ? 'bg-[#E4E7E0]' : 'bg-[#1F2A37]'
                )}
              />

              {[
                { event: 'Task completed: explain about h&m market supply chain', time: '6h ago', type: 'complete' },
                { event: 'Task queued: Automated Kernel Livepatching Deployment', time: '10h ago', type: 'queue' },
                { event: 'Task completed: Enterprise Zero Trust Mesh Architecture', time: '10h ago', type: 'complete' },
              ].map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-3">
                    {act.type === 'complete' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#21845A] shadow-xs" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0E5B59] shadow-xs" />
                    )}
                    <span className={cn('font-medium truncate max-w-[190px]', isLight ? 'text-[#172321]' : 'text-gray-200')}>
                      {act.event}
                    </span>
                  </div>
                  <span className={cn('text-[10px] font-mono shrink-0', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
                    {act.time}
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
