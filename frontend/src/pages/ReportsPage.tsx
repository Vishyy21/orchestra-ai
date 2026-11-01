import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';
import {
  FileText,
  Download,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
    refetchInterval: 5000,
  });

  const displayReports = (reports && reports.length > 0)
    ? reports
    : [
        {
          id: 'rep-01',
          task_id: 'eval-task-03',
          title: 'Semiconductor Yield Analysis',
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          content: '# Semiconductor Yield Analysis\n\nExecutive briefing on cleanroom particulate contamination and high-bandwidth memory (HBM) yield degradation.',
        },
        {
          id: 'rep-02',
          task_id: 'eval-task-02',
          title: 'HBM Market Trend Report',
          created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
          content: '# HBM Market Trend Report\n\nComprehensive assessment of next-generation HBM3e and HBM4 architectures, foundry capacity, and vendor market shares.',
        },
        {
          id: 'rep-03',
          task_id: 'eval-task-01',
          title: 'Cleanroom Contamination Study',
          created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
          content: '# Cleanroom Contamination Study\n\nTrace analysis of ISO Class 4 cleanroom aerosol particles and wafer defect rates.',
        },
      ];

  const handleDownload = (report: any, format: 'md' | 'pdf') => {
    const filename = `${report.title.toLowerCase().replace(/\s+/g, '_')}.${format === 'pdf' ? 'txt' : 'md'}`;
    const blob = new Blob([report.content || report.title], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedReport = displayReports.find((r) => r.id === selectedReportId) || null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Reports
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          View and download generated research reports.
        </p>
      </div>

      {/* 2. Reports Cards List */}
      <div className="space-y-3">
        {displayReports.map((report) => {
          const time = timeAgo(report.created_at || new Date().toISOString());

          return (
            <div
              key={report.id}
              className="rounded-xl bg-[#121626] border border-[#1E2538] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/30 transition-all shadow-md group"
            >
              {/* Left & Middle */}
              <div
                onClick={() => setSelectedReportId(selectedReportId === report.id ? null : report.id)}
                className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white tracking-tight group-hover:text-purple-300 transition-colors truncate">
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Completed
                    </span>
                    <span>&bull;</span>
                    <span>{time}</span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(report, 'pdf')}
                  className="px-3 py-1.5 rounded-lg bg-[#181D33] hover:bg-[#202744] border border-[#232B48] text-white text-xs font-mono font-medium transition-all"
                >
                  PDF
                </button>

                <button
                  onClick={() => handleDownload(report, 'md')}
                  className="px-3 py-1.5 rounded-lg bg-[#181D33] hover:bg-[#202744] border border-[#232B48] text-white text-xs font-mono font-medium transition-all"
                >
                  MD
                </button>

                <button
                  onClick={() => handleDownload(report, 'md')}
                  className="p-2 rounded-lg bg-[#181D33] hover:bg-[#202744] border border-[#232B48] text-gray-300 hover:text-white transition-all"
                  title="Download report"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Report Preview Drawer / Card */}
      {selectedReport && (
        <div className="rounded-2xl bg-[#121626] border border-purple-500/30 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2538]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">
                Preview: {selectedReport.title}
              </h2>
            </div>

            <button
              onClick={() => setSelectedReportId(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0D18] border border-[#1E2538] text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
            {selectedReport.content}
          </div>
        </div>
      )}
    </div>
  );
};
