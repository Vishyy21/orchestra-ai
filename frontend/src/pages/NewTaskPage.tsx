import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TaskCreateInput } from '../types';
import heroImage from '../assets/hero.png';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';

export const NewTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [category] = useState('research');
  const [priority] = useState('high');

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
      requires_approval: true,
    });
  };

  const handleClear = () => {
    setTitle('');
    setDescription('');
    setSelectedDocId('');
    setValidationErrors({});
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          New Task
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Define a research task for the 5-agent pipeline
        </p>
      </div>

      {/* 2. Main Grid: Left 2/3 Form + Right 1/3 3D Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form (2 Columns wide) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#121626] border border-[#1E2538] p-6 sm:p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Task Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
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
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D18] border text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all ${
                  validationErrors.title ? 'border-rose-500' : 'border-[#1E2538]'
                }`}
              />
              {validationErrors.title && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{validationErrors.title}</span>
                </p>
              )}
            </div>

            {/* Field 2: Task Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
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
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D18] border text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none ${
                  validationErrors.description ? 'border-rose-500' : 'border-[#1E2538]'
                }`}
              />
              {validationErrors.description && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{validationErrors.description}</span>
                </p>
              )}
            </div>

            {/* Field 3: Knowledge Base (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
                Knowledge Base (Optional)
              </label>
              <div className="relative">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D18] border border-[#1E2538] text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Semiconductor KB</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.chunk_count} chunks)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Database className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Success Banner if Submitted */}
            {submittedTask && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Task created successfully! Redirecting to Live Agent Workspace...</span>
              </div>
            )}

            {/* Buttons: Clear + Create Task */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-lg border border-[#1E2538] bg-[#0A0D18] text-gray-300 hover:text-white hover:bg-[#121626] text-xs font-medium transition-all"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:from-[#8B5CF6] hover:to-[#6366F1] text-white text-xs font-medium shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{mutation.isPending ? 'Creating...' : 'Create Task'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1/3 Card: 3D Isometric Visual + Checklist */}
        <div className="rounded-2xl bg-[#121626] border border-[#1E2538] p-6 sm:p-7 shadow-xl flex flex-col items-center text-center justify-between min-h-[380px] relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* 3D Isometric floating glass layers asset */}
          <div className="w-full flex items-center justify-center py-4 relative z-10">
            <img
              src={heroImage}
              alt="3D Multi-Agent Pipeline Visualization"
              className="max-h-48 object-contain filter drop-shadow-[0_15px_30px_rgba(168,85,247,0.35)]"
            />
          </div>

          {/* Checklist */}
          <div className="w-full text-left pt-4 border-t border-[#1E2538]/60 relative z-10 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              From Query to Verified Report
            </h3>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-gray-200">Multi-agent execution</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-gray-200">Evidence-backed analysis</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-gray-200">Human-in-the-loop review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
