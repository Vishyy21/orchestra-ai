import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import type { TaskCreateInput } from '../types';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  FileText,
  Search,
  BarChart3,
  ShieldCheck,
  Info,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const NewTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [category] = useState('research');
  const [priority] = useState('high');
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

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
        // Execute autonomously by default without mandatory human approval gate
        await api.executeTask(created.id, false, false);
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
      }, 1000);
    },
  });

  const validate = () => {
    const errors: { title?: string; description?: string } = {};
    if (!title.trim()) errors.title = 'Task title is required';
    if (!description.trim()) errors.description = 'Task description is required';
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
      requires_approval: false, // Autonomous execution policy
    });
  };

  const handleClear = () => {
    setTitle('');
    setDescription('');
    setSelectedDocId('');
    setValidationErrors({});
  };

  const PIPELINE_STEPS = [
    {
      id: 'planner',
      number: 1,
      name: 'Planner',
      role: 'Understands the task',
      description: 'Decomposes the objective into tactical analytical steps and sets research boundaries.',
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'researcher',
      number: 2,
      name: 'Researcher',
      role: 'Retrieves web & document evidence',
      description: 'Performs semantic RAG retrieval from ChromaDB and live web grounding via Tavily.',
      icon: Search,
      color: 'text-blue-600 dark:text-cyan-400',
    },
    {
      id: 'analyst',
      number: 3,
      name: 'Analyst',
      role: 'Synthesizes findings',
      description: 'Extracts core quantitative metrics, correlates facts, and synthesizes analytical findings.',
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'verifier',
      number: 4,
      name: 'Verifier',
      role: 'Checks claims & numerical consistency',
      description: 'Performs automated mathematical verification and guards against model hallucinations.',
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'reporter',
      number: 5,
      name: 'Reporter',
      role: 'Generates final report',
      description: 'Compiles clean executive Markdown briefings complete with formal source citations.',
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
    },
  ];

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
          New Task
        </h1>
        <p className={cn('text-xs mt-1', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
          Define a research task for autonomous 5-agent pipeline execution.
        </p>
      </div>

      {/* 2. Main Grid: Left 2/3 Form + Right 1/3 Animated Pipeline & Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form (7 of 12 columns) */}
        <div
          className={cn(
            'lg:col-span-7 rounded-2xl border p-6 sm:p-7 shadow-xs space-y-5 transition-all',
            isLight
              ? 'bg-[#FFFFFF] border-[#EAEAE7]'
              : 'bg-[#121626] border-[#1E2538]'
          )}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Task Title */}
            <div className="space-y-1.5">
              <label className={cn('text-xs font-bold block', isLight ? 'text-[#374151]' : 'text-white')}>
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationErrors.title) setValidationErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="HBM Market Landscape and Supply Chain Analysis"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all',
                  isLight
                    ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] placeholder-gray-400 focus:border-purple-600'
                    : 'bg-[#0A0D18] border-[#1E2538] text-white placeholder-gray-500 focus:border-purple-500',
                  validationErrors.title && 'border-rose-500'
                )}
              />
              {validationErrors.title && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{validationErrors.title}</span>
                </p>
              )}
            </div>

            {/* Field 2: Task Description */}
            <div className="space-y-1.5">
              <label className={cn('text-xs font-bold block', isLight ? 'text-[#374151]' : 'text-white')}>
                Task Description
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description) setValidationErrors((prev) => ({ ...prev, description: undefined }));
                }}
                rows={5}
                placeholder="Analyze the current HBM market, key players, yield trends, and supply chain risks with supporting evidence from recent sources."
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none',
                  isLight
                    ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] placeholder-gray-400 focus:border-purple-600'
                    : 'bg-[#0A0D18] border-[#1E2538] text-white placeholder-gray-500 focus:border-purple-500',
                  validationErrors.description && 'border-rose-500'
                )}
              />
              {validationErrors.description && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{validationErrors.description}</span>
                </p>
              )}
            </div>

            {/* Field 3: Knowledge Base (Optional) */}
            <div className="space-y-2">
              <label className={cn('text-xs font-bold block', isLight ? 'text-[#374151]' : 'text-white')}>
                Knowledge Base (Optional)
              </label>
              <div className="relative">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer',
                    isLight
                      ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] focus:border-purple-600'
                      : 'bg-[#0A0D18] border-[#1E2538] text-white focus:border-purple-500'
                  )}
                >
                  <option value="">No Knowledge Base (Open Web Research)</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.chunk_count} indexed chunks)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Database className="w-4 h-4" />
                </div>
              </div>

              {/* Accurate Knowledge Base Help Callout */}
              <div
                className={cn(
                  'p-3.5 rounded-xl border text-[11px] leading-relaxed space-y-2 transition-colors',
                  isLight
                    ? 'bg-purple-50/60 border-purple-100 text-[#4B5563]'
                    : 'bg-[#0E1220] border-[#1E2538] text-gray-300'
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 text-xs">
                  <Info className="w-3.5 h-3.5" />
                  <span>Knowledge Base Guidance</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p>
                    <strong>No Knowledge Base selected:</strong> The task uses its description and available web research sources, without an additional selected document collection.
                  </p>
                  <p>
                    <strong>Knowledge Base selected:</strong> The Researcher can retrieve relevant chunks from the selected indexed document collection.
                  </p>
                  <p>
                    <strong>RAG semantic retrieval:</strong> Semantic vector search in ChromaDB finds relevant document chunks to provide verifiable context.
                  </p>
                  <p>
                    <strong>Source traceability:</strong> Where available, citations include document identity, page and chunk information.
                  </p>
                </div>
              </div>
            </div>

            {/* Submission Status Banner */}
            {submittedTask && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Task created! Dispatching autonomous 5-agent pipeline...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1E2538]">
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'px-4 py-2 rounded-xl border text-xs font-semibold transition-all',
                  isLight
                    ? 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-gray-50'
                    : 'border-[#1E2538] bg-[#0A0D18] text-gray-300 hover:text-white hover:bg-[#121626]'
                )}
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{mutation.isPending ? 'Dispatching...' : 'Create Task'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 5-Agent Flow Illustration & Step Explanations (5 of 12 columns) */}
        <div
          className={cn(
            'lg:col-span-5 rounded-2xl border p-6 space-y-5 shadow-xs transition-all',
            isLight
              ? 'bg-[#FFFFFF] border-[#EAEAE7]'
              : 'bg-[#121626] border-[#1E2538]'
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1E2538]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className={cn('text-sm font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
                Autonomous Workflow
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
              5 Steps
            </span>
          </div>

          {/* Interactive, Sophisticated 5-Agent Pipeline Visual */}
          <div className="space-y-3 relative pl-3">
            {/* Animated vertical flowing guide line */}
            <div
              className={cn(
                'absolute left-5 top-3 bottom-3 w-0.5 pointer-events-none transition-colors duration-300',
                isLight ? 'bg-purple-200' : 'bg-[#1E2538]'
              )}
            />

            {PIPELINE_STEPS.map((step) => {
              const Icon = step.icon;
              const isHovered = hoveredAgent === step.id;

              return (
                <div
                  key={step.id}
                  onMouseEnter={() => setHoveredAgent(step.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  className={cn(
                    'p-3 rounded-xl border transition-all duration-200 relative z-10 cursor-pointer',
                    isHovered
                      ? isLight
                        ? 'bg-purple-50/80 border-purple-300 shadow-sm transform -translate-x-0.5'
                        : 'bg-[#1A1833] border-purple-500/50 shadow-md transform -translate-x-0.5'
                      : isLight
                      ? 'bg-[#F9FAFB] border-[#E5E7EB]'
                      : 'bg-[#0E1220] border-[#1E2538]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all',
                        isHovered
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : isLight
                          ? 'bg-white border-[#E5E7EB]'
                          : 'bg-[#121626] border-[#1E2538]'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', isHovered ? 'text-white' : step.color)} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
                          {step.number}. {step.name}
                        </span>
                        <span className={cn('text-[10px] font-medium', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
                          &bull; {step.role}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-[11px] leading-relaxed mt-1',
                          isLight ? 'text-[#4B5563]' : 'text-gray-400'
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={cn(
              'p-3 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2',
              isLight
                ? 'bg-gray-50 border-gray-200 text-[#4B5563]'
                : 'bg-[#0A0D18] border-[#1E2538] text-gray-400'
            )}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Autonomous verification executes before the Reporter generates the final executive dossier.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
