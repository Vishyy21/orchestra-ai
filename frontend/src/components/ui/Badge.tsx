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
    // Theme-aware tokens matching Luxury Teal and Midnight Dark
    violet: 'bg-[#E6F4F1] dark:bg-[#132B2A] text-[#12615D] dark:text-[#22D3EE] border-[#C8E4DE] dark:border-[#1E4B48]',
    accent: 'bg-[#E6F4F1] dark:bg-[#132B2A] text-[#12615D] dark:text-[#22D3EE] border-[#C8E4DE] dark:border-[#1E4B48]',
    cyan: 'bg-[#E6F4F1] dark:bg-[#132B2A] text-[#0B4947] dark:text-[#67C9C5] border-[#C8E4DE] dark:border-[#1E4B48]',
    emerald: 'bg-[#EAF5EE] dark:bg-[#10241B] text-[#25865E] dark:text-[#34D399] border-[#CCE7DB] dark:border-[#1A3E2F]',
    success: 'bg-[#EAF5EE] dark:bg-[#10241B] text-[#25865E] dark:text-[#34D399] border-[#CCE7DB] dark:border-[#1A3E2F]',
    amber: 'bg-[#FDF5E8] dark:bg-[#251E14] text-[#B98232] dark:text-[#D69E2E] border-[#F7E7CD] dark:border-[#382C1C]',
    warning: 'bg-[#FDF5E8] dark:bg-[#251E14] text-[#B98232] dark:text-[#D69E2E] border-[#F7E7CD] dark:border-[#382C1C]',
    rose: 'bg-[#FDF0EE] dark:bg-[#2B1413] text-[#B65A56] dark:text-[#F87171] border-[#F7D8D6] dark:border-[#441C1B]',
    error: 'bg-[#FDF0EE] dark:bg-[#2B1413] text-[#B65A56] dark:text-[#F87171] border-[#F7D8D6] dark:border-[#441C1B]',
    neutral: 'bg-[#F0F3EF] dark:bg-[#10161D] text-[#667875] dark:text-[#94A3B8] border-[#E2E8E3] dark:border-[#1E293B]',
  };

  const dotColors = {
    violet: 'bg-[#12615D] dark:bg-[#22D3EE]',
    accent: 'bg-[#12615D] dark:bg-[#22D3EE]',
    cyan: 'bg-[#0B4947] dark:bg-[#67C9C5]',
    emerald: 'bg-[#25865E] dark:bg-[#34D399]',
    success: 'bg-[#25865E] dark:bg-[#34D399]',
    amber: 'bg-[#B98232] dark:bg-[#D69E2E]',
    warning: 'bg-[#B98232] dark:bg-[#D69E2E]',
    rose: 'bg-[#B65A56] dark:bg-[#F87171]',
    error: 'bg-[#B65A56] dark:bg-[#F87171]',
    neutral: 'bg-[#667875] dark:bg-[#626B7F]',
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
