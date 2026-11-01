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
    // Exact Linear subtle pill colors
    violet: 'bg-[#8B7CFF]/10 text-[#A499FF] border-[#8B7CFF]/20',
    accent: 'bg-[#8B7CFF]/10 text-[#A499FF] border-[#8B7CFF]/20',
    cyan: 'bg-[#55C7D9]/10 text-[#55C7D9] border-[#55C7D9]/20',
    emerald: 'bg-[#36B98A]/10 text-[#36B98A] border-[#36B98A]/20',
    success: 'bg-[#36B98A]/10 text-[#36B98A] border-[#36B98A]/20',
    amber: 'bg-[#E6AA57]/10 text-[#E6AA57] border-[#E6AA57]/20',
    warning: 'bg-[#E6AA57]/10 text-[#E6AA57] border-[#E6AA57]/20',
    rose: 'bg-[#E16D78]/10 text-[#E16D78] border-[#E16D78]/20',
    error: 'bg-[#E16D78]/10 text-[#E16D78] border-[#E16D78]/20',
    neutral: 'bg-[#181D27] text-[#9CA3AF] border-[#252B36]',
  };

  const dotColors = {
    violet: 'bg-[#8B7CFF]',
    accent: 'bg-[#8B7CFF]',
    cyan: 'bg-[#55C7D9]',
    emerald: 'bg-[#36B98A]',
    success: 'bg-[#36B98A]',
    amber: 'bg-[#E6AA57]',
    warning: 'bg-[#E6AA57]',
    rose: 'bg-[#E16D78]',
    error: 'bg-[#E16D78]',
    neutral: 'bg-[#6B7280]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
