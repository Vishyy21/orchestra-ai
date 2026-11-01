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
  ShieldAlert,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', filter],
    queryFn: () => api.getApprovals(filter === 'all' ? undefined : filter),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'approved' | 'rejected'; notes?: string }) =>
      api.decideApproval(id, decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['active-task'] });
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2330] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDEF] flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#34D399]" />
            <span>Human-in-the-Loop Governance &amp; Approvals</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
            Authorize critical agent actions: report synthesis, verification checkpoints, and execution progression.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#0C0E14] p-1 rounded-lg border border-[#1E2330] text-xs">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-[11px] capitalize font-medium transition-all duration-150 ${
                filter === f
                  ? 'bg-[#151924] text-[#EDEDEF] font-semibold border border-[#2D3447] shadow-sm'
                  : 'text-[#949BA8] hover:text-[#EDEDEF]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="p-16 text-center text-xs font-mono text-[#949BA8] space-y-2">
          <div className="w-6 h-6 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying governance records from SQLite...</p>
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const isPending = approval.status.toLowerCase() === 'pending';
            return (
              <div
                key={approval.id}
                className={`p-5 rounded-xl border transition-all duration-200 space-y-4 shadow-card ${
                  isPending
                    ? 'bg-[#11141D] border-[#F59E0B]/40 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                    : 'bg-[#11141D] border-[#1E2330]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2330]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isPending
                          ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                          : approval.status === 'approved'
                          ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30'
                          : 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30'
                      }`}
                    >
                      {isPending ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : approval.status === 'approved' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#EDEDEF]">
                          {approval.agent_name || 'Workflow Gate'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#090B10] text-[#949BA8] border border-[#1E2330]">
                          Task #{approval.task_id}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#949BA8] block mt-0.5">
                        Action Type: {approval.action_type || 'Checkpoint Verification'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#949BA8]">
                      {formatDate(approval.created_at)}
                    </span>
                    {getStatusBadge(approval.status)}
                  </div>
                </div>

                {/* Payload context */}
                {approval.payload && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#949BA8]">
                      Intermediate Analysis &amp; Findings
                    </span>
                    <div className="p-4 rounded-xl bg-[#090B10] border border-[#1E2330] font-mono text-xs text-[#EDEDEF] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {approval.payload}
                    </div>
                  </div>
                )}

                {/* Decision controls if pending */}
                {isPending && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="Optional operator notes for audit trail..."
                      value={decisionNotes[approval.id] || ''}
                      onChange={(e) =>
                        setDecisionNotes({ ...decisionNotes, [approval.id]: e.target.value })
                      }
                      className="flex-1 bg-[#090B10] text-[#EDEDEF] text-xs font-mono px-3.5 py-2 rounded-lg border border-[#1E2330] focus:outline-none focus:border-[#6366F1] shadow-inner"
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
                        className="text-[#FB7185] hover:text-[#FB7185] border-[#F43F5E]/30 hover:border-[#F43F5E] h-9"
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
                        className="bg-gradient-to-b from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-[#08090C] font-bold border-[#047857] h-9"
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
        <div className="p-16 rounded-xl bg-[#0C0E14] border border-[#1E2330] text-center space-y-3 text-xs text-[#949BA8]">
          <ShieldCheck className="w-10 h-10 text-[#949BA8]/40 mx-auto" />
          <p className="text-sm font-semibold text-[#EDEDEF]">No approval requests found</p>
          <p className="text-xs max-w-md mx-auto leading-relaxed">
            When tasks are configured with Human Approval Gates, execution checkpoints waiting for operator review will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
