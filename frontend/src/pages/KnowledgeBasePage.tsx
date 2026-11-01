import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { formatBytes } from '../lib/utils';
import {
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  Search,
  CheckCircle2,
  Database,
  BookOpen,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const KnowledgeBasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploadError(null);
    },
    onError: (err: any) => {
      setUploadError(err?.message || 'Failed to upload document.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const filteredDocs = documents?.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalChunks = documents?.reduce((acc, d) => acc + (d.chunk_count || 0), 0) ?? 0;
  const totalBytes = documents?.reduce((acc, d) => acc + (d.file_size || 0), 0) ?? 0;

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
          Knowledge Base
        </h1>
        <p className={cn('text-xs sm:text-sm mt-1', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
          Your private research library for document-grounded AI analysis.
        </p>
      </div>

      {/* 2. Educational Architecture Strip: 5-Step RAG Pipeline */}
      <div
        className={cn(
          'rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4 transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#EAEAE7]'
            : 'bg-[#121626] border-[#1E2538]'
        )}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
          <h2 className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
            How Document Grounding Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {[
            { step: '1. Extracted', desc: 'Raw text and page structures parsed via pypdf or text extractors.' },
            { step: '2. Chunked', desc: 'Normalized into overlapping semantic chunks with page provenance.' },
            { step: '3. Embedded', desc: 'Vector embeddings generated locally using all-MiniLM dense encoders.' },
            { step: '4. ChromaDB', desc: 'Indexed into local persistent vector collection with distance metrics.' },
            { step: '5. Retrieved', desc: 'Semantically queried with a 0.82 distance cutoff during task execution.' },
          ].map((item, i) => (
            <div
              key={i}
              className={cn(
                'p-3.5 rounded-xl border text-xs space-y-1 transition-all',
                isLight
                  ? 'bg-[#F9FAFB] border-[#E5E7EB]'
                  : 'bg-[#0A0D18] border-[#1E2538]'
              )}
            >
              <span className="font-bold text-[#0E5B59] dark:text-[#22D3EE] block text-xs">
                {item.step}
              </span>
              <p className={cn('text-[11px] leading-relaxed', isLight ? 'text-[#4B5563]' : 'text-gray-400')}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-[#0E5B59] bg-[#E6F4F1] dark:bg-[#132B2A]'
            : isLight
            ? 'border-[#E5E7EB] bg-[#FFFFFF] hover:border-[#0E5B59]/60 hover:bg-gray-50 shadow-xs'
            : 'border-[#1E2538] bg-[#121626] hover:border-[#0E5B59]/60 hover:bg-[#151B2E]'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.markdown"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
              isLight
                ? 'bg-[#E6F4F1] text-[#0E5B59] border border-[#C8E4DE]'
                : 'bg-[#132B2A] text-[#22D3EE] border border-[#1E4B48]'
            )}
          >
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className={cn('text-sm font-bold', isLight ? 'text-[#172321]' : 'text-white')}>
              {uploadMutation.isPending
                ? 'Extracting and indexing into ChromaDB...'
                : 'Click or drag files here to upload'}
            </p>
            <p className={cn('text-xs mt-1', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              Supported formats: <strong>PDF (.pdf)</strong>, <strong>Plain Text (.txt)</strong>, and <strong>Markdown (.md)</strong>
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 4. Document Library List */}
      <div
        className={cn(
          'rounded-2xl border p-5 sm:p-6 space-y-4 shadow-xs transition-all',
          isLight
            ? 'bg-[#FFFFFF] border-[#EAEAE7]'
            : 'bg-[#121626] border-[#1E2538]'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#1E2538]">
          <div>
            <h2 className={cn('text-sm font-bold', isLight ? 'text-[#111827]' : 'text-white')}>
              Indexed Research Documents ({filteredDocs?.length ?? 0})
            </h2>
            <p className={cn('text-[11px] mt-0.5', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
              {totalChunks} total chunks indexed &bull; {formatBytes(totalBytes)} stored
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search indexed files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 transition-all',
                isLight
                  ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] focus:border-[#0E5B59] focus:ring-[#0E5B59]'
                  : 'bg-[#0A0D18] border-[#1E2538] text-white focus:border-[#0E5B59] focus:ring-[#0E5B59]'
              )}
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#1E2538]/50">
          {filteredDocs && filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  'py-3.5 flex items-center justify-between gap-4 px-2 rounded-xl transition-colors',
                  isLight ? 'hover:bg-gray-50' : 'hover:bg-[#181D33]/40'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                      isLight
                        ? 'bg-[#E6F4F1] border-[#C8E4DE] text-[#0E5B59]'
                        : 'bg-[#132B2A] border-[#1E4B48] text-[#22D3EE]'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className={cn('text-xs font-bold truncate', isLight ? 'text-[#111827]' : 'text-white')}>
                      {doc.filename}
                    </p>
                    <p className={cn('text-[11px] mt-0.5', isLight ? 'text-[#6B7280]' : 'text-gray-400')}>
                      {formatBytes(doc.file_size)} &bull; {doc.chunk_count} semantic chunks &bull; ChromaDB active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Indexed
                  </span>

                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                    title="Delete document and un-index chunks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-gray-400 space-y-2">
              <Database className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="font-medium">No documents in the knowledge base.</p>
              <p className="text-[11px] text-gray-500">
                Upload research papers, technical specs, or notes to ground your agents with verified citations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
