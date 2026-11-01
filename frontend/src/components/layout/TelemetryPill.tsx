import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cpu, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, Terminal } from 'lucide-react';
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
        return 'text-[#36B98A] bg-[#36B98A]/10 border-[#36B98A]/20';
      case 'MODEL_MISSING':
        return 'text-[#E6AA57] bg-[#E6AA57]/10 border-[#E6AA57]/20';
      default:
        return 'text-[#E16D78] bg-[#E16D78]/10 border-[#E16D78]/20';
    }
  };

  const getDotColor = () => {
    switch (statusEnum) {
      case 'CONNECTED':
        return 'bg-[#36B98A]';
      case 'MODEL_MISSING':
        return 'bg-[#E6AA57]';
      default:
        return 'bg-[#E16D78]';
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
          className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-[#151922] border border-[#252B36] hover:border-[#343C4B] text-xs transition-colors"
          title="Click to view Ollama diagnostics"
        >
          {/* Status Dot */}
          <span className={`w-2 h-2 rounded-full ${getDotColor()}`} />

          {/* Model info */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[#9CA3AF]">Ollama:</span>
            <span className="text-[#E5E7EB] font-medium">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
          </div>

          {/* Status Badge */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold tracking-wide border ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>

          {/* GPU Hardware */}
          <div className="hidden lg:flex items-center gap-1 text-[#9CA3AF] pl-1 border-l border-[#252B36]">
            <Cpu className="w-3.5 h-3.5 text-[#55C7D9]" />
            <span className="font-mono text-[11px]">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'} (4GB)
            </span>
          </div>

          <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
        </button>

        {/* Retry Button when Offline */}
        {!isModelReady && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLLM()}
            isLoading={isRefetchingLLM}
            className="hidden sm:inline-flex"
            title="Retry connecting to local Ollama service"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </Button>
        )}
      </div>

      {/* Diagnostics Dropdown Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute top-full mt-2 left-0 w-80 p-3.5 rounded-lg bg-[#151922] border border-[#252B36] shadow-dropdown z-50 text-xs space-y-3 animate-fade-in font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-[#252B36]">
              <div className="flex items-center gap-2">
                {isModelReady ? (
                  <CheckCircle2 className="w-4 h-4 text-[#36B98A]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#E16D78]" />
                )}
                <span className="font-semibold text-[#E5E7EB]">Ollama Health Diagnostics</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchLLM()}
                isLoading={isRefetchingLLM}
                className="h-6 px-1.5 text-[10px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Probe</span>
              </Button>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Runtime Status:</span>
                <span className={`font-semibold ${isModelReady ? 'text-[#36B98A]' : 'text-[#E16D78]'}`}>
                  {statusEnum}
                </span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Target Model:</span>
                <span className="text-[#E5E7EB]">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Base Endpoint:</span>
                <span className="text-[#E5E7EB]">{llmStatus?.base_url || 'http://localhost:11434'}</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>GPU Acceleration:</span>
                <span className="text-[#55C7D9]">
                  {health?.hardware?.gpu_model || 'NVIDIA RTX 2050'} (4GB VRAM)
                </span>
              </div>
            </div>

            {!isModelReady && (
              <div className="p-2.5 rounded bg-[#11141B] border border-[#252B36] space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold text-[#E6AA57]">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>How to connect local Ollama:</span>
                </div>
                <p className="text-[#9CA3AF] leading-relaxed">
                  {statusEnum === 'MODEL_MISSING'
                    ? `Ollama is running, but '${llmStatus?.target_model || 'qwen3.5:4b'}' is not installed.`
                    : 'Ollama is not running on port 11434.'}
                </p>
                <div className="p-1.5 rounded bg-[#0B0D12] text-[#8B7CFF] font-mono text-[10px] break-all select-all">
                  {statusEnum === 'MODEL_MISSING'
                    ? `ollama run ${llmStatus?.target_model || 'qwen3.5:4b'}`
                    : '.\\scripts\\start_orchestra.ps1'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
