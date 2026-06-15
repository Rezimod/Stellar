'use client';

interface Props {
  title: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
}

export default function MarketplaceSectionHeader({ title, viewAllLabel, onViewAll }: Props) {
  return (
    <div className="flex items-baseline justify-between mb-[14px]">
      <h2 className="font-display text-[18px] sm:text-[20px] tracking-[-0.005em] text-[#F8F4EC]" style={{ fontWeight: 600 }}>
        {title}
      </h2>
      {onViewAll && viewAllLabel && (
        <button
          onClick={onViewAll}
          className="text-[11px] tracking-[0.12em] uppercase font-semibold text-white/55 hover:text-[var(--terracotta)] transition-colors"
        >
          {viewAllLabel} →
        </button>
      )}
    </div>
  );
}
