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
  Shield,
  Activity,
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
    <aside className="w-60 border-r border-[#1F273B] bg-[#090B10] flex flex-col justify-between p-3.5 shrink-0 hidden md:flex select-none">
      <div className="space-y-4">
        {/* Cluster Identity Shield */}
        <div className="flex items-center gap-3 p-2.5 rounded bg-[#121624] border border-[#1F273B]">
          <div className="w-8 h-8 rounded bg-[#181F33] flex items-center justify-center text-[#22D3EE] border border-[#22D3EE]/25 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
            <Shield className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[12px] font-semibold text-[#F1F5F9] truncate leading-tight font-sans">
              Local Mesh Core
            </div>
            <div className="text-[10px] font-mono text-[#94A3B8] truncate">
              Ollama / Qwen 3.5 4B
            </div>
          </div>
        </div>

        {/* Navigation Group Header */}
        <div className="px-3 pt-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] font-semibold">
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
                    'flex items-center justify-between px-3 py-2 rounded text-xs transition-all duration-150 group relative font-mono',
                    isActive
                      ? 'bg-[#141A29] text-[#F1F5F9] font-medium border border-[#2A354D] border-l-2 border-l-[#22D3EE] shadow-[0_2px_10px_rgba(0,0,0,0.4)]'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#121624] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-[#22D3EE]' : 'text-[#64748B] group-hover:text-[#94A3B8]'
                        )}
                      />
                      <span className="font-sans font-medium text-xs">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181F33] text-[#22D3EE] border border-[#22D3EE]/30">
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

      {/* Cluster Footer Telemetry Diagnostic Dock */}
      <div className="p-3 rounded bg-[#121624] border border-[#1F273B] space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="font-medium text-[#F1F5F9] text-xs">Node Health</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#10B981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            ONLINE
          </span>
        </div>

        <div className="space-y-1 text-[10px] font-mono text-[#94A3B8] pt-2 border-t border-[#1F273B]/70">
          <div className="flex justify-between">
            <span className="text-[#64748B]">LATENCY</span>
            <span className="text-[#22D3EE]">14ms (p99)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">CONSENSUS</span>
            <span className="text-[#34D399]">PBFT-Lite 99.8%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">GPU VRAM</span>
            <span className="text-[#E2E8F0]">RTX 2050 (4GB)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
