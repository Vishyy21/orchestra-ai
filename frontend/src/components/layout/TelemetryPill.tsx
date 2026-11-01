import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cpu, RefreshCw, AlertCircle, ChevronDown, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

export const TelemetryPill: React.FC = () => {
  const [showPopover, setShowPopover] = useState(false);

  const {
    data: llmStatus,
    refetch: refetchLLM,
    isRefetching: isRefetchingLLM,
  } = useQuery({
    queryKey: ['llm-status'],
    queryFn: api.getLLMStatus,
    refetchInterval: 12000,
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: api.getHealth,
    refetchInterval: 20000,
  });

  const isConnected = llmStatus?.connected ?? false;
  const isModelReady = llmStatus?.model_available ?? false;
  const statusEnum = llmStatus?.status || (isModelReady ? 'CONNECTED' : isConnected ? 'MODEL_MISSING' : 'SERVICE_STOPPED');

  const getStatusColor = () => {
    switch (statusEnum) {
      case 'CONNECTED':
        return 'text-[#34D399] bg-[#10B981]/12 border-[#10B981]/25';
      case 'MODEL_MISSING':
        return 'text-[#FBBF24] bg-[#F59E0B]/12 border-[#F59E0B]/25';
      default:
        return 'text-[#FB7185] bg-[#F43F5E]/12 border-[#F43F5E]/25';
    }
  };

  const getDotColor = () => {
    switch (statusEnum) {
      case 'CONNECTED':
        return 'bg-[#10B981]';
      case 'MODEL_MISSING':
        return 'bg-[#F59E0B]';
      default:
        return 'bg-[#F43F5E]';
    }
  };

  const getStatusLabel = () => {
    switch (statusEnum) {
      case 'CONNECTED':
        return 'CONNECTED';
      case 'MODEL_MISSING':
        return 'MODEL MISSING';
      default:
        return 'OFFLINE';
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#121624] border border-[#1F273B] hover:border-[#0E5B59]/60 text-xs transition-all duration-150 shadow-sm"
          title="Click to view Ollama diagnostics"
        >
          {/* Status Dot with pulse */}
          <span className="relative flex h-2 w-2">
            {isModelReady && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${getDotColor()}`} />
          </span>

          {/* Model info */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[#64748B]">Ollama:</span>
            <span className="text-[#F1F5F9] font-medium">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
          </div>

          {/* Status Badge */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>

          {/* GPU Hardware */}
          <div className="hidden lg:flex items-center gap-1.5 text-[#949BA8] pl-2.5 border-l border-[#1F273B]">
            <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="font-mono text-[11px]">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'} (4GB)
            </span>
          </div>

          <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${showPopover ? 'rotate-180' : ''}`} />
        </button>

        {/* Retry Button when Offline */}
        {!isModelReady && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLLM()}
            isLoading={isRefetchingLLM}
            title="Probe Ollama connection"
            className="text-xs h-7 px-2.5 font-mono border-[#1F273B] hover:border-[#0E5B59]/60 bg-[#121624]"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Probe</span>
          </Button>
        )}
      </div>

      {/* Popover Diagnostics Panel */}
      {showPopover && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 rounded bg-[#121624] border border-[#2A354D] shadow-2xl p-4 z-50 animate-scale-in text-xs space-y-3 font-sans top-radiant-sheen">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2330]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#6366F1]" />
              <span className="font-semibold text-[#EDEDEF]">Local Inference Diagnostics</span>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="text-[#949BA8] hover:text-[#EDEDEF] text-xs"
            >
              ✕
            </button>
          </div>

          {/* Diagnostic Details */}
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between p-2 rounded-lg bg-[#090B10] border border-[#1A1F2C]">
              <span className="text-[#949BA8]">Host Endpoint:</span>
              <span className="text-[#EDEDEF]">{llmStatus?.base_url || 'http://localhost:11434'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[#090B10] border border-[#1A1F2C]">
              <span className="text-[#949BA8]">Active Model:</span>
              <span className="text-[#818CF8] font-bold">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[#090B10] border border-[#1A1F2C]">
              <span className="text-[#949BA8]">GPU Acceleration:</span>
              <span className="text-[#38BDF8]">
                {health?.hardware?.gpu_model || 'NVIDIA RTX 2050'} ({health?.hardware?.gpu_vram_mb || 4096} MB)
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[#090B10] border border-[#1A1F2C]">
              <span className="text-[#949BA8]">Host RAM Available:</span>
              <span className="text-[#34D399]">
                {health?.hardware?.ram_available_gb ? `${health.hardware.ram_available_gb} GB` : '—'} /{' '}
                {health?.hardware?.ram_total_gb ? `${health.hardware.ram_total_gb} GB` : '16 GB'}
              </span>
            </div>
          </div>

          {/* Remediation instructions if missing */}
          {!isModelReady && (
            <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#FBBF24] font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ollama Setup Required</span>
              </div>
              <p className="text-[#EDEDEF]/80 text-[10px] leading-relaxed">
                Run this command in PowerShell to pull and activate the local model:
              </p>
              <div className="p-1.5 rounded bg-[#090B10] text-[#FBBF24] font-mono text-[10px] select-all">
                {llmStatus?.install_command || 'ollama run qwen3.5:4b'}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-[#949BA8] font-mono">
              Auto-polled every 12s
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchLLM();
              }}
              isLoading={isRefetchingLLM}
              className="text-xs h-7"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Status</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
