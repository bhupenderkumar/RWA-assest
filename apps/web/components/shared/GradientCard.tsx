'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'border' | 'fill' | 'glow';
  gradient?: 'primary' | 'solana' | 'cool' | 'warm';
  animated?: boolean;
  hover?: boolean;
}

const gradientVariants = {
  primary: 'from-solana-purple to-solana-green',
  solana: 'from-[#9945FF] via-[#6366F1] to-[#14F195]',
  cool: 'from-blue-500 via-purple-500 to-pink-500',
  warm: 'from-amber-500 via-orange-500 to-red-500',
};

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, variant = 'border', gradient = 'primary', animated = false, hover = true, children, ...props }, ref) => {
    if (variant === 'fill') {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-xl p-6 bg-gradient-to-br text-white',
            gradientVariants[gradient],
            animated && 'bg-[length:200%_200%] animate-gradient',
            hover && 'transition-all duration-300 hover:shadow-glow-md hover:scale-[1.02]',
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (variant === 'glow') {
      return (
        <div
          ref={ref}
          className={cn(
            'relative rounded-xl bg-card p-6 transition-all duration-300',
            hover && 'hover:shadow-glow-lg',
            className
          )}
          {...props}
        >
          <div 
            className={cn(
              'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 blur-xl transition-opacity duration-300 -z-10',
              gradientVariants[gradient],
              hover && 'group-hover:opacity-50'
            )}
          />
          {children}
        </div>
      );
    }

    // Default: border variant
    return (
      <div className={cn('group relative p-[2px] rounded-xl', className)}>
        <div
          className={cn(
            'absolute inset-0 rounded-xl bg-gradient-to-br opacity-50 transition-opacity duration-300',
            gradientVariants[gradient],
            hover && 'group-hover:opacity-100'
          )}
        />
        <div
          ref={ref}
          className={cn(
            'relative rounded-xl bg-card p-6 transition-all duration-300',
            hover && 'group-hover:bg-card/95'
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

GradientCard.displayName = 'GradientCard';

const GradientCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 mb-4', className)}
    {...props}
  />
));
GradientCardHeader.displayName = 'GradientCardHeader';

const GradientCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
GradientCardTitle.displayName = 'GradientCardTitle';

const GradientCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
GradientCardDescription.displayName = 'GradientCardDescription';

export {
  GradientCard,
  GradientCardHeader,
  GradientCardTitle,
  GradientCardDescription,
};
