import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Server,
  Play,
  Globe,
  Terminal,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [testPrompt, setTestPrompt] = useState(
    'Ping Orchestra AI. Confirm identity and local inference readiness in one sentence.'
  );
  const [testResult, setTestResult] = useState<any | null>(null);

  const {
    data: llmStatus,
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
    onSuccess: () => {
      refetchIntegrations();
    },
    onError: () => {},
  });

  const testLangSmithMutation = useMutation({
    mutationFn: () => api.testLangSmith(),
    onSuccess: () => {
      refetchIntegrations();
    },
    onError: () => {},
  });

  const isModelReady = llmStatus?.model_available ?? false;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          System configuration, Ollama model inference, and API keys.
        </p>
      </div>

      {/* 2. Ollama Inference Configuration */}
      <div className="rounded-2xl bg-[#121626] border border-[#1E2538] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2538]">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">
              Local Ollama Inference
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isModelReady ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-mono text-gray-300">
              {isModelReady ? 'MODEL READY' : 'OFFLINE / PULLING'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0A0D18] border border-[#1E2538]">
            <span className="text-gray-400">Target Model</span>
            <div className="text-white font-bold mt-1 text-sm">{llmStatus?.target_model || 'qwen3.5:4b'}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0D18] border border-[#1E2538]">
            <span className="text-gray-400">Ollama Host</span>
            <div className="text-white font-bold mt-1 text-sm">{llmStatus?.base_url || 'http://localhost:11434'}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0D18] border border-[#1E2538]">
            <span className="text-gray-400">GPU Acceleration</span>
            <div className="text-cyan-400 font-bold mt-1 text-sm">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
            </div>
          </div>
        </div>

        {/* Test Prompt Trigger */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-white">
            Inference Smoke Test Prompt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#0A0D18] border border-[#1E2538] text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:from-[#8B5CF6] hover:to-[#6366F1] text-white text-xs font-medium shadow-[0_0_15px_rgba(124,58,237,0.4)] flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{testMutation.isPending ? 'Testing...' : 'Test Model'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs font-mono leading-relaxed ${
              testResult.success
                ? 'bg-[#0A0D18] border border-emerald-500/30 text-emerald-300'
                : 'bg-[#0A0D18] border border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <div>
                <span className="font-bold text-emerald-400">Response: </span>
                {testResult.data?.response}
                <div className="text-[10px] text-gray-400 mt-1">
                  Latency: {testResult.data?.latency_ms}ms &bull; Model: {testResult.data?.model}
                </div>
              </div>
            ) : (
              <div>Error: {testResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* 3. API Integrations */}
      <div className="rounded-2xl bg-[#121626] border border-[#1E2538] p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-semibold text-white pb-3 border-b border-[#1E2538]">
          External APIs &amp; Telemetry
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tavily Search */}
          <div className="p-4 rounded-xl bg-[#0A0D18] border border-[#1E2538] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">Tavily Web Search</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  integrations?.tavily?.configured
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-gray-700/40 text-gray-400'
                }`}
              >
                {integrations?.tavily?.configured ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
            <button
              onClick={() => testTavilyMutation.mutate()}
              disabled={testTavilyMutation.isPending}
              className="w-full py-1.5 rounded-lg border border-[#1E2538] bg-[#121626] hover:bg-[#181D33] text-gray-300 hover:text-white text-xs transition-all font-mono"
            >
              {testTavilyMutation.isPending ? 'Verifying...' : 'Test Tavily Connection'}
            </button>
          </div>

          {/* LangSmith Tracing */}
          <div className="p-4 rounded-xl bg-[#0A0D18] border border-[#1E2538] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">LangSmith Tracing</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  integrations?.langsmith?.configured
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-gray-700/40 text-gray-400'
                }`}
              >
                {integrations?.langsmith?.configured ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
            <button
              onClick={() => testLangSmithMutation.mutate()}
              disabled={testLangSmithMutation.isPending}
              className="w-full py-1.5 rounded-lg border border-[#1E2538] bg-[#121626] hover:bg-[#181D33] text-gray-300 hover:text-white text-xs transition-all font-mono"
            >
              {testLangSmithMutation.isPending ? 'Verifying...' : 'Test LangSmith Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
