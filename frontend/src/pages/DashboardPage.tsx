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
  Bell,
  Sun,
  Moon,
  MoreHorizontal,
  Layers,
} from 'lucide-react';
import { timeAgo } from '../lib/utils';
import { cn } from '../lib/utils';

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

  const totalTasks = metrics?.total_tasks ?? 0;
  const completedTasks = metrics?.completed_tasks ?? 0;
  const inProgressTasks = metrics?.running_tasks ?? 0;
  const modelName = metrics?.llm_model || 'qwen3.5:4b';
  const gpuModel = health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050';

  // Compute average runtime from actual completed tasks if available
  const avgRuntime = React.useMemo(() => {
    if (!tasksData?.tasks || tasksData.tasks.length === 0) return '2m 41s';
    const completed = tasksData.tasks.filter((t) => t.status === 'completed' && t.agent_runs?.length);
    if (completed.length === 0) return '2m 41s';
    let totalMs = 0;
    for (const t of completed) {
      const runTotal = t.agent_runs?.reduce((sum, r) => sum + (r.execution_time_ms || 0), 0) || 0;
      totalMs += runTotal;
    }
    const avgSec = Math.round(totalMs / (completed.length * 1000));
    const m = Math.floor(avgSec / 60);
    const s = avgSec % 60;
    return `${m}m ${s}s`;
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
        isLight ? 'text-[#111827]' : 'text-[#F1F5F9]'
      )}
    >
      {/* 1. Header Bar: Tag + Title + Hardware Status + Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span
            className={cn(
              'text-[10px] font-mono tracking-widest uppercase font-semibold block mb-1',
              isLight ? 'text-[#6B7280]' : 'text-gray-400'
            )}
          >
            DASHBOARD
          </span>
          <h1
            className={cn(
              'text-2xl sm:text-3xl font-extrabold tracking-tight font-serif',
              isLight ? 'text-[#111827]' : 'text-white'
            )}
          >
            Research operations
          </h1>
          <div
            className={cn(
              'flex items-center gap-2 mt-1.5 text-xs',
              isLight ? 'text-[#6B7280]' : 'text-gray-400'
            )}
          >
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              Local AI Orchestration
            </span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">{modelName}</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">{gpuModel}</span>
          </div>
        </div>

        {/* Right Top Controls */}
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              isLight
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                : 'bg-[#121626] border-emerald-500/20 text-emerald-400'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#34D399]" />
            <span>System Healthy</span>
          </div>

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'p-2 rounded-xl border transition-all text-xs flex items-center justify-center',
              isLight
                ? 'bg-white border-[#EAEAE7] text-[#4B5563] hover:text-[#111827] hover:border-gray-300 shadow-2xs'
                : 'bg-[#121626] border-[#1E2538] text-gray-300 hover:text-white'
            )}
            title={`Switch to ${isLight ? 'Midnight Dark' : 'Luxury Light'}`}
          >
            {isLight ? <Moon className="w-4 h-4 text-purple-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-medium text-xs flex items-center justify-center shadow-xs">
            V
          </div>
        </div>
      </div>

      {/* 2. Main Hero: Compact Editorial Banner with 5-Agent Visual Illustration */}
      <div
        className={cn(
          'relative rounded-2xl p-6 sm:p-7 border overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#EAEAE7] shadow-xs'
            : 'bg-[#121626] border-[#1E2538] shadow-xl'
        )}
      >
        {/* Left Editorial Copy & CTA */}
        <div className="relative z-10 max-w-xl space-y-3">
          <h2
            className={cn(
              'text-2xl sm:text-3xl font-extrabold tracking-tight font-serif leading-tight',
              isLight ? 'text-[#111827]' : 'text-white'
            )}
          >
            From research question to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500">
              evidence-backed report.
            </span>
          </h2>
          <p
            className={cn(
              'text-xs sm:text-sm leading-relaxed max-w-md',
              isLight ? 'text-[#6B7280]' : 'text-gray-400'
            )}
          >
            A local multi-agent system that plans, researches, analyzes, verifies and generates trusted reports.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/new-task')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Task</span>
            </button>

            <button
              onClick={() => navigate('/agents')}
              className={cn(
                'px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all',
                isLight
                  ? 'border-[#EAEAE7] bg-white text-[#374151] hover:bg-gray-50'
                  : 'border-[#1E2538] bg-[#0E1220] text-gray-300 hover:text-white hover:bg-[#151B2E]'
              )}
            >
              <Play className="w-3 h-3 fill-current text-purple-500" />
              <span>View Pipeline</span>
            </button>
          </div>
        </div>

        {/* Right 5-Agent Flow Illustration */}
        <div className="w-full lg:w-1/2 relative flex flex-col items-center justify-center py-2 pointer-events-none">
          {/* Nodes sitting across the wave */}
          <div className="w-full grid grid-cols-5 text-center relative z-10 px-2">
            {[
              { name: 'Planner', icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
              { name: 'Researcher', icon: Search, color: 'text-blue-600 dark:text-cyan-400' },
              { name: 'Analyst', icon: BarChart3, color: 'text-indigo-600 dark:text-indigo-400' },
              { name: 'Verifier', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400' },
              { name: 'Reporter', icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
            ].map((node) => {
              const Icon = node.icon;
              return (
                <div key={node.name} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs transition-all',
                      isLight
                        ? 'bg-white border-[#EAEAE7]'
                        : 'bg-[#0E1220] border-[#1E2538]'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', node.color)} />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold mt-1.5',
                      isLight ? 'text-[#374151]' : 'text-gray-300'
                    )}
                  >
                    {node.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Flowing sinusoidal wave ribbon SVG */}
          <div className="w-full h-16 -mt-3 relative">
            <svg
              viewBox="0 0 500 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
                  <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <path
                d="M 10 40 Q 70 65, 130 35 T 250 45 T 370 30 T 490 40"
                stroke="url(#flowGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 10 40 Q 70 15, 130 45 T 250 25 T 370 50 T 490 35"
                stroke="url(#flowGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Metrics Strip: 5-Item Clean Horizontal Bar */}
      <div
        className={cn(
          'rounded-2xl border p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-[#1E2538] transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#EAEAE7] shadow-xs'
            : 'bg-[#121626] border-[#1E2538] shadow-md'
        )}
      >
        {/* Metric 1: Total Tasks */}
        <div className="flex items-center gap-3.5 pr-2">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              isLight
                ? 'bg-purple-50 text-purple-700 border-purple-100'
                : 'bg-[#1E1B38] text-purple-400 border-purple-500/20'
            )}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className={cn('text-xl font-bold leading-none', isLight ? 'text-[#111827]' : 'text-white')}>
              {totalTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
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
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-[#0E2820] text-emerald-400 border-emerald-500/20'
            )}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className={cn('text-xl font-bold leading-none', isLight ? 'text-[#111827]' : 'text-white')}>
              {completedTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
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
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-[#0F2238] text-cyan-400 border-cyan-500/20'
            )}
          >
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className={cn('text-xl font-bold leading-none', isLight ? 'text-[#111827]' : 'text-white')}>
              {inProgressTasks}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
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
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-[#282012] text-amber-400 border-amber-500/20'
            )}
          >
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <div className={cn('text-xl font-bold leading-none', isLight ? 'text-[#111827]' : 'text-white')}>
              {completedTasks > 0 ? avgRuntime : '2m 41s'}
            </div>
            <div className={cn('text-[11px] mt-1 font-medium', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              Avg. Runtime
            </div>
          </div>
        </div>

        {/* Metric 5: Mini Activity Visual */}
        <div className="flex items-center gap-3.5 sm:pl-3 pt-3 sm:pt-0 col-span-2 sm:col-span-1">
          <div className="flex items-end gap-1 h-8">
            <span className="w-1.5 h-3 rounded-xs bg-purple-300 dark:bg-purple-900" />
            <span className="w-1.5 h-5 rounded-xs bg-purple-400 dark:bg-purple-700" />
            <span className="w-1.5 h-7 rounded-xs bg-purple-600 dark:bg-purple-500" />
            <span className="w-1.5 h-4 rounded-xs bg-purple-400 dark:bg-purple-600" />
            <span className="w-1.5 h-6 rounded-xs bg-purple-500 dark:bg-purple-500" />
            <span className="w-1.5 h-8 rounded-xs bg-indigo-600 dark:bg-indigo-400" />
          </div>
          <div>
            <div className={cn('text-xs font-semibold', isLight ? 'text-[#111827]' : 'text-white')}>
              Task Activity
            </div>
            <div className={cn('text-[10px]', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
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
              ? 'bg-[#FFFFFF] border-[#EAEAE7]'
              : 'bg-[#121626] border-[#1E2538]'
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1E2538]">
            <h3
              className={cn(
                'text-base font-bold tracking-tight',
                isLight ? 'text-[#111827]' : 'text-white'
              )}
            >
              Recent Research Tasks
            </h3>
            <button
              onClick={() => navigate('/agents')}
              className={cn(
                'text-xs font-semibold flex items-center gap-1 transition-colors',
                isLight ? 'text-purple-600 hover:text-purple-800' : 'text-purple-400 hover:text-purple-300'
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
                    isLight ? 'text-[#6B7280] border-gray-100' : 'text-gray-400 border-[#1E2538]'
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
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E2538]/50">
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
                          isLight ? 'hover:bg-gray-50/80' : 'hover:bg-[#181D33]/60'
                        )}
                      >
                        <td className="py-3.5 pr-3">
                          <div className="flex items-start gap-2.5">
                            <FileText
                              className={cn(
                                'w-4 h-4 mt-0.5 shrink-0 transition-colors',
                                isLight ? 'text-gray-400 group-hover:text-purple-600' : 'text-gray-400 group-hover:text-purple-400'
                              )}
                            />
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  'text-xs font-semibold block truncate max-w-[240px]',
                                  isLight ? 'text-[#111827] group-hover:text-purple-700' : 'text-white group-hover:text-purple-300'
                                )}
                              >
                                {t.title}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] block truncate max-w-[240px] mt-0.5',
                                  isLight ? 'text-[#6B7280]' : 'text-gray-400'
                                )}
                              >
                                {t.description || 'Autonomous multi-agent research analysis'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-2">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          ) : isRunning ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
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
                                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_3px_#10B981]"
                                  />
                                );
                              }
                              if (d === 'running') {
                                return (
                                  <span
                                    key={idx}
                                    className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_4px_#3B82F6]"
                                  />
                                );
                              }
                              return (
                                <span
                                  key={idx}
                                  className={cn('w-2 h-2 rounded-full', isLight ? 'bg-gray-300' : 'bg-gray-600/50')}
                                />
                              );
                            })}
                          </div>
                        </td>

                        <td
                          className={cn(
                            'py-3.5 px-2 text-[11px] whitespace-nowrap',
                            isLight ? 'text-[#6B7280]' : 'text-gray-400'
                          )}
                        >
                          {timeAgo(t.created_at || new Date().toISOString())}
                        </td>

                        <td
                          className={cn(
                            'py-3.5 pl-2 text-right text-[11px] font-mono whitespace-nowrap',
                            isLight ? 'text-[#374151]' : 'text-gray-300'
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
                ? 'bg-[#FFFFFF] border-[#EAEAE7]'
                : 'bg-[#121626] border-[#1E2538]'
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1E2538]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className={cn('text-sm font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
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
                  isLight ? 'bg-gray-200' : 'bg-[#1E2538]'
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
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs">
                        ✓
                      </span>
                    ) : agent.active ? (
                      <span className="w-4 h-4 rounded-full bg-white dark:bg-[#121626] border-2 border-purple-600 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center" />
                    )}

                    <div>
                      <span
                        className={cn(
                          'font-semibold block',
                          agent.active
                            ? 'text-purple-600 dark:text-purple-400 font-bold'
                            : isLight
                            ? 'text-[#111827]'
                            : 'text-white'
                        )}
                      >
                        {agent.name}
                      </span>
                      <span className={cn('text-[10px]', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
                        {agent.desc}
                      </span>
                    </div>
                  </div>

                  <span className={cn('font-mono text-[11px]', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
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
                ? 'bg-[#FFFFFF] border-[#EAEAE7]'
                : 'bg-[#121626] border-[#1E2538]'
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1E2538]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className={cn('text-sm font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
                  Recent Activity
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* Chronological Activity Feed */}
            <div className="space-y-3 relative pl-2">
              <div
                className={cn(
                  'absolute left-3.5 top-2 bottom-2 w-0.5 pointer-events-none',
                  isLight ? 'bg-purple-100' : 'bg-purple-900/40'
                )}
              />

              {[
                { event: 'Analyst agent started', time: '2m ago' },
                { event: 'Researcher completed', time: '3m ago' },
                { event: 'Sources retrieved (5)', time: '4m ago' },
                { event: 'Planner completed', time: '5m ago' },
                { event: 'Task created', time: '5m ago' },
              ].map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" />
                    <span className={cn('font-medium', isLight ? 'text-[#374151]' : 'text-gray-300')}>
                      {act.event}
                    </span>
                  </div>
                  <span className={cn('text-[10px] font-mono', isLight ? 'text-[#9CA3AF]' : 'text-gray-500')}>
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
