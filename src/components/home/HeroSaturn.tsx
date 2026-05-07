'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type CSSProperties } from 'react';

const STAR_FIELD: Array<[number, number, number, number]> = [
  // x%, y%, radius px, opacity
  [4, 12, 0.6, 0.55], [11, 78, 0.8, 0.7], [17, 34, 0.5, 0.45],
  [22, 60, 0.9, 0.85], [28, 18, 0.6, 0.55], [33, 88, 0.7, 0.6],
  [38, 46, 0.5, 0.4], [44, 22, 1.0, 0.95], [49, 72, 0.6, 0.55],
  [54, 8, 0.7, 0.65], [60, 56, 0.5, 0.45], [66, 30, 0.8, 0.75],
  [71, 84, 0.6, 0.5], [77, 14, 0.5, 0.4], [82, 66, 1.0, 0.9],
  [88, 40, 0.7, 0.6], [93, 78, 0.6, 0.5], [97, 22, 0.5, 0.4],
  [7, 50, 0.6, 0.5], [14, 6, 0.5, 0.4], [25, 92, 0.7, 0.55],
  [42, 64, 0.5, 0.4], [56, 36, 0.6, 0.5], [69, 12, 0.5, 0.4],
  [80, 52, 0.7, 0.6], [89, 92, 0.6, 0.5],
];

export default function HeroSaturn() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -1 .. 1 across the stage
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    setTilt({ x: nx, y: ny, active: true });
  };

  const handleLeave = () => setTilt({ x: 0, y: 0, active: false });

  // Parallax magnitudes — Saturn moves more, glare moves less, stars least
  const planetTransform = `translate3d(${tilt.x * -28}px, ${tilt.y * -18}px, 0) rotateX(${tilt.y * -3}deg) rotateY(${tilt.x * 4}deg)`;
  const glareTransform = `translate3d(${tilt.x * -42}px, ${tilt.y * -28}px, 0)`;
  const starsTransform = `translate3d(${tilt.x * -8}px, ${tilt.y * -6}px, 0)`;
  const transition = tilt.active
    ? 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)'
    : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <section
      ref={stageRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'min(720px, 100vh)',
        background:
          'radial-gradient(120% 80% at 75% 55%, #2A0E1F 0%, #160A1E 38%, #0A0815 70%, #06060F 100%)',
      }}
    >
      {/* === Background star layer === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ transform: starsTransform, transition }}
      >
        {STAR_FIELD.map(([x, y, r, o], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: r * 2,
              height: r * 2,
              opacity: o,
              boxShadow: r > 0.7 ? `0 0 ${r * 6}px rgba(255,255,255,0.55)` : undefined,
            }}
          />
        ))}
      </div>

      {/* === Sun glare === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ transform: glareTransform, transition, mixBlendMode: 'screen' }}
      >
        <div
          className="absolute"
          style={{
            top: '18%',
            left: '54%',
            width: 360,
            height: 360,
            background:
              'radial-gradient(circle, rgba(255,238,200,0.95) 0%, rgba(255,170,90,0.55) 22%, rgba(255,90,40,0.18) 48%, transparent 72%)',
            filter: 'blur(2px)',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '28%',
            left: '60%',
            width: 90,
            height: 90,
            background:
              'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,236,200,0.75) 30%, transparent 60%)',
          }}
        />
      </div>

      {/* === Saturn === */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          right: '-8%',
          transform: `translateY(-50%) ${planetTransform}`,
          transition,
          width: 'min(1180px, 95vw)',
          aspectRatio: '2 / 1',
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            filter: 'saturate(1.18) brightness(1.06) contrast(1.05)',
          }}
        >
          <Image
            src="/sky/targets/saturn.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 1180px, 95vw"
            className="object-cover select-none"
            style={{ objectPosition: 'center' }}
          />
          {/* Warm rim light from the sun glare */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 32% 36%, rgba(255,170,90,0.45) 0%, transparent 36%)',
              mixBlendMode: 'screen',
            }}
          />
          {/* Shadow on the far side */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 80% 64%, rgba(20,8,30,0.55) 0%, transparent 42%)',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
      </div>

      {/* === Soft vignette so the copy stays readable === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,6,15,0.65) 0%, rgba(6,6,15,0.35) 32%, transparent 60%)',
        }}
      />

      {/* === Copy === */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-10 lg:px-12 py-24 md:py-28 lg:py-36">
        <div className="max-w-[640px]">
          <h1
            className="text-white font-bold leading-[0.98] tracking-[-0.01em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(44px, 8vw, 96px)',
              fontWeight: 700,
            }}
          >
            Find every planet.
            <br />
            Earn rewards.
          </h1>

          <p
            className="mt-6 md:mt-7 text-[15px] md:text-[18px] leading-[1.5]"
            style={{
              color: 'rgba(255, 220, 230, 0.72)',
              maxWidth: 520,
            }}
          >
            Find what&apos;s up tonight. Photograph it.
            <br className="hidden sm:block" />
            Redeem Stars for a real telescope.
          </p>

          <div className="mt-9 md:mt-12 flex flex-wrap gap-3">
            <CTA href="/missions" tone="primary">Earn Rewards</CTA>
            <CTA href="/sky" tone="secondary">Start Observing</CTA>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA({
  href,
  tone,
  children,
}: {
  href: string;
  tone: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 168,
    padding: '16px 28px',
    borderRadius: 8,
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '0.005em',
    textDecoration: 'none',
    transition: 'background 140ms ease, filter 140ms ease',
    cursor: 'pointer',
  };
  const skin: CSSProperties =
    tone === 'primary'
      ? { background: '#FF6A1A', color: '#FFFFFF', border: 'none' }
      : { background: '#1A2540', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)' };

  return (
    <Link
      href={href}
      style={{ ...base, ...skin }}
      className={tone === 'primary' ? 'hero-cta-primary' : 'hero-cta-secondary'}
    >
      {children}
    </Link>
  );
}
