'use client';

export interface ForecastDay {
  date: string;
  dayLabel: string;
  cloudCover: number;
  badge: 'go' | 'maybe' | 'skip';
  isToday?: boolean;
}

interface ForecastStripProps {
  days: ForecastDay[];
  onDayClick?: (day: ForecastDay) => void;
  className?: string;
}

const dotStyle: Record<ForecastDay['badge'], React.CSSProperties> = {
  go: {
    background: 'var(--success)',
    boxShadow: '0 0 6px rgba(94, 234, 212,0.4)',
  },
  maybe: { background: 'var(--warning)' },
  skip: { background: 'var(--error)' },
};

export default function ForecastStrip({ days, onDayClick, className = '' }: ForecastStripProps) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} className={className}>
      {/* Left fade */}
      <div
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 32,
          background: 'linear-gradient(to right, var(--bg-base), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {/* Right fade */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 0 auto',
          width: 32,
          background: 'linear-gradient(to left, var(--bg-base), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        className="scroll-x scrollbar-hide"
        style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto' }}
      >
        {days.map((day) => (
          <div
            key={day.date}
            onClick={() => onDayClick?.(day)}
            style={{
              flexShrink: 0,
              width: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 4,
              paddingRight: 4,
              borderRadius: 12,
              cursor: onDayClick ? 'pointer' : undefined,
              border: day.isToday
                ? '1px solid var(--accent-border)'
                : '1px solid var(--border-subtle)',
              background: day.isToday ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 200ms var(--ease-out-expo)',
            }}
            onMouseEnter={(e) => {
              if (!day.isToday) {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!day.isToday) {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 10,
                color: day.isToday ? 'var(--accent)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {day.dayLabel}
            </span>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                ...dotStyle[day.badge],
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
              }}
            >
              {day.cloudCover}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
