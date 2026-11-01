import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 disabled:opacity-50 disabled:cursor-not-allowed select-none text-xs';

    const variants = {
      primary:
        'bg-gradient-to-b from-[#6366F1] to-[#4F46E5] hover:from-[#7073F3] hover:to-[#574FE8] text-white shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#4338CA] active:scale-[0.98]',
      secondary:
        'bg-[#151924] hover:bg-[#1A202E] text-[#EDEDEF] border border-[#1E2330] hover:border-[#2D3447] shadow-sm active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-[#151924] text-[#EDEDEF] border border-[#1E2330] hover:border-[#2D3447] active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-[#151924] text-[#949BA8] hover:text-[#EDEDEF] active:scale-[0.98]',
      danger:
        'bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-7 px-2.5 text-xs gap-1.5',
      md: 'h-8 px-3 text-xs gap-2',
      lg: 'h-9 px-4 text-sm gap-2',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
