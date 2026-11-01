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
  HardDrive,
  CheckCircle2,
  Layers,
  Activity,
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

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1F273B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#22D3EE]" />
            <span>Knowledge Base &amp; RAG Repository</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
            Ground the Research Agent with internal technical manuals, whitepapers, and corpuses.
          </p>
        </div>
        <div className="text-xs font-mono text-[#949BA8] px-3 py-1.5 rounded bg-[#121624] border border-[#1F273B] flex items-center gap-2">
          <span className="text-[#64748B]">ChromaDB Store:</span>
          <span className="text-[#22D3EE] font-medium">data/chroma</span>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        className={`p-8 rounded border-2 border-dashed text-center transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
          dragOver
            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
            : 'border-[#1F273B] hover:border-[#8B5CF6]/40 bg-[#121624] hover:bg-[#141A29]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.txt,.md,.json,.csv"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded bg-[#181F33] border border-[#2A354D] flex items-center justify-center mx-auto text-[#22D3EE] shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F1F5F9]">
              Drop documents here, or <span className="text-[#8B5CF6] hover:underline">browse files</span>
            </p>
            <p className="text-xs text-[#949BA8] mt-1 font-sans">
              Supports PDF, Markdown, Plain Text, JSON, and CSV (Indexed via all-MiniLM-L6-v2)
            </p>
          </div>
          {uploadMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#22D3EE] pt-2">
              <div className="w-3.5 h-3.5 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin" />
              <span>Chunking and vectorizing embeddings in ChromaDB...</span>
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-[#FB7185] flex items-center justify-center gap-1 font-mono pt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Documents Repository Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#1F273B]">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">Indexed Documents</h2>
            <span className="text-[10px] font-mono text-[#22D3EE] px-2 py-0.2 rounded bg-[#181F33] border border-[#1F273B]">
              {documents?.length || 0}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded bg-[#0A0D15] border border-[#1F273B] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6] shadow-inner font-mono"
            />
          </div>
        </div>

        <div className="rounded bg-[#121624] border border-[#1F273B] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#949BA8] space-y-2">
              <div className="w-5 h-5 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading document registry...</p>
            </div>
          ) : filteredDocs && filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#1F273B] bg-[#0E121D] text-[#64748B] font-mono text-[11px]">
                    <th className="py-3 px-4 font-normal uppercase text-[10px]">File Name</th>
                    <th className="py-3 px-3 font-normal uppercase text-[10px]">File Size</th>
                    <th className="py-3 px-3 font-normal uppercase text-[10px]">Indexed In</th>
                    <th className="py-3 px-3 font-normal uppercase text-[10px]">Created</th>
                    <th className="py-3 px-4 font-normal uppercase text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F273B]/70">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#181F33]/60 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#22D3EE] shrink-0" />
                          <span className="font-medium text-[#F1F5F9] group-hover:text-[#A78BFA] transition-colors truncate max-w-xs">
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#949BA8] font-mono text-[11px]">
                        {formatBytes(doc.file_size)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          ChromaDB Vector
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(doc.id)}
                          className="p-1.5 rounded text-[#64748B] hover:text-[#FB7185] hover:bg-[#F43F5E]/15 transition-colors"
                          title="Delete from knowledge base"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2 text-xs text-[#949BA8]">
              <HardDrive className="w-8 h-8 text-[#64748B] mx-auto" />
              <p className="font-semibold text-[#F1F5F9]">No documents indexed</p>
              <p className="text-[11px] max-w-sm mx-auto text-[#64748B]">
                Upload research papers, technical specs, or policies to ground the agent workflow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
