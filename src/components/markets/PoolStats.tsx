'use client';

import type { MarketOnChain } from '@/lib/markets';

interface PoolStatsProps {
  onChain: MarketOnChain;
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function PoolStats({ onChain }: PoolStatsProps) {
  const yes = onChain.yesPool;
  const no = onChain.noPool;
  const total = yes + no;
  const empty = total === 0;
  const yesPct = empty ? 50 : Math.round((yes / total) * 100);
  const noPct = 100 - yesPct;

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        Pool state
      </div>

      <div className="flex flex-col gap-1.5">
        <PoolRow label="YES pool" value={fmtInt(yes)} color="var(--success)" />
        <PoolRow label="NO pool" value={fmtInt(no)} color="#F472B6" />
        <div
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.06)',
            margin: '4px 0',
          }}
        />
        <PoolRow label="Total" value={`${fmtInt(total)} ✦`} color="#F2F0EA" />
      </div>

      {empty ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '10px 0',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 6,
          }}
        >
          Awaiting first position
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            height: 24,
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              flex: yesPct,
              background:
                'linear-gradient(90deg, rgba(52,211,153,0.85), rgba(52,211,153,0.65))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: '#04140C',
              letterSpacing: '0.04em',
              minWidth: yesPct === 0 ? 0 : 40,
            }}
          >
            {yesPct > 0 ? `YES ${yesPct}%` : ''}
          </div>
          <div
            style={{
              flex: noPct,
              background:
                'linear-gradient(90deg, rgba(244,114,182,0.65), rgba(244,114,182,0.85))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: '#1A0810',
              letterSpacing: '0.04em',
              minWidth: noPct === 0 ? 0 : 40,
            }}
          >
            {noPct > 0 ? `NO ${noPct}%` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function PoolRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
