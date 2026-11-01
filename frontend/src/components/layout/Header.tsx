import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TelemetryPill } from './TelemetryPill';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="h-13 px-5 border-b border-[#252B36] bg-[#11141B] sticky top-0 z-40 flex items-center justify-between select-none">
      {/* Brand Anchor */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded bg-[#151922] border border-[#252B36] flex items-center justify-center p-1 group-hover:border-[#8B7CFF] transition-colors">
            <img src="/logo.svg" alt="Orchestra AI Logo" className="w-full h-full" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-[#E5E7EB] font-sans group-hover:text-[#8B7CFF] transition-colors">
                ORCHESTRA AI
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#151922] text-[#55C7D9] border border-[#252B36]">
                v1.0 Local
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Telemetry Pill in Center */}
      <TelemetryPill />

      {/* Trailing User & Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/new-task')}
          className="hidden sm:inline-flex"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </Button>

        <div className="h-4 w-[1px] bg-[#252B36] mx-0.5" />

        {/* Operator Profile */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 rounded bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF] font-mono text-[10px] font-bold">
            OA
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-[11px] font-medium text-[#E5E7EB] leading-tight">Lead Architect</span>
            <span className="text-[10px] font-mono text-[#9CA3AF]">Local Root (NVIDIA)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
