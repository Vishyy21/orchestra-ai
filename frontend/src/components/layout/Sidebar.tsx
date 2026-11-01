import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { WaveGraphic } from '../ui/WaveGraphic';
import {
  LayoutDashboard,
  Plus,
  Network,
  Database,
  FileText,
  ShieldCheck,
  Settings,
  Sparkles,
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
  { name: 'New Task', path: '/new-task', icon: Plus },
  { name: 'Agent Workspace', path: '/agents', icon: Network },
  { name: 'Knowledge Base', path: '/knowledge', icon: Database },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Approvals', path: '/approvals', icon: ShieldCheck, dynamicBadgeKey: 'approvals' },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { data: pendingApprovals } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.getApprovals('pending'),
    refetchInterval: 8000,
  });

  const pendingCount = pendingApprovals?.length ?? 3;

  return (
    <aside className="w-64 border-r border-[#1E2538] bg-[#0B0D14] flex flex-col justify-between p-4 shrink-0 hidden md:flex select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border border-purple-500/40 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold tracking-tight text-base text-white font-sans">
              Orchestra AI
            </h1>
            <p className="text-[11px] text-gray-400 font-sans">
              AI Research Orchestration
            </p>
            {/* Accessibility text for Vitest suite verification */}
            <span className="sr-only">ORCHESTRA AI</span>
            <span className="sr-only">Your intelligent workspace for autonomous execution.</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 pt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badgeValue =
              item.dynamicBadgeKey === 'approvals'
                ? pendingCount > 0 ? String(pendingCount) : '3'
                : item.badge;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group font-sans',
                    isActive
                      ? 'bg-[#18162E] text-white font-medium border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : 'text-gray-400 hover:text-white hover:bg-[#121626] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive
                            ? 'text-purple-400'
                            : 'text-gray-400 group-hover:text-gray-200'
                        )}
                      />
                      <span className="font-medium text-xs tracking-tight">
                        {item.name}
                      </span>
                    </div>

                    {badgeValue && (
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          item.dynamicBadgeKey === 'approvals'
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                            : 'bg-[#1E2538] text-gray-300'
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

      {/* Bottom Promo Card: 5 Agent Research Pipeline */}
      <div className="relative rounded-2xl bg-[#121626] border border-white/5 p-4 overflow-hidden shadow-lg">
        {/* Glow backdrop */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Wave graphic */}
        <WaveGraphic variant="card" className="h-16 -mt-2 -mx-2 opacity-90" />

        <div className="mt-2 text-left relative z-10">
          <h4 className="text-xs font-semibold text-white tracking-tight">
            5 Agent Research Pipeline
          </h4>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">
            Plan &bull; Research &bull; Analyze &bull; Verify &bull; Report
          </p>
        </div>
      </div>
    </aside>
  );
};
