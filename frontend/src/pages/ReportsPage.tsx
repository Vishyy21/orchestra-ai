import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { timeAgo, cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import {
  FileText,
  Download,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
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
    <div
      className={cn(
        'p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans transition-colors duration-200',
        isLight ? 'text-[#172321]' : 'text-[#F1F5F9]'
      )}
    >
      {/* 1. Header */}
      <div>
        <h1
          className={cn(
            'text-xl sm:text-2xl font-serif font-bold tracking-tight',
            isLight ? 'text-[#172321]' : 'text-white'
          )}
        >
          Reports
        </h1>
        <p className={cn('text-xs mt-1', isLight ? 'text-[#68736F]' : 'text-gray-400')}>
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
              className={cn(
                'rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs group',
                isLight
                  ? 'bg-[#FFFFFF] border-[#E4E7E0] hover:border-[#0E5B59]/40'
                  : 'bg-[#131920] border-[#1F2A37] hover:border-[#0E5B59]/40 shadow-md'
              )}
            >
              {/* Left & Middle */}
              <div
                onClick={() => setSelectedReportId(selectedReportId === report.id ? null : report.id)}
                className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform',
                    isLight
                      ? 'bg-[#E6F4F1] border-[#C8E4DE] text-[#0E5B59]'
                      : 'bg-[#132B2A] border-[#1E4B48] text-[#22D3EE]'
                  )}
                >
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h3
                    className={cn(
                      'text-sm font-semibold tracking-tight transition-colors truncate',
                      isLight
                        ? 'text-[#172321] group-hover:text-[#0E5B59]'
                        : 'text-white group-hover:text-[#22D3EE]'
                    )}
                  >
                    {report.title}
                  </h3>
                  <div
                    className={cn(
                      'flex items-center gap-2 mt-0.5 text-xs',
                      isLight ? 'text-[#68736F]' : 'text-gray-400'
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[#21845A] dark:text-[#34D399] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#21845A] dark:bg-[#34D399]" />
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
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all',
                    isLight
                      ? 'bg-white hover:bg-[#F1F2ED] border-[#E4E7E0] text-[#172321]'
                      : 'bg-[#18202A] hover:bg-[#222E3C] border-[#1F2A37] text-white'
                  )}
                >
                  PDF
                </button>

                <button
                  onClick={() => handleDownload(report, 'md')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all',
                    isLight
                      ? 'bg-white hover:bg-[#F1F2ED] border-[#E4E7E0] text-[#172321]'
                      : 'bg-[#18202A] hover:bg-[#222E3C] border-[#1F2A37] text-white'
                  )}
                >
                  MD
                </button>

                <button
                  onClick={() => handleDownload(report, 'md')}
                  className={cn(
                    'p-2 rounded-lg border transition-all',
                    isLight
                      ? 'bg-white hover:bg-[#F1F2ED] border-[#E4E7E0] text-[#68736F] hover:text-[#172321]'
                      : 'bg-[#18202A] hover:bg-[#222E3C] border-[#1F2A37] text-gray-300 hover:text-white'
                  )}
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
        <div
          className={cn(
            'rounded-2xl border p-6 space-y-4 shadow-xl',
            isLight
              ? 'bg-white border-[#E4E7E0]'
              : 'bg-[#131920] border-[#1F2A37]'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between pb-3 border-b',
              isLight ? 'border-[#E4E7E0]' : 'border-[#1F2A37]'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0E5B59] dark:text-[#22D3EE]" />
              <h2 className={cn('text-sm font-semibold', isLight ? 'text-[#172321]' : 'text-white')}>
                Preview: {selectedReport.title}
              </h2>
            </div>

            <button
              onClick={() => setSelectedReportId(null)}
              className={cn('text-xs hover:underline', isLight ? 'text-[#68736F]' : 'text-gray-400')}
            >
              Close
            </button>
          </div>

          <div
            className={cn(
              'p-4 rounded-xl border text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed',
              isLight
                ? 'bg-[#F7F6F1] border-[#E4E7E0] text-[#172321]'
                : 'bg-[#0C1015] border-[#1F2A37] text-gray-300'
            )}
          >
            {selectedReport.content}
          </div>
        </div>
      )}
    </div>
  );
};
