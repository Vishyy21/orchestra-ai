import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import type { Report } from '../types';
import {
  FileText,
  Eye,
  Download,
  X,
  Copy,
  Check,
  Calendar,
  Hash,
  Sparkles,
  BookOpen,
  Code,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
  });

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

  // Helper to format simple markdown into clean styled typography
  const renderStyledMarkdown = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-3 text-xs leading-relaxed text-[#EDEDEF]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-lg font-bold text-[#EDEDEF] pt-3 pb-1 border-b border-[#1E2330] tracking-tight">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-sm font-semibold text-[#818CF8] pt-2.5 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" />
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xs font-semibold text-[#38BDF8] pt-1.5 tracking-tight">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('> ')) {
            return (
              <div key={idx} className="p-3 my-2 rounded-lg bg-[#6366F1]/10 border-l-2 border-[#6366F1] text-[11px] text-[#EDEDEF]/90 italic">
                {trimmed.replace('> ', '')}
              </div>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-[11px] text-[#EDEDEF]/90 pl-1">
                {trimmed.replace(/^[-*]\s+/, '')}
              </li>
            );
          }
          if (trimmed.startsWith('|')) {
            return (
              <div key={idx} className="font-mono text-[10px] text-[#949BA8] bg-[#090B10] px-2 py-0.5 rounded overflow-x-auto whitespace-pre">
                {trimmed}
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }
          return (
            <p key={idx} className="text-[11px] text-[#EDEDEF]/85 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E2330] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDEF] flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#818CF8]" />
            <span>Generated Intelligence Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
            Structured analysis, architectural evaluations, and multi-agent synthesis exports.
          </p>
        </div>
        <div className="text-xs font-mono text-[#949BA8] px-3 py-1.5 rounded-lg bg-[#11141D] border border-[#1E2330] flex items-center gap-2">
          <span>Reports Storage:</span>
          <span className="text-[#38BDF8] font-medium">data/reports</span>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs font-mono text-[#949BA8] space-y-2">
          <div className="w-6 h-6 border-2 border-[#818CF8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying report library from SQLite...</p>
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-5 rounded-xl bg-[#11141D] border border-[#1E2330] hover:border-[#2D3447] shadow-card hover:shadow-hover transition-all duration-200 flex flex-col justify-between space-y-4 group relative overflow-hidden"
            >
              {/* Subtle top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="accent" className="font-mono text-[10px]">
                    {report.category || 'General'}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#949BA8]">
                    {formatDate(report.created_at)}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-semibold text-[#EDEDEF] group-hover:text-[#818CF8] transition-colors line-clamp-2 leading-snug">
                  {report.title}
                </h3>

                <p className="text-[11px] text-[#949BA8] line-clamp-3 leading-relaxed">
                  {report.content.replace(/[#*`]/g, '')}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1E2330] flex items-center justify-between gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(report);
                    setViewMode('rendered');
                  }}
                  className="w-full text-xs h-8"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload(report)}
                  title="Download .md file"
                  className="h-8 w-8 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 rounded-xl bg-[#0C0E14] border border-[#1E2330] text-center space-y-3 text-xs text-[#949BA8]">
          <FileText className="w-10 h-10 text-[#949BA8]/40 mx-auto" />
          <p className="text-sm font-semibold text-[#EDEDEF]">No reports generated yet</p>
          <p className="text-xs max-w-md mx-auto leading-relaxed">
            When a task finishes synthesis through the Reporter Agent, publication-ready Markdown documents are archived here.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090C]/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl rounded-xl bg-[#11141D] border border-[#2D3447] shadow-dropdown flex flex-col max-h-[88vh] overflow-hidden animate-scale-in relative">
            {/* Top specular highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1E2330] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0C0E14]">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-semibold text-[#EDEDEF] truncate">
                  {selectedReport.title}
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-[#949BA8] mt-1">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-[#38BDF8]" />
                    {selectedReport.id.slice(0, 8)}...
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#818CF8]" />
                    {formatDate(selectedReport.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* View toggle */}
                <div className="flex items-center bg-[#090B10] p-0.5 rounded-lg border border-[#1E2330] text-xs">
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      viewMode === 'rendered'
                        ? 'bg-[#151924] text-[#EDEDEF] border border-[#2D3447]'
                        : 'text-[#949BA8] hover:text-[#EDEDEF]'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Formatted</span>
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      viewMode === 'raw'
                        ? 'bg-[#151924] text-[#EDEDEF] border border-[#2D3447]'
                        : 'text-[#949BA8] hover:text-[#EDEDEF]'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Raw Markdown</span>
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyContent(selectedReport.content)}
                  className="text-xs h-8"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedReport)}
                  className="text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg text-[#949BA8] hover:text-[#EDEDEF] hover:bg-[#1A202E] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs leading-relaxed text-[#EDEDEF]">
              {viewMode === 'rendered' ? (
                <div className="p-5 rounded-xl bg-[#0C0E14] border border-[#1E2330] shadow-inner max-w-none">
                  {renderStyledMarkdown(selectedReport.content)}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#090B10] border border-[#1E2330] font-mono text-[11px] whitespace-pre-wrap leading-relaxed select-text overflow-x-auto shadow-inner text-[#EDEDEF]">
                  {selectedReport.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
