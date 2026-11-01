import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hover = false, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-lg bg-[#151922] border border-[#252B36] p-4 text-[#E5E7EB]',
        hover && 'hover:border-[#343C4B] transition-colors duration-150',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
