'use client';

import { RotateCw, Play } from 'lucide-react';
import type { QuizDef } from '@/lib/quizzes';

export type QuizTheme = 'solar' | 'stars' | 'telescope' | 'cosmos' | 'exploration';

const THEMES: Record<QuizTheme, {
  background: string;
  border: string;
  accent: string;
  buttonBg: string;
  buttonBorder: string;
  buttonFill: string;
}> = {
  solar: {
    background:
      'radial-gradient(circle at 85% 30%, rgba(255,180,80,0.18) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(255,100,40,0.1) 0%, transparent 50%), linear-gradient(145deg, #1a0e07 0%, #0a0a14 100%)',
    border: 'rgba(255,180,80,0.18)',
    accent: '#FFB84A',
    buttonBg: 'rgba(255,180,80,0.1)',
    buttonBorder: 'rgba(255,180,80,0.3)',
    buttonFill: '#FFB84A',
  },
  stars: {
    background:
      'radial-gradient(circle at 80% 20%, rgba(184,212,255,0.14) 0%, transparent 50%), radial-gradient(circle at 15% 70%, rgba(132,155,220,0.08) 0%, transparent 50%), linear-gradient(145deg, #0d1428 0%, var(--canvas) 100%)',
    border: 'rgba(184,212,255,0.12)',
    accent: '#B8D4FF',
    buttonBg: 'rgba(184,212,255,0.1)',
    buttonBorder: 'rgba(184,212,255,0.25)',
    buttonFill: 'rgba(184,212,255,0.9)',
  },
  telescope: {
    background:
      'radial-gradient(circle at 80% 30%, rgba(94, 234, 212,0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(100,180,220,0.06) 0%, transparent 50%), linear-gradient(145deg, var(--canvas) 0%, var(--canvas) 100%)',
    border: 'rgba(94, 234, 212,0.15)',
    accent: 'var(--stl-teal)',
    buttonBg: 'rgba(94, 234, 212,0.1)',
    buttonBorder: 'rgba(94, 234, 212,0.3)',
    buttonFill: 'var(--stl-teal)',
  },
  cosmos: {
    background:
      'radial-gradient(circle at 85% 25%, rgba(167,139,232,0.18) 0%, transparent 55%), radial-gradient(circle at 15% 85%, rgba(255,143,184,0.1) 0%, transparent 55%), linear-gradient(145deg, var(--canvas) 0%, var(--canvas) 100%)',
    border: 'rgba(167,139,232,0.18)',
    accent: 'var(--terracotta)',
    buttonBg: 'rgba(167,139,232,0.1)',
    buttonBorder: 'rgba(167,139,232,0.3)',
    buttonFill: 'rgba(167,139,232,0.95)',
  },
  exploration: {
    background:
      'radial-gradient(circle at 80% 20%, rgba(255,143,184,0.14) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,180,80,0.08) 0%, transparent 50%), linear-gradient(145deg, #1a0916 0%, var(--canvas) 100%)',
    border: 'rgba(255,143,184,0.14)',
    accent: 'var(--negative)',
    buttonBg: 'rgba(255,143,184,0.08)',
    buttonBorder: 'rgba(255,143,184,0.25)',
    buttonFill: 'rgba(255,143,184,0.95)',
  },
};

interface Props {
  quiz: QuizDef;
  theme: QuizTheme;
  Icon: React.ComponentType<{ size?: number }>;
  titleEn: string;
  descEn: string;
  totalQuestions: number;
  bestPct?: number | null;
  starsEarned?: number;
  progressQ?: number;
  badges?: Array<{ label: string; variant: 'new' | 'hard' | 'done' }>;
  reward: number;
  onStart: () => void;
}

export default function QuizCard({
  quiz, theme, Icon, titleEn, descEn, totalQuestions, bestPct, starsEarned, progressQ, badges = [], reward, onStart,
}: Props) {
  void quiz;
  const t = THEMES[theme];
  const isCompleted = bestPct != null;
  const inProgress = progressQ != null && progressQ > 0 && !isCompleted;

  return (
    <button
      onClick={onStart}
      className="w-full grid items-center text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        gap: 10,
        padding: 10,
        background: t.background,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        cursor: 'pointer',
      }}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <Icon size={32} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--text)',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {titleEn}
          </h3>
          {badges.map((b, i) => (
            <span
              key={i}
              className={b.variant === 'new' ? 'stl-badge-pulse' : ''}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 8,
                color: b.variant === 'new' ? 'var(--stl-teal)'
                     : b.variant === 'done' ? '#86efac'
                     : 'var(--terracotta)',
                background: b.variant === 'new' ? 'rgba(94, 234, 212,0.14)'
                          : b.variant === 'done' ? 'rgba(94, 234, 212,0.12)'
                          : 'rgba(167,139,232,0.12)',
                padding: '2px 5px',
                borderRadius: 3,
                letterSpacing: '0.12em',
                fontWeight: 500,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10.5,
            color: 'rgba(255,255,255,0.48)',
            lineHeight: 1.35,
            marginTop: 1,
          }}
        >
          {descEn}
        </div>

        {inProgress ? (
          <div className="flex items-center gap-2 mt-2">
            <div
              style={{
                flex: 1,
                maxWidth: 120,
                height: 3,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(progressQ! / totalQuestions) * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${t.accent}, var(--terracotta))`,
                  borderRadius: 2,
                }}
              />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9.5, color: `${t.accent}b0`, letterSpacing: '0.05em' }}>
              {progressQ}/{totalQuestions} · CONTINUE
            </span>
          </div>
        ) : isCompleted ? (
          <div className="flex items-center gap-2.5 mt-2">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
              {totalQuestions} Q · BEST {Math.round((bestPct! / 100) * totalQuestions)}/{totalQuestions}
            </span>
            <span style={{ fontSize: 10, color: 'var(--stars)', fontWeight: 600 }}>
              +{starsEarned ?? 0} earned
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 mt-2">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
              {totalQuestions} QUESTIONS
            </span>
            <span style={{ fontSize: 10, color: 'var(--stars)', fontWeight: 600 }}>
              +{reward} ✦
            </span>
          </div>
        )}
      </div>

      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          background: isCompleted ? 'rgba(255,255,255,0.04)' : t.buttonBg,
          border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.1)' : t.buttonBorder}`,
          borderRadius: 9,
        }}
      >
        {isCompleted
          ? <RotateCw size={11} color="rgba(255,255,255,0.6)" />
          : <Play size={11} fill={t.buttonFill} color={t.buttonFill} />}
      </div>
    </button>
  );
}
