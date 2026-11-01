import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TelemetryPill } from './TelemetryPill';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="h-14 px-5 border-b border-[#1E2330] bg-[#0C0E14]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between select-none">
      {/* Brand Anchor */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E2435] to-[#11141D] border border-[#2D3447] flex items-center justify-center p-1 group-hover:border-[#6366F1]/60 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all duration-200">
            <img src="/logo.svg" alt="Orchestra AI Logo" className="w-full h-full" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-xs sm:text-sm text-[#EDEDEF] font-sans group-hover:text-[#818CF8] transition-colors">
                ORCHESTRA AI
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#151924] text-[#38BDF8] border border-[#1E2330]">
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

        <div className="h-4 w-[1px] bg-[#1E2330] mx-0.5" />

        {/* Operator Profile */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-mono text-[10px] font-bold shadow-sm">
            OA
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-[11px] font-medium text-[#EDEDEF] leading-tight">Lead Architect</span>
            <span className="text-[10px] font-mono text-[#949BA8]">Local Host (NVIDIA)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
