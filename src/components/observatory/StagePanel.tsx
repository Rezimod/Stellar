'use client';

import Image from 'next/image';
import { ChevronRight, MapPin, SignalHigh, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SIM_TARGETS, targetPhoto, type SimTarget } from '@/lib/observatory/sim-targets';
import type { SafetyVerdict } from '@/lib/observatory/safety';
import type { ObservatoryNode } from '@/lib/observatory/types';

export type StagePanelProps = {
  node: ObservatoryNode;
  /** The object being tracked, or null when the mount is parked or steered by hand. */
  target: SimTarget | null;
  /** What the mount is doing, in one word, and one line about it. */
  state: string;
  stateLine: string;
  tracking: boolean;
  cloudCover: number | null;
  verdicts: Record<string, SafetyVerdict>;
  onGoTo: (target: SimTarget) => void;
  /** A booked slot; absent in the simulator. */
  session?: { startsAtMs: number; endsAtMs: number; now: number; timezone: string };
  /** The simulator's clock control, rendered under the panel. */
  children?: React.ReactNode;
};

/**
 * The panel over the live view: where the telescope is, what it is looking at,
 * how the night is going, and what it could look at next.
 *
 * The frame behind it is the argument; this is the caption. It answers the
 * three questions a visitor has while the mount is running — what am I seeing,
 * is it working, how long have I got — and offers exactly one next thing.
 */
export default function StagePanel(p: StagePanelProps) {
  const t = useTranslations('observatory.console');
  const tState = useTranslations('observatory.state');
  const photo = p.target ? targetPhoto(p.target) : null;

  // The next thing worth pointing at: the first target the sky allows that is
  // not the one already in the frame.
  const next = SIM_TARGETS.find((s) => s.id !== p.target?.id && p.verdicts[s.id]?.ok);
  const nextPhoto = next ? targetPhoto(next) : null;

  const cloud = p.cloudCover;
  const conditions =
    cloud === null ? null : cloud > 70 ? 'Poor' : cloud > 30 ? 'Fair' : 'Good';
  const conditionsLabel =
    conditions === 'Poor' ? t('conditionsPoor') : conditions === 'Fair' ? t('conditionsFair') : t('conditionsGood');
  const conditionsTone = conditions === 'Poor' ? ' obs-status__icon--bad' : conditions === 'Fair' ? ' obs-status__icon--warn' : '';

  return (
    <div className="obs-float obs-float--main">
      <div className="obs-float__head">
        <span className="obs-float__node">
          <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
          {p.node.name}
        </span>
        <span className={`obs-pill obs-pill--${p.tracking ? 'live' : 'busy'}`}>
          <span className="obs-led" aria-hidden="true" />
          {p.state}
        </span>
      </div>
      <p className="obs-float__meta">
        <span>{p.node.site}</span>
        <span>{p.node.instrument.optics}</span>
        <span>{p.node.instrument.camera}</span>
      </p>

      <h1 className="obs-float__title">
        {p.target ? p.target.name : p.state === 'MANUAL' ? t('manual') : t('parked')}
      </h1>
      <p className="obs-float__subtitle">{p.stateLine}</p>
      {p.target && <p className="obs-float__text">{p.target.expect}</p>}

      <div className="obs-float__rule" />

      <div className="obs-status">
        <div className="obs-status__item">
          <span className="obs-status__icon">
            <Target size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="obs-status__fact">{p.tracking ? t('tracking') : t('trackingOff')}</span>
            <span className="obs-status__about">
              {p.target ? t('following', { target: p.target.name }) : tState('daylight')}
            </span>
          </span>
        </div>
        <div className="obs-status__item">
          <span className={`obs-status__icon${conditionsTone}`}>
            <SignalHigh size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="obs-status__fact">{cloud === null ? '—' : conditionsLabel}</span>
            <span className="obs-status__about">{t('conditions')}</span>
          </span>
        </div>
      </div>

      {p.session && <SessionRing {...p.session} />}
      {p.children}

      {next && (
        <>
          <div className="obs-card__head" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            <span className="obs-card__title">{t('nextTarget')}</span>
          </div>
          <button type="button" className="obs-row" onClick={() => p.onGoTo(next)}>
            <span className="obs-row__thumb">
              {nextPhoto && <Image src={nextPhoto.src} alt="" fill sizes="72px" />}
            </span>
            <span className="obs-row__body">
              <span className="obs-row__name">{next.name}</span>
              <span className="obs-row__line">{next.expect}</span>
            </span>
            <span className="obs-row__arrow" aria-hidden="true">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>
        </>
      )}
    </div>
  );
}

/** How much of the booked slot is left, as a ring that empties. */
function SessionRing({
  startsAtMs,
  endsAtMs,
  now,
  timezone,
}: {
  startsAtMs: number;
  endsAtMs: number;
  now: number;
  timezone: string;
}) {
  const t = useTranslations('observatory.console');
  const total = Math.max(1, endsAtMs - startsAtMs);
  const left = Math.max(0, endsAtMs - now);
  const fraction = Math.min(1, left / total);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const clock = (at: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(at));

  const circumference = 2 * Math.PI * 45;

  return (
    <div className="obs-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span className="obs-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="obs-ring__track" cx="50" cy="50" r="45" />
          <circle
            className="obs-ring__fill"
            cx="50"
            cy="50"
            r="45"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        </svg>
        <span className="obs-ring__label">
          <span className="obs-ring__value">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="obs-ring__caption">{t('remaining')}</span>
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="obs-card__title" style={{ display: 'block' }}>{t('session')}</span>
        <span className="obs-card__aside" style={{ display: 'block', marginTop: 2 }}>
          {t('total', { minutes: Math.round(total / 60_000) })}
        </span>
        <span className="obs-bar" style={{ display: 'block', marginTop: '0.75rem' }}>
          <span style={{ width: `${(1 - fraction) * 100}%` }} />
        </span>
        <span className="obs-card__aside" style={{ display: 'block', marginTop: '0.5rem' }}>
          {t('startedAt', { time: clock(startsAtMs) })}
        </span>
      </span>
    </div>
  );
}
