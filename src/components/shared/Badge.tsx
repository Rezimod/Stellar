interface BadgeProps {
  children: React.ReactNode;
  color?: 'brass' | 'emerald' | 'cyan' | 'purple' | 'dim';
}

const colors = {
  brass: 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/40',
  emerald: 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40',
  cyan: 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/40',
  purple: 'bg-[#9945FF]/20 text-[#9945FF] border-[#9945FF]/40',
  dim: 'bg-[#1a2d4d] text-slate-400 border-[#1a2d4d]',
};

export default function Badge({ children, color = 'dim' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}
