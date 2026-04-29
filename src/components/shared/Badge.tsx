interface BadgeProps {
  children: React.ReactNode;
  color?: 'brass' | 'emerald' | 'cyan' | 'purple' | 'dim';
}

const colors = {
  brass: 'bg-[var(--terracotta)]/20 text-[var(--terracotta)] border-[var(--terracotta)]/40',
  emerald: 'bg-[var(--seafoam)]/20 text-[var(--seafoam)] border-[var(--seafoam)]/40',
  cyan: 'bg-[var(--terracotta)]/20 text-[var(--terracotta)] border-[var(--terracotta)]/40',
  purple: 'bg-[var(--terracotta)]/20 text-[var(--terracotta)] border-[var(--terracotta)]/40',
  dim: 'bg-[var(--surface)] text-text-muted border-[rgba(232, 130, 107,0.12)]',
};

export default function Badge({ children, color = 'dim' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}
