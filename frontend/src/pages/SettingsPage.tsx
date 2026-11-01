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
  Activity,
  ShieldCheck,
  Database,
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
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#252B36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#8B7CFF]" />
            Infrastructure &amp; System Configuration
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
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
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Probe All Endpoints</span>
        </Button>
      </div>

      {/* 1. Local AI Model & Ollama Section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#252B36]">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#8B7CFF]" />
            <div>
              <h2 className="text-sm font-semibold text-[#E5E7EB]">Local Ollama LLM Runtime</h2>
              <p className="text-[11px] font-mono text-[#9CA3AF]">
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
          <div className="p-3.5 rounded-lg bg-[#11141B] border border-[#252B36] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#E6AA57] font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {statusEnum === 'MODEL_MISSING'
                  ? `Model '${llmStatus?.target_model}' is not pulled in local Ollama.`
                  : 'Local Ollama service is not running on port 11434.'}
              </span>
            </div>
            <p className="text-[#9CA3AF] leading-relaxed">
              Orchestra AI operates on local zero-cost LLM infrastructure. To activate inference:
            </p>
            <div className="flex items-center justify-between p-2 rounded bg-[#0B0D12] border border-[#252B36] font-mono text-xs text-[#8B7CFF]">
              <code>{llmStatus?.install_command || 'ollama run qwen3.5:4b'}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyInstallCommand}
                className="h-6 px-2 text-[11px] text-[#9CA3AF] hover:text-[#E5E7EB]"
              >
                {copiedCommand ? <Check className="w-3 h-3 text-[#36B98A]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCommand ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Specification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] space-y-1">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Configured Model</span>
            <p className="font-bold text-[#8B7CFF] text-sm">{llmStatus?.target_model || 'qwen3.5:4b'}</p>
            <p className="text-[10px] text-[#9CA3AF]">Fits 4-bit / 4GB VRAM GPU memory profile</p>
          </div>

          <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] space-y-1">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Ping Latency</span>
            <p className={`font-bold text-sm ${llmStatus?.latency_ms ? 'text-[#36B98A]' : 'text-[#E16D78]'}`}>
              {llmStatus?.latency_ms ? `${llmStatus.latency_ms} ms` : 'Offline / Unreachable'}
            </p>
            <p className="text-[10px] text-[#9CA3AF]">Lightweight HTTP socket check</p>
          </div>
        </div>

        {/* Inference Diagnostic Test Trigger */}
        <div className="pt-2 border-t border-[#252B36] space-y-2">
          <label className="text-xs font-semibold text-[#E5E7EB] block">
            Test Real Local Inference
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#E5E7EB] focus:outline-none focus:border-[#8B7CFF]"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => testMutation.mutate()}
              isLoading={testMutation.isPending}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Test</span>
            </Button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] font-mono text-xs space-y-1.5">
              {testResult.success ? (
                <>
                  <div className="flex items-center justify-between text-[#36B98A]">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Inference Verified ({testResult.data.latency_ms} ms)
                    </span>
                    <span className="text-[11px] text-[#9CA3AF]">Model: {testResult.data.model}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#151922] border border-[#252B36] text-[#E5E7EB] font-sans leading-relaxed">
                    {testResult.data.response}
                  </div>
                </>
              ) : (
                <div className="text-[#E16D78] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Inference Request Failed</span>
                  </div>
                  <p className="text-[11px] text-[#E16D78]/90">{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 2. GPU Hardware & Concurrency Guardrails */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#252B36]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#55C7D9]" />
            <h2 className="text-sm font-semibold text-[#E5E7EB]">NVIDIA GPU &amp; Hardware Telemetry</h2>
          </div>
          <Badge variant="cyan">RTX 2050 Profile</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] space-y-1">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Dedicated GPU</span>
            <p className="font-bold text-[#E5E7EB]">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
            </p>
            <p className="text-[10px] text-[#55C7D9]">
              {health?.hardware?.gpu_vram_mb || 4096} MB VRAM
            </p>
          </div>

          <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] space-y-1">
            <span className="text-[10px] text-[#9CA3AF] uppercase">System Memory</span>
            <p className="font-bold text-[#E5E7EB]">
              {health?.hardware?.ram_total_gb || 16.0} GB RAM
            </p>
            <p className="text-[10px] text-[#36B98A]">Single Resident Model</p>
          </div>

          <div className="p-3 rounded-md bg-[#11141B] border border-[#252B36] space-y-1">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Concurrency Fence</span>
            <p className="font-bold text-[#8B7CFF]">Serialized (N=1)</p>
            <p className="text-[10px] text-[#9CA3AF]">Protects against VRAM thrashing</p>
          </div>
        </div>
      </Card>

      {/* 3. External Integrations: Tavily & LangSmith */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#252B36]">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#8B7CFF]" />
            <div>
              <h2 className="text-sm font-semibold text-[#E5E7EB]">External Tools &amp; Tracing Observability</h2>
              <p className="text-[11px] font-mono text-[#9CA3AF]">
                Tavily Web Search and LangSmith tracing integrations.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchIntegrations()}
            isLoading={isRefetchingIntegrations}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tavily Web Search Card */}
          <div className="p-4 rounded-lg bg-[#11141B] border border-[#252B36] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#55C7D9]" />
                  <span className="text-xs font-semibold text-[#E5E7EB]">Tavily Web Search</span>
                </div>
                <Badge variant={integrations?.tavily?.configured ? 'success' : 'warning'}>
                  {integrations?.tavily?.configured ? 'Configured' : 'Unconfigured'}
                </Badge>
              </div>

              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                Empowers the <strong className="text-[#E5E7EB]">Research Agent</strong> with live web retrieval and citation verification.
              </p>

              <div className="text-[11px] font-mono text-[#9CA3AF] space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>API Key:</span>
                  <span className="text-[#E5E7EB] font-semibold">
                    {integrations?.tavily?.masked_key || 'Not configured in backend/.env'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Search Depth:</span>
                  <span className="text-[#E5E7EB]">{integrations?.tavily?.details?.search_depth || 'basic'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#252B36] space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => testTavilyMutation.mutate()}
                isLoading={testTavilyMutation.isPending}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Test Tavily Connection</span>
              </Button>

              {tavilyTestResult && (
                <div
                  className={`p-2 rounded text-[11px] font-mono ${
                    tavilyTestResult.connected
                      ? 'bg-[#36B98A]/10 border border-[#36B98A]/30 text-[#36B98A]'
                      : 'bg-[#E16D78]/10 border border-[#E16D78]/30 text-[#E16D78]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {tavilyTestResult.connected ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{tavilyTestResult.message || (tavilyTestResult.connected ? 'Connected' : 'Failed')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LangSmith Observability Card */}
          <div className="p-4 rounded-lg bg-[#11141B] border border-[#252B36] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#8B7CFF]" />
                  <span className="text-xs font-semibold text-[#E5E7EB]">LangSmith Observability</span>
                </div>
                <Badge variant={integrations?.langsmith?.configured ? 'success' : 'warning'}>
                  {integrations?.langsmith?.configured ? 'Tracing Active' : 'Unconfigured'}
                </Badge>
              </div>

              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                Provides deep run tracing, token telemetry, and debugging for <strong className="text-[#E5E7EB]">LangGraph agent workflows</strong>.
              </p>

              <div className="text-[11px] font-mono text-[#9CA3AF] space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>API Key:</span>
                  <span className="text-[#E5E7EB] font-semibold">
                    {integrations?.langsmith?.masked_key || 'Not configured in backend/.env'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target Project:</span>
                  <span className="text-[#E5E7EB]">{integrations?.langsmith?.details?.project || 'orchestra-ai'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#252B36] space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => testLangSmithMutation.mutate()}
                isLoading={testLangSmithMutation.isPending}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Test LangSmith Connection</span>
              </Button>

              {langsmithTestResult && (
                <div
                  className={`p-2 rounded text-[11px] font-mono ${
                    langsmithTestResult.connected
                      ? 'bg-[#36B98A]/10 border border-[#36B98A]/30 text-[#36B98A]'
                      : 'bg-[#E16D78]/10 border border-[#E16D78]/30 text-[#E16D78]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {langsmithTestResult.connected ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{langsmithTestResult.message || (langsmithTestResult.connected ? 'Connected' : 'Failed')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security & Offline Policy Banner */}
        <div className="flex items-center gap-3 p-3 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#9CA3AF]">
          <ShieldCheck className="w-4 h-4 text-[#36B98A] shrink-0" />
          <p className="text-[11px]">
            <strong className="text-[#E5E7EB]">Security Guarantee:</strong> All API keys are loaded securely from <code className="font-mono text-[#8B7CFF]">backend/.env</code>. Keys are never passed to the frontend browser or committed to Git. The primary LLM (<code className="font-mono text-[#55C7D9]">Qwen3.5 4B</code>) runs 100% locally on Ollama.
          </p>
        </div>
      </Card>

      {/* 4. Storage & Application Configuration */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#252B36]">
          <Database className="w-4 h-4 text-[#55C7D9]" />
          <h2 className="text-sm font-semibold text-[#E5E7EB]">Storage &amp; Persistence Paths</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#11141B] border border-[#252B36] space-y-0.5">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Database</span>
            <p className="text-[#E5E7EB] font-medium">orchestra.db (SQLite)</p>
          </div>
          <div className="p-2.5 rounded bg-[#11141B] border border-[#252B36] space-y-0.5">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Uploads Directory</span>
            <p className="text-[#E5E7EB] font-medium">./data/uploads</p>
          </div>
          <div className="p-2.5 rounded bg-[#11141B] border border-[#252B36] space-y-0.5">
            <span className="text-[10px] text-[#9CA3AF] uppercase">Vector Embeddings</span>
            <p className="text-[#E5E7EB] font-medium">./data/chroma</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
