import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import {
  Server,
  Play,
  Globe,
  Terminal,
  Sun,
  Moon,
  Sliders,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';

  const [testPrompt, setTestPrompt] = useState(
    'Ping Orchestra AI. Confirm identity and local inference readiness in one sentence.'
  );
  const [testResult, setTestResult] = useState<any | null>(null);

  const { data: llmStatus } = useQuery({
    queryKey: ['llm-status'],
    queryFn: api.getLLMStatus,
    refetchInterval: 12000,
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: api.getHealth,
    refetchInterval: 20000,
  });

  const { data: integrations, refetch: refetchIntegrations } = useQuery({
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
    <div
      className={cn(
        'p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans transition-colors duration-200',
        isLight ? 'text-[#111827]' : 'text-[#F1F5F9]'
      )}
    >
      {/* 1. Header */}
      <div>
        <h1
          className={cn(
            'text-2xl sm:text-3xl font-extrabold tracking-tight font-serif',
            isLight ? 'text-[#111827]' : 'text-white'
          )}
        >
          Settings
        </h1>
        <p className={cn('text-xs mt-1', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
          System configuration, visual theme preference, Ollama model inference, and API keys.
        </p>
      </div>

      {/* 2. Visual Theme Preference Card */}
      <div
        className={cn(
          'rounded-2xl border p-6 space-y-4 shadow-xs transition-all',
          isLight ? 'bg-[#FFFFFF] border-[#EAEAE7]' : 'bg-[#121626] border-[#1E2538]'
        )}
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-[#1E2538]">
          <Sliders className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
          <h2 className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
            Visual Appearance &amp; Theme
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Midnight Dark */}
          <div
            onClick={() => setTheme('dark')}
            className={cn(
              'p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5',
              theme === 'dark'
                ? 'border-[#0E5B59] bg-[#0E5B59]/10 shadow-xs ring-1 ring-[#0E5B59]'
                : isLight
                ? 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                : 'bg-[#0A0D18] border-[#1E2538] hover:bg-[#151B2E]'
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-[#0C1015] border border-[#1F2A37] text-[#22D3EE] flex items-center justify-center shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
                  Midnight Dark
                </span>
                {theme === 'dark' && (
                  <span className="text-[10px] font-semibold text-[#22D3EE] bg-[#0E5B59]/30 px-2 py-0.2 rounded-full border border-[#0E5B59]/40">
                    Active
                  </span>
                )}
              </div>
              <p className={cn('text-[11px] mt-1 leading-relaxed', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
                Deep slate midnight charcoal canvas with radiant teal and champagne highlights.
              </p>
            </div>
          </div>

          {/* Option B: Luxury Light */}
          <div
            onClick={() => setTheme('light')}
            className={cn(
              'p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5',
              theme === 'light'
                ? 'border-[#0E5B59] bg-[#E6F4F1] shadow-xs ring-1 ring-[#0E5B59]'
                : isLight
                ? 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                : 'bg-[#0A0D18] border-[#1E2538] hover:bg-[#151B2E]'
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] text-[#C5A46D] flex items-center justify-center shrink-0 shadow-2xs">
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
                  Luxury Light
                </span>
                {theme === 'light' && (
                  <span className="text-[10px] font-semibold text-[#0E5B59] bg-[#E6F4F1] px-2 py-0.2 rounded-full border border-[#C8E4DE]">
                    Active
                  </span>
                )}
              </div>
              <p className={cn('text-[11px] mt-1 leading-relaxed', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
                Warm ivory surfaces, deep ink typography, and restrained teal-champagne accents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ollama Inference Configuration */}
      <div
        className={cn(
          'rounded-2xl border p-6 space-y-5 shadow-xs transition-all',
          isLight ? 'bg-[#FFFFFF] border-[#EAEAE7]' : 'bg-[#131920] border-[#1F2A37]'
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1F2A37]">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
            <h2 className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
              Local Ollama Inference
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isModelReady ? 'bg-emerald-500 shadow-[0_0_8px_#34D399]' : 'bg-amber-400'
              )}
            />
            <span className={cn('text-xs font-mono font-medium', isLight ? 'text-[#374151]' : 'text-gray-300')}>
              {isModelReady ? 'MODEL READY' : 'OFFLINE / PULLING'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div
            className={cn(
              'p-3.5 rounded-xl border',
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#0A0D18] border-[#1E2538]'
            )}
          >
            <span className={cn('text-[10px] uppercase font-semibold', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              Target Model
            </span>
            <div className={cn('font-bold mt-1 text-sm', isLight ? 'text-[#111827]' : 'text-white')}>
              {llmStatus?.target_model || 'qwen3.5:4b'}
            </div>
          </div>

          <div
            className={cn(
              'p-3.5 rounded-xl border',
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#0A0D18] border-[#1E2538]'
            )}
          >
            <span className={cn('text-[10px] uppercase font-semibold', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              Ollama Host
            </span>
            <div className={cn('font-bold mt-1 text-sm', isLight ? 'text-[#111827]' : 'text-white')}>
              {llmStatus?.base_url || 'http://localhost:11434'}
            </div>
          </div>

          <div
            className={cn(
              'p-3.5 rounded-xl border',
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#0A0D18] border-[#1E2538]'
            )}
          >
            <span className={cn('text-[10px] uppercase font-semibold', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              GPU Acceleration
            </span>
            <div className="text-cyan-600 dark:text-cyan-400 font-bold mt-1 text-sm">
              {health?.hardware?.gpu_model?.replace('NVIDIA GeForce ', '') || 'RTX 2050'}
            </div>
          </div>
        </div>

        {/* Inference Smoke Test Prompt */}
        <div className="space-y-2 pt-2">
          <label className={cn('text-xs font-bold block', isLight ? 'text-[#374151]' : 'text-white')}>
            Inference Smoke Test Prompt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className={cn(
                'flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 font-mono transition-all',
                isLight
                  ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] focus:border-[#0E5B59]'
                  : 'bg-[#0A0D18] border-[#1E2538] text-white focus:border-[#0E5B59]'
              )}
            />
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="px-4 py-2 rounded-xl bg-[#0E5B59] hover:bg-[#0A4543] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{testMutation.isPending ? 'Testing...' : 'Test Model'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={cn(
              'p-4 rounded-xl text-xs font-mono leading-relaxed border',
              testResult.success
                ? isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-[#0A0D18] border-emerald-500/30 text-emerald-300'
                : isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-[#0A0D18] border-rose-500/30 text-rose-300'
            )}
          >
            {testResult.success ? (
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Response: </span>
                {testResult.data?.response}
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  Latency: {testResult.data?.latency_ms}ms &bull; Model: {testResult.data?.model}
                </div>
              </div>
            ) : (
              <div>Error: {testResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* 4. API Integrations */}
      <div
        className={cn(
          'rounded-2xl border p-6 space-y-4 shadow-xs transition-all',
          isLight ? 'bg-[#FFFFFF] border-[#EAEAE7]' : 'bg-[#121626] border-[#1E2538]'
        )}
      >
        <h2 className={cn('text-sm font-bold pb-3 border-b border-gray-100 dark:border-[#1E2538]', isLight ? 'text-[#111827]' : 'text-white')}>
          External APIs &amp; Grounding Services
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tavily Search */}
          <div
            className={cn(
              'p-4 rounded-xl border space-y-3',
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#0A0D18] border-[#1E2538]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
                <span className={cn('text-xs font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
                  Tavily Web Grounding
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono font-semibold px-2 py-0.5 rounded',
                  integrations?.tavily?.configured
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                )}
              >
                {integrations?.tavily?.configured ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
            <button
              onClick={() => testTavilyMutation.mutate()}
              disabled={testTavilyMutation.isPending}
              className={cn(
                'w-full py-1.5 rounded-lg border text-xs transition-all font-mono',
                isLight
                  ? 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50'
                  : 'border-[#1E2538] bg-[#121626] text-gray-300 hover:text-white hover:bg-[#181D33]'
              )}
            >
              {testTavilyMutation.isPending ? 'Verifying...' : 'Test Tavily Connection'}
            </button>
          </div>

          {/* LangSmith Tracing */}
          <div
            className={cn(
              'p-4 rounded-xl border space-y-3',
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#0A0D18] border-[#1E2538]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
                <span className={cn('text-xs font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
                  LangSmith Tracing
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono font-semibold px-2 py-0.5 rounded',
                  integrations?.langsmith?.configured
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                )}
              >
                {integrations?.langsmith?.configured ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
            <button
              onClick={() => testLangSmithMutation.mutate()}
              disabled={testLangSmithMutation.isPending}
              className={cn(
                'w-full py-1.5 rounded-lg border text-xs transition-all font-mono',
                isLight
                  ? 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50'
                  : 'border-[#1E2538] bg-[#121626] text-gray-300 hover:text-white hover:bg-[#181D33]'
              )}
            >
              {testLangSmithMutation.isPending ? 'Verifying...' : 'Test LangSmith Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
