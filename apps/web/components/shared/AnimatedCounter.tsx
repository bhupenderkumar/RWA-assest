'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  separator?: string;
  className?: string;
  onComplete?: () => void;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedCounter({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  className,
  onComplete,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      let startTime: number | null = null;
      const startValue = start;
      const endValue = end;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = easeOutExpo(progress);
        const currentValue = startValue + (endValue - startValue) * easedProgress;

        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          onComplete?.();
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, start, end, duration, delay, onComplete]);

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
  };

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

interface StatCounterProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCounter({
  value,
  label,
  prefix = '',
  suffix = '',
  icon,
  className,
}: StatCounterProps) {
  return (
    <div className={cn('text-center', className)}>
      {icon && (
        <div className="mb-3 flex justify-center text-primary">{icon}</div>
      )}
      <div className="text-4xl font-bold gradient-text">
        <AnimatedCounter end={value} prefix={prefix} suffix={suffix} />
      </div>
      <p className="mt-2 text-muted-foreground">{label}</p>
    </div>
  );
}
