import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatBytes, formatDate } from '../lib/utils';
import {
  Database,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery({
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
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]" />
            <span className="text-[10px] font-mono tracking-widest text-[#22D3EE] uppercase font-semibold">
              Context Memory
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Knowledge Base &amp; ChromaDB Store
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Vector embeddings and indexed document corpus utilized by the Research Agent for dense retrieval.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0E1320] border border-[#1E2638] text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-[#34D399]" />
          <span className="text-[#94A3B8]">Store:</span>
          <span className="text-[#34D399] font-semibold">ChromaDB Persistent</span>
        </div>
      </div>

      {/* Storage Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Total Documents</div>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9] tabular-nums">
            {documents?.length || 0}
          </div>
          <div className="text-[10px] font-mono text-[#94A3B8]">PDF, Markdown &amp; TXT files</div>
        </div>

        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Indexed Chunks</div>
          <div className="text-2xl font-bold font-mono text-[#22D3EE] tabular-nums">
            {totalChunks}
          </div>
          <div className="text-[10px] font-mono text-[#94A3B8]">Dense vector representations</div>
        </div>

        <div className="p-4 rounded bg-[#0E1320] border border-[#1E2638] space-y-1">
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Corpus Footprint</div>
          <div className="text-2xl font-bold font-mono text-[#8B5CF6] tabular-nums">
            {formatBytes(totalBytes)}
          </div>
          <div className="text-[10px] font-mono text-[#94A3B8]">Local disk storage (./data/chroma)</div>
        </div>
      </div>

      {/* Cybernetic Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded border-2 border-dashed transition-all cursor-pointer text-center space-y-3 ${
          dragOver
            ? 'border-[#8B5CF6] bg-[#141A2B] shadow-[0_0_24px_rgba(139,92,246,0.2)]'
            : 'border-[#1E2638] bg-[#0E1320] hover:border-[#2A354D] hover:bg-[#121828]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <div className="w-12 h-12 rounded bg-[#121828] border border-[#1E2638] flex items-center justify-center mx-auto text-[#8B5CF6]">
          <UploadCloud className={`w-6 h-6 ${uploadMutation.isPending ? 'animate-bounce text-[#22D3EE]' : ''}`} />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#F1F5F9] font-sans">
            {uploadMutation.isPending ? 'Uploading & Chunking Document...' : 'Upload Document to ChromaDB'}
          </p>
          <p className="text-xs font-mono text-[#64748B]">
            Drag &amp; drop PDF, Markdown, or TXT files here or click to browse
          </p>
        </div>

        {uploadError && (
          <p className="text-xs font-mono text-[#FB7185] flex items-center justify-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{uploadError}</span>
          </p>
        )}
      </div>

      {/* Document Registry Table */}
      <div className="p-5 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2638]">
          <h2 className="text-sm font-semibold text-[#F1F5F9] font-sans flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#22D3EE]" />
            <span>Document Registry</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter indexed documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#07090E] text-[#F1F5F9] text-xs font-mono pl-8 pr-3 py-1.5 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-[#64748B]">
            Querying document registry from ChromaDB...
          </div>
        ) : filteredDocs && filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1E2638] text-[#64748B] text-[10px] uppercase tracking-wider">
                  <th className="pb-2.5 font-semibold">Document Name</th>
                  <th className="pb-2.5 font-semibold">Size</th>
                  <th className="pb-2.5 font-semibold">Chunks</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Indexed At</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2638]/70 text-[#94A3B8]">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#121828] transition-colors">
                    <td className="py-3 text-[#F1F5F9] font-medium flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3">{formatBytes(doc.file_size)}</td>
                    <td className="py-3 text-[#22D3EE] font-semibold">{doc.chunk_count} chunks</td>
                    <td className="py-3">
                      {doc.indexed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399]">
                          <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
                          <span>INDEXED</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#FBBF24]">PROCESSING</span>
                      )}
                    </td>
                    <td className="py-3 text-[#64748B]">{formatDate(doc.uploaded_at)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        className="text-[#64748B] hover:text-[#FB7185] transition-colors p-1"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs font-mono text-[#64748B]">
            No documents match the search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
