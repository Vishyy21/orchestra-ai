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
        await api.executeTask(created.id);
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
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#252B36] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#8B7CFF]" />
            Dispatch New Autonomous Task
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Submit a complex goal for coordinated multi-agent planning, research, and execution.
          </p>
        </div>
      </div>

      {submittedTask ? (
        <Card className="p-6 border-[#36B98A]/30 bg-[#151922] space-y-4 text-center">
          <div className="w-10 h-10 rounded-full bg-[#36B98A]/10 text-[#36B98A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#E5E7EB]">Task Committed to SQLite Database</h2>
            <p className="text-xs text-[#9CA3AF] font-mono">
              Task ID: {submittedTask.id}
            </p>
          </div>
          <div className="p-3 rounded bg-[#11141B] border border-[#252B36] text-left text-xs max-w-md mx-auto space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Status:</span>
              <span className="text-[#E6AA57] font-semibold">{submittedTask.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Category:</span>
              <span className="text-[#E5E7EB]">{submittedTask.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Target:</span>
              <span className="text-[#55C7D9]">Local Multi-Agent Fleet</span>
            </div>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
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
              size="sm"
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
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E5E7EB] block">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Emerging agentic AI technologies research in 2026"
                  className="w-full px-3 py-2 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#E5E7EB] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF]/50 transition-colors"
                />
                {validationErrors.title && (
                  <p className="text-[11px] text-[#E16D78] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.title}
                  </p>
                )}
              </div>

              {/* Task Prompt / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E5E7EB] block">
                  Detailed Prompt &amp; Objectives
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your objective, requirements, specific questions to answer, constraints, or formats needed..."
                  className="w-full px-3 py-2 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#E5E7EB] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF]/50 transition-colors leading-relaxed"
                />
                {validationErrors.description && (
                  <p className="text-[11px] text-[#E16D78] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.description}
                  </p>
                )}
              </div>

              {/* Category & Priority Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#E5E7EB] block">
                    Domain Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#E5E7EB] focus:outline-none focus:border-[#8B7CFF]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#E5E7EB] block">
                    Priority Dispatch
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {PRIORITIES.map((pri) => (
                      <button
                        type="button"
                        key={pri.value}
                        onClick={() => setPriority(pri.value)}
                        className={`py-1.5 text-[11px] font-mono rounded border transition-colors ${
                          priority === pri.value
                            ? 'bg-[#8B7CFF]/15 border-[#8B7CFF] text-[#8B7CFF] font-bold'
                            : 'bg-[#11141B] border-[#252B36] text-[#9CA3AF] hover:text-[#E5E7EB]'
                        }`}
                      >
                        {pri.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Knowledge Base Document Attachment */}
              <div className="space-y-1.5 pt-2 border-t border-[#252B36]">
                <label className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#55C7D9]" />
                  <span>Attach Knowledge Base Context (Optional)</span>
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#11141B] border border-[#252B36] text-xs text-[#E5E7EB] focus:outline-none focus:border-[#8B7CFF]"
                >
                  <option value="">No document attached (Clean run)</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({(doc.file_size / 1024).toFixed(1)} KB)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#9CA3AF]">
                  Selected document will be passed into the Research Agent for localized retrieval.
                </p>
              </div>

              {/* Execution Options */}
              <div className="space-y-2 pt-2 border-t border-[#252B36]">
                <label className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#8B7CFF]" />
                  <span>Execution Configuration</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded bg-[#11141B] border border-[#252B36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      className="rounded border-[#252B36] text-[#8B7CFF] focus:ring-0"
                    />
                    <div>
                      <span className="font-medium text-[#E5E7EB] block">Tavily Web Search</span>
                      <span className="text-[10px] text-[#9CA3AF] block">Enable live web search tool</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-[#11141B] border border-[#252B36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTracing}
                      onChange={(e) => setEnableTracing(e.target.checked)}
                      className="rounded border-[#252B36] text-[#8B7CFF] focus:ring-0"
                    />
                    <div>
                      <span className="font-medium text-[#E5E7EB] block">LangSmith Tracing</span>
                      <span className="text-[10px] text-[#9CA3AF] block">Record DAG telemetry</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-[#11141B] border border-[#252B36] cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={requireApproval}
                      onChange={(e) => setRequireApproval(e.target.checked)}
                      className="rounded border-[#252B36] text-[#8B7CFF] focus:ring-0"
                    />
                    <div>
                      <span className="font-medium text-[#E5E7EB] block">Human Approval Gate</span>
                      <span className="text-[10px] text-[#9CA3AF] block">Require human sign-off before reporter execution</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-xs"
                  isLoading={mutation.isPending}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Dispatch Task to Agent Pipeline</span>
                </Button>
              </div>
            </Card>
          </form>

          {/* Presets Sidebar (1/3) */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E6AA57]" />
                <span>Quick-Start Presets</span>
              </h2>
              <p className="text-[11px] text-[#9CA3AF]">
                Click any preset to prefill the task composer.
              </p>
            </div>

            <div className="space-y-2.5">
              {PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 rounded-lg bg-[#151922] border border-[#252B36] hover:border-[#8B7CFF]/40 cursor-pointer transition-all space-y-1.5 group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E5E7EB] group-hover:text-[#8B7CFF] transition-colors truncate">
                      {preset.title}
                    </span>
                    <Badge variant="neutral" className="text-[9px] uppercase font-mono">
                      {preset.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] line-clamp-2 leading-relaxed">
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
