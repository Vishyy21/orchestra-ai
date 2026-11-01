import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-[#EDEDEF]/90 tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 px-3 rounded-lg bg-[#090B10] border border-[#1E2330] text-[#EDEDEF] text-xs placeholder:text-[#949BA8]/40 transition-all duration-150 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#F43F5E] focus:border-[#F43F5E] focus:ring-[#F43F5E]/30',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-[#949BA8]">{hint}</p>}
        {error && <p className="text-[11px] text-[#FB7185] font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
