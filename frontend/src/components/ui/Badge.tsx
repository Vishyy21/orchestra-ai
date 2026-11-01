import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'neutral' | 'accent' | 'success' | 'warning' | 'error';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  pulse = false,
  children,
  ...props
}) => {
  const variants = {
    // Linear / Raycast-inspired subtle pill styling with fine borders
    violet: 'bg-[#0E5B59]/15 text-[#0E5B59] dark:text-[#22D3EE] border-[#0E5B59]/30',
    accent: 'bg-[#0E5B59]/15 text-[#0E5B59] dark:text-[#22D3EE] border-[#0E5B59]/30',
    cyan: 'bg-[#286D78]/15 text-[#286D78] dark:text-[#388B97] border-[#286D78]/30',
    emerald: 'bg-[#21845A]/15 text-[#21845A] dark:text-[#34D399] border-[#21845A]/30',
    success: 'bg-[#21845A]/15 text-[#21845A] dark:text-[#34D399] border-[#21845A]/30',
    amber: 'bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D69E2E] border-[#B7791F]/30',
    warning: 'bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D69E2E] border-[#B7791F]/30',
    rose: 'bg-[#B94A48]/15 text-[#B94A48] dark:text-[#E53E3E] border-[#B94A48]/30',
    error: 'bg-[#B94A48]/15 text-[#B94A48] dark:text-[#E53E3E] border-[#B94A48]/30',
    neutral: 'bg-[#151924] text-[#949BA8] border-[#1E2330]',
  };

  const dotColors = {
    violet: 'bg-[#0E5B59]',
    accent: 'bg-[#0E5B59]',
    cyan: 'bg-[#06B6D4]',
    emerald: 'bg-[#10B981]',
    success: 'bg-[#10B981]',
    amber: 'bg-[#F59E0B]',
    warning: 'bg-[#F59E0B]',
    rose: 'bg-[#F43F5E]',
    error: 'bg-[#F43F5E]',
    neutral: 'bg-[#626B7F]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border select-none transition-colors duration-150',
        variants[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColors[variant])} />
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
};
