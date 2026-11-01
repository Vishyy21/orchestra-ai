import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TelemetryPill } from './TelemetryPill';
import { Button } from '../ui/Button';
import { Plus, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="h-14 px-5 border-b border-[#1F273B] bg-[#090B10]/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between select-none top-radiant-sheen">
      {/* Brand & Cluster Identity */}
      <div className="flex items-center gap-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#1E2538] to-[#121624] border border-[#2A354D] flex items-center justify-center p-1.5 group-hover:border-[#8B5CF6] group-hover:shadow-[0_0_16px_rgba(139,92,246,0.35)] transition-all duration-300">
            <img src="/logo.svg" alt="Orchestra AI Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-xs sm:text-sm text-[#F1F5F9] font-sans group-hover:text-[#A78BFA] transition-colors">
                ORCHESTRA AI
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121624] text-[#22D3EE] border border-[#1E273B] tracking-wide">
                v2.6 Enterprise
              </span>
            </div>
          </div>
        </Link>

        {/* Global Cluster Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#121624]/80 border border-[#1F273B]">
          <span className="w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE] pip-pulse" />
          <span className="font-mono text-[11px] text-[#94A3B8]">
            Cluster: <strong className="text-[#E2E8F0] font-medium">Hyperion-9</strong> • Local Mesh
          </span>
        </div>
      </div>

      {/* Centerpiece Telemetry Pill */}
      <div className="flex items-center gap-3">
        <TelemetryPill />
      </div>

      {/* Trailing Controls & Operator Context */}
      <div className="flex items-center gap-3">
        {/* Consensus / DAG status */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#121624] border border-[#1F273B] text-[11px] font-mono text-[#94A3B8]">
          <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>PBFT-Lite: <strong className="text-[#34D399]">4/5 Consensus</strong></span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/new-task')}
          className="hidden sm:inline-flex bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 shadow-[0_0_14px_rgba(124,58,237,0.3)] transition-all font-mono text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </Button>

        <div className="h-5 w-[1px] bg-[#1F273B] mx-0.5" />

        {/* Operator Profile */}
        <div className="flex items-center gap-2 pl-1 cursor-pointer group">
          <div className="w-7 h-7 rounded bg-[#1A1D2E] border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA] font-mono text-[11px] font-bold group-hover:border-[#8B5CF6] shadow-sm">
            SYS
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-[11px] font-medium text-[#F1F5F9] leading-tight">Lead Architect</span>
            <span className="text-[10px] font-mono text-[#64748B]">Local Host (NVIDIA)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
