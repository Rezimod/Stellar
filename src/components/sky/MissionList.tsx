'use client';

import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface MissionListProps {
  onStart: (mission: Mission) => void;
}

const difficultyVariant: Record<string, 'green' | 'teal' | 'amber' | 'red' | 'default'> = {
  Beginner:     'green',
  Intermediate: 'teal',
  Advanced:     'amber',
  Hard:         'amber',
  Expert:       'red',
};

export default function MissionList({ onStart }: MissionListProps) {
  const { state } = useAppState();
  const completedEntries = state.completedMissions.filter(m => m.status === 'completed');
  const completedIds = new Set(completedEntries.map(m => m.id));
  const pendingIds   = new Set(state.completedMissions.filter(m => m.status === 'pending').map(m => m.id));

  function completedTodayId(id: string): boolean {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.completedMissions.some(
      m => m.id === id && m.status === 'completed' && new Date(m.timestamp).getTime() > cutoff
    );
  }

  function getOnChainTx(id: string): string | undefined {
    return completedEntries.find(m => m.id === id && m.txId && !m.txId.startsWith('sim'))?.txId;
  }

  return (
    <div className="flex flex-col gap-2 stagger-children">
      {MISSIONS.map((mission, idx) => {
        const isRepeatable = mission.repeatable === true;
        const done      = completedIds.has(mission.id) && !isRepeatable;
        const doneToday = isRepeatable && completedTodayId(mission.id);
        const pending   = pendingIds.has(mission.id);
        const txId      = getOnChainTx(mission.id);
        const canStart  = !done && !doneToday && !pending;

        const leftBorder = done
          ? '3px solid var(--color-aurora-green, #34D399)'
          : '3px solid var(--color-nebula-teal, #38F0FF)';

        return (
          <div
            key={mission.id}
            className="animate-fade-in-up flex items-center gap-3 px-4 py-3"
            style={{
              background: done ? 'rgba(255,255,255,0.015)' : 'var(--color-card-surface, #0F1D32)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: leftBorder,
              borderRadius: 12,
              opacity: done ? 0.58 : 1,
              boxShadow: done ? 'none' : 'var(--shadow-card)',
              animationDelay: `${idx * 55}ms`,
            }}
          >
            {/* Left: emoji circle */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                background: done
                  ? 'rgba(52,211,153,0.07)'
                  : 'rgba(56,240,255,0.06)',
                border: `1px solid ${done ? 'rgba(52,211,153,0.15)' : 'rgba(56,240,255,0.1)'}`,
              }}
            >
              <MissionIcon id={mission.id} size={24} />
            </div>

            {/* Center */}
            <div className="flex-1 min-w-0">
              <p style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}
                className="truncate">
                {mission.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant={mission.type === 'naked_eye' ? 'teal' : 'oracle'} size="sm">
                  {mission.type === 'naked_eye' ? 'Naked Eye' : 'Telescope'}
                </Badge>
                <Badge variant={difficultyVariant[mission.difficulty] ?? 'default'} size="sm">
                  {mission.difficulty}
                </Badge>
              </div>
              <p style={{ color: 'var(--color-star-gold, #FFD166)', fontSize: '0.6875rem', fontWeight: 700, marginTop: 4 }}>
                ✦ {mission.stars} Stars
              </p>
            </div>

            {/* Right: status */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              {done ? (
                <>
                  <div className="flex items-center gap-1" style={{ color: 'var(--color-aurora-green, #34D399)', fontSize: '0.6875rem', fontWeight: 600 }}>
                    <CheckCircle2 size={12} />
                    <span>Sealed ✓</span>
                  </div>
                  {txId && (
                    <a
                      href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                      aria-label="View on Solana Explorer"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </>
              ) : doneToday ? (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem' }}>✓ Today</span>
              ) : pending ? (
                <span style={{ color: '#F59E0B', fontSize: '0.6875rem' }}>Pending</span>
              ) : canStart ? (
                <Button variant="primary" size="sm" onClick={() => onStart(mission)}>
                  Start
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
