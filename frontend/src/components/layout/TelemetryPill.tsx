import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cpu, RefreshCw, AlertCircle, ChevronDown, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';

export const TelemetryPill: React.FC = () => {
  const [showPopover, setShowPopover] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
        return isLight
          ? 'text-[#25865E] bg-[#EAF5EE] border-[#CCE7DB]'
          : 'text-[#34D399] bg-[#10241B] border-[#1A3E2F]';
      case 'MODEL_MISSING':
        return isLight
          ? 'text-[#B98232] bg-[#FDF5E8] border-[#F7E7CD]'
          : 'text-[#D69E2E] bg-[#251E14] border-[#382C1C]';
      default:
        return isLight
          ? 'text-[#B65A56] bg-[#FDF0EE] border-[#F7D8D6]'
          : 'text-[#F87171] bg-[#2B1413] border-[#441C1B]';
    }
  };

  const getDotColor = () => {
    switch (statusEnum) {
      case 'CONNECTED':
        return isLight ? 'bg-[#25865E]' : 'bg-[#34D399]';
      case 'MODEL_MISSING':
        return isLight ? 'bg-[#B98232]' : 'bg-[#D69E2E]';
      default:
        return isLight ? 'bg-[#B65A56]' : 'bg-[#F87171]';
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
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded text-xs transition-all duration-150 border shadow-xs',
            isLight
              ? 'bg-white border-[#E2E8E3] hover:border-[#12615D] text-[#172A29]'
              : 'bg-[#10161D] border-[#1E293B] hover:border-[#12615D]/60 text-white'
          )}
          title="Click to view Ollama diagnostics"
        >
          {/* Status Dot with pulse */}
          <span className="relative flex h-2 w-2">
            {isModelReady && (
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', getDotColor())} />
            )}
            <span className={cn('relative inline-flex rounded-full h-2 w-2', getDotColor())} />
          </span>

          {/* Model info */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className={isLight ? 'text-[#667875]' : 'text-[#64748B]'}>Ollama:</span>
            <span className={cn('font-medium', isLight ? 'text-[#172A29]' : 'text-[#F1F5F9]')}>
              {llmStatus?.target_model || 'qwen3.5:4b'}
            </span>
          </div>

          {/* Status Badge */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>

          {/* GPU Hardware */}
          <div className={cn('hidden lg:flex items-center gap-1.5 pl-2.5 border-l', isLight ? 'text-[#667875] border-[#E2E8E3]' : 'text-[#94A3B8] border-[#1E293B]')}>
            <Cpu className="w-3.5 h-3.5 text-[#12615D] dark:text-[#67C9C5]" />
            <span className="font-mono text-[11px]">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'} (4GB)
            </span>
          </div>

          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', isLight ? 'text-[#667875]' : 'text-[#64748B]', showPopover ? 'rotate-180' : '')} />
        </button>

        {/* Retry Button when Offline */}
        {!isModelReady && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLLM();
            }}
            isLoading={isRefetchingLLM}
            className={cn('text-xs h-7 px-2 border', isLight ? 'bg-white border-[#E2E8E3] text-[#172A29]' : 'bg-[#10161D] border-[#1E293B] text-white')}
            title="Probe local inference engine"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Probe</span>
          </Button>
        )}
      </div>

      {/* Popover Diagnostics Panel */}
      {showPopover && (
        <div
          className={cn(
            'absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 rounded-xl border shadow-2xl p-4 z-50 animate-scale-in text-xs space-y-3 font-sans transition-all',
            isLight
              ? 'bg-white border-[#E2E8E3] text-[#172A29]'
              : 'bg-[#10161D] border-[#1E293B] text-[#F1F5F9] top-radiant-sheen'
          )}
        >
          {/* Popover Header */}
          <div className={cn('flex items-center justify-between pb-2 border-b', isLight ? 'border-[#E2E8E3]' : 'border-[#1E293B]')}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#12615D] dark:text-[#67C9C5]" />
              <span className={cn('font-semibold', isLight ? 'text-[#172A29]' : 'text-[#EDEDEF]')}>
                Local Inference Diagnostics
              </span>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className={cn('text-xs hover:opacity-100', isLight ? 'text-[#667875]' : 'text-[#949BA8]')}
            >
              ✕
            </button>
          </div>

          {/* Diagnostic Details */}
          <div className="space-y-2 font-mono text-[11px]">
            <div className={cn('flex justify-between p-2 rounded-lg border', isLight ? 'bg-[#F0F3EF] border-[#E2E8E3]' : 'bg-[#0B0F14] border-[#1E293B]')}>
              <span className={isLight ? 'text-[#667875]' : 'text-[#949BA8]'}>Host Endpoint:</span>
              <span className={isLight ? 'text-[#172A29]' : 'text-[#EDEDEF]'}>{llmStatus?.base_url || 'http://localhost:11434'}</span>
            </div>
            <div className={cn('flex justify-between p-2 rounded-lg border', isLight ? 'bg-[#F0F3EF] border-[#E2E8E3]' : 'bg-[#0B0F14] border-[#1E293B]')}>
              <span className={isLight ? 'text-[#667875]' : 'text-[#949BA8]'}>Active Model:</span>
              <span className="text-[#12615D] dark:text-[#67C9C5] font-bold">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
            </div>
            <div className={cn('flex justify-between p-2 rounded-lg border', isLight ? 'bg-[#F0F3EF] border-[#E2E8E3]' : 'bg-[#0B0F14] border-[#1E293B]')}>
              <span className={isLight ? 'text-[#667875]' : 'text-[#949BA8]'}>GPU Acceleration:</span>
              <span className="text-[#397F86] dark:text-[#22D3EE]">
                {health?.hardware?.gpu_model || 'NVIDIA RTX 2050'} ({health?.hardware?.gpu_vram_mb || 4096} MB)
              </span>
            </div>
            <div className={cn('flex justify-between p-2 rounded-lg border', isLight ? 'bg-[#F0F3EF] border-[#E2E8E3]' : 'bg-[#0B0F14] border-[#1E293B]')}>
              <span className={isLight ? 'text-[#667875]' : 'text-[#949BA8]'}>Host RAM Available:</span>
              <span className="text-[#25865E] dark:text-[#34D399]">
                {health?.hardware?.ram_available_gb ? `${health.hardware.ram_available_gb} GB` : '—'} /{' '}
                {health?.hardware?.ram_total_gb ? `${health.hardware.ram_total_gb} GB` : '16 GB'}
              </span>
            </div>
          </div>

          {/* Remediation instructions if missing */}
          {!isModelReady && (
            <div className={cn('p-2.5 rounded-lg border text-[11px] space-y-1.5', isLight ? 'bg-[#FDF5E8] border-[#F7E7CD]' : 'bg-[#251E14] border-[#382C1C]')}>
              <div className="flex items-center gap-1.5 text-[#B98232] dark:text-[#D69E2E] font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ollama Setup Required</span>
              </div>
              <p className={cn('text-[10px] leading-relaxed', isLight ? 'text-[#667875]' : 'text-[#EDEDEF]/80')}>
                Run this command in PowerShell to pull and activate the local model:
              </p>
              <div className={cn('p-1.5 rounded font-mono text-[10px] select-all', isLight ? 'bg-white text-[#B98232] border border-[#F7E7CD]' : 'bg-[#0B0F14] text-[#D69E2E]')}>
                {llmStatus?.install_command || 'ollama run qwen3.5:4b'}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-1 flex items-center justify-between">
            <span className={cn('text-[10px] font-mono', isLight ? 'text-[#667875]' : 'text-[#949BA8]')}>
              Auto-polled every 12s
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchLLM();
              }}
              isLoading={isRefetchingLLM}
              className={cn('text-xs h-7', isLight ? 'bg-white border-[#E2E8E3] text-[#172A29]' : '')}
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
