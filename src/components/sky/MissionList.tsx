'use client';

import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import StaggerChildren from '@/components/ui/StaggerChildren';

interface MissionListProps {
  onStart: (mission: Mission) => void;
}

const DIFF_STRIP: Record<string, string> = {
  Beginner:     'var(--success)',
  Intermediate: 'var(--accent)',
  Advanced:     'var(--accent)',
  Hard:         '#A855F7',
  Expert:       'var(--stars)',
}

const DIFF_BADGE: Record<string, string> = {
  Beginner:     'badge-pill badge-success',
  Intermediate: 'badge-pill badge-accent',
  Advanced:     'badge-pill badge-accent',
  Hard:         'badge-pill',
  Expert:       'badge-pill badge-stars',
}

const HARD_BADGE_STYLE = { background: 'rgba(168,85,247,0.12)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.25)' }

export default function MissionList({ onStart }: MissionListProps) {
  const { state } = useAppState();
  const completedIds = new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id));
  const pendingIds   = new Set(state.completedMissions.filter(m => m.status === 'pending').map(m => m.id));

  function completedTodayId(id: string): boolean {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.completedMissions.some(
      m => m.id === id && m.status === 'completed' && new Date(m.timestamp).getTime() > cutoff
    );
  }

  return (
    <StaggerChildren stagger={50} className="flex flex-col gap-2.5">
      {MISSIONS.map(mission => {
        const isRepeatable = mission.repeatable === true;
        const done     = completedIds.has(mission.id) && !isRepeatable;
        const doneToday = isRepeatable && completedTodayId(mission.id);
        const pending  = pendingIds.has(mission.id);

        const stripColor = DIFF_STRIP[mission.difficulty] ?? 'var(--accent)'
        const badgeClass = DIFF_BADGE[mission.difficulty] ?? 'badge-pill badge-accent'
        const isHardBadge = mission.difficulty === 'Hard'

        return (
          <div
            key={mission.id}
            className="card-base overflow-hidden flex flex-row p-0"
            style={{ opacity: done ? 0.5 : 1, cursor: done ? 'default' : undefined }}
          >
            {/* Left color strip */}
            <div
              style={{
                width: 6,
                flexShrink: 0,
                background: stripColor,
                boxShadow: done ? `1px 0 8px rgba(52,211,153,0.4)` : undefined,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Row 1: emoji + name + difficulty badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{mission.emoji}</span>
                  <span
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      lineHeight: 1.3,
                    }}
                  >
                    {mission.name}
                  </span>
                </div>
                <span
                  className={badgeClass}
                  style={{
                    fontSize: 10,
                    flexShrink: 0,
                    ...(isHardBadge ? HARD_BADGE_STYLE : {}),
                  }}
                >
                  {mission.difficulty}
                </span>
              </div>

              {/* Row 2: description */}
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  fontFamily: 'var(--font-body)',
                  margin: 0,
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {mission.desc}
              </p>

              {/* Row 3: stars + CTA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span
                  style={{
                    color: 'var(--stars)',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ✦ +{mission.stars}
                </span>

                {done ? (
                  <span className="badge-pill badge-success" style={{ fontSize: 11 }}>✓ Completed</span>
                ) : doneToday ? (
                  <span className="badge-pill badge-success" style={{ fontSize: 11 }}>✓ Done today</span>
                ) : pending ? (
                  <span className="badge-pill badge-warning" style={{ fontSize: 11 }}>Pending</span>
                ) : isRepeatable ? (
                  <button
                    onClick={() => onStart(mission)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 12, minHeight: 36 }}
                  >
                    Start →
                  </button>
                ) : (
                  <button
                    onClick={() => onStart(mission)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 12, minHeight: 36 }}
                  >
                    Start →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </StaggerChildren>
  );
}
