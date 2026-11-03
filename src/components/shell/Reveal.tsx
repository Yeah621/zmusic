'use client';
import type { HTMLAttributes, ReactNode } from 'react';
import { delayStyle, useReveal } from '@/lib/use-reveal';

/** `<div class="… rv">` yang muncul bertahap saat terlihat (padanan .rv + IntersectionObserver di HTML). */
export function Reveal({
  className = '',
  delay,
  children,
  ...rest
}: { className?: string; delay?: number; children?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>) {
  const { ref, cls } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`${className} rv${cls}`} style={delay ? delayStyle(delay) : undefined} {...rest}>
      {children}
    </div>
  );
}
