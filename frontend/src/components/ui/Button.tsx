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
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed select-none text-xs';

    const variants = {
      primary:
        'bg-[#8B7CFF] hover:bg-[#7A69FA] text-white shadow-sm font-semibold active:scale-[0.99]',
      secondary:
        'bg-[#151922] hover:bg-[#1E2430] text-[#E5E7EB] border border-[#252B36] hover:border-[#343C4B] active:scale-[0.99]',
      outline:
        'bg-transparent hover:bg-[#151922] text-[#E5E7EB] border border-[#252B36] hover:border-[#343C4B] active:scale-[0.99]',
      ghost:
        'bg-transparent hover:bg-[#151922] text-[#9CA3AF] hover:text-[#E5E7EB] active:scale-[0.99]',
      danger:
        'bg-[#E16D78]/10 hover:bg-[#E16D78]/20 text-[#E16D78] border border-[#E16D78]/30 active:scale-[0.99]',
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
