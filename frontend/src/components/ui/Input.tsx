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
          <label className="block text-xs font-medium text-foreground/80 tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 px-3 rounded bg-surface-shell border border-border text-foreground text-sm placeholder:text-foreground/40 transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-rose focus:border-rose focus:ring-rose/30',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-foreground/50">{hint}</p>}
        {error && <p className="text-[11px] text-rose font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
