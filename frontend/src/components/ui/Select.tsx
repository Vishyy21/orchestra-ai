import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-[#EDEDEF]/90 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full h-9 px-3 pr-8 rounded-lg bg-[#090B10] border border-[#1E2330] text-[#EDEDEF] text-xs appearance-none transition-all duration-150 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[#F43F5E] focus:border-[#F43F5E] focus:ring-[#F43F5E]/30',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949BA8] pointer-events-none" />
        </div>
        {hint && !error && <p className="text-[11px] text-[#949BA8]">{hint}</p>}
        {error && <p className="text-[11px] text-[#FB7185] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
