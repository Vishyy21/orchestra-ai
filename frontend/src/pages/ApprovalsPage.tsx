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
  UserCheck,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', filter],
    queryFn: () => api.getApprovals(filter === 'all' ? undefined : filter),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      api.decideApproval(id, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
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
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#252B36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#36B98A]" />
            Human-in-the-Loop Governance &amp; Approvals
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Authorize critical agent actions: code execution, filesystem mutations, and tool delegations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#11141B] p-1 rounded-md border border-[#252B36] text-xs">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-[11px] capitalize font-medium transition-colors ${
                filter === f
                  ? 'bg-[#181D27] text-[#E5E7EB] font-semibold border border-[#252B36]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[#9CA3AF]">
          Loading governance queue...
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const isPending = approval.status === 'pending';
            return (
              <div
                key={approval.id}
                className="p-4 rounded-lg bg-[#151922] border border-[#252B36] hover:border-[#343C4B] transition-all space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#252B36]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#8B7CFF]" />
                    <span className="font-semibold text-[#E5E7EB]">
                      {approval.agent_name || 'Verification Agent'}
                    </span>
                    <span className="text-[#9CA3AF] font-mono text-[10px]">
                      requested action
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(approval.status)}
                    <span className="text-[10px] font-mono text-[#9CA3AF]">
                      {formatDate(approval.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#9CA3AF]">
                    Action Description
                  </span>
                  <p className="text-xs text-[#E5E7EB] leading-relaxed">
                    {approval.description}
                  </p>
                </div>

                {approval.payload && (
                  <div className="p-2.5 rounded bg-[#11141B] border border-[#252B36] font-mono text-[10px] text-[#55C7D9] overflow-x-auto">
                    {approval.payload}
                  </div>
                )}

                {/* Approve / Reject Controls */}
                {isPending && (
                  <div className="pt-2 border-t border-[#252B36] flex items-center justify-end gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        decideMutation.mutate({ id: approval.id, decision: 'rejected' })
                      }
                      isLoading={decideMutation.isPending}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Action</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        decideMutation.mutate({ id: approval.id, decision: 'approved' })
                      }
                      isLoading={decideMutation.isPending}
                      className="bg-[#36B98A] hover:bg-[#36B98A]/90"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Authorize Execution</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-lg bg-[#151922] border border-[#252B36] text-center space-y-2 text-xs text-[#9CA3AF]">
          <ShieldCheck className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
          <p className="font-semibold text-[#E5E7EB]">No authorization requests in queue</p>
          <p className="text-[11px] max-w-sm mx-auto">
            When an autonomous agent reaches a gated tool invocation (such as executing shell commands or writing files), human approval will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
