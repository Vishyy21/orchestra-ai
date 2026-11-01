import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TelemetryPill } from './TelemetryPill';
import { Button } from '../ui/Button';
import { Plus, Terminal } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    <header className="h-14 px-5 border-b border-[#1E2638] bg-[#07090E]/95 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between select-none top-radiant-sheen">
      {/* Route Breadcrumb Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Terminal className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-[#64748B] hidden sm:inline">ORCHESTRA AI</span>
          <span className="text-[#475569] hidden sm:inline">/</span>
          <span className="text-[#F1F5F9] font-medium tracking-tight">
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
          className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 shadow-sm transition-all font-mono text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>
    </header>
  );
};
