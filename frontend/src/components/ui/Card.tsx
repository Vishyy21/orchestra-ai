import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hover = false, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-[#11141D] border border-[#1E2330] p-4 text-[#EDEDEF] shadow-card relative overflow-hidden',
        hover && 'hover:border-[#2D3447] hover:shadow-hover transition-all duration-200',
        className
      )}
      {...props}
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
