import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-foreground/80 tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full h-9 px-3 rounded bg-surface-shell border border-border text-foreground text-sm transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            error && 'border-rose focus:border-rose focus:ring-rose/30',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-card text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-rose font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
