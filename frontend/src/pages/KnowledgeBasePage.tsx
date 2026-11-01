import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { formatBytes, formatDate } from '../lib/utils';
import {
  Database,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  Search,
  HardDrive,
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
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#252B36] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#55C7D9]" />
            Knowledge Base &amp; RAG Repository
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Ground the Research Agent with internal technical manuals, whitepapers, and corpuses.
          </p>
        </div>
        <div className="text-[11px] font-mono text-[#9CA3AF]">
          ChromaDB Store: <span className="text-[#55C7D9]">data/chroma</span>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        className={`p-6 rounded-lg border-2 border-dashed text-center transition-all cursor-pointer select-none ${
          dragOver
            ? 'border-[#8B7CFF] bg-[#8B7CFF]/5'
            : 'border-[#252B36] hover:border-[#343C4B] bg-[#11141B]'
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
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#151922] border border-[#252B36] flex items-center justify-center text-[#55C7D9]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#E5E7EB]">
              {uploadMutation.isPending
                ? 'Streaming file to storage...'
                : 'Click to upload or drag and drop'}
            </p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5 font-mono">
              Supports PDF, Markdown, TXT, JSON, CSV (Max 25 MB)
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded bg-[#E16D78]/10 border border-[#E16D78]/30 text-xs text-[#E16D78] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Document Library Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#E5E7EB]">Repository Documents</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#151922] text-[#9CA3AF] border border-[#252B36]">
              {documents?.length ?? 0} files
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by filename..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#151922] border border-[#252B36] text-xs text-[#E5E7EB] placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#8B7CFF]"
            />
          </div>
        </div>

        <div className="rounded-lg bg-[#151922] border border-[#252B36] overflow-hidden text-xs">
          {filteredDocs && filteredDocs.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#252B36] bg-[#11141B]/70 text-[#9CA3AF] font-mono text-[11px]">
                  <th className="py-2.5 px-4 font-normal">Document</th>
                  <th className="py-2.5 px-3 font-normal">Size</th>
                  <th className="py-2.5 px-3 font-normal">Chunks</th>
                  <th className="py-2.5 px-3 font-normal hidden sm:table-cell">Uploaded</th>
                  <th className="py-2.5 px-3 font-normal">Status</th>
                  <th className="py-2.5 px-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252B36]/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#181D27]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#55C7D9] shrink-0" />
                        <div>
                          <span className="font-medium text-[#E5E7EB] block truncate max-w-sm">
                            {doc.filename}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] font-mono block">
                            ID: {doc.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#9CA3AF]">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {doc.chunk_count !== undefined && doc.chunk_count > 0 ? (
                        <span className="text-[#55C7D9] font-medium">{doc.chunk_count} chunks</span>
                      ) : (
                        <span className="text-[#9CA3AF]/60">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#9CA3AF] hidden sm:table-cell text-[11px]">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="py-3 px-3">
                      {doc.indexed ? (
                        <Badge variant="success">Indexed in ChromaDB</Badge>
                      ) : (
                        <Badge variant="neutral">Stored (Unindexed)</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded text-[#9CA3AF] hover:text-[#E16D78] hover:bg-[#E16D78]/10 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center space-y-2 text-xs text-[#9CA3AF]">
              <HardDrive className="w-6 h-6 text-[#9CA3AF]/40 mx-auto" />
              <p className="font-semibold text-[#E5E7EB]">Knowledge base is empty</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Drop PDF manuals or technical documents above to allow the Research Agent to cite local context.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
