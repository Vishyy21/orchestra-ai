import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import type { TaskCreateInput } from '../types';
import {
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Send,
  Shield,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'research', label: 'Web & Literature Research' },
  { value: 'architecture', label: 'System & Architecture Design' },
  { value: 'code_generation', label: 'Code Synthesis & Implementation' },
  { value: 'verification', label: 'Security & QA Verification' },
  { value: 'general', label: 'General Multi-Agent Workflow' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', badgeClass: 'text-[#94A3B8] border-[#1E2638] bg-[#07090E]' },
  { value: 'medium', label: 'Normal', badgeClass: 'text-[#22D3EE] border-[#06B6D4]/30 bg-[#06B6D4]/10' },
  { value: 'high', label: 'High', badgeClass: 'text-[#FBBF24] border-amber-500/30 bg-amber-500/10' },
  { value: 'critical', label: 'Critical', badgeClass: 'text-[#FB7185] border-[#F43F5E]/30 bg-[#F43F5E]/10' },
];

const PRESETS = [
  {
    title: 'Top Emerging Agentic AI Technologies in 2026',
    description:
      'Research the top emerging agentic AI technologies in 2026, explain their applications, compare them and prepare a structured report with sources.',
    category: 'research',
    priority: 'high',
  },
  {
    title: 'Microservices Circuit Breaker & Resiliency Pattern',
    description:
      'Analyze and implement an asynchronous circuit breaker pattern with backoff jitter in Python for resilient local LLM orchestration.',
    category: 'code_generation',
    priority: 'medium',
  },
  {
    title: 'Zero-Trust Multi-Agent Authorization Architecture',
    description:
      'Design an RBAC and cryptographic verification architecture for autonomous agent delegation and audit compliance.',
    category: 'architecture',
    priority: 'critical',
  },
];

export const NewTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('research');
  const [priority, setPriority] = useState('high');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enableTracing, setEnableTracing] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{ title?: string; description?: string }>({});
  const [submittedTask, setSubmittedTask] = useState<any | null>(null);

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });

  const mutation = useMutation({
    mutationFn: async (data: TaskCreateInput) => {
      const created = await api.createTask(data);
      try {
        await api.executeTask(created.id, false, data.requires_approval);
      } catch (err) {
        console.error('Failed to auto-dispatch task:', err);
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setSubmittedTask(created);
      setTimeout(() => {
        navigate(`/agents?taskId=${created.id}`);
      }, 1200);
    },
  });

  const validate = () => {
    const errors: { title?: string; description?: string } = {};
    if (!title.trim()) errors.title = 'Mission title is required';
    if (!description.trim()) errors.description = 'Mission objective / directives are required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      requires_approval: requireApproval,
    });
  };

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.category);
    setPriority(p.priority);
    setValidationErrors({});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]" />
            <span className="text-[10px] font-mono tracking-widest text-[#22D3EE] uppercase font-semibold">
              Mission Dispatcher
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Compose Multi-Agent Directives
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Dispatch a coordinated five-agent workflow with local inference, RAG context, and governance gates.
          </p>
        </div>
      </div>

      {submittedTask && (
        <div className="p-4 rounded bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-between text-xs font-mono text-[#34D399]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
            <span>Mission #{submittedTask.id.slice(0, 8)} successfully dispatched. Redirecting to workspace...</span>
          </div>
          <div className="w-4 h-4 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Two-Column Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 2/3 Primary Composer */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Title & Priority Block */}
          <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
            <div>
              <label htmlFor="mission-title" className="block text-xs font-semibold text-[#F1F5F9] font-sans mb-1.5">
                Mission Directive Title
              </label>
              <input
                id="mission-title"
                type="text"
                placeholder="e.g. Synthesize Distributed Consensus Audit for Cluster-01"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2.5 rounded border focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                  validationErrors.title ? 'border-[#F43F5E]' : 'border-[#1E2638]'
                }`}
              />
              {validationErrors.title && (
                <p className="text-[11px] font-mono text-[#FB7185] mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{validationErrors.title}</span>
                </p>
              )}
            </div>

            {/* Tactical Priority Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] font-sans mb-2">
                Execution Priority
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-2 px-3 rounded text-xs font-mono border transition-all text-center ${
                      priority === p.value
                        ? 'bg-[#181F33] text-[#F1F5F9] font-bold border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                        : 'bg-[#07090E] text-[#64748B] border-[#1E2638] hover:text-[#94A3B8] hover:bg-[#0E1320]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label htmlFor="mission-category" className="block text-xs font-semibold text-[#F1F5F9] font-sans mb-1.5">
                Task Domain &amp; Workflow Category
              </label>
              <select
                id="mission-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2.5 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#07090E] text-[#F1F5F9]">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Objective / Directives Studio Textarea */}
          <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="mission-description" className="block text-xs font-semibold text-[#F1F5F9] font-sans">
                Directives &amp; Research Objectives
              </label>
              <span className="text-[10px] font-mono text-[#64748B]">
                {description.length} characters
              </span>
            </div>

            <textarea
              id="mission-description"
              rows={7}
              placeholder="Provide explicit instructions for the Planner, Research, Analysis, Verification, and Reporter agents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono p-3.5 rounded border focus:outline-none focus:border-[#8B5CF6] leading-relaxed transition-colors ${
                validationErrors.description ? 'border-[#F43F5E]' : 'border-[#1E2638]'
              }`}
            />
            {validationErrors.description && (
              <p className="text-[11px] font-mono text-[#FB7185] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{validationErrors.description}</span>
              </p>
            )}
          </div>

          {/* 3. Context Document Attachment (ChromaDB RAG) */}
          <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="document-context" className="block text-xs font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#8B5CF6]" />
                <span>Grounding Context &bull; ChromaDB Documents</span>
              </label>
              <span className="text-[10px] font-mono text-[#64748B]">
                {documents?.length || 0} indexed documents available
              </span>
            </div>

            <select
              id="document-context"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono px-3.5 py-2.5 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="">No specific document attached (general RAG context)</option>
              {documents?.map((doc) => (
                <option key={doc.id} value={doc.id} className="bg-[#07090E] text-[#F1F5F9]">
                  {doc.filename} ({doc.chunk_count} chunks &bull; {(doc.file_size / 1024).toFixed(1)} KB)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: 1/3 Execution Parameters & Quick Presets */}
        <div className="lg:col-span-4 space-y-5">
          {/* Execution Controls & Governance */}
          <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
            <h3 className="text-xs font-semibold text-[#F1F5F9] font-sans pb-2 border-b border-[#1E2638] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#22D3EE]" />
              <span>Execution Controls &amp; Governance</span>
            </h3>

            {/* Tavily Toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs font-medium text-[#F1F5F9] font-sans">Tavily Web Search</div>
                <div className="text-[10px] font-mono text-[#64748B]">Grounding SERP retrieval</div>
              </div>
              <button
                type="button"
                onClick={() => setEnableWebSearch(!enableWebSearch)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  enableWebSearch ? 'bg-[#7C3AED]' : 'bg-[#1E2638]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    enableWebSearch ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* LangSmith Toggle */}
            <div className="flex items-center justify-between py-1 border-t border-[#1E2638]">
              <div>
                <div className="text-xs font-medium text-[#F1F5F9] font-sans">LangSmith Tracing</div>
                <div className="text-[10px] font-mono text-[#64748B]">Telemetry &amp; run traces</div>
              </div>
              <button
                type="button"
                onClick={() => setEnableTracing(!enableTracing)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  enableTracing ? 'bg-[#7C3AED]' : 'bg-[#1E2638]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    enableTracing ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Human Approval Gate Toggle */}
            <div className="flex items-center justify-between py-1 border-t border-[#1E2638]">
              <div>
                <div className="text-xs font-medium text-[#FBBF24] font-sans flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Human Approval Gate</span>
                </div>
                <div className="text-[10px] font-mono text-[#94A3B8]">Pause before Verifier step</div>
              </div>
              <button
                type="button"
                onClick={() => setRequireApproval(!requireApproval)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  requireApproval ? 'bg-[#F59E0B]' : 'bg-[#1E2638]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    requireApproval ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick-Dispatch System Presets */}
          <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-3">
            <h3 className="text-xs font-semibold text-[#F1F5F9] font-sans pb-2 border-b border-[#1E2638] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span>Quick-Dispatch Presets</span>
            </h3>

            <div className="space-y-2.5">
              {PRESETS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="p-3 rounded bg-[#07090E] border border-[#1E2638] hover:border-[#8B5CF6]/50 hover:bg-[#121828] cursor-pointer transition-all space-y-1 group"
                >
                  <div className="text-xs font-semibold text-[#F1F5F9] group-hover:text-[#A78BFA] transition-colors line-clamp-1">
                    {p.title}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748B] flex items-center justify-between">
                    <span className="capitalize">{p.category}</span>
                    <span className="text-[#22D3EE] group-hover:underline">Inject &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Dispatch Trigger */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={mutation.isPending}
              className="w-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border border-[#A78BFA]/30 shadow-[0_0_16px_rgba(124,58,237,0.3)] font-mono text-xs font-bold h-11"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>Dispatch Mission</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
