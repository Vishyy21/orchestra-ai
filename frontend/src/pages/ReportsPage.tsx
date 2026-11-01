import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import type { Report } from '../types';
import {
  FileText,
  Download,
  Copy,
  Check,
  Search,
  BookOpen,
  Code,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
  });

  const filteredReports = (reports || []).filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.task_id && r.task_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) ||
    (filteredReports.length > 0 ? filteredReports[0] : null);

  const handleDownload = (report: Report) => {
    const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.title.toLowerCase().replace(/\s+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
            <span className="text-[10px] font-mono tracking-widest text-[#22D3EE] uppercase font-semibold">
              Executive Dossiers
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] font-sans">
            Intelligence &amp; Executive Reports Library
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Verified analytical outputs compiled and formatted by the Reporter Agent.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports or task IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0E1320] text-[#F1F5F9] text-xs font-mono pl-9 pr-3.5 py-2 rounded border border-[#1E2638] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Main Two-Column Document Library Layout */}
      {isLoading ? (
        <div className="p-16 text-center text-xs font-mono text-[#64748B] space-y-2">
          <div className="w-6 h-6 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying SQLite reports database...</p>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Report List (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] px-1">
              {filteredReports.length} Available Reports
            </div>

            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {filteredReports.map((report) => {
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`p-3.5 rounded border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-[#141A2B] border-[#8B5CF6] shadow-md ring-1 ring-[#8B5CF6]/40'
                        : 'bg-[#0E1320] border-[#1E2638] hover:border-[#2A354D] hover:bg-[#121828]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#22D3EE] font-semibold">
                        #{report.task_id ? report.task_id.slice(0, 8) : 'general'}
                      </span>
                      <span className="text-[#64748B]">
                        {formatDate(report.created_at)}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#F1F5F9] line-clamp-1 font-sans">
                      {report.title}
                    </h3>

                    <p className="text-[11px] font-mono text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {report.content.slice(0, 120)}...
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Previewer (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded bg-[#0E1320] border border-[#1E2638] space-y-4">
            {selectedReport ? (
              <>
                {/* Header with Title and Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#1E2638]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
                      <span className="text-[#22D3EE]">Mission #{selectedReport.task_id || 'general'}</span>
                      <span>&bull;</span>
                      <span>{formatDate(selectedReport.created_at)}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[#F1F5F9] font-sans">
                      {selectedReport.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded border border-[#1E2638] text-xs font-mono">
                      <button
                        onClick={() => setViewMode('rendered')}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                          viewMode === 'rendered'
                            ? 'bg-[#181F33] text-[#F1F5F9] font-medium border border-[#283652]'
                            : 'text-[#64748B] hover:text-[#94A3B8]'
                        }`}
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Rendered</span>
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                          viewMode === 'raw'
                            ? 'bg-[#181F33] text-[#F1F5F9] font-medium border border-[#283652]'
                            : 'text-[#64748B] hover:text-[#94A3B8]'
                        }`}
                      >
                        <Code className="w-3 h-3" />
                        <span>Raw</span>
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyContent(selectedReport.content)}
                      className="text-xs font-mono h-8 px-2.5 border-[#1E2638] bg-[#07090E] text-[#94A3B8]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedReport)}
                      className="text-xs font-mono h-8 px-2.5 border-[#1E2638] bg-[#07090E] text-[#94A3B8]"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>

                {/* Report Content Body */}
                {viewMode === 'rendered' ? (
                  <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] max-h-[620px] overflow-y-auto space-y-3 font-sans text-xs text-[#E2E8F0] leading-relaxed">
                    {selectedReport.content.split('\n').map((line, idx) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('# ')) {
                        return (
                          <h1 key={idx} className="text-base font-bold text-[#F1F5F9] pt-2 pb-1 border-b border-[#1E2638]">
                            {trimmed.replace('# ', '')}
                          </h1>
                        );
                      }
                      if (trimmed.startsWith('## ')) {
                        return (
                          <h2 key={idx} className="text-sm font-semibold text-[#A78BFA] pt-2">
                            {trimmed.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (trimmed.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-xs font-semibold text-[#22D3EE] pt-1">
                            {trimmed.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                        return (
                          <li key={idx} className="ml-4 list-disc text-[#CBD5E1]">
                            {trimmed.replace(/^[*\-]\s+/, '')}
                          </li>
                        );
                      }
                      if (!trimmed) {
                        return <div key={idx} className="h-2" />;
                      }
                      return <p key={idx} className="text-[#94A3B8]">{trimmed}</p>;
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded bg-[#07090E] border border-[#1E2638] font-mono text-xs text-[#F1F5F9] max-h-[620px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedReport.content}
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                Select a report from the list to preview.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-16 rounded bg-[#0E1320] border border-[#1E2638] text-center space-y-3">
          <FileText className="w-10 h-10 text-[#475569] mx-auto" />
          <h2 className="text-sm font-semibold text-[#F1F5F9]">No Executive Reports Found</h2>
          <p className="text-xs font-mono text-[#64748B] max-w-md mx-auto">
            Reports are generated automatically by the Reporter Agent upon completing research missions.
          </p>
        </div>
      )}
    </div>
  );
};
