import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Settings,
  Server,
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Globe,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [testPrompt, setTestPrompt] = useState(
    'Ping Orchestra AI. Confirm identity and local inference readiness in one sentence.'
  );
  const [testResult, setTestResult] = useState<any | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState<any | null>(null);
  const [langsmithTestResult, setLangsmithTestResult] = useState<any | null>(null);

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

  const {
    data: integrations,
    refetch: refetchIntegrations,
    isRefetching: isRefetchingIntegrations,
  } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: api.getIntegrationsStatus,
  });

  const testMutation = useMutation({
    mutationFn: () => api.testLLM(testPrompt, llmStatus?.target_model),
    onSuccess: (data) => {
      setTestResult({ success: true, data });
    },
    onError: (err: any) => {
      setTestResult({ success: false, error: err.message });
    },
  });

  const testTavilyMutation = useMutation({
    mutationFn: api.testTavily,
    onSuccess: (data) => {
      setTavilyTestResult(data);
      refetchIntegrations();
    },
    onError: (err: any) => setTavilyTestResult({ connected: false, error: err.message }),
  });

  const testLangSmithMutation = useMutation({
    mutationFn: () => api.testLangSmith(),
    onSuccess: (data) => {
      setLangsmithTestResult(data);
      refetchIntegrations();
    },
    onError: (err: any) => setLangsmithTestResult({ connected: false, error: err.message }),
  });

  const handleCopyInstallCommand = () => {
    const cmd = llmStatus?.install_command || 'ollama run qwen3.5:4b';
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const isConnected = llmStatus?.connected ?? false;
  const isModelReady = llmStatus?.model_available ?? false;
  const statusEnum = llmStatus?.status || (isModelReady ? 'CONNECTED' : isConnected ? 'MODEL_MISSING' : 'SERVICE_STOPPED');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2330] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDEF] flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#818CF8]" />
            <span>Infrastructure &amp; System Configuration</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
            Local Ollama endpoints, GPU memory fences, external search, and execution tracing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchLLM();
            refetchIntegrations();
          }}
          isLoading={isRefetchingLLM || isRefetchingIntegrations}
          className="text-xs h-9"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Probe All Endpoints</span>
        </Button>
      </div>

      {/* 1. Local AI Model & Ollama Section */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2330]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4 text-[#818CF8]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#EDEDEF]">Local Ollama LLM Runtime</h2>
              <p className="text-[11px] font-mono text-[#949BA8]">
                Base Endpoint: {llmStatus?.base_url || 'http://localhost:11434'}
              </p>
            </div>
          </div>
          <Badge
            variant={isModelReady ? 'success' : isConnected ? 'warning' : 'error'}
          >
            {statusEnum}
          </Badge>
        </div>

        {/* Actionable Notice when Offline / Model Missing */}
        {!isModelReady && (
          <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#FBBF24] font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {statusEnum === 'MODEL_MISSING'
                  ? `Model '${llmStatus?.target_model}' is not pulled in local Ollama.`
                  : 'Local Ollama service is not running on port 11434.'}
              </span>
            </div>
            <p className="text-[#EDEDEF]/80 leading-relaxed text-[11px]">
              Orchestra AI operates on local zero-cost LLM infrastructure. To activate inference:
            </p>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#08090C] border border-[#1E2330] font-mono text-xs text-[#818CF8]">
              <code>{llmStatus?.install_command || 'ollama run qwen3.5:4b'}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyInstallCommand}
                className="h-6 px-2 text-[11px] text-[#949BA8] hover:text-[#EDEDEF]"
              >
                {copiedCommand ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCommand ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Specification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-1">
            <span className="text-[10px] text-[#949BA8] uppercase font-semibold">Configured Model</span>
            <p className="font-bold text-[#818CF8] text-sm">{llmStatus?.target_model || 'qwen3.5:4b'}</p>
            <p className="text-[10px] text-[#949BA8]">Fits 4-bit / 4GB VRAM GPU memory profile</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-1">
            <span className="text-[10px] text-[#949BA8] uppercase font-semibold">Ping Latency</span>
            <p className={`font-bold text-sm ${llmStatus?.latency_ms ? 'text-[#34D399]' : 'text-[#FB7185]'}`}>
              {llmStatus?.latency_ms ? `${llmStatus.latency_ms} ms` : 'Offline / Unreachable'}
            </p>
            <p className="text-[10px] text-[#949BA8]">Lightweight HTTP socket check</p>
          </div>
        </div>

        {/* Inference Diagnostic Test Trigger */}
        <div className="pt-3 border-t border-[#1E2330] space-y-2.5">
          <label className="text-xs font-semibold text-[#EDEDEF] block tracking-wide">
            Test Real Local Inference
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#090B10] border border-[#1E2330] text-xs text-[#EDEDEF] focus:outline-none focus:border-[#6366F1] shadow-inner"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => testMutation.mutate()}
              isLoading={testMutation.isPending}
              disabled={!isModelReady}
              className="text-xs h-9 shrink-0"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              <span>Run Diagnostic Prompt</span>
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                testResult.success
                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#34D399]'
                  : 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#FB7185]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{testResult.success ? 'Diagnostic Success' : 'Diagnostic Error'}</span>
              </div>
              <p className="text-[#EDEDEF] whitespace-pre-wrap leading-relaxed">
                {testResult.success
                  ? testResult.data?.response || JSON.stringify(testResult.data)
                  : testResult.error}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Hardware Resource Profile */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2330]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#EDEDEF]">Hardware Resource Constraints</h2>
              <p className="text-[11px] font-mono text-[#949BA8]">
                Detected Host Device &amp; Compute Configuration
              </p>
            </div>
          </div>
          <Badge variant="cyan">Active GPU</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-1">
            <span className="text-[10px] text-[#949BA8] uppercase font-semibold">GPU Acceleration</span>
            <p className="font-bold text-[#38BDF8] text-sm">
              {health?.hardware?.gpu_model || 'NVIDIA GeForce RTX 2050'}
            </p>
            <p className="text-[10px] text-[#949BA8]">
              {health?.hardware?.gpu_vram_mb || 4096} MB VRAM Dedicated
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-1">
            <span className="text-[10px] text-[#949BA8] uppercase font-semibold">Physical RAM</span>
            <p className="font-bold text-[#EDEDEF] text-sm">
              {health?.hardware?.ram_total_gb ? `${health.hardware.ram_total_gb} GB` : '16.0 GB'}
            </p>
            <p className="text-[10px] text-[#949BA8]">
              {health?.hardware?.ram_available_gb ? `${health.hardware.ram_available_gb} GB Free` : 'Sufficient'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-1">
            <span className="text-[10px] text-[#949BA8] uppercase font-semibold">Inference Model</span>
            <p className="font-bold text-[#34D399] text-sm">Serialized Concurrency</p>
            <p className="text-[10px] text-[#949BA8]">1 Active Worker (Prevents CUDA OOM)</p>
          </div>
        </div>
      </Card>

      {/* 3. Live Tool Integrations */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2330]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-[#818CF8]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#EDEDEF]">Tool &amp; Telemetry Integrations</h2>
              <p className="text-[11px] font-mono text-[#949BA8]">
                External Web Research &amp; Execution Tracing
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          {/* Tavily */}
          <div className="p-4 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#EDEDEF] text-sm">Tavily Web Search</span>
              <Badge variant={integrations?.tavily?.configured ? 'success' : 'neutral'}>
                {integrations?.tavily?.configured ? 'Active' : 'Not Configured'}
              </Badge>
            </div>
            <p className="text-[11px] text-[#949BA8] font-sans">
              Provides real-time web research tools for the Research Agent. When unconfigured, the pipeline operates on local document RAG.
            </p>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testTavilyMutation.mutate()}
                isLoading={testTavilyMutation.isPending}
                className="text-xs h-8"
              >
                <span>Test Tavily Connectivity</span>
              </Button>
            </div>
            {tavilyTestResult && (
              <p className={`text-[10px] ${tavilyTestResult.connected ? 'text-[#34D399]' : 'text-[#FB7185]'}`}>
                {tavilyTestResult.connected ? '✓ Tavily API reachable' : `✗ ${tavilyTestResult.error || 'Connection failed'}`}
              </p>
            )}
          </div>

          {/* LangSmith */}
          <div className="p-4 rounded-xl bg-[#0C0E14] border border-[#1E2330] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#EDEDEF] text-sm">LangSmith Tracing</span>
              <Badge variant={integrations?.langsmith?.configured ? 'success' : 'neutral'}>
                {integrations?.langsmith?.configured ? 'Active' : 'Not Configured'}
              </Badge>
            </div>
            <p className="text-[11px] text-[#949BA8] font-sans">
              Captures token analytics and node-by-node execution traces for LangGraph multi-agent debugging.
            </p>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testLangSmithMutation.mutate()}
                isLoading={testLangSmithMutation.isPending}
                className="text-xs h-8"
              >
                <span>Test LangSmith Connectivity</span>
              </Button>
            </div>
            {langsmithTestResult && (
              <p className={`text-[10px] ${langsmithTestResult.connected ? 'text-[#34D399]' : 'text-[#FB7185]'}`}>
                {langsmithTestResult.connected ? '✓ LangSmith reachable' : `✗ ${langsmithTestResult.error || 'Connection failed'}`}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
