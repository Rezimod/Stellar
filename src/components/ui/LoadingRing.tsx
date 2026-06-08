'use client';

import { useEffect, useState } from 'react';
import ScoreRing from './ScoreRing';

const DEFAULT_FACTS = [
  'Jupiter has 95 known moons',
  "Saturn's rings would stretch from Earth to the Moon",
  'The Orion Nebula is 1,344 light-years away',
  'Light from the Andromeda Galaxy left 2.5 million years ago',
  'A teaspoon of neutron star weighs 6 billion tons',
  "The Sun makes up 99.86% of the Solar System's mass",
  'There are more stars in the universe than grains of sand on Earth',
  'The Milky Way and Andromeda will merge in 4.5 billion years',
];

interface LoadingRingProps {
  progress?: number;
  size?: number;
  message?: string;
  facts?: string[];
  factInterval?: number;
}

export default function LoadingRing({
  progress,
  size = 80,
  message,
  facts = DEFAULT_FACTS,
  factInterval = 3000,
}: LoadingRingProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!facts.length) return;
    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setFactIndex(i => (i + 1) % facts.length);
        setVisible(true);
      }, 300);
    }, factInterval);
    return () => {
      clearInterval(id);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [facts, factInterval]);

  const strokeWidth = Math.max(4, Math.round(size / 12));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {progress !== undefined ? (
        <ScoreRing
          value={progress}
          size={size}
          strokeWidth={strokeWidth}
          color="gradient"
          animate={false}
          label=""
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ animation: 'spin-slow 1.5s linear infinite', display: 'block' }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
      )}
      {(message || facts.length > 0) && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            maxWidth: 200,
            lineHeight: 1.4,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {message ?? facts[factIndex]}
        </p>
      )}
    </div>
  );
}
