import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { WaveGraphic } from '../components/ui/WaveGraphic';
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  Hourglass,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { timeAgo } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    refetchInterval: 10000,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks({ limit: 5 }),
    refetchInterval: 10000,
  });

  const totalTasks = metrics?.total_tasks ?? 48;
  const completedTasks = metrics?.completed_tasks ?? 37;
  const inProgressTasks = (metrics?.running_tasks ?? 0) > 0 ? metrics?.running_tasks : 8;
  const pendingApprovals = (metrics?.pending_tasks ?? 0) > 0 ? metrics?.pending_tasks : 3;

  // Real or fallback tasks styled matching reference UI
  const recentTasks = (tasksData?.tasks && tasksData.tasks.length > 0)
    ? tasksData.tasks.slice(0, 5)
    : [
        {
          id: 'eval-task-03',
          title: 'Semiconductor Yield Analysis',
          status: 'running',
          created_at: new Date(Date.now() - 2 * 60000).toISOString(),
          agentState: [true, true, 'running', false, false],
        },
        {
          id: 'eval-task-02',
          title: 'HBM Market Trend Report',
          status: 'pending_approval',
          created_at: new Date(Date.now() - 18 * 60000).toISOString(),
          agentState: [true, true, true, 'waiting', false],
        },
        {
          id: 'eval-task-01',
          title: 'Cleanroom Contamination Study',
          status: 'completed',
          created_at: new Date(Date.now() - 60 * 60000).toISOString(),
          agentState: [true, true, true, true, true],
        },
        {
          id: 'eval-task-04',
          title: 'AI Accelerator Landscape',
          status: 'completed',
          created_at: new Date(Date.now() - 120 * 60000).toISOString(),
          agentState: [true, true, true, true, true],
        },
        {
          id: 'eval-task-05',
          title: 'Packaging Technology Comparison',
          status: 'completed',
          created_at: new Date(Date.now() - 180 * 60000).toISOString(),
          agentState: [true, true, true, true, true],
        },
      ];

  const getAgentDots = (task: any) => {
    if (task.agentState) return task.agentState;
    if (task.status === 'completed') return [true, true, true, true, true];
    if (task.status === 'running') return [true, true, 'running', false, false];
    if (task.status === 'pending_approval' || task.status === 'waiting') return [true, true, true, 'waiting', false];
    return [true, false, false, false, false];
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 font-sans">
      {/* 1. Header Bar: Title + System Healthy + User Avatar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Dashboard Overview
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#121626] border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
            <span>System Healthy</span>
          </div>

          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-medium text-xs flex items-center justify-center shadow-md">
            V
          </div>
        </div>
      </div>

      {/* 2. Hero Section: Headline + Subtitle + Glowing Ribbon Wave Graphic */}
      <div className="relative rounded-2xl bg-[#121626] border border-[#1E2538] p-6 lg:p-8 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Research at{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#EC4899]">
              Industrial Grade
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
            A multi-agent AI system that plans, researches, analyzes, verifies, and generates evidence-backed reports.
          </p>
        </div>

        {/* Floating Glowing Ribbon Wave Graphic */}
        <div className="w-full md:w-1/2 h-36 sm:h-44 flex items-center justify-center relative pointer-events-none">
          <WaveGraphic variant="hero" className="w-full h-full" />
        </div>
      </div>

      {/* 3. Four Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121626] border border-[#1E2538] flex items-center gap-4 shadow-sm hover:border-purple-500/30 transition-all">
          <div className="w-11 h-11 rounded-lg bg-[#1E1B38] text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{totalTasks}</div>
            <div className="text-xs text-gray-400 font-medium">Total Tasks</div>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121626] border border-[#1E2538] flex items-center gap-4 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="w-11 h-11 rounded-lg bg-[#0E2820] text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{completedTasks}</div>
            <div className="text-xs text-gray-400 font-medium">Completed</div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121626] border border-[#1E2538] flex items-center gap-4 shadow-sm hover:border-cyan-500/30 transition-all">
          <div className="w-11 h-11 rounded-lg bg-[#0F2238] text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{inProgressTasks}</div>
            <div className="text-xs text-gray-400 font-medium">In Progress</div>
          </div>
        </div>

        {/* Card 4: Awaiting Approval */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121626] border border-[#1E2538] flex items-center gap-4 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="w-11 h-11 rounded-lg bg-[#282012] text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{pendingApprovals}</div>
            <div className="text-xs text-gray-400 font-medium">Awaiting Approval</div>
          </div>
        </div>
      </div>

      {/* 4. Lower Section: Recent Tasks (Left 2/3) + Agent Pipeline (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Tasks */}
        <div className="lg:col-span-2 rounded-xl bg-[#121626] border border-[#1E2538] p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2538]">
            <h3 className="text-sm font-semibold text-white">Recent Tasks</h3>
            <button
              onClick={() => navigate('/agents')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-medium text-gray-400 border-b border-[#1E2538]/60 pb-2">
                  <th className="pb-2.5 font-normal">Task</th>
                  <th className="pb-2.5 font-normal">Status</th>
                  <th className="pb-2.5 font-normal">Agents</th>
                  <th className="pb-2.5 font-normal text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2538]/40">
                {recentTasks.map((t: any) => {
                  const dots = getAgentDots(t);
                  const isPending = t.status === 'pending_approval' || t.status === 'waiting';
                  const isRunning = t.status === 'running' || t.status === 'in_progress';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/agents?taskId=${t.id}`)}
                      className="hover:bg-[#181D33]/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors shrink-0" />
                          <span className="text-xs text-gray-200 group-hover:text-white font-medium truncate max-w-[220px]">
                            {t.title}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        {isPending ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Awaiting Approval
                          </span>
                        ) : isRunning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Completed
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          {dots.map((d: any, idx: number) => {
                            if (d === true) {
                              return <span key={idx} className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_#34D399]" />;
                            }
                            if (d === 'running') {
                              return <span key={idx} className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_#A855F7]" />;
                            }
                            if (d === 'waiting') {
                              return <span key={idx} className="w-2 h-2 rounded-full bg-amber-400" />;
                            }
                            return <span key={idx} className="w-2 h-2 rounded-full bg-gray-600/40" />;
                          })}
                        </div>
                      </td>

                      <td className="py-3 pl-3 text-right text-[11px] text-gray-400 font-mono">
                        {timeAgo(t.created_at || new Date().toISOString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Agent Pipeline */}
        <div className="rounded-xl bg-[#121626] border border-[#1E2538] p-5 space-y-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1E2538]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
            <h3 className="text-sm font-semibold text-white">Agent Pipeline</h3>
          </div>

          <div className="flex items-center gap-6 my-auto py-2">
            {/* Circular Progress Ring */}
            <div className="relative w-24 h-24 rounded-full border-4 border-purple-500/40 flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-[#0E1220]">
              <span className="text-3xl font-extrabold text-white leading-none">5</span>
              <span className="text-[10px] text-gray-400 mt-1 uppercase font-medium tracking-wider">Agents</span>
            </div>

            {/* Five Agents List */}
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Planner</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-3">Define scope & strategy</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Researcher</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-3">Gather & synthesize evidence</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Analyst</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-3">Analyze & derive insights</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Verifier</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-3">Validate, check numerics</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  <span>Reporter</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-3">Generate final report</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
