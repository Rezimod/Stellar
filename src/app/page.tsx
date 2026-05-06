import Image from 'next/image';
import Link from 'next/link';
import HeroSkyPanel from '@/components/home/HeroSkyPanelLazy';

// Mirrors src/app/missions/page.tsx GRID — keep the seven hero targets in the
// same order as the missions deck so labels, equip and difficulty don't drift.
const HERO_MISSIONS: { id: string; name: string; equip: string; diff: string; stars: number }[] = [
  { id: 'moon',      name: 'The Moon',     equip: 'Naked eye',  diff: 'Easy',   stars: 50 },
  { id: 'jupiter',   name: 'Jupiter',      equip: 'Telescope',  diff: 'Easy',   stars: 75 },
  { id: 'pleiades',  name: 'Pleiades',     equip: 'Naked eye',  diff: 'Easy',   stars: 60 },
  { id: 'saturn',    name: 'Saturn',       equip: 'Telescope',  diff: 'Medium', stars: 100 },
  { id: 'orion',     name: 'Orion Nebula', equip: 'Telescope',  diff: 'Medium', stars: 100 },
  { id: 'andromeda', name: 'Andromeda',    equip: 'Binoculars', diff: 'Hard',   stars: 175 },
  { id: 'crab',      name: 'Crab Nebula',  equip: 'Telescope',  diff: 'Expert', stars: 250 },
];

const TILE_BRASS = 'bg-[rgba(255,209,102,0.08)] border-[rgba(255,209,102,0.2)]';
const TILE_PURPLE = 'bg-[rgba(176,127,232,0.08)] border-[rgba(176,127,232,0.2)]';
const TILE_TEAL = 'bg-[rgba(56,240,255,0.08)] border-[rgba(56,240,255,0.2)]';

const STROKE_BRASS = '#FFD166';
const STROKE_PURPLE = '#B07FE8';
const STROKE_TEAL = '#38F0FF';

function IconTile({ tone, children }: { tone: 'brass' | 'purple' | 'teal'; children: React.ReactNode }) {
  const cls = tone === 'brass' ? TILE_BRASS : tone === 'purple' ? TILE_PURPLE : TILE_TEAL;
  return (
    <div className={`w-14 h-14 ${cls} border rounded-xl flex items-center justify-center mb-6 mx-auto md:mx-0`}>
      {children}
    </div>
  );
}

function StrokeIcon({ tone, children }: { tone: 'brass' | 'purple' | 'teal'; children: React.ReactNode }) {
  const stroke = tone === 'brass' ? STROKE_BRASS : tone === 'purple' ? STROKE_PURPLE : STROKE_TEAL;
  return (
    <svg
      className="w-7 h-7"
      stroke={stroke}
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 32 32"
    >
      {children}
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[14px] font-semibold tracking-[0.22em] uppercase text-[#FFD166] mb-6">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[28px] md:text-[60px] font-extrabold leading-[1.1] md:leading-[1.05] tracking-[-0.02em] text-white mb-5 md:mb-7">
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] md:text-[20px] leading-[1.55] text-[#9BA3B4] max-w-[680px] mx-auto">
      {children}
    </p>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[18px] md:text-[22px] font-bold text-white mb-3 md:mb-4">{children}</div>;
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] md:text-[15px] leading-[1.65] text-[#9BA3B4]">{children}</div>;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black/40 border-l-2 border-[#8B5CF6] rounded px-4 py-3 mb-3 font-mono text-[12px] text-[#B8BFD0] leading-[1.5] last:mb-0">
      <span className="text-[#10B981] mr-2">&gt;</span>
      {children}
    </div>
  );
}

function LedgerStat({
  label,
  value,
  suffix,
  meta,
}: {
  label: string;
  value: string;
  suffix?: string;
  meta: string;
}) {
  return (
    <div className="px-3 md:px-6 py-6 md:py-8 flex flex-col items-center text-center">
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#6B7385] font-mono">
        {label}
      </div>
      <div className="mt-3 md:mt-4 flex items-baseline justify-center">
        <span className="font-mono text-[30px] md:text-[48px] font-bold leading-none text-white tabular-nums tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="font-mono text-[20px] md:text-[28px] font-bold leading-none text-[#FFD166] tabular-nums ml-0.5">
            {suffix}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[11.5px] md:text-[13px] text-[#9BA3B4] leading-tight">
        {meta}
      </div>
    </div>
  );
}

function PartnerLogo({
  src,
  alt,
  width,
  height,
  filter,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  filter?: string;
}) {
  // SVGs are already vector-perfect, skip Next's raster pipeline; raster logos go through next/image so they ship as AVIF/WebP at the actual rendered size.
  const isSvg = src.endsWith('.svg');
  return (
    <div className="flex items-center justify-center px-4 md:px-6 h-[88px] md:h-[112px] group">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized={isSvg}
        loading="lazy"
        sizes="(max-width: 768px) 50vw, 240px"
        className="h-7 md:h-9 w-auto opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={filter ? { filter, height: 'auto', maxHeight: '36px' } : { height: 'auto', maxHeight: '36px' }}
      />
    </div>
  );
}

function StarSparkle({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="#FFD166">
      <path d="M6 1l1.5 3.5L11 5l-2.5 2L9 10.5 6 8.5 3 10.5l.5-3.5L1 5l3.5-.5z" />
    </svg>
  );
}

/* ─── How It Works: phone-frame mockups ───────────────────────────── */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[230px] md:w-[260px] aspect-[9/19.5] rounded-[38px] bg-[#05070D] p-[6px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="absolute -inset-[1px] rounded-[39px] ring-1 ring-white/[0.04] pointer-events-none" />
      <div className="relative h-full w-full rounded-[32px] bg-gradient-to-b from-[#0B0E17] to-[#0F1424] overflow-hidden">
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-[20px] w-[78px] rounded-full bg-black z-20" />
        <div className="flex items-center justify-between px-5 pt-2 text-[9px] font-mono text-white/50 relative z-10">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 rounded-[1px] bg-white/40" />
            <span className="w-3 h-1.5 rounded-[1px] border border-white/40" />
          </span>
        </div>
        <div className="px-3 pt-6 pb-4 h-full">{children}</div>
      </div>
    </div>
  );
}

function HowStep({
  title,
  caption,
  screen,
}: {
  title: string;
  caption: string;
  screen: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {screen}
      <div className="mt-7 md:mt-8 text-white text-[18px] md:text-[20px] font-semibold tracking-[-0.01em]">
        {title}
      </div>
      <div className="mt-2 text-[#9BA3B4] text-[13.5px] md:text-[14.5px] leading-[1.55] max-w-[260px]">
        {caption}
      </div>
    </div>
  );
}

function PhonePic({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[230px] md:w-[260px] aspect-[884/1498] rounded-[28px] bg-[#05070D] p-[5px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="absolute -inset-[1px] rounded-[29px] ring-1 ring-white/[0.04] pointer-events-none" />
      <div className="relative h-full w-full rounded-[24px] overflow-hidden bg-[#0B0E17]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 260px, 230px"
          loading="lazy"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/* ─── Section screens: Missions, Learning, Sky, Chat ─────────────── */

function MissionsScreen() {
  const targets = [
    { name: 'Moon',      stars: 50,  img: '/sky/targets/moon.jpg' },
    { name: 'Jupiter',   stars: 75,  img: '/sky/targets/jupiter.jpg' },
    { name: 'Pleiades',  stars: 60,  img: '/images/dso/m45.jpg' },
    { name: 'Orion',     stars: 100, img: '/sky/targets/m42.jpg' },
    { name: 'Saturn',    stars: 100, img: '/sky/targets/saturn.jpg' },
    { name: 'Andromeda', stars: 175, img: '/sky/targets/m31.jpg' },
  ];
  return (
    <PhoneFrame>
      <div className="flex flex-col pt-3">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Missions</span>
          <span className="text-[#FFD166] text-[9.5px] font-mono">2 / 7</span>
        </div>
        <div className="mt-1 text-white text-[14px] font-bold leading-tight">Seven targets.</div>
        <div className="text-white/50 text-[10px]">All seven → free telescope</div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {targets.map((t) => (
            <div key={t.name} className="rounded-[8px] overflow-hidden bg-white/[0.04] border border-white/10">
              <div className="relative aspect-[16/10]">
                <Image src={t.img} alt={t.name} fill sizes="120px" className="object-cover" />
              </div>
              <div className="px-1.5 py-1 flex items-center justify-between">
                <span className="text-white text-[9.5px] font-medium leading-none">{t.name}</span>
                <span className="text-[#FFD166] text-[8.5px] font-mono">+{t.stars}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

function LearnScreen() {
  const planets = [
    { name: 'Moon',    img: '/images/planets/moon.jpg' },
    { name: 'Mercury', img: '/images/planets/mercury.jpg' },
    { name: 'Venus',   img: '/images/planets/venus.jpg' },
    { name: 'Mars',    img: '/images/planets/mars.jpg' },
    { name: 'Jupiter', img: '/images/planets/jupiter.jpg' },
    { name: 'Saturn',  img: '/images/planets/saturn.jpg' },
    { name: 'Uranus',  img: '/images/planets/uranus.jpg' },
    { name: 'Neptune', img: '/images/planets/neptune.jpg' },
  ];
  return (
    <PhoneFrame>
      <div className="flex flex-col pt-3">
        <div className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Learn</div>
        <div className="mt-1 text-white text-[14px] font-bold leading-tight">Solar System</div>
        <div className="text-white/50 text-[10px]">9 objects · tap to explore</div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {planets.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1">
              <div className="relative w-full aspect-square rounded-[8px] overflow-hidden bg-black/30">
                <Image src={p.img} alt={p.name} fill sizes="60px" className="object-cover" />
              </div>
              <span className="text-white/80 text-[8.5px] leading-none">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-[10px] bg-white/[0.04] border border-white/10 px-2.5 py-2">
          <div className="text-white/60 text-[9px] font-mono uppercase tracking-wider">Quizzes</div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-white">Constellations</span>
            <span className="text-[#FFD166] font-mono">+100 ★</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function SkyScreen() {
  const days = [
    { d: 'Mon', label: 'Go',    color: '#10B981' },
    { d: 'Tue', label: 'Go',    color: '#10B981' },
    { d: 'Wed', label: 'Maybe', color: '#FFD166' },
    { d: 'Thu', label: 'Skip',  color: '#94A3B8' },
    { d: 'Fri', label: 'Go',    color: '#10B981' },
    { d: 'Sat', label: 'Maybe', color: '#FFD166' },
    { d: 'Sun', label: 'Go',    color: '#10B981' },
  ];
  return (
    <PhoneFrame>
      <div className="flex flex-col pt-3">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Tbilisi</span>
          <span className="text-[#5EEAD4] text-[9.5px] font-mono">Tonight: Go</span>
        </div>
        <div className="mt-1 text-white text-[14px] font-bold leading-tight">7-day forecast</div>

        <div className="mt-3 flex flex-col gap-1.5">
          {days.map((d, i) => (
            <div key={d.d} className="flex items-center gap-2">
              <span className="text-white/55 text-[9.5px] font-mono w-6">{d.d}</span>
              <div className="flex-1 h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${[88, 82, 60, 28, 90, 55, 84][i]}%`, background: d.color }}
                />
              </div>
              <span
                className="text-[8.5px] font-mono uppercase w-8 text-right"
                style={{ color: d.color }}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-[10px] bg-white/[0.04] border border-white/10 p-2">
          <div className="grid grid-cols-3 text-[9px] text-white/55 font-mono uppercase">
            <span>Cloud</span><span>Moon</span><span>Seeing</span>
          </div>
          <div className="grid grid-cols-3 text-[10px] text-white mt-0.5">
            <span>14%</span><span>22%</span><span>Good</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ─── Brand wordmarks ────────────────────────────────────────────── */

function BrandLogo({ name }: { name: 'astroman' | 'bresser' | 'celestron' | 'levenhuk' }) {
  if (name === 'astroman') {
    return (
      <span
        className="text-white/80 leading-none whitespace-nowrap"
        style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 600, letterSpacing: '0.18em' }}
      >
        ASTROMAN
      </span>
    );
  }
  if (name === 'bresser') {
    return (
      <span
        className="inline-flex items-baseline gap-1.5 text-white/80 leading-none whitespace-nowrap"
        style={{ fontFamily: '"Public Sans", system-ui, sans-serif', fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 800, letterSpacing: '-0.01em' }}
      >
        BRESSER
        <svg viewBox="0 0 12 12" className="w-[9px] h-[9px] self-start mt-[3px]" fill="currentColor" aria-hidden="true">
          <path d="M6 0l1.5 4.2L12 4.6l-3.5 2.9L9.7 12 6 9.4 2.3 12l1.2-4.5L0 4.6l4.5-.4z" />
        </svg>
      </span>
    );
  }
  if (name === 'celestron') {
    return (
      <span
        className="text-white/80 leading-none whitespace-nowrap"
        style={{ fontFamily: '"Public Sans", system-ui, sans-serif', fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.015em' }}
      >
        CELESTRON
      </span>
    );
  }
  return (
    <span
      className="text-white/80 leading-none whitespace-nowrap"
      style={{ fontFamily: '"Public Sans", system-ui, sans-serif', fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 300, letterSpacing: '0.24em' }}
    >
      LEVENHUK
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="bg-[#0A1735] text-white -mt-14 pt-14 overflow-x-hidden">

      {/* ============================================================
          HERO
         ============================================================ */}
      <section className="relative px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden">
        {/* radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 70% 50%, rgba(255, 209, 102, 0.10) 0%, transparent 50%), radial-gradient(circle at 30% 60%, rgba(176, 127, 232, 0.08) 0%, transparent 50%)',
          }}
        />
        {/* faint star field */}
        <svg
          className="absolute inset-0 pointer-events-none opacity-50 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1200 700"
        >
          <g fill="#FFFFFF">
            <circle cx="100"  cy="80"  r="0.8" opacity="0.6" />
            <circle cx="240"  cy="160" r="1.2" opacity="0.8" />
            <circle cx="380"  cy="60"  r="0.6" opacity="0.5" />
            <circle cx="520"  cy="220" r="1.4" opacity="0.7" />
            <circle cx="700"  cy="90"  r="0.8" opacity="0.6" />
            <circle cx="880"  cy="180" r="1.0" opacity="0.7" />
            <circle cx="1050" cy="120" r="0.6" opacity="0.5" />
            <circle cx="60"   cy="320" r="1.0" opacity="0.6" />
            <circle cx="200"  cy="420" r="0.6" opacity="0.4" />
            <circle cx="340"  cy="500" r="1.2" opacity="0.7" />
            <circle cx="480"  cy="380" r="0.8" opacity="0.5" />
            <circle cx="620"  cy="540" r="1.4" opacity="0.8" />
            <circle cx="780"  cy="440" r="0.6" opacity="0.5" />
            <circle cx="940"  cy="500" r="1.0" opacity="0.6" />
            <circle cx="1100" cy="380" r="0.8" opacity="0.5" />
            <circle cx="160"  cy="600" r="0.8" opacity="0.6" />
            <circle cx="420"  cy="660" r="0.6" opacity="0.4" />
            <circle cx="700"  cy="640" r="1.0" opacity="0.6" />
            <circle cx="1020" cy="640" r="0.8" opacity="0.5" />
          </g>
        </svg>

        <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-10 md:gap-12 items-center">
          <div>
            <h1 className="text-[36px] md:text-[72px] font-extrabold leading-[1.05] md:leading-[1] tracking-[-0.025em] text-white mb-5 md:mb-8">
              Find every{' '}
              <span className="bg-gradient-to-r from-[#B07FE8] to-[#38F0FF] bg-clip-text text-transparent">
                planet
              </span>
              . Earn rewards.
            </h1>

            <p className="text-[15px] md:text-[18px] leading-[1.65] text-[#9BA3B4] mb-7 md:mb-9 max-w-[480px]">
              Real-time sky positions from your location. Photograph what you find, redeem Stars for telescopes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-[460px]">
              <Link
                href="/missions"
                className="flex-1 inline-flex items-center justify-center px-8 py-[18px] text-white font-semibold text-[15px] tracking-[0.005em] rounded-[14px] no-underline transition-all active:translate-y-[0.5px] hover:brightness-[1.08]"
                style={{
                  fontFamily: 'var(--font-cta, var(--font-body))',
                  background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                  boxShadow: '0 10px 32px rgba(91, 108, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
                }}
              >
                Start observing
              </Link>
              <Link
                href="/sky"
                className="btn-sky-watcher group flex-1 inline-flex items-center justify-center gap-2 px-8 py-[18px] text-white font-semibold text-[15px] tracking-[0.005em] whitespace-nowrap rounded-[14px] no-underline transition-all active:translate-y-[0.5px] hover:bg-[#1C2235]"
                style={{
                  fontFamily: 'var(--font-cta, var(--font-body))',
                  background: '#161A28',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                Sky watcher
                <span aria-hidden className="relative inline-flex w-[18px] h-[18px] flex-shrink-0">
                  <svg viewBox="0 0 18 18" className="absolute inset-0 w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6 L6 4 L9 7 L12 4 L15 6" pathLength="100" stroke="#5EEAD4" strokeWidth="0.7" className="constellation-line" />
                    <circle cx="3" cy="6" r="0.7" fill="#E2F8FF" className="constellation-star const-s1" />
                    <circle cx="6" cy="4" r="0.7" fill="#E2F8FF" className="constellation-star const-s2" />
                    <circle cx="12" cy="4" r="0.7" fill="#E2F8FF" className="constellation-star const-s3" />
                    <circle cx="15" cy="6" r="0.7" fill="#E2F8FF" className="constellation-star const-s4" />
                    <circle cx="9" cy="7" r="2" fill="#FFD166" className="constellation-glow" />
                    <circle cx="9" cy="7" r="1" fill="#FFD166" className="constellation-anchor" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          {/* hero instrument panel */}
          <div className="hidden md:flex relative items-center justify-center">
            <HeroSkyPanel />
          </div>
        </div>

        {/* loyalty stats + brand partners — minimal, centered */}
        <div className="relative max-w-[960px] mx-auto mt-14 md:mt-24">
          {/* stats row */}
          <div className="grid grid-cols-3 md:divide-x md:divide-white/[0.06]">
            <LedgerStat
              label="Customers"
              value="60K"
              suffix="+"
              meta="Across Georgia"
            />
            <LedgerStat
              label="Years"
              value="7"
              meta="Since 2019"
            />
            <LedgerStat
              label="Brands"
              value="4"
              meta="Authorized dealer"
            />
          </div>

          {/* logo wall */}
          <div className="mt-2 md:mt-4 grid grid-cols-2 md:grid-cols-4 items-center gap-y-2 md:gap-y-0">
            <PartnerLogo
              src="/brand-partners/astroman.png"
              alt="Astroman"
              width={640}
              height={169}
              filter="invert(1) brightness(1.05)"
            />
            <PartnerLogo
              src="/brand-partners/bresser.svg"
              alt="Bresser"
              width={290}
              height={60}
              filter="brightness(0) invert(0.85)"
            />
            <PartnerLogo
              src="/brand-partners/celestron.png"
              alt="Celestron"
              width={500}
              height={76}
            />
            <PartnerLogo
              src="/brand-partners/levenhuk.svg"
              alt="Levenhuk"
              width={300}
              height={60}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <Eyebrow>Get Started</Eyebrow>
            <SectionTitle>How It Works</SectionTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            <HowStep
              title="Sign in"
              caption="Email or Google. Wallet appears silently."
              screen={<PhonePic src="/landing/login.png" alt="Sign in to Stellar" />}
            />
            <HowStep
              title="Complete missions"
              caption="Photograph each target. We verify the night."
              screen={<PhonePic src="/landing/missions.png" alt="Tonight's mission: Jupiter" />}
            />
            <HowStep
              title="Earn rewards"
              caption="Stars for every discovery. Spend at real shops."
              screen={<PhonePic src="/landing/stars.png" alt="Your Stars and discoveries" />}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          SKY MISSIONS — phone + tight list
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>Missions</Eyebrow>
            <SectionTitle>
              Seven targets,
              <br />
              one telescope.
            </SectionTitle>
            <SectionSub>
              Photograph each. Earn Stars. Complete all seven — get a free telescope.
            </SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-1 md:order-1 mx-auto">
              <MissionsScreen />
            </div>
            <div className="order-2 md:order-2">
              <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {HERO_MISSIONS.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 md:py-2.5">
                    <div className="min-w-0">
                      <div className="text-white text-[12px] md:text-[13px] font-semibold leading-tight">{m.name}</div>
                      <div className="text-[#9BA3B4] text-[10px] md:text-[11px] font-mono uppercase tracking-[0.06em] mt-0.5">
                        {m.equip} · {m.diff}
                      </div>
                    </div>
                    <div className="text-[#FFD166] font-mono text-[10.5px] md:text-[11.5px] inline-flex items-center gap-1 tabular-nums">
                      <StarSparkle className="w-2.5 h-2.5" />+{m.stars}
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/missions"
                className="mt-4 md:mt-5 inline-flex items-center gap-2 text-[#FFD166] font-mono text-[11px] md:text-[12px] hover:gap-3 transition-all no-underline"
              >
                All seven · free telescope →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          LEARNING — phone + tight description
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px] bg-[#0E1428]/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>Learn</Eyebrow>
            <SectionTitle>Know what you&apos;re looking at.</SectionTitle>
            <SectionSub>
              Planets, deep-sky objects, constellations. Quizzes pay Stars.
            </SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-2 md:order-1 text-center md:text-left">
              <div className="grid gap-5 max-w-[420px] mx-auto md:mx-0">
                <div>
                  <div className="text-white text-[16px] md:text-[18px] font-semibold">9 planets, 10+ deep-sky objects</div>
                  <div className="text-[#9BA3B4] text-[13.5px] md:text-[14.5px] leading-[1.55] mt-1">
                    Real photos, what&apos;s visible tonight, when to look.
                  </div>
                </div>
                <div>
                  <div className="text-white text-[16px] md:text-[18px] font-semibold">5 quizzes · 10 questions each</div>
                  <div className="text-[#9BA3B4] text-[13.5px] md:text-[14.5px] leading-[1.55] mt-1">
                    100 Stars per quiz. Solar System, constellations, optics.
                  </div>
                </div>
                <div>
                  <div className="text-white text-[16px] md:text-[18px] font-semibold">Field guide</div>
                  <div className="text-[#9BA3B4] text-[13.5px] md:text-[14.5px] leading-[1.55] mt-1">
                    Find Andromeda by star-hopping. Choose your first telescope.
                  </div>
                </div>
              </div>
              <Link
                href="/learn"
                className="mt-7 md:mt-8 inline-flex items-center gap-2 text-[#FFD166] font-mono text-[13px] hover:gap-3 transition-all no-underline"
              >
                Open the field guide →
              </Link>
            </div>
            <div className="order-1 md:order-2 mx-auto">
              <LearnScreen />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CAPABILITIES — phone + compact features
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>Capabilities</Eyebrow>
            <SectionTitle>Plan every clear night.</SectionTitle>
            <SectionSub>Forecast, planet positions, AI companion. One app.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-1 mx-auto">
              <SkyScreen />
            </div>
            <div className="order-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-[#11172A] border border-white/[0.06] rounded-[14px] p-4 md:p-5">
                <IconTile tone="brass">
                  <StrokeIcon tone="brass">
                    <path d="M3 18c4-6 8-9 13-9s9 3 13 9" />
                    <path d="M3 18c4 6 8 9 13 9s9-3 13-9" />
                    <circle cx="16" cy="18" r="3" />
                  </StrokeIcon>
                </IconTile>
                <div className="text-white text-[15px] font-bold mb-1">7-day forecast</div>
                <div className="text-[#9BA3B4] text-[13px] leading-[1.5]">Cloud, moon, seeing. Go / Maybe / Skip.</div>
              </div>
              <div className="bg-[#11172A] border border-white/[0.06] rounded-[14px] p-4 md:p-5">
                <IconTile tone="purple">
                  <StrokeIcon tone="purple">
                    <circle cx="16" cy="16" r="13" />
                    <circle cx="16" cy="16" r="6" />
                    <circle cx="22" cy="11" r="1" fill="#B07FE8" />
                  </StrokeIcon>
                </IconTile>
                <div className="text-white text-[15px] font-bold mb-1">Planet tracker</div>
                <div className="text-[#9BA3B4] text-[13px] leading-[1.5]">Live altitude, rise/set, location-aware.</div>
              </div>
              <div className="bg-[#11172A] border border-white/[0.06] rounded-[14px] p-4 md:p-5">
                <IconTile tone="teal">
                  <StrokeIcon tone="teal">
                    <rect x="6" y="6" width="20" height="20" rx="4" />
                    <circle cx="12" cy="14" r="1.5" />
                    <circle cx="20" cy="14" r="1.5" />
                    <path d="M12 20c1 1.5 2.5 2.5 4 2.5s3-1 4-2.5" />
                  </StrokeIcon>
                </IconTile>
                <div className="text-white text-[15px] font-bold mb-1">ASTRA AI</div>
                <div className="text-[#9BA3B4] text-[13px] leading-[1.5]">Ask what&apos;s up. Get a plan for tonight.</div>
              </div>
              <div className="bg-[#11172A] border border-white/[0.06] rounded-[14px] p-4 md:p-5">
                <IconTile tone="brass">
                  <StrokeIcon tone="brass">
                    <circle cx="16" cy="16" r="12" />
                    <path d="M9 16l5 5 9-9" />
                  </StrokeIcon>
                </IconTile>
                <div className="text-white text-[15px] font-bold mb-1">On-chain proof</div>
                <div className="text-[#9BA3B4] text-[13px] leading-[1.5]">Each observation: a compressed NFT. Gasless.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BUILT ON ASTROMAN — logos + 3 bullets
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px] bg-[#0E1428]/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <Eyebrow>Distribution</Eyebrow>
            <SectionTitle>Built on top of Astroman.</SectionTitle>
            <SectionSub>Real shop. Real inventory. Real partners.</SectionSub>
          </div>

          {/* logo wall */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 border-y border-white/[0.07] py-8 md:py-10 mb-10 md:mb-14">
            <div className="flex items-center justify-center md:border-r md:border-white/[0.06] md:px-4">
              <BrandLogo name="astroman" />
            </div>
            <div className="flex items-center justify-center md:border-r md:border-white/[0.06] md:px-4">
              <BrandLogo name="bresser" />
            </div>
            <div className="flex items-center justify-center md:border-r md:border-white/[0.06] md:px-4">
              <BrandLogo name="celestron" />
            </div>
            <div className="flex items-center justify-center md:px-4">
              <BrandLogo name="levenhuk" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            <div className="text-center md:text-left">
              <div className="font-mono text-[28px] md:text-[36px] font-bold text-white tabular-nums leading-none">60K+</div>
              <div className="text-white text-[14px] md:text-[15px] font-semibold mt-2.5">Astroman customers</div>
              <div className="text-[#9BA3B4] text-[13px] md:text-[13.5px] leading-[1.55] mt-1">Seven years. Physical store in Tbilisi.</div>
            </div>
            <div className="text-center md:text-left">
              <div className="font-mono text-[28px] md:text-[36px] font-bold text-white tabular-nums leading-none">3</div>
              <div className="text-white text-[14px] md:text-[15px] font-semibold mt-2.5">Brand partners</div>
              <div className="text-[#9BA3B4] text-[13px] md:text-[13.5px] leading-[1.55] mt-1">Authorized dealer for Bresser, Celestron, and Levenhuk.</div>
            </div>
            <div className="text-center md:text-left">
              <div className="font-mono text-[28px] md:text-[36px] font-bold text-white tabular-nums leading-none">0</div>
              <div className="text-white text-[14px] md:text-[15px] font-semibold mt-2.5">Drop-shipping promises</div>
              <div className="text-[#9BA3B4] text-[13px] md:text-[13.5px] leading-[1.55] mt-1">Stars redeem for gear users pick up in store.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          COMPARISON — two visual cards, no table
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>The Difference</Eyebrow>
            <SectionTitle>Other apps vs Stellar.</SectionTitle>
            <SectionSub>Plenty show the sky. One closes the loop.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-[920px] mx-auto">
            {/* generic */}
            <div className="bg-[#0E1426] border border-white/[0.06] rounded-[18px] p-6 md:p-8">
              <div className="text-[#6B7385] text-[11px] uppercase tracking-[0.22em] mb-4">Generic astronomy app</div>
              <ul className="space-y-3">
                {['Sky chart', 'Static planet positions', 'No verification', 'No rewards', 'No real gear'].map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-[#9BA3B4] text-[14px] md:text-[15px]">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#EF4444]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            {/* stellar */}
            <div className="relative bg-gradient-to-b from-[rgba(255,209,102,0.05)] to-[#11172A] border border-[rgba(255,209,102,0.25)] rounded-[18px] p-6 md:p-8">
              <div className="text-[#FFD166] text-[11px] uppercase tracking-[0.22em] mb-4">Stellar</div>
              <ul className="space-y-3">
                {[
                  '7-day Open-Meteo forecast',
                  'Live planet altitude · location-aware',
                  'Photo + sky oracle + on-chain proof',
                  'Stars for every observation',
                  'Redeem for telescopes at Astroman',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-white text-[14px] md:text-[15px]">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#10B981]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          VISION — one line
         ============================================================ */}
      <section className="relative px-4 md:px-8 py-16 md:py-[120px] text-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(176,127,232,0.10) 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-[900px] mx-auto">
          <Eyebrow>The Vision</Eyebrow>
          <h2 className="text-[28px] md:text-[52px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white mb-5 md:mb-6">
            Astroman is the shop.
            <br />
            Stellar is{' '}
            <span className="bg-gradient-to-r from-[#B07FE8] to-[#38F0FF] bg-clip-text text-transparent">
              the on-chain layer for the night sky.
            </span>
          </h2>
          <p className="text-[14px] md:text-[17px] leading-[1.6] text-[#9BA3B4] max-w-[560px] mx-auto">
            Every smartphone is a telescope&apos;s starting point.
          </p>
        </div>
      </section>


      {/* ============================================================
          FINAL CTA
         ============================================================ */}
      <section className="px-6 md:px-8 py-20 md:py-[120px] text-center">
        <div className="max-w-[1200px] mx-auto">
          <Eyebrow>Get Started</Eyebrow>
          <h2 className="text-[28px] md:text-[60px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white mb-5 md:mb-8">
            The sky is open.
            <br />
            Take your first observation.
          </h2>
          <p className="text-[15px] md:text-[20px] leading-[1.6] text-[#9BA3B4] max-w-[640px] mx-auto mb-8 md:mb-12">
            Sign in with email. Your wallet appears silently. Step outside with the phone you already have,
            check tonight&apos;s sky, ask ASTRA what&apos;s visible — start with whichever speaks to you.
          </p>
          <div className="inline-flex flex-wrap gap-3.5 justify-center">
            <Link
              href="/missions"
              className="inline-flex items-center gap-2.5 px-9 text-white font-semibold text-[17px] rounded-[14px] transition-all hover:brightness-[1.08] active:translate-y-[0.5px] no-underline"
              style={{
                paddingTop: 18,
                paddingBottom: 18,
                fontFamily: 'var(--font-cta, var(--font-body))',
                background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                boxShadow: '0 12px 36px rgba(91, 108, 255, 0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Start observing
            </Link>
            <Link
              href="/sky"
              className="inline-flex items-center gap-2.5 px-9 text-white font-semibold text-[17px] rounded-[14px] transition-all hover:bg-[#1C2235] no-underline"
              style={{
                paddingTop: 18,
                paddingBottom: 18,
                fontFamily: 'var(--font-cta, var(--font-body))',
                background: '#161A28',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              Tonight&apos;s sky →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
