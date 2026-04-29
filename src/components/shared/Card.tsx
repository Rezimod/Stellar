import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'gold' | 'emerald' | 'cyan' | 'purple' | null;
}

const glowMap = {
  gold: 'border-[var(--terracotta)]/50 glow-gold',
  emerald: 'border-[var(--seafoam)]/50 glow-emerald',
  cyan: 'border-[var(--terracotta)]/50 glow-cyan',
  purple: 'border-[var(--terracotta)]/50 glow-purple',
};

export default function Card({ children, className = '', glow }: CardProps) {
  return (
    <div className={`
      glass-card p-3 sm:p-5 transition-all duration-300
      ${glow ? glowMap[glow] : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}
