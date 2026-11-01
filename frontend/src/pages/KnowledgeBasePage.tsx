import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatBytes } from '../lib/utils';
import {
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  Search,
} from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Knowledge Base
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage documents and vector embeddings for ChromaDB RAG retrieval.
        </p>
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-[#1E2538] bg-[#121626] hover:border-purple-500/40 hover:bg-[#151B2E]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.json,.csv"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {uploadMutation.isPending
                ? 'Indexing document into ChromaDB...'
                : 'Click or drag files here to upload'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports PDF, Markdown, TXT, JSON, and CSV for dense retrieval
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 3. Document Library List */}
      <div className="rounded-2xl bg-[#121626] border border-[#1E2538] p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2538]">
          <h2 className="text-sm font-semibold text-white">
            Indexed Documents ({filteredDocs?.length ?? 0})
          </h2>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0D18] text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#1E2538] focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="divide-y divide-[#1E2538]/50">
          {filteredDocs && filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="py-3 flex items-center justify-between gap-4 hover:bg-[#181D33]/40 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {doc.filename}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatBytes(doc.file_size)} &bull; {doc.chunk_count} chunks indexed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="p-1.5 rounded text-gray-400 hover:text-rose-400 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              No documents found. Upload files to populate the vector store.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
