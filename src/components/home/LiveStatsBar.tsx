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

// Circular badge icons for the chips (mirrors the reference's pill-badge language).
function IconDiscovery() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <path d="M5 14c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2.2" fill="currentColor" />
      <path d="M12 4v1.6M19.5 6.5l-1.1 1.1M4.5 6.5l1.1 1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <path d="M12 3l2.5 5.6L20 9.3l-4 4 1 6-5-2.9L7 19.3l1-6-4-4 5.5-.7L12 3Z" fill="currentColor" />
    </svg>
  );
}
function IconObservers() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <circle cx="9" cy="8.5" r="3" fill="currentColor" />
      <path d="M3.5 18.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="currentColor" />
      <circle cx="16.5" cy="9.5" r="2.3" fill="currentColor" opacity="0.7" />
      <path d="M15 14.4c2.4.2 4.5 1.9 4.5 4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
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
          <div className="live-stats-chip">
            <span className="live-stats-badge badge-mint" aria-hidden><IconDiscovery /></span>
            <span className="live-stats-figure">
              <CountUp value={stats.totalObservations} run={inView} />
              <span className="live-stats-label">discoveries sealed</span>
            </span>
          </div>
          <div className="live-stats-chip">
            <span className="live-stats-badge badge-violet" aria-hidden><IconStar /></span>
            <span className="live-stats-figure">
              <CountUp value={stats.totalStars} run={inView} suffix={<StarMark />} />
              <span className="live-stats-label">Stars earned</span>
            </span>
          </div>
          <div className="live-stats-chip">
            <span className="live-stats-badge badge-mint" aria-hidden><IconObservers /></span>
            <span className="live-stats-figure">
              <CountUp value={stats.activeTonight} run={inView} />
              <span className="live-stats-label">observers joined</span>
            </span>
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
        /* Reference-inspired: deep indigo->violet gradient strip, rounded chips,
           circular mint/violet badges. Borrows the visual language, not the genre. */
        .live-stats-bar {
          width: 100%;
          background: linear-gradient(135deg, #0e1f4a 0%, #14306b 50%, #0c1838 100%);
          border-top: 1px solid rgba(167, 139, 250, 0.18);
          border-bottom: 1px solid rgba(167, 139, 250, 0.18);
          padding: 14px 16px;
          min-height: 76px;
          display: flex;
          align-items: center;
        }
        @media (min-width: 768px) {
          .live-stats-bar {
            min-height: 64px;
          }
        }
        .live-stats-inner {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          align-items: stretch;
        }
        @media (min-width: 768px) {
          .live-stats-inner {
            display: flex;
            justify-content: center;
            gap: 14px;
            flex-wrap: nowrap;
          }
        }
        .live-stats-chip {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 8px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        @media (min-width: 768px) {
          .live-stats-chip {
            flex: 0 1 auto;
          }
        }
        .live-stats-badge {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0b1020;
        }
        .badge-mint {
          background: linear-gradient(150deg, #5B8CF8 0%, #3B6FF6 100%);
          box-shadow: 0 0 0 3px rgba(59, 111, 246, 0.16);
        }
        .badge-violet {
          background: linear-gradient(150deg, #c4b5fd 0%, #a78bfa 100%);
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.14);
        }
        .live-stats-figure {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.15;
        }
        .live-stats-num {
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
        }
        .live-stats-star {
          color: var(--color-success);
        }
        .live-stats-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .live-stats-live {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .live-stats-live-label {
          color: rgba(120, 160, 255, 0.9);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
        .live-stats-skeleton {
          width: 100%;
          max-width: 760px;
          height: 30px;
          margin: 0 auto;
          border-radius: 14px;
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
