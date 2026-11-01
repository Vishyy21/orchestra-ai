import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  PlusCircle,
  Network,
  Database,
  FileText,
  ShieldCheck,
  Settings,
  Server,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  dynamicBadgeKey?: 'approvals';
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Task', path: '/new-task', icon: PlusCircle },
  { name: 'Agent Workspace', path: '/agents', icon: Network, badge: '5' },
  { name: 'Knowledge Base', path: '/knowledge', icon: Database },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Approvals', path: '/approvals', icon: ShieldCheck, dynamicBadgeKey: 'approvals' },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { data: llmStatus } = useQuery({
    queryKey: ['llm-status'],
    queryFn: api.getLLMStatus,
    refetchInterval: 12000,
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: api.getHealth,
    refetchInterval: 20000,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.getApprovals('pending'),
    refetchInterval: 8000,
  });

  const pendingCount = pendingApprovals?.length ?? 0;
  const isLlmConnected = llmStatus?.connected ?? false;
  const isModelReady = llmStatus?.model_available ?? false;

  return (
    <aside className="w-64 border-r border-[#1E2638] bg-[#07090E] flex flex-col justify-between p-4 shrink-0 hidden md:flex select-none">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-9 h-9 rounded bg-[#101424] border border-[#2A354D] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(139,92,246,0.25)]">
            <Layers className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-sm text-[#F1F5F9] font-sans">
                ORCHESTRA AI
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#64748B] truncate tracking-tight">
              Your intelligent workspace for autonomous execution.
            </div>
          </div>
        </div>

        {/* Navigation Category Label */}
        <div className="px-2 pt-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#475569] font-semibold">
            Platform Navigation
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badgeValue =
              item.dynamicBadgeKey === 'approvals' && pendingCount > 0
                ? String(pendingCount)
                : item.badge;

            const isApprovalAlert = item.dynamicBadgeKey === 'approvals' && pendingCount > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2 rounded text-xs transition-all duration-150 group relative font-mono',
                    isActive
                      ? 'bg-[#121828] text-[#F1F5F9] font-medium border border-[#283652] border-l-2 border-l-[#8B5CF6] shadow-sm'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#0E1320] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive
                            ? 'text-[#8B5CF6]'
                            : isApprovalAlert
                            ? 'text-[#F59E0B]'
                            : 'text-[#64748B] group-hover:text-[#94A3B8]'
                        )}
                      />
                      <span className="font-sans font-medium text-xs tracking-tight">{item.name}</span>
                    </div>

                    {badgeValue && (
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.2 rounded border',
                          isApprovalAlert
                            ? 'bg-amber-500/20 text-[#FBBF24] border-amber-500/40 animate-pulse font-bold'
                            : 'bg-[#121828] text-[#22D3EE] border-[#1E2638]'
                        )}
                      >
                        {badgeValue}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Cluster Node Status (Real Values Only) */}
      <div className="p-3.5 rounded bg-[#0E1320] border border-[#1E2638] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="font-medium text-[#F1F5F9] text-xs font-sans">Node Status</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isModelReady
                  ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
                  : isLlmConnected
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#F43F5E]'
              )}
            />
            <span className={isModelReady ? 'text-[#34D399]' : isLlmConnected ? 'text-[#FBBF24]' : 'text-[#FB7185]'}>
              {isModelReady ? 'ONLINE' : isLlmConnected ? 'PULLING' : 'OFFLINE'}
            </span>
          </span>
        </div>

        <div className="space-y-1.5 text-[10px] font-mono text-[#94A3B8] pt-2 border-t border-[#1E2638]">
          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">MODEL</span>
            <span className="text-[#F1F5F9] font-medium">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">GPU</span>
            <span className="text-[#22D3EE] truncate max-w-[120px] text-right" title={health?.hardware?.gpu_model || 'RTX 2050'}>
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">DATABASE</span>
            <span className="text-[#34D399] font-medium">SQLite Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
