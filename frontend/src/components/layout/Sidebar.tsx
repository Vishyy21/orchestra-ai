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
    <aside className="w-56 border-r border-[#252B36] bg-[#11141B] flex flex-col justify-between p-3 shrink-0 hidden md:flex select-none">
      <div className="space-y-4">
        {/* Navigation Group Header */}
        <div className="px-2.5 pt-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]/60 font-semibold">
            Platform Navigation
          </p>
        </div>

        {/* Navigation List */}
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group',
                    isActive
                      ? 'bg-[#181D27] text-[#E5E7EB] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#151922]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-[#8B7CFF]' : 'text-[#9CA3AF] group-hover:text-[#E5E7EB]'
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181D27] text-[#55C7D9] border border-[#252B36]">
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
      <div className="p-3 rounded-md bg-[#151922] border border-[#252B36] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[#E5E7EB]">Local Environment</span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#36B98A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#36B98A]" />
            Active
          </span>
        </div>
        <div className="space-y-1 text-[10px] font-mono text-[#9CA3AF]">
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="text-[#E5E7EB]">Ollama Local</span>
          </div>
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="text-[#8B7CFF]">Qwen 3.5 4B</span>
          </div>
          <div className="flex justify-between">
            <span>GPU:</span>
            <span className="text-[#55C7D9]">RTX 2050 (4GB)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
