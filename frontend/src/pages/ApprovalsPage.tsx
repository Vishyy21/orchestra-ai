import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import {
  ShieldCheck,
  Check,
  X,
  Gavel,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', filter],
    queryFn: () => api.getApprovals(filter === 'all' ? undefined : filter),
    refetchInterval: 5000,
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'approved' | 'rejected'; notes?: string }) =>
      api.decideApproval(id, decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      default:
        return (
          <Badge variant="warning" pulse>
            Awaiting Approval
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]" />
            <span className="text-[10px] font-mono tracking-widest text-[#FBBF24] uppercase font-semibold">
              Governance Queue
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Human-in-the-Loop Approval Checkpoints
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Authorize critical workflow checkpoints before downstream Verification and Report synthesis.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#0E1320] p-1 rounded border border-[#1E2638] text-xs font-mono">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-[11px] capitalize font-medium transition-all ${
                filter === f
                  ? 'bg-[#181F33] text-[#F1F5F9] font-semibold border border-[#283652] shadow-sm'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="p-16 text-center text-xs font-mono text-[#64748B] space-y-2">
          <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying SQLite governance records...</p>
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const isPending = approval.status.toLowerCase() === 'pending';
            return (
              <div
                key={approval.id}
                className={`p-5 rounded border transition-all duration-200 space-y-4 shadow-sm ${
                  isPending
                    ? 'bg-[#141622] border-amber-500/40 amber-radiant-sheen shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                    : 'bg-[#0E1320] border-[#1E2638]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2638]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${
                        isPending
                          ? 'bg-amber-500/20 text-[#FBBF24] border-amber-500/40'
                          : approval.status === 'approved'
                          ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30'
                          : 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30'
                      }`}
                    >
                      {isPending ? (
                        <Gavel className="w-4 h-4 animate-pulse" />
                      ) : approval.status === 'approved' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#F1F5F9]">
                          {approval.agent_name || 'Verification Gate'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#07090E] text-[#22D3EE] border border-[#1E2638]">
                          Task #{approval.task_id}
                        </span>
                        {isPending && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            L3 AUTH REQUIRED
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B] block mt-0.5">
                        Action: {approval.action_type || 'Checkpoint Verification'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {formatDate(approval.created_at)}
                    </span>
                    {getStatusBadge(approval.status)}
                  </div>
                </div>

                {/* Intermediate Payload context */}
                {approval.payload && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                      Intermediate Swarm Output Payload:
                    </span>
                    <div className="p-3.5 rounded bg-[#07090E] border border-[#1E2638] font-mono text-xs text-[#F1F5F9] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {approval.payload}
                    </div>
                  </div>
                )}

                {/* Decision controls if pending */}
                {isPending && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="Optional operator justification notes..."
                      value={decisionNotes[approval.id] || ''}
                      onChange={(e) =>
                        setDecisionNotes({ ...decisionNotes, [approval.id]: e.target.value })
                      }
                      className="flex-1 bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2 rounded border border-[#1E2638] focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          decideMutation.mutate({
                            id: approval.id,
                            decision: 'rejected',
                            notes: decisionNotes[approval.id],
                          })
                        }
                        isLoading={decideMutation.isPending}
                        className="text-[#FB7185] hover:text-[#FB7185] border-[#F43F5E]/40 hover:border-[#F43F5E] bg-[#0E1320] font-mono text-xs h-9 px-4"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          decideMutation.mutate({
                            id: approval.id,
                            decision: 'approved',
                            notes: decisionNotes[approval.id],
                          })
                        }
                        isLoading={decideMutation.isPending}
                        className="bg-[#10B981] hover:bg-[#059669] text-[#07090E] font-bold border border-[#34D399] font-mono text-xs h-9 px-4 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Authorize &amp; Resume</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 rounded bg-[#0E1320] border border-[#1E2638] text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-[#475569] mx-auto" />
          <h2 className="text-sm font-semibold text-[#F1F5F9]">No Governance Checkpoints</h2>
          <p className="text-xs font-mono text-[#64748B] max-w-md mx-auto">
            When tasks are configured with Human Approval Gates, execution checkpoints waiting for operator review will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
