import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import type { Report } from '../types';
import { FileText, Eye, Download, X, Copy, Check, Calendar, Hash } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
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

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#252B36] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E5E7EB] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B7CFF]" />
            Generated Intelligence Reports
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Structured analysis, architectural evaluations, and multi-agent synthesis exports.
          </p>
        </div>
        <div className="text-[11px] font-mono text-[#9CA3AF]">
          Reports Storage: <span className="text-[#55C7D9]">data/reports</span>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[#9CA3AF]">
          Querying report library...
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-lg bg-[#151922] border border-[#252B36] hover:border-[#343C4B] transition-colors flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="accent" className="font-mono text-[10px]">
                    {report.category || 'General'}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#9CA3AF]">
                    {formatDate(report.created_at)}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-[#E5E7EB] group-hover:text-[#8B7CFF] transition-colors line-clamp-2 leading-snug">
                  {report.title}
                </h3>

                <p className="text-[11px] text-[#9CA3AF] line-clamp-3 leading-relaxed">
                  {report.content.replace(/[#*`]/g, '')}
                </p>
              </div>

              <div className="pt-3 border-t border-[#252B36] flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                  className="w-full text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload(report)}
                  title="Download .md file"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-lg bg-[#151922] border border-[#252B36] text-center space-y-2 text-xs text-[#9CA3AF]">
          <FileText className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
          <p className="font-semibold text-[#E5E7EB]">No reports generated yet</p>
          <p className="text-[11px] max-w-sm mx-auto">
            When a task finishes synthesis through the Reporter Agent, structured Markdown documents appear here.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-lg bg-[#151922] border border-[#252B36] shadow-dropdown flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#252B36] flex items-center justify-between bg-[#11141B]">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-semibold text-[#E5E7EB] truncate">
                  {selectedReport.title}
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-[#9CA3AF] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-[#55C7D9]" />
                    {selectedReport.id.slice(0, 8)}...
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8B7CFF]" />
                    {formatDate(selectedReport.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyContent(selectedReport.content)}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#36B98A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedReport)}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E2430] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 font-sans text-xs leading-relaxed text-[#E5E7EB]">
              <div className="p-4 rounded bg-[#11141B] border border-[#252B36] font-mono text-[11px] whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                {selectedReport.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
