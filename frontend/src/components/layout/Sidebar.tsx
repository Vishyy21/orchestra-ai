import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Network,
  Database,
  FileText,
  ShieldCheck,
  Settings,
  Cpu,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Task', path: '/new-task', icon: PlusCircle },
  { name: 'Agent Workspace', path: '/agents', icon: Network, badge: '5' },
  { name: 'Knowledge Base', path: '/knowledge', icon: Database },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Approvals', path: '/approvals', icon: ShieldCheck },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 border-r border-[#1E2330] bg-[#0C0E14] flex flex-col justify-between p-3.5 shrink-0 hidden md:flex select-none">
      <div className="space-y-4">
        {/* Navigation Group Header */}
        <div className="px-3 pt-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#949BA8]/70 font-semibold">
            Platform Navigation
          </p>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group relative',
                    isActive
                      ? 'bg-[#151924] text-[#EDEDEF] font-semibold border border-[#2D3447] shadow-sm'
                      : 'text-[#949BA8] hover:text-[#EDEDEF] hover:bg-[#11141D] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-[#818CF8]' : 'text-[#949BA8] group-hover:text-[#EDEDEF]'
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#11141D] text-[#38BDF8] border border-[#1E2330]">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Cluster Footer Card */}
      <div className="p-3.5 rounded-xl bg-[#11141D] border border-[#1E2330] shadow-card space-y-2.5 relative overflow-hidden">
        {/* Subtle top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#818CF8]" />
            <span className="font-semibold text-[#EDEDEF]">Local Environment</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#34D399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Active
          </span>
        </div>
        <div className="space-y-1.5 text-[11px] font-mono text-[#949BA8] pt-1 border-t border-[#1E2330]">
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="text-[#EDEDEF]">Ollama Local</span>
          </div>
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="text-[#818CF8] font-medium">Qwen 3.5 4B</span>
          </div>
          <div className="flex justify-between">
            <span>GPU:</span>
            <span className="text-[#38BDF8]">RTX 2050 (4GB)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
