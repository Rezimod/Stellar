'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'bar' | 'custom';
  width?: number | string;
  height?: number | string;
  lines?: number;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.8s ease-in-out infinite',
};

export function Skeleton({ className = '', variant = 'text', width, height, lines }: SkeletonProps) {
  if (variant === 'text' && lines && lines > 1) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...shimmerStyle,
              borderRadius: 6,
              height: height ?? 14,
              width: i === lines - 1 ? '60%' : (width ?? '100%'),
            }}
          />
        ))}
      </div>
    );
  }

  const variantStyle: React.CSSProperties =
    variant === 'circular'
      ? { borderRadius: '50%', width: width ?? 40, height: height ?? 40 }
      : variant === 'rectangular'
      ? { borderRadius: 12, width: width ?? '100%', height: height ?? 80 }
      : variant === 'bar'
      ? { borderRadius: 4, height: height ?? 6, width: width ?? '100%' }
      : variant === 'custom'
      ? { borderRadius: 8, width: width ?? '100%', height: height ?? 40 }
      : { borderRadius: 6, height: height ?? 16, width: width ?? '100%' };

  return <div style={{ ...shimmerStyle, ...variantStyle }} className={className} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card-base ${className}`} style={{ overflow: 'hidden' }}>
      <div style={{ ...shimmerStyle, aspectRatio: '1', width: '100%', borderRadius: '12px 12px 0 0' }} />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton variant="text" className="" />
        <div style={{ height: 12, width: '60%', ...shimmerStyle, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', ...shimmerStyle }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, width: '66%', ...shimmerStyle, borderRadius: 6 }} />
            <div style={{ height: 12, width: '40%', ...shimmerStyle, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({
  cols = 2,
  count = 4,
  className = '',
}: {
  cols?: number;
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}
    >
      <div style={{ width: 80, height: 80, borderRadius: '50%', ...shimmerStyle }} />
      <div style={{ height: 20, width: 112, ...shimmerStyle, borderRadius: 6, marginTop: 8 }} />
      <div style={{ height: 14, width: 80, ...shimmerStyle, borderRadius: 6 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', marginTop: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 80, width: '100%', ...shimmerStyle, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatRow({ className = '' }: { className?: string }) {
  return (
    <div className={`${className}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card-base" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 32, width: '100%', ...shimmerStyle, borderRadius: 6 }} />
          <div style={{ height: 12, width: '66%', ...shimmerStyle, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
