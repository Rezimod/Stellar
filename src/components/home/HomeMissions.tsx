'use client';

import Link from 'next/link';

type Diff = 'easy' | 'medium' | 'hard';
type IconKey = 'moon' | 'jupiter' | 'saturn' | 'nebula';

interface HomeMission {
  slug: string;
  name: string;
  desc: string;
  icon: IconKey;
  diff: Diff;
  diffLabel: string;
  stars: number;
}

const MISSIONS: HomeMission[] = [
  { slug: 'moon',    name: 'The Moon',      desc: 'Photograph craters and seas',    icon: 'moon',    diff: 'easy',   diffLabel: 'Easy',   stars: 50 },
  { slug: 'jupiter', name: 'Jupiter',       desc: 'Spot the four big moons',         icon: 'jupiter', diff: 'medium', diffLabel: 'Medium', stars: 75 },
  { slug: 'saturn',  name: 'Saturn',        desc: 'See the rings through a scope',   icon: 'saturn',  diff: 'medium', diffLabel: 'Medium', stars: 100 },
  { slug: 'orion',   name: 'Orion Nebula',  desc: 'Capture a cosmic cloud',          icon: 'nebula',  diff: 'hard',   diffLabel: 'Hard',   stars: 100 },
];

function MissionIcon({ icon }: { icon: IconKey }) {
  if (icon === 'moon') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <circle cx="13" cy="13" r="9" fill="#E5E7EB" />
        <circle cx="10" cy="11" r="1.1" fill="var(--text-muted)" opacity="0.7" />
        <circle cx="15.5" cy="14.5" r="0.9" fill="var(--text-muted)" opacity="0.7" />
        <circle cx="12" cy="16" r="0.6" fill="var(--text-muted)" opacity="0.6" />
      </svg>
    );
  }
  if (icon === 'jupiter') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <circle cx="13" cy="13" r="9" fill="#D8A86A" />
        <path d="M5 10.5h16M5 13h16M5 15.5h16" stroke="#8B5E34" strokeWidth="0.7" opacity="0.55" />
        <ellipse cx="15" cy="13.5" rx="1.6" ry="0.9" fill="#B14A2A" opacity="0.8" />
      </svg>
    );
  }
  if (icon === 'saturn') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <ellipse cx="14" cy="14" rx="11" ry="3" stroke="#D4C05A" strokeWidth="0.9" fill="none" />
        <circle cx="14" cy="14" r="5.5" fill="#E6D47A" />
        <ellipse cx="14" cy="14" rx="11" ry="3" stroke="#D4C05A" strokeWidth="0.9" fill="none" />
      </svg>
    );
  }
  // nebula
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle cx="13" cy="13" r="9" fill="#4C1D95" opacity="0.55" />
      <circle cx="13" cy="13" r="6" fill="var(--terracotta)" opacity="0.6" />
      <circle cx="13" cy="13" r="3" fill="var(--terracotta)" opacity="0.85" />
      <circle cx="13" cy="13" r="1" fill="#FFF" />
    </svg>
  );
}

export default function HomeMissions() {
  return (
    <div>
      <div className="home-col-head">
        <h2 className="home-col-title">Active missions</h2>
        <Link href="/missions" className="home-col-link">All missions</Link>
      </div>
      <div className="home-missions-list">
        {MISSIONS.map((m) => (
          <Link key={m.slug} href={`/missions?open=${m.slug}`} className="home-mission-card">
            <div className={`home-mission-icon-tile ${m.icon}`}>
              <div className="home-mission-icon-stars" />
              <MissionIcon icon={m.icon} />
            </div>
            <div className="home-mission-info">
              <span className="home-mission-name">{m.name}</span>
              <span className="home-mission-desc">{m.desc}</span>
            </div>
            <div className="home-mission-right">
              <span className={`home-mission-diff ${m.diff}`}>{m.diffLabel}</span>
              <span className="home-mission-stars">+{m.stars}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
