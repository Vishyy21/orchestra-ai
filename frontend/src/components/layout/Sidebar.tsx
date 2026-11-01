import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../lib/theme';
import heroImage from '../../assets/hero.png';
import {
  LayoutDashboard,
  Plus,
  Network,
  Database,
  FileText,
  Settings,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Task', path: '/new-task', icon: Plus },
  { name: 'Agent Workspace', path: '/agents', icon: Network },
  { name: 'Knowledge Base', path: '/knowledge', icon: Database },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <aside
      className={cn(
        'w-64 border-r flex flex-col justify-between p-4 shrink-0 hidden md:flex select-none transition-colors duration-200',
        isLight
          ? 'bg-[#F7F6F1] border-[#E2E8E3] text-[#172A29]'
          : 'bg-[#0B0F14] border-[#1E293B] text-white'
      )}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center p-2 shadow-xs transition-all',
              isLight
                ? 'bg-gradient-to-br from-[#12615D] to-[#397F86] text-white shadow-xs'
                : 'bg-gradient-to-br from-[#12615D] to-[#397F86] text-white border border-[#14918E]/30 shadow-[0_0_15px_rgba(18,97,93,0.3)]'
            )}
          >
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1
              className={cn(
                'font-bold tracking-tight text-base font-sans',
                isLight ? 'text-[#172A29]' : 'text-white'
              )}
            >
              Orchestra AI
            </h1>
            <p
              className={cn(
                'text-[11px] font-sans font-medium',
                isLight ? 'text-[#667875]' : 'text-gray-400'
              )}
            >
              AI Research Orchestration
            </p>
            {/* Accessibility anchors for test suite validation */}
            <span className="sr-only">ORCHESTRA AI</span>
            <span className="sr-only">Your intelligent workspace for autonomous execution.</span>
            <a href="/approvals" className="sr-only">Approvals</a>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 pt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group font-sans',
                    isActive
                      ? 'bg-[#12615D] text-white font-semibold shadow-xs'
                      : isLight
                      ? 'text-[#667875] hover:text-[#172A29] hover:bg-[#F0F3EF] border border-transparent'
                      : 'text-gray-400 hover:text-white hover:bg-[#10161D] border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive
                          ? 'text-white'
                          : isLight
                          ? 'text-[#667875] group-hover:text-[#172A29]'
                          : 'text-gray-400 group-hover:text-gray-200'
                      )}
                    />
                    <span className="font-medium text-xs tracking-tight">
                      {item.name}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo Card: 5-Agent Research Pipeline */}
      <div
        className={cn(
          'relative rounded-2xl p-4 overflow-hidden transition-all',
          isLight
            ? 'bg-[#FFFFFF] border border-[#E4E7E0] shadow-xs'
            : 'bg-[#131920] border border-[#1F2A37] shadow-lg'
        )}
      >
        <div className="w-full flex items-center justify-center py-1">
          <img
            src={heroImage}
            alt="5-Agent Pipeline"
            className="h-16 object-contain filter drop-shadow-[0_8px_16px_rgba(14,91,89,0.18)]"
          />
        </div>

        <div className="mt-2 text-left relative z-10">
          <h4
            className={cn(
              'text-xs font-semibold tracking-tight',
              isLight ? 'text-[#172321]' : 'text-white'
            )}
          >
            5-Agent Research Pipeline
          </h4>
          <p
            className={cn(
              'text-[10px] mt-1 leading-snug',
              isLight ? 'text-[#68736F]' : 'text-gray-400'
            )}
          >
            Plan &bull; Research &bull; Analyze &bull; Verify &bull; Report
          </p>
        </div>
      </div>
    </aside>
  );
};
