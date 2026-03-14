import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'brass' | 'emerald' | 'cyan' | 'solana' | null;
}

const glowMap = {
  brass: 'border-[#c9a84c] glow-brass',
  emerald: 'border-[#34d399] glow-emerald',
  cyan: 'border-[#22d3ee] glow-cyan',
  solana: 'border-[#9945FF] glow-solana',
};

export default function Card({ children, className = '', glow }: CardProps) {
  return (
    <div className={`
      bg-[#111c30] border rounded-xl p-5 transition-all duration-300
      ${glow ? glowMap[glow] : 'border-[#1a2d4d]'}
      ${className}
    `}>
      {children}
    </div>
  );
}
