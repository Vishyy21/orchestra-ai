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
    violet: 'bg-[#6366F1]/12 text-[#A5B4FC] border-[#6366F1]/25',
    accent: 'bg-[#6366F1]/12 text-[#A5B4FC] border-[#6366F1]/25',
    cyan: 'bg-[#06B6D4]/12 text-[#38BDF8] border-[#06B6D4]/25',
    emerald: 'bg-[#10B981]/12 text-[#34D399] border-[#10B981]/25',
    success: 'bg-[#10B981]/12 text-[#34D399] border-[#10B981]/25',
    amber: 'bg-[#F59E0B]/12 text-[#FBBF24] border-[#F59E0B]/25',
    warning: 'bg-[#F59E0B]/12 text-[#FBBF24] border-[#F59E0B]/25',
    rose: 'bg-[#F43F5E]/12 text-[#FB7185] border-[#F43F5E]/25',
    error: 'bg-[#F43F5E]/12 text-[#FB7185] border-[#F43F5E]/25',
    neutral: 'bg-[#151924] text-[#949BA8] border-[#1E2330]',
  };

  const dotColors = {
    violet: 'bg-[#6366F1]',
    accent: 'bg-[#6366F1]',
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
