import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { TaskCreateInput } from '../types';
import {
  PlusCircle,
  Sparkles,
  ArrowRight,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'research', label: 'Web & Literature Research' },
  { value: 'architecture', label: 'System & Architecture Design' },
  { value: 'code_generation', label: 'Code Synthesis & Implementation' },
  { value: 'verification', label: 'Security & QA Verification' },
  { value: 'general', label: 'General Multi-Agent Workflow' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Urgent' },
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
      'Design an RBAC and JWT verification architecture for autonomous agent delegation and audit compliance.',
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSubmittedTask(created);
    },
  });

  const validate = () => {
    const errors: { title?: string; description?: string } = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = 'Task prompt must be at least 10 characters to provide sufficient context.';
    }
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

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setCategory(preset.category);
    setPriority(preset.priority);
    setValidationErrors({});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2330] flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDEF] flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-[#818CF8]" />
            <span>Dispatch New Autonomous Task</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
            Submit a complex goal for coordinated multi-agent planning, research, and execution.
          </p>
        </div>
      </div>

      {submittedTask ? (
        <Card className="p-8 border-[#10B981]/30 bg-[#11141D] space-y-5 text-center max-w-2xl mx-auto shadow-hover">
          <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-[#EDEDEF] tracking-tight">Task Committed to SQLite Database</h2>
            <p className="text-xs text-[#949BA8] font-mono">
              Task ID: <span className="text-[#38BDF8]">{submittedTask.id}</span>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#090B10] border border-[#1E2330] text-left text-xs max-w-md mx-auto space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-[#949BA8]">Status:</span>
              <span className="text-[#FBBF24] font-semibold uppercase">{submittedTask.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#949BA8]">Category:</span>
              <span className="text-[#EDEDEF]">{submittedTask.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#949BA8]">Target Fleet:</span>
              <span className="text-[#38BDF8]">5 Specialized Local Agents</span>
            </div>
          </div>
          <div className="flex justify-center gap-3 pt-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSubmittedTask(null);
                setTitle('');
                setDescription('');
              }}
            >
              Submit Another Task
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/agents?taskId=${submittedTask.id}`)}
            >
              <span>Inspect in Agent Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2/3) */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <Card className="p-5 sm:p-6 space-y-5">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDEDEF] block tracking-wide">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Emerging agentic AI technologies research in 2026"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090B10] border border-[#1E2330] text-xs text-[#EDEDEF] placeholder-[#949BA8]/40 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner transition-colors"
                />
                {validationErrors.title && (
                  <p className="text-[11px] text-[#FB7185] flex items-center gap-1 mt-1 font-mono">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.title}
                  </p>
                )}
              </div>

              {/* Task Prompt / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDEDEF] block tracking-wide">
                  Detailed Prompt &amp; Objectives
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your objective, requirements, specific questions to answer, constraints, or formats needed..."
                  className="w-full p-3.5 rounded-lg bg-[#090B10] border border-[#1E2330] text-xs text-[#EDEDEF] placeholder-[#949BA8]/40 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner transition-colors leading-relaxed"
                />
                {validationErrors.description && (
                  <p className="text-[11px] text-[#FB7185] flex items-center gap-1 mt-1 font-mono">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.description}
                  </p>
                )}
              </div>

              {/* Category & Priority Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDEDEF] block tracking-wide">
                    Domain Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1E2330] text-xs text-[#EDEDEF] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDEDEF] block tracking-wide">
                    Priority Dispatch
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRIORITIES.map((pri) => (
                      <button
                        type="button"
                        key={pri.value}
                        onClick={() => setPriority(pri.value)}
                        className={`py-2 text-[11px] font-mono rounded-lg border transition-all duration-150 ${
                          priority === pri.value
                            ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#A5B4FC] font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                            : 'bg-[#090B10] border-[#1E2330] text-[#949BA8] hover:text-[#EDEDEF] hover:border-[#2D3447]'
                        }`}
                      >
                        {pri.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Knowledge Base Document Attachment */}
              <div className="space-y-1.5 pt-3 border-t border-[#1E2330]">
                <label className="text-xs font-semibold text-[#EDEDEF] flex items-center gap-2 tracking-wide">
                  <Paperclip className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Attach Knowledge Base Context (Optional)</span>
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1E2330] text-xs text-[#EDEDEF] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner cursor-pointer"
                >
                  <option value="">No document attached (Clean run)</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({(doc.file_size / 1024).toFixed(1)} KB)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#949BA8]">
                  Selected document will be passed into the Research Agent for localized ChromaDB retrieval.
                </p>
              </div>

              {/* Execution Options */}
              <div className="space-y-2.5 pt-3 border-t border-[#1E2330]">
                <label className="text-xs font-semibold text-[#EDEDEF] flex items-center gap-2 tracking-wide">
                  <Sliders className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Execution Configuration</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-[#090B10] border border-[#1E2330] hover:border-[#2D3447] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      className="rounded border-[#1E2330] text-[#6366F1] focus:ring-0 accent-[#6366F1]"
                    />
                    <div>
                      <span className="font-medium text-[#EDEDEF] block">Tavily Web Search</span>
                      <span className="text-[10px] text-[#949BA8] block">Enable live web search tool</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-[#090B10] border border-[#1E2330] hover:border-[#2D3447] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={enableTracing}
                      onChange={(e) => setEnableTracing(e.target.checked)}
                      className="rounded border-[#1E2330] text-[#6366F1] focus:ring-0 accent-[#6366F1]"
                    />
                    <div>
                      <span className="font-medium text-[#EDEDEF] block">LangSmith Tracing</span>
                      <span className="text-[10px] text-[#949BA8] block">Record DAG telemetry</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-[#090B10] border border-[#1E2330] hover:border-[#F59E0B]/40 cursor-pointer transition-colors sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={requireApproval}
                      onChange={(e) => setRequireApproval(e.target.checked)}
                      className="rounded border-[#1E2330] text-[#F59E0B] focus:ring-0 accent-[#F59E0B]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#EDEDEF] block">Human Approval Gate</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
                          HITL
                        </span>
                      </div>
                      <span className="text-[10px] text-[#949BA8] block">
                        Pause workflow before Verifier Agent; persists checkpoint in SQLite until approved
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-xs h-10 shadow-glow"
                  isLoading={mutation.isPending}
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  <span>Dispatch Task to Agent Pipeline</span>
                </Button>
              </div>
            </Card>
          </form>

          {/* Presets Sidebar (1/3) */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-[#EDEDEF] flex items-center gap-1.5 tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>Quick-Start Presets</span>
              </h2>
              <p className="text-[11px] text-[#949BA8]">
                Click any preset to prefill the task composer.
              </p>
            </div>

            <div className="space-y-3">
              {PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3.5 rounded-xl bg-[#11141D] border border-[#1E2330] hover:border-[#6366F1]/50 shadow-card hover:shadow-hover cursor-pointer transition-all duration-150 space-y-2 group select-none relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#EDEDEF] group-hover:text-[#818CF8] transition-colors truncate">
                      {preset.title}
                    </span>
                    <Badge variant="neutral" className="text-[9px] uppercase font-mono shrink-0">
                      {preset.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#949BA8] line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
