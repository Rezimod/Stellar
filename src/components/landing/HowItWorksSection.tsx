'use client';

import { useRouter } from 'next/navigation';

const DECOR_STARS: { cx: number; cy: number; r: number; opacity: number; gold?: boolean }[] = [
  { cx: 540, cy: 120, r: 1.3, opacity: 0.45 },
  { cx: 120, cy: 160, r: 1,   opacity: 0.35 },
  { cx: 600, cy: 320, r: 1,   opacity: 0.4 },
  { cx: 80,  cy: 350, r: 1.2, opacity: 0.3 },
  { cx: 380, cy: 60,  r: 1.5, opacity: 0.5, gold: true },
  { cx: 240, cy: 380, r: 1,   opacity: 0.35 },
  { cx: 430, cy: 400, r: 1,   opacity: 0.3 },
];

export default function HowItWorksSection() {
  const router = useRouter();

  const goSky = () => router.push('/sky');
  const goObserve = () => router.push('/observe');
  const goNfts = () => router.push('/nfts');

  return (
    <section className="py-16 md:py-24 bg-[radial-gradient(ellipse_at_50%_50%,rgba(255, 209, 102,0.05)_0%,transparent_70%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-[640px] text-center mb-10 md:mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(232,230,221,0.4)]">
          02 · MECHANISM
        </span>
        <h2 className="mt-3 font-display font-medium tracking-[-0.02em] text-[24px] md:text-[32px] text-[#F8F4EC]">
          Three orbits, one discovery.
        </h2>
        <p className="mt-3 text-[13px] md:text-[14px] text-[rgba(232,230,221,0.55)]">
          From the sky to the chain in three motions.
        </p>
      </header>

      <div className="w-full max-w-[680px] mx-auto">
        <svg
          viewBox="0 0 680 460"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-labelledby="hiw-title hiw-desc"
          className="w-full h-auto"
        >
          <title id="hiw-title">How Stellar works</title>
          <desc id="hiw-desc">
            Three orbits around you: Observe tonight&apos;s sky, Verify with photo and oracle,
            Collect an NFT and Stars rewards.
          </desc>

          <ellipse cx="340" cy="230" rx="100" ry="100" fill="none" stroke="rgba(232,230,221,0.08)" strokeWidth="0.5" strokeDasharray="2 4" />
          <ellipse cx="340" cy="230" rx="160" ry="160" fill="none" stroke="rgba(232,230,221,0.06)" strokeWidth="0.5" strokeDasharray="2 4" />
          <ellipse cx="340" cy="230" rx="220" ry="220" fill="none" stroke="rgba(232,230,221,0.04)" strokeWidth="0.5" strokeDasharray="2 4" />

          {DECOR_STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill={s.gold ? 'var(--terracotta)' : '#F8F4EC'}
              opacity={s.opacity}
            />
          ))}

          <circle cx="340" cy="230" r="32" fill="var(--terracotta)" opacity="0.12" />
          <circle cx="340" cy="230" r="18" fill="var(--terracotta)" opacity="0.3" />
          <circle cx="340" cy="230" r="9"  fill="var(--terracotta)" opacity="1" />
          <text
            x="340"
            y="290"
            textAnchor="middle"
            fontSize="9"
            letterSpacing="0.2em"
            fill="rgba(232,230,221,0.5)"
            fontFamily="var(--font-mono)"
          >
            YOU
          </text>

          {/* OBSERVE — top */}
          <g className="cursor-pointer" onClick={goSky} role="link" aria-label="Observe — tonight's sky">
            <circle cx="340" cy="130" r="22" fill="var(--canvas)" stroke="var(--seafoam)" strokeWidth="1" />
            <circle cx="340" cy="130" r="4"  fill="var(--seafoam)" />
            <circle cx="335" cy="126" r="1.2" fill="rgba(94, 234, 212,0.6)" />
            <circle cx="344" cy="132" r="1"   fill="rgba(94, 234, 212,0.45)" />
            <circle cx="338" cy="135" r="0.9" fill="rgba(94, 234, 212,0.4)" />
            <text x="340" y="92" textAnchor="middle" fontSize="9" letterSpacing="0.2em" fill="var(--seafoam)" fontFamily="var(--font-mono)">
              i · OBSERVE
            </text>
            <text x="340" y="170" textAnchor="middle" fontSize="14" fill="#F8F4EC" fontFamily="var(--font-display)">
              Tonight&apos;s sky
            </text>
          </g>

          {/* VERIFY — right */}
          <g className="cursor-pointer" onClick={goObserve} role="link" aria-label="Verify — photo and oracle">
            <circle cx="500" cy="230" r="20" fill="var(--canvas)" stroke="var(--terracotta)" strokeWidth="1" />
            <path
              d="M 492 230 L 498 236 L 510 222"
              fill="none"
              stroke="var(--terracotta)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="540" y="222" textAnchor="start" fontSize="9" letterSpacing="0.2em" fill="var(--terracotta)" fontFamily="var(--font-mono)">
              ii · VERIFY
            </text>
            <text x="540" y="240" textAnchor="start" fontSize="14" fill="#F8F4EC" fontFamily="var(--font-display)">
              Photo + oracle
            </text>
          </g>

          {/* COLLECT — left */}
          <g className="cursor-pointer" onClick={goNfts} role="link" aria-label="Collect — NFT and Stars">
            <circle cx="180" cy="230" r="20" fill="var(--canvas)" stroke="var(--terracotta)" strokeWidth="1" />
            <path
              d="M 172 226 L 180 220 L 188 226 L 188 236 L 172 236 Z"
              fill="none"
              stroke="var(--terracotta)"
              strokeWidth="1.2"
            />
            <circle cx="180" cy="231" r="2" fill="var(--terracotta)" />
            <text x="140" y="222" textAnchor="end" fontSize="9" letterSpacing="0.2em" fill="var(--terracotta)" fontFamily="var(--font-mono)">
              iii · COLLECT
            </text>
            <text x="140" y="240" textAnchor="end" fontSize="14" fill="#F8F4EC" fontFamily="var(--font-display)">
              NFT + Stars
            </text>
          </g>

          <text
            x="340"
            y="430"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(232,230,221,0.45)"
            fontFamily="var(--font-display)"
          >
            Each completed orbit mints one verified discovery, gasless.
          </text>
        </svg>
      </div>
      </div>
    </section>
  );
}
