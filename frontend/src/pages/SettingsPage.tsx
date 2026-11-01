import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import {
  Server,
  Play,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Terminal,
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

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]" />
            <span className="text-[10px] font-mono tracking-widest text-[#22D3EE] uppercase font-semibold">
              Cluster Controls
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Infrastructure &amp; Node Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Configure local Ollama inference, ChromaDB vector store, and live diagnostic tools.
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
          className="text-xs font-mono h-9 border-[#1E2638] bg-[#0E1320] text-[#F1F5F9]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-[#22D3EE]" />
          <span>Probe All Endpoints</span>
        </Button>
      </div>

      {/* Grid of Hardware & Engine Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Ollama Configuration */}
        <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2638]">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-sm font-semibold text-[#F1F5F9] font-sans">Local Inference Core (Ollama)</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isModelReady ? 'bg-[#10B981]' : isConnected ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'}`} />
              <span className={isModelReady ? 'text-[#34D399]' : isConnected ? 'text-[#FBBF24]' : 'text-[#FB7185]'}>
                {isModelReady ? 'ONLINE' : isConnected ? 'PULLING' : 'DISCONNECTED'}
              </span>
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#1E2638]/50">
              <span className="text-[#64748B]">Ollama Endpoint</span>
              <span className="text-[#F1F5F9]">{llmStatus?.base_url || 'http://localhost:11434'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E2638]/50">
              <span className="text-[#64748B]">Target Model</span>
              <span className="text-[#22D3EE] font-semibold">{llmStatus?.target_model || 'qwen3.5:4b'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E2638]/50">
              <span className="text-[#64748B]">Host GPU</span>
              <span className="text-[#F1F5F9]">{health?.hardware?.gpu_model || 'RTX 2050 (4GB)'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B]">RAM Allocated</span>
              <span className="text-[#F1F5F9]">{health?.hardware?.ram_total_gb?.toFixed(1) || '16.0'} GB</span>
            </div>
          </div>

          {!isModelReady && isConnected && (
            <div className="p-3 rounded bg-[#181B25] border border-amber-500/30 text-xs font-mono space-y-1.5">
              <div className="text-[#FBBF24] font-semibold flex items-center justify-between">
                <span>Model Not Cached Locally:</span>
                <button
                  onClick={handleCopyInstallCommand}
                  className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-1"
                >
                  {copiedCommand ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCommand ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <div className="bg-[#07090E] p-2 rounded text-[#94A3B8] text-[11px]">
                ollama run qwen3.5:4b
              </div>
            </div>
          )}
        </div>

        {/* External Integrations */}
        <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2638]">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[#22D3EE]" />
              <span className="text-sm font-semibold text-[#F1F5F9] font-sans">Search &amp; Observability Services</span>
            </div>
          </div>

          {/* Tavily Test Block */}
          <div className="p-3.5 rounded bg-[#07090E] border border-[#1E2638] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#F1F5F9] font-semibold">Tavily Web Intelligence</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testTavilyMutation.mutate()}
                isLoading={testTavilyMutation.isPending}
                className="text-[10px] font-mono h-7 px-2.5 border-[#1E2638] bg-[#0E1320]"
              >
                Test Connection
              </Button>
            </div>
            <div className="text-[11px] font-mono text-[#64748B]">
              Status: {integrations?.tavily?.configured ? (
                <span className="text-[#34D399]">Configured &amp; Active</span>
              ) : (
                <span className="text-[#64748B]">Unconfigured (TAVILY_API_KEY optional)</span>
              )}
            </div>
            {tavilyTestResult && (
              <div className={`text-[10px] font-mono p-2 rounded ${tavilyTestResult.connected ? 'bg-[#10B981]/15 text-[#34D399]' : 'bg-[#F43F5E]/15 text-[#FB7185]'}`}>
                {tavilyTestResult.connected ? 'Connection verified successfully.' : `Error: ${tavilyTestResult.error || 'Connection failed'}`}
              </div>
            )}
          </div>

          {/* LangSmith Test Block */}
          <div className="p-3.5 rounded bg-[#07090E] border border-[#1E2638] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#F1F5F9] font-semibold">LangSmith Tracing</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testLangSmithMutation.mutate()}
                isLoading={testLangSmithMutation.isPending}
                className="text-[10px] font-mono h-7 px-2.5 border-[#1E2638] bg-[#0E1320]"
              >
                Test Connection
              </Button>
            </div>
            <div className="text-[11px] font-mono text-[#64748B]">
              Status: {integrations?.langsmith?.configured ? (
                <span className="text-[#34D399]">Configured &amp; Active</span>
              ) : (
                <span className="text-[#64748B]">Unconfigured (LANGSMITH_API_KEY optional)</span>
              )}
            </div>
            {langsmithTestResult && (
              <div className={`text-[10px] font-mono p-2 rounded ${langsmithTestResult.connected ? 'bg-[#10B981]/15 text-[#34D399]' : 'bg-[#F43F5E]/15 text-[#FB7185]'}`}>
                {langsmithTestResult.connected ? 'Tracing endpoint reachable.' : `Error: ${langsmithTestResult.error || 'Connection failed'}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Model Diagnostic Runner */}
      <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2638]">
          <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#8B5CF6]" />
            <span>Interactive Model Diagnostic Runner</span>
          </h2>
          <span className="text-[10px] font-mono text-[#64748B]">
            Sends a synchronous test query to local Ollama
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="diagnostic-prompt" className="block text-xs font-mono text-[#64748B] mb-1.5">
              Diagnostic Test Prompt:
            </label>
            <input
              id="diagnostic-prompt"
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2.5 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => testMutation.mutate()}
              isLoading={testMutation.isPending}
              disabled={!isModelReady}
              className="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 font-mono text-xs h-9 px-4"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              <span>Run Diagnostic Test</span>
            </Button>
          </div>

          {testResult && (
            <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#64748B] text-[10px]">
                <span className={testResult.success ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                  {testResult.success ? 'TEST PASSED' : 'TEST FAILED'}
                </span>
                {testResult.data?.response_time_ms && (
                  <span className="text-[#22D3EE] tabular-nums">
                    Latency: {testResult.data.response_time_ms.toFixed(1)} ms
                  </span>
                )}
              </div>
              <div className="p-3 rounded bg-[#0E1320] text-[#F1F5F9] whitespace-pre-wrap leading-relaxed">
                {testResult.success
                  ? testResult.data?.response || 'Received response from model.'
                  : `Error: ${testResult.error}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
