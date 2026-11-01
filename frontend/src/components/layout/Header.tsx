import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TelemetryPill } from './TelemetryPill';
import { Button } from '../ui/Button';
import { Plus, Terminal } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Mission Control Dashboard';
      case '/new-task':
        return 'Mission Dispatcher';
      case '/agents':
        return 'Multi-Agent Workspace';
      case '/knowledge':
        return 'Knowledge Base & Vector Store';
      case '/reports':
        return 'Intelligence & Executive Reports';
      case '/approvals':
        return 'Governance & Approval Queue';
      case '/settings':
        return 'System Configuration & Diagnostics';
      default:
        return 'Workspace';
    }
  };

  return (
    <header
      className={cn(
        'h-14 px-5 border-b sticky top-0 z-40 flex items-center justify-between select-none transition-colors duration-200',
        isLight
          ? 'bg-[#FFFFFF]/90 border-[#E2E8E3] backdrop-blur-xl text-[#172A29]'
          : 'bg-[#0B0F14]/95 border-[#1E293B] backdrop-blur-xl text-[#F1F5F9] top-radiant-sheen'
      )}
    >
      {/* Route Breadcrumb Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Terminal className="w-4 h-4 text-[#12615D] dark:text-[#67C9C5]" />
          <span className={cn('hidden sm:inline', isLight ? 'text-[#667875]' : 'text-[#64748B]')}>
            ORCHESTRA AI
          </span>
          <span className={cn('hidden sm:inline', isLight ? 'text-[#A0AEC0]' : 'text-[#475569]')}>
            /
          </span>
          <span className={cn('font-medium tracking-tight', isLight ? 'text-[#172A29]' : 'text-[#F1F5F9]')}>
            {getPageTitle(location.pathname)}
          </span>
        </div>
      </div>

      {/* Centerpiece Real Telemetry Pill */}
      <div className="flex items-center gap-3">
        <TelemetryPill />
      </div>

      {/* Trailing Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/new-task')}
          className="bg-[#12615D] hover:bg-[#0B4947] text-white border border-[#14918E]/30 shadow-xs transition-all font-mono text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>
    </header>
  );
};
