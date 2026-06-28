'use client';
import { useState, useEffect, useRef } from 'react';

interface Stats {
  totalObservations: number;
  totalStars: number;
  activeTonight: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animated count-up: ramps 0 → value with ease-out when `run` flips true.
// Honors reduced-motion (jumps straight to the final value).
function CountUp({ value, run, suffix }: { value: number; run: boolean; suffix?: React.ReactNode }) {
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!run || startedRef.current) return;
    startedRef.current = true;

    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const duration = 1200; // ms
    let raf = 0;
    let startTs = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      setDisplay(Math.round(easeOut(p) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value]);

  return (
    <span className="live-stats-num">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// Brand SVG star — replaces the inconsistent "✦" text glyph (SVG-icons-only rule).
function StarMark() {
  return (
    <svg
      className="live-stats-star"
      viewBox="0 0 24 24"
      width="0.8em"
      height="0.8em"
      aria-hidden
      focusable="false"
    >
      <path
        d="M12 2.5c.3 4.2 1.3 5.2 5.5 5.5-4.2.3-5.2 1.3-5.5 5.5-.3-4.2-1.3-5.2-5.5-5.5 4.2-.3 5.2-1.3 5.5-5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LiveStatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [inView, setInView] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/leaderboard?period=all&limit=100')
      .then(r => r.json())
      .then(data => {
        const lb = data.leaderboard ?? [];
        const totalObservations = lb.reduce((s: number, e: { observations: number }) => s + e.observations, 0);
        const totalStars = lb.reduce((s: number, e: { total_stars: number }) => s + e.total_stars, 0);
        setStats({ totalObservations, totalStars, activeTonight: lb.length });
      })
      .catch(() => {});
  }, []);

  // Trigger the count-up only when the bar scrolls into view.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [stats]);

  const hasData = stats && stats.totalObservations > 0;

  return (
    // Reserved height is always rendered so content never shifts when the
    // numbers arrive (kills the old null -> content layout jump).
    <div className="live-stats-bar" ref={barRef} aria-hidden={!hasData}>
      {hasData ? (
        <div className="live-stats-inner">
          <div className="live-stats-cell">
            <CountUp value={stats.totalObservations} run={inView} />
            <span className="live-stats-label">discoveries sealed on Solana</span>
          </div>
          <div className="live-stats-cell">
            <CountUp value={stats.totalStars} run={inView} suffix={<StarMark />} />
            <span className="live-stats-label">Stars earned</span>
          </div>
          <div className="live-stats-cell">
            <CountUp value={stats.activeTonight} run={inView} />
            <span className="live-stats-label">observers joined</span>
          </div>
          <div className="live-stats-live">
            <span className="live-led" aria-hidden />
            <span className="live-stats-live-label">Live</span>
          </div>
        </div>
      ) : (
        <div className="live-stats-skeleton" aria-hidden />
      )}
      <style jsx>{`
        .live-stats-bar {
          width: 100%;
          background: rgba(94, 234, 212, 0.04);
          border-top: 1px solid rgba(94, 234, 212, 0.08);
          border-bottom: 1px solid rgba(94, 234, 212, 0.08);
          padding: 10px 16px;
          min-height: 64px;
          display: flex;
          align-items: center;
        }
        @media (min-width: 768px) {
          .live-stats-bar {
            min-height: 48px;
          }
        }
        .live-stats-inner {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 18px;
          align-items: center;
        }
        @media (min-width: 768px) {
          .live-stats-inner {
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: nowrap;
          }
        }
        .live-stats-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .live-stats-num {
          color: var(--color-success);
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .live-stats-star {
          color: var(--color-success);
        }
        .live-stats-label {
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
          line-height: 1.3;
        }
        .live-stats-live {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .live-stats-live-label {
          color: rgba(94, 234, 212, 0.7);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
        .live-stats-skeleton {
          width: 100%;
          max-width: 640px;
          height: 14px;
          margin: 0 auto;
          border-radius: 7px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 25%,
            rgba(255, 255, 255, 0.07) 37%,
            rgba(255, 255, 255, 0.03) 63%
          );
          background-size: 400% 100%;
          animation: live-stats-shimmer 1.4s ease infinite;
        }
        @keyframes live-stats-shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: 0 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .live-stats-skeleton {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
