import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'gold' | 'emerald' | 'cyan' | 'purple' | null;
}

const glowMap = {
  gold: 'border-[#FFD166]/50 glow-gold',
  emerald: 'border-[#34d399]/50 glow-emerald',
  cyan: 'border-[#818cf8]/50 glow-cyan',
  purple: 'border-[#7A5FFF]/50 glow-purple',
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
