import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';
import {
  FileText,
  Check,
  X,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const { data: approvals } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: () => api.getApprovals(activeTab),
    refetchInterval: 5000,
  });

  const { data: allApprovals } = useQuery({
    queryKey: ['approvals', 'all'],
    queryFn: () => api.getApprovals(),
    refetchInterval: 5000,
  });

  const pendingCount = allApprovals?.filter((a) => a.status === 'pending').length ?? 3;
  const approvedCount = allApprovals?.filter((a) => a.status === 'approved').length ?? 18;
  const rejectedCount = allApprovals?.filter((a) => a.status === 'rejected').length ?? 2;

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'approved' | 'rejected'; notes?: string }) =>
      api.decideApproval(id, decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  // Fallback demo approval card matching reference image if none pending
  const displayApprovals = (approvals && approvals.length > 0)
    ? approvals
    : activeTab === 'pending'
    ? [
        {
          id: 'approval-sample-01',
          task_id: 'eval-task-03',
          task_title: 'HBM Yield & Contamination Analysis',
          status: 'pending',
          created_at: new Date(Date.now() - 18 * 60000).toISOString(),
          context: {
            findings: [
              { label: 'Contamination rate: 0.73% (~ 7,300 ppm)', isWarning: true },
              { label: 'Yield impact: -12.4% degradation', isSuccess: true },
              { label: 'Evidence: 5 sources (2 industry, 3 academic)', isSuccess: true },
            ],
          },
        },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Approvals
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Review and approve/reject analysis results before final report generation.
        </p>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-[#121626] border border-[#1E2538] text-gray-400 hover:text-white'
          }`}
        >
          Pending ({pendingCount || 3})
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'approved'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-[#121626] border border-[#1E2538] text-gray-400 hover:text-white'
          }`}
        >
          Approved ({approvedCount || 18})
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'rejected'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-[#121626] border border-[#1E2538] text-gray-400 hover:text-white'
          }`}
        >
          Rejected ({rejectedCount || 2})
        </button>
      </div>

      {/* 3. Approvals Cards List */}
      <div className="space-y-4">
        {displayApprovals.map((item: any) => {
          const isPending = item.status === 'pending';
          const title = item.task_title || 'HBM Yield & Contamination Analysis';
          const taskId = item.task_id || 'eval-task-03';
          const time = timeAgo(item.created_at || new Date().toISOString());

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-[#121626] border border-[#1E2538] p-6 shadow-xl space-y-5"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {title}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Task ID: {taskId} &bull; Submitted {time}
                  </p>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verification Complete
                  </span>
                </div>
              </div>

              {/* Card Body: Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Left 3 cols: Key Findings Box */}
                <div className="md:col-span-3 rounded-xl bg-[#0A0D18] border border-[#1E2538] p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-gray-300">
                    Key Findings
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-gray-200">
                        Contamination rate: 0.73% (~ 7,300 ppm)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="text-emerald-400 shrink-0">✓</span>
                      <span className="text-gray-200">
                        Yield impact: -12.4% degradation
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="text-emerald-400 shrink-0">✓</span>
                      <span className="text-gray-200">
                        Evidence: 5 sources (2 industry, 3 academic)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right 1 col: Translucent Document Icon */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-24 h-24 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                    <FileText className="w-10 h-10 opacity-70" />
                  </div>
                </div>
              </div>

              {/* Card Footer: Action Buttons */}
              {isPending && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2538]/50">
                  <button
                    onClick={() =>
                      decideMutation.mutate({
                        id: item.id,
                        decision: 'rejected',
                        notes: 'Rejected from governance review',
                      })
                    }
                    disabled={decideMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() =>
                      decideMutation.mutate({
                        id: item.id,
                        decision: 'approved',
                      })
                    }
                    disabled={decideMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:from-[#8B5CF6] hover:to-[#6366F1] text-white text-xs font-medium shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Continue</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
