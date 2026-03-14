interface BadgeProps {
  children: React.ReactNode;
  color?: 'brass' | 'emerald' | 'cyan' | 'purple' | 'dim';
}

const colors = {
  brass: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/40',
  emerald: 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40',
  cyan: 'bg-[#38F0FF]/20 text-[#38F0FF] border-[#38F0FF]/40',
  purple: 'bg-[#7A5FFF]/20 text-[#7A5FFF] border-[#7A5FFF]/40',
  dim: 'bg-[#0F1F3D] text-slate-400 border-[rgba(56,240,255,0.12)]',
};

export default function Badge({ children, color = 'dim' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}
