import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[#1E2330] bg-[#11141D]/50 my-4 shadow-card">
      <div className="w-12 h-12 rounded-xl bg-[#090B10] border border-[#1E2330] flex items-center justify-center text-[#949BA8] mb-4 shadow-inner">
        <Icon className="w-6 h-6 text-[#818CF8]" />
      </div>
      <h3 className="text-base font-semibold text-[#EDEDEF] tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-[#949BA8] max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
