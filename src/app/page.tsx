import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import HomeHeroSaturn from '@/components/home/HomeHeroSaturn';
import TonightAtAGlance from '@/components/home/TonightAtAGlanceLazy';
import ComparisonTable from '@/components/home/ComparisonTable';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] md:text-[13px] font-semibold tracking-[0.22em] uppercase text-[#FFB347] mb-5">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="hidden md:block text-[30px] md:text-[56px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white mb-4 md:mb-6">
      {children}
    </h2>
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

function AchievementBadge({
  href,
  logoSrc,
  logoAlt,
  logoWidth,
  logoHeight,
  label,
  rank,
  date,
  color,
  linkLabel,
}: {
  href: string;
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  label: string;
  rank: string;
  date: string;
  color: string;
  linkLabel: string;
}) {
  const isSvg = logoSrc.endsWith('.svg');
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkLabel}
      className="home-achievement-card group flex flex-col items-center text-center min-w-0 flex-1 max-w-[300px] rounded-[16px] bg-white/[0.03] border border-white/[0.08] px-5 py-5 md:px-7 md:py-6 no-underline transition-colors hover:bg-white/[0.05] hover:[border-color:var(--accent-border)]"
      style={{
        ['--accent-border' as string]: `${color}66`,
      }}
    >
      <div className="home-achievement-logo flex items-center justify-center w-full min-h-[52px] md:min-h-[60px] mb-4 md:mb-5">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={logoWidth}
          height={logoHeight}
          unoptimized={isSvg}
          loading="lazy"
          className="home-achievement-image w-auto h-9 sm:h-10 md:h-12 max-w-[min(100%,220px)] opacity-95 group-hover:opacity-100 transition-opacity"
          style={{ width: 'auto', height: 'auto', maxHeight: '48px' }}
        />
      </div>
      <p className="home-achievement-label text-white text-[14px] md:text-[15px] font-semibold tracking-[-0.01em] leading-tight">
        {label}
      </p>
      <p className="home-achievement-rank text-[12px] md:text-[13px] font-semibold mt-1" style={{ color }}>
        {rank}
      </p>
      <p className="home-achievement-date text-white/40 font-mono text-[11px] mt-1 tabular-nums">{date}</p>
      <span className="home-achievement-arrow mt-3 text-[10px] font-mono text-white/25 group-hover:text-[#FFB347]/80 transition-colors">
        ↗
      </span>
    </a>
  );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[#FFB347] font-mono text-[11.5px] md:text-[12.5px] hover:gap-3 transition-all no-underline"
    >
      {children}
    </Link>
  );
}

/* ─── Unified iPhone chassis ─────────────────────────────────────────
   One frame, three sizes. Same titanium chassis, Dynamic Island,
   side buttons, status bar, home indicator and screen glare across
   every phone on the page so the visual language is consistent. */

type IPhoneSize = 'sm' | 'md' | 'lg';
type AppTab = 'sky' | 'missions' | 'home' | 'feed' | 'hub';

function TabIcon({
  kind,
  color,
  size,
  strokeWidth = 1.7,
}: {
  kind: AppTab;
  color: string;
  size: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'sky':
      return (
        <svg {...common}>
          <circle cx="7" cy="9" r="3" />
          <path d="M17 18a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A4.5 4.5 0 0 0 8 18z" />
        </svg>
      );
    case 'missions':
      return (
        <svg {...common}>
          <path d="M14.5 3a6 6 0 0 1 6.5 6.5 11 11 0 0 1-7 7l-3-3a11 11 0 0 1 7-7l-3.5-3.5z" />
          <path d="M7 14l-3 3 3 3 3-3" />
          <circle cx="15.5" cy="8.5" r="1.2" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'feed':
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
          <path d="M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7z" />
        </svg>
      );
    case 'hub':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
        </svg>
      );
  }
}

function PhoneTopBar({ size }: { size: IPhoneSize }) {
  const cfg =
    size === 'sm'
      ? { h: 22, logo: 7.5, icon: 10, padX: 8, gap: 5, mark: 9 }
      : size === 'md'
      ? { h: 28, logo: 9.5, icon: 13, padX: 10, gap: 7, mark: 12 }
      : { h: 34, logo: 11.5, icon: 15, padX: 12, gap: 9, mark: 14 };

  return (
    <div
      className="flex items-center justify-between bg-black"
      style={{
        height: cfg.h,
        paddingLeft: cfg.padX,
        paddingRight: cfg.padX,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center" style={{ gap: Math.max(4, cfg.gap * 0.55) }}>
        <span
          className="rounded-full flex items-center justify-center"
          style={{
            width: cfg.mark,
            height: cfg.mark,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <svg width={cfg.mark * 0.55} height={cfg.mark * 0.55} viewBox="0 0 12 12" fill="#FFB347">
            <path d="M6 1l1.5 3.5L11 5l-2.5 2L9 10.5 6 8.5 3 10.5l.5-3.5L1 5l3.5-.5z" />
          </svg>
        </span>
        <span
          className="font-semibold text-white"
          style={{
            fontSize: cfg.logo,
            letterSpacing: '0.18em',
            fontFamily: 'var(--font-display, ui-serif, Georgia, serif)',
            lineHeight: 1,
          }}
        >
          STELLAR
        </span>
      </div>
      <div className="flex items-center" style={{ gap: cfg.gap }}>
        <svg
          width={cfg.icon}
          height={cfg.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span
          className="rounded-full"
          style={{
            width: cfg.icon + 2,
            height: cfg.icon + 2,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        />
      </div>
    </div>
  );
}

function PhoneBottomNav({
  size,
  active,
  labels,
}: {
  size: IPhoneSize;
  active: AppTab;
  labels: Record<AppTab, string>;
}) {
  const cfg =
    size === 'sm'
      ? { h: 32, icon: 12, label: 6, gap: 1.5, dashW: 10, dashH: 1.2, padTop: 4 }
      : size === 'md'
      ? { h: 40, icon: 15, label: 7.5, gap: 2, dashW: 13, dashH: 1.5, padTop: 5 }
      : { h: 48, icon: 18, label: 9, gap: 2.5, dashW: 16, dashH: 1.6, padTop: 6 };

  const tabs: AppTab[] = ['sky', 'missions', 'home', 'feed', 'hub'];

  return (
    <div
      className="flex items-stretch bg-black"
      style={{
        height: cfg.h,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const isActive = t === active;
        const color = isActive ? '#FFB347' : 'rgba(255,255,255,0.42)';
        return (
          <div
            key={t}
            className="flex-1 flex flex-col items-center relative"
            style={{ paddingTop: cfg.padTop, gap: cfg.gap }}
          >
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: cfg.dashW,
                  height: cfg.dashH,
                  borderRadius: cfg.dashH,
                  background: '#FFB347',
                }}
              />
            )}
            <TabIcon kind={t} color={color} size={cfg.icon} strokeWidth={isActive ? 2 : 1.7} />
            <span
              style={{
                fontSize: cfg.label,
                color,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em',
                lineHeight: 1,
                fontFamily: 'var(--font-display, ui-sans-serif, system-ui)',
              }}
            >
              {labels[t]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function IPhone({
  size = 'md',
  image,
  imageAlt,
  imageSizes,
  activeTab = 'home',
  navLabels,
  children,
}: {
  size?: IPhoneSize;
  image?: string;
  imageAlt?: string;
  imageSizes?: string;
  activeTab?: AppTab;
  navLabels: Record<AppTab, string>;
  children?: React.ReactNode;
}) {
  const cfg =
    size === 'sm'
      ? {
          width: 'w-[170px] md:w-[200px]',
          chRound: 32, chPad: 3, scrRound: 28,
          statH: 24, txt: 7.5,
          islandW: 50, islandH: 14,
          contentPad: 'px-2.5 pt-1.5',
          imgSizes: '(min-width:768px) 200px, 170px',
          showSignal: false,
        }
      : size === 'md'
      ? {
          width: 'w-[230px] md:w-[260px]',
          chRound: 40, chPad: 3.5, scrRound: 36,
          statH: 30, txt: 9,
          islandW: 70, islandH: 18,
          contentPad: 'px-3 pt-2',
          imgSizes: '(min-width:768px) 260px, 230px',
          showSignal: true,
        }
      : {
          width: 'w-[260px] md:w-[300px]',
          chRound: 46, chPad: 4, scrRound: 42,
          statH: 36, txt: 10.5,
          islandW: 86, islandH: 22,
          contentPad: 'px-4 pt-2.5',
          imgSizes: '(min-width:768px) 300px, 260px',
          showSignal: true,
        };

  return (
    <div className={`relative mx-auto ${cfg.width}`}>
      {/* Outer titanium edge */}
      <div
        className="relative w-full"
        style={{
          padding: 1,
          borderRadius: cfg.chRound + 1,
          background: 'linear-gradient(145deg, #2A2E38 0%, #14171F 50%, #1F242E 100%)',
        }}
      >
      {/* Solid dark chassis */}
      <div
        className="relative w-full"
        style={{
          padding: cfg.chPad,
          borderRadius: cfg.chRound,
          background: '#05070C',
          boxShadow:
            '0 50px 100px -30px rgba(0,0,0,0.85), 0 20px 40px -20px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Screen */}
        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ borderRadius: cfg.scrRound }}
        >
          {/* Status bar */}
          <div
            className="relative flex items-center justify-between bg-black z-10"
            style={{
              height: cfg.statH,
              paddingLeft: Math.round(cfg.statH * 0.7),
              paddingRight: Math.round(cfg.statH * 0.7),
            }}
          >
            <span
              className="font-mono font-semibold text-white/95 tabular-nums z-10"
              style={{ fontSize: cfg.txt }}
            >
              9:41
            </span>

            {/* Dynamic Island */}
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
              style={{
                width: cfg.islandW,
                height: cfg.islandH,
                boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.04)',
              }}
            />

            <span className="flex items-center z-10" style={{ gap: Math.max(2, cfg.txt * 0.4) }}>
              {cfg.showSignal && (
                <svg
                  viewBox="0 0 18 10"
                  className="block"
                  style={{ width: cfg.txt * 1.5, height: cfg.txt * 0.85 }}
                  fill="white"
                  fillOpacity="0.9"
                >
                  <rect x="0"  y="6" width="3" height="4"  rx="0.6" />
                  <rect x="5"  y="4" width="3" height="6"  rx="0.6" />
                  <rect x="10" y="2" width="3" height="8"  rx="0.6" />
                  <rect x="15" y="0" width="3" height="10" rx="0.6" />
                </svg>
              )}
              <span className="relative flex items-center">
                <span
                  className="block rounded-[2px] border border-white/55"
                  style={{ width: cfg.txt * 2.2, height: cfg.txt * 1.1, padding: 1 }}
                >
                  <span className="block w-[72%] h-full rounded-[1px] bg-white/85" />
                </span>
                <span
                  className="block rounded-r-[1px] bg-white/55"
                  style={{ marginLeft: 1, width: 1.5, height: cfg.txt * 0.45 }}
                />
              </span>
            </span>
          </div>

          {/* Content area — image OR mockup children with app chrome */}
          {image ? (
            <div className="relative w-full" style={{ aspectRatio: '884 / 1498' }}>
              <Image
                src={image}
                alt={imageAlt ?? ''}
                fill
                sizes={imageSizes ?? cfg.imgSizes}
                loading="lazy"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="relative w-full flex flex-col bg-gradient-to-b from-[#0A1735] to-[#0F1424]"
              style={{ aspectRatio: '884 / 1498' }}
            >
              <PhoneTopBar size={size} />
              <div className={`flex-1 min-h-0 overflow-hidden ${cfg.contentPad}`}>{children}</div>
              <PhoneBottomNav size={size} active={activeTab} labels={navLabels} />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ─── Mockup screens (rendered inside IPhone) ────────────────────── */

function MissionsScreen({ labels }: { labels: { label: string; title: string; sub: string } }) {
  const targets = [
    { name: 'Moon',      stars: 50,  img: '/sky/targets/moon.jpg',   done: true  },
    { name: 'Jupiter',   stars: 75,  img: '/sky/targets/jupiter.jpg', done: true  },
    { name: 'Pleiades',  stars: 60,  img: '/images/dso/m45.jpg',     done: false },
    { name: 'Orion',     stars: 100, img: '/sky/targets/m42.jpg',    done: false },
    { name: 'Saturn',    stars: 100, img: '/sky/targets/saturn.jpg', done: false },
    { name: 'Andromeda', stars: 175, img: '/sky/targets/m31.jpg',    done: false },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">{labels.label}</span>
        <span className="text-[#FFB347] text-[9.5px] font-mono tabular-nums">2 / 7</span>
      </div>
      <div className="mt-1 text-white text-[14px] font-bold leading-tight">{labels.title}</div>
      <div className="text-white/50 text-[10px]">{labels.sub}</div>

      <div className="mt-2 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-[#FFB347]" style={{ width: '28%' }} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {targets.map((t) => (
          <div
            key={t.name}
            className="rounded-[8px] overflow-hidden bg-white/[0.04] border border-white/10 relative"
          >
            <div className="relative aspect-[16/10]">
              <Image src={t.img} alt={t.name} fill sizes="120px" className="object-cover" />
              {t.done && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-[#5EEAD4] flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
            <div className="px-1.5 py-1 flex items-center justify-between">
              <span className="text-white text-[9.5px] font-medium leading-none">{t.name}</span>
              <span className="text-[#FFB347] text-[8.5px] font-mono tabular-nums">+{t.stars}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearnScreen({
  labels,
  planetNames,
}: {
  labels: {
    label: string;
    title: string;
    sub: string;
    featured: string;
    upTonight: string;
    quizLabel: string;
    quizSubject: string;
    jupiterName: string;
  };
  planetNames: Record<'moon' | 'mercury' | 'venus' | 'mars' | 'saturn' | 'uranus', string>;
}) {
  const planets = [
    { key: 'moon' as const,    img: '/images/planets/moon.jpg' },
    { key: 'mercury' as const, img: '/images/planets/mercury.jpg' },
    { key: 'venus' as const,   img: '/images/planets/venus.jpg' },
    { key: 'mars' as const,    img: '/images/planets/mars.jpg' },
    { key: 'saturn' as const,  img: '/images/planets/saturn.jpg' },
    { key: 'uranus' as const,  img: '/images/planets/uranus.jpg' },
  ];
  return (
    <div className="flex flex-col">
      <div className="text-white/60 text-[10px] font-mono uppercase tracking-wider">{labels.label}</div>
      <div className="mt-1 text-white text-[14px] font-bold leading-tight">{labels.title}</div>
      <div className="text-white/50 text-[10px]">{labels.sub}</div>

      <div className="mt-2.5 relative rounded-[10px] overflow-hidden border border-white/10">
        <div className="relative aspect-[16/9]">
          <Image src="/images/planets/jupiter.jpg" alt={labels.jupiterName} fill sizes="220px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
            <div>
              <div className="text-white text-[11px] font-bold leading-none">{labels.jupiterName}</div>
              <div className="text-white/70 text-[7.5px] font-mono mt-0.5 uppercase tracking-wider">{labels.upTonight}</div>
            </div>
            <span className="text-[#5EEAD4] text-[7.5px] font-mono uppercase tracking-wider">{labels.featured}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {planets.map((p) => (
          <div key={p.key} className="flex flex-col items-center gap-1">
            <div className="relative w-full aspect-square rounded-[8px] overflow-hidden bg-black/30">
              <Image src={p.img} alt={planetNames[p.key]} fill sizes="60px" className="object-cover" />
            </div>
            <span className="text-white/80 text-[8.5px] leading-none">{planetNames[p.key]}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-[10px] bg-white/[0.04] border border-white/10 px-2.5 py-1.5 flex items-center justify-between">
        <div>
          <div className="text-white/55 text-[8px] font-mono uppercase tracking-wider">{labels.quizLabel}</div>
          <div className="text-white text-[10px] leading-tight">{labels.quizSubject}</div>
        </div>
        <span className="text-[#FFB347] font-mono text-[9.5px] tabular-nums">+100 ★</span>
      </div>
    </div>
  );
}

function SkyMapScreen({ labels }: { labels: { location: string; visible: string; title: string } }) {
  const stars: Array<[number, number, number]> = [
    [22, 28, 0.5], [70, 22, 0.7], [82, 58, 0.5], [33, 72, 0.6],
    [60, 78, 0.7], [18, 56, 0.5], [55, 18, 0.5], [78, 80, 0.5],
    [44, 50, 0.4], [28, 42, 0.4], [62, 38, 0.5], [85, 40, 0.4],
    [40, 84, 0.4], [72, 65, 0.4], [25, 80, 0.4],
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">{labels.location}</span>
        <span className="text-[#5EEAD4] text-[8px] font-mono">{labels.visible}</span>
      </div>
      <div className="mt-0.5 text-white text-[11px] font-bold leading-tight">{labels.title}</div>

      <div className="relative mt-2 mx-auto w-full aspect-square">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <radialGradient id="domeBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a1430" />
              <stop offset="100%" stopColor="#05070D" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#domeBg)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />

          <text x="50" y="3.5" fill="rgba(255,255,255,0.45)" fontSize="3.5" textAnchor="middle" fontFamily="monospace">N</text>
          <text x="96.5" y="51.5" fill="rgba(255,255,255,0.45)" fontSize="3.5" textAnchor="middle" fontFamily="monospace">E</text>
          <text x="50" y="99" fill="rgba(255,255,255,0.45)" fontSize="3.5" textAnchor="middle" fontFamily="monospace">S</text>
          <text x="3.5" y="51.5" fill="rgba(255,255,255,0.45)" fontSize="3.5" textAnchor="middle" fontFamily="monospace">W</text>

          {stars.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity={0.4 + (i % 3) * 0.15} />
          ))}

          <circle cx="38" cy="42" r="3.2" fill="none" stroke="#FFB347" strokeWidth="0.5" opacity="0.6" />
          <circle cx="38" cy="42" r="1.8" fill="#FFB347" />
          <text x="38" y="36" fill="#FFB347" fontSize="3" textAnchor="middle" fontFamily="monospace" fontWeight="bold">JUP</text>

          <circle cx="65" cy="55" r="1.4" fill="#B07FE8" />
          <text x="65" y="50" fill="#B07FE8" fontSize="2.6" textAnchor="middle" fontFamily="monospace">SAT</text>

          <circle cx="48" cy="68" r="2.6" fill="#E2F8FF" opacity="0.85" />
          <circle cx="76" cy="34" r="1.2" fill="#FFE0A3" />
        </svg>
      </div>
    </div>
  );
}

function SkyARScreen({ labels }: { labels: { label: string; jupiterName: string } }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">{labels.label}</span>
        <span className="text-[#FFB347] text-[8px] font-mono">SE 142°</span>
      </div>

      <div className="mt-2 relative flex-1 rounded-[10px] overflow-hidden bg-gradient-to-b from-[#0a1430] via-[#0f1a40] to-[#1a1030]">
        {Array.from({ length: 28 }).map((_, i) => {
          const x = (i * 37) % 100;
          const y = (i * 53) % 100;
          const r = i % 4 === 0 ? 0.7 : 0.35;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${r * 2}px`,
                height: `${r * 2}px`,
                opacity: 0.4 + (i % 3) * 0.2,
              }}
            />
          );
        })}

        <div className="absolute top-1.5 left-0 right-0 flex justify-center text-[6.5px] font-mono text-white/40 gap-2.5">
          <span>N</span><span>NE</span><span className="text-white">E</span><span>SE</span><span>S</span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-[42px] h-[42px] rounded-full border border-[#FFB347]/70" />
            <div className="absolute inset-0 m-auto w-[7px] h-[7px] rounded-full bg-[#FFB347] shadow-[0_0_10px_#FFB347]" />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-[#FFB347]/70" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-px h-2 bg-[#FFB347]/70" />
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-px w-2 bg-[#FFB347]/70" />
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-px w-2 bg-[#FFB347]/70" />
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
              <div className="text-[#FFB347] text-[9px] font-bold leading-none">{labels.jupiterName}</div>
              <div className="text-white/55 text-[7px] font-mono mt-0.5">alt 38° · mag −2.1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type SkyEventKind = 'lunar' | 'solar' | 'meteors' | 'opp' | 'conj';

function EventGlyph({ kind }: { kind: SkyEventKind }) {
  switch (kind) {
    case 'lunar':
      return (
        <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" fill="#C84A2E" />
          <circle cx="4.6" cy="5" r="0.7" fill="rgba(0,0,0,0.28)" />
          <circle cx="6.8" cy="6.6" r="0.5" fill="rgba(0,0,0,0.22)" />
        </svg>
      );
    case 'solar':
      return (
        <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#FFE3A1" strokeWidth="1.1" />
          <circle cx="6" cy="6" r="2.8" fill="#0A1224" />
        </svg>
      );
    case 'meteors':
      return (
        <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="#FFE3A1" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="9.5" cy="2.5" r="1" fill="#FFE3A1" />
        </svg>
      );
    case 'opp':
      return (
        <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
          <ellipse cx="6" cy="6" rx="5.2" ry="1.3" fill="none" stroke="#F4D78A" strokeWidth="0.9" />
          <circle cx="6" cy="6" r="2.4" fill="#C89A3E" />
        </svg>
      );
    case 'conj':
      return (
        <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
          <circle cx="3.8" cy="6" r="1.8" fill="#C84A2E" />
          <circle cx="8.2" cy="6" r="2.2" fill="#C89A3E" />
        </svg>
      );
  }
}

function SkyEventsScreen({
  labels,
}: {
  labels: {
    label: string;
    next: string;
    title: string;
    colDate: string;
    colType: string;
    colMoon: string;
    typeConj: string;
    names: {
      lunar: string;
      lyrids: string;
      conj: string;
      perseids: string;
      solar: string;
      saturnOpp: string;
      geminids: string;
    };
  };
}) {
  const events: { kind: SkyEventKind; name: string; date: string; isNext?: boolean }[] = [
    { kind: 'lunar',   name: labels.names.lunar,     date: 'Mar 3' },
    { kind: 'meteors', name: labels.names.lyrids,    date: 'Apr 22' },
    { kind: 'conj',    name: labels.names.conj,      date: 'May 12', isNext: true },
    { kind: 'meteors', name: labels.names.perseids,  date: 'Aug 12' },
    { kind: 'solar',   name: labels.names.solar,     date: 'Aug 12' },
    { kind: 'opp',     name: labels.names.saturnOpp, date: 'Oct 4' },
    { kind: 'meteors', name: labels.names.geminids,  date: 'Dec 13' },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">{labels.label}</span>
        <span className="text-[#5EEAD4] text-[8px] font-mono">{labels.next}</span>
      </div>
      <div className="mt-0.5 text-white text-[11px] font-bold leading-tight">{labels.title}</div>

      <div className="mt-2 flex flex-col gap-[3px]">
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-[4px] px-1 py-[2px]"
            style={e.isNext ? { background: 'rgba(94, 234, 212, 0.10)' } : undefined}
          >
            <span className="shrink-0 w-3 h-3 flex items-center justify-center">
              <EventGlyph kind={e.kind} />
            </span>
            <span
              className="flex-1 text-[7.5px] tracking-tight truncate leading-none"
              style={{ color: e.isNext ? '#5EEAD4' : 'rgba(255,255,255,0.85)' }}
            >
              {e.name}
            </span>
            <span
              className="text-[7px] font-mono tabular-nums"
              style={{ color: e.isNext ? '#5EEAD4' : 'rgba(255,255,255,0.50)' }}
            >
              {e.date}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-[8px] bg-white/[0.04] border border-white/10 p-1.5">
        <div className="grid grid-cols-3 text-[6.5px] text-white/55 font-mono uppercase">
          <span>{labels.colDate}</span><span>{labels.colType}</span><span>{labels.colMoon}</span>
        </div>
        <div className="grid grid-cols-3 text-[9px] text-white mt-0.5 font-mono">
          <span>May 12</span><span>{labels.typeConj}</span><span>4%</span>
        </div>
      </div>
    </div>
  );
}

function SignInScreen({ labels }: { labels: { title: string; subtitle: string; email: string; cta: string } }) {
  return (
    <div className="flex flex-col h-full justify-center px-1">
      <div className="text-center">
        <div className="mx-auto mb-2 w-8 h-8 rounded-full bg-[#FFB347]/15 border border-[#FFB347]/35 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB347" aria-hidden="true">
            <path d="M12 1l1.5 3.5L17 5l-2.5 2L15 10.5 12 8.5 9 10.5l.5-3.5L7 5l3.5-.5z" />
          </svg>
        </div>
        <div className="text-white text-[12px] font-bold leading-tight">{labels.title}</div>
        <div className="text-white/50 text-[8.5px] mt-0.5">{labels.subtitle}</div>
      </div>
      <div className="mt-3 rounded-[7px] bg-white/[0.05] border border-white/10 px-2 py-1.5 text-white/35 text-[8px]">
        {labels.email}
      </div>
      <div className="mt-2 rounded-[7px] bg-[#FFB347] text-[#0A1735] text-[8.5px] font-semibold text-center py-1.5">
        {labels.cta}
      </div>
    </div>
  );
}

function EarnStarsScreen({ labels }: { labels: { sealed: string; target: string; stars: string } }) {
  return (
    <div className="flex flex-col h-full justify-center items-center text-center px-1">
      <div className="w-10 h-10 rounded-full bg-[#5EEAD4]/15 border border-[#5EEAD4]/40 flex items-center justify-center mb-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="text-[#5EEAD4] text-[8px] font-mono uppercase tracking-wider">{labels.sealed}</div>
      <div className="text-white text-[13px] font-bold mt-1">{labels.target}</div>
      <div className="text-[#FFB347] font-mono text-[11px] font-semibold tabular-nums mt-2">{labels.stars}</div>
      <div className="mt-3 w-full rounded-[7px] bg-white/[0.04] border border-white/10 px-2 py-1.5 flex items-center justify-between">
        <span className="text-white/50 text-[7.5px]">Solana</span>
        <span className="text-[#5EEAD4] text-[7px] font-mono">✓ on-chain</span>
      </div>
    </div>
  );
}

// Compact step slide — a real app screenshot in a phone frame with a numbered
// badge + short caption. Sits in a horizontal snap carousel so the whole
// "how it works" fits in one screen on mobile (swipe through the three).
function PhoneStep({
  n,
  title,
  desc,
  img,
}: {
  n: string;
  title: string;
  desc: string;
  img: string;
}) {
  return (
    <div className="snap-center shrink-0 flex flex-col items-center">
      <div
        className="relative h-[268px] sm:h-[300px] rounded-[24px] overflow-hidden border border-white/[0.12] shrink-0"
        style={{ aspectRatio: '878 / 1480', boxShadow: '0 30px 60px -28px rgba(0,0,0,0.85), 0 0 44px -16px rgba(59,111,246,0.4)' }}
      >
        <Image src={img} alt={title} fill sizes="200px" className="object-cover" />
        <span
          className="absolute top-2.5 left-2.5 flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] font-bold tabular-nums"
          style={{ color: '#FFB347', background: 'rgba(8,7,4,0.8)', border: '1px solid rgba(255,179,71,0.5)', boxShadow: '0 0 10px rgba(255,179,71,0.3)' }}
        >
          {n}
        </span>
      </div>
      <h3 className="mt-3.5 text-white text-[15.5px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1 max-w-[185px] text-center text-[12.5px] leading-snug text-white/50">{desc}</p>
    </div>
  );
}

function SkyFeatureSlot({
  step,
  title,
  children,
}: {
  step?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {children}
      {step && (
        <div className="mt-5 md:mt-6 font-mono text-[10px] md:text-[10.5px] text-[#6B7385] tabular-nums tracking-[0.18em]">
          {step}
        </div>
      )}
      <div className={`${step ? 'mt-1' : 'mt-5 md:mt-6'} text-white text-[14px] md:text-[15.5px] font-semibold tracking-[-0.005em]`}>
        {title}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('homepage');
  const tNav = await getTranslations('nav');
  const tPlanets = await getTranslations('planets');

  const navLabels = {
    sky: tNav('sky'),
    missions: tNav('missions'),
    home: t('homeTabLabel'),
    feed: tNav('feed'),
    hub: tNav('hub'),
  } as const;

  const achievements = [
    {
      key: 'tether',
      color: '#16E3C1',
      href: 'https://superteam.fun/earn/listing/tether-frontier-hackathon-track',
      logoSrc: '/brand-partners/qvac.svg',
      logoAlt: 'QVAC by Tether',
      logoWidth: 218,
      logoHeight: 24,
      label: t('achievements.items.tether.label'),
      rank: t('achievements.items.tether.rank'),
      date: t('achievements.items.tether.date'),
      linkLabel: t('achievements.items.tether.linkLabel'),
    },
    {
      key: 'superteam',
      color: '#A78BFA',
      href: 'https://superteam.fun/earn/grants/solana-foundation-georgia-grants',
      logoSrc: '/brand-partners/superteam.webp',
      logoAlt: 'Superteam',
      logoWidth: 160,
      logoHeight: 48,
      label: t('achievements.items.superteam.label'),
      rank: t('achievements.items.superteam.rank'),
      date: t('achievements.items.superteam.date'),
      linkLabel: t('achievements.items.superteam.linkLabel'),
    },
  ] as const;

  const missionsLabels = {
    label: t('missions.screenLabel'),
    title: t('missions.screenTitle'),
    sub: t('missions.screenSub'),
  };

  const learnLabels = {
    label: t('learn.screenLabel'),
    title: t('learn.screenTitle'),
    sub: t('learn.screenSub'),
    featured: t('learn.featured'),
    upTonight: t('learn.upTonight'),
    quizLabel: t('learn.quizLabel'),
    quizSubject: t('learn.quizSubject'),
    jupiterName: tPlanets('jupiter'),
  };

  const planetNames = {
    moon: tPlanets('moon'),
    mercury: tPlanets('mercury'),
    venus: tPlanets('venus'),
    mars: tPlanets('mars'),
    saturn: tPlanets('saturn'),
    uranus: t('learn.uranus'),
  };

  const skyMapLabels = {
    location: t('skyPage.mapLocation'),
    visible: t('skyPage.mapVisible'),
    title: t('skyPage.mapTitle'),
  };

  const skyARLabels = {
    label: t('skyPage.arLabel'),
    jupiterName: tPlanets('jupiter'),
  };

  const skyEventsLabels = {
    label: t('skyPage.eventsLabel'),
    next: t('skyPage.eventsNext'),
    title: t('skyPage.eventsTitle'),
    colDate: t('skyPage.colDate'),
    colType: t('skyPage.colType'),
    colMoon: t('skyPage.colMoon'),
    typeConj: t('skyPage.typeConj'),
    names: {
      lunar: t('skyPage.eventNames.lunar'),
      lyrids: t('skyPage.eventNames.lyrids'),
      conj: t('skyPage.eventNames.conj'),
      perseids: t('skyPage.eventNames.perseids'),
      solar: t('skyPage.eventNames.solar'),
      saturnOpp: t('skyPage.eventNames.saturnOpp'),
      geminids: t('skyPage.eventNames.geminids'),
    },
  };

  return (
    <div className="home-font bg-[#0A1735] text-white -mt-14 overflow-x-hidden">

      {/* ============================================================
          HERO — Saturn parallax, screenshot redesign
         ============================================================ */}
      <HomeHeroSaturn />

      <section className="relative px-4 md:px-8 pt-14 md:pt-20 pb-2">
        <div className="relative max-w-[960px] mx-auto">
          <div className="text-center mb-5 md:mb-7 text-[10.5px] md:text-[11px] font-mono uppercase tracking-[0.22em] text-[#6B7385]">
            {t('partners')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 items-center gap-y-2 md:gap-y-0">
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
          ACHIEVEMENTS / NEWS
         ============================================================ */}
      <section className="px-4 md:px-8 pt-14 md:pt-20 pb-2">
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <Eyebrow>{t('achievements.eyebrow')}</Eyebrow>
          </div>

          <div className="home-achievements-grid grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {achievements.map((a) => (
              <AchievementBadge
                key={a.key}
                href={a.href}
                logoSrc={a.logoSrc}
                logoAlt={a.logoAlt}
                logoWidth={a.logoWidth}
                logoHeight={a.logoHeight}
                label={a.label}
                rank={a.rank}
                date={a.date}
                color={a.color}
                linkLabel={a.linkLabel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS — compact carousel of real app screenshots
         ============================================================ */}
      <section className="md:px-8 py-10 md:py-16">
        <div className="max-w-[1080px] mx-auto flex flex-col">
          <div className="text-center mb-7 md:mb-9 px-4">
            <Eyebrow>{t('howItWorks.eyebrow')}</Eyebrow>
          </div>

          <div className="flex gap-5 sm:gap-7 justify-start sm:justify-center overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 sm:px-0 pb-2">
            <PhoneStep n="1" title={t('howItWorks.step1')} desc={t('howItWorks.step1Desc')} img="/landing/login.png" />
            <PhoneStep n="2" title={t('howItWorks.step2')} desc={t('howItWorks.step2Desc')} img="/landing/missions.png" />
            <PhoneStep n="3" title={t('howItWorks.step3')} desc={t('howItWorks.step3Desc')} img="/landing/stars.png" />
          </div>

          <div className="mt-7 md:mt-9 text-center px-4">
            <SectionLink href="/missions">{t('howItWorks.cta')}</SectionLink>
          </div>
        </div>
      </section>

      {/* ============================================================
          MISSIONS
         ============================================================ */}
      <section className="relative px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>{t('missions.eyebrow')}</Eyebrow>
            <SectionTitle>{t('missions.title')}</SectionTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-1 mx-auto">
              <IPhone size="md" activeTab="missions" navLabels={navLabels}>
                <MissionsScreen labels={missionsLabels} />
              </IPhone>
            </div>
            <div className="order-2">
              {/* Mobile: phone + horizontal step grid (matches HOW IT WORKS) */}
              <div className="grid grid-cols-3 gap-x-3 w-full max-w-[420px] mx-auto md:hidden">
                {[t('missions.step1'), t('missions.step2'), t('missions.step3')].map((title) => (
                  <div key={title} className="text-center text-white text-[15px] font-semibold leading-tight tracking-[-0.005em]">
                    {title}
                  </div>
                ))}
              </div>
              {/* Desktop: divider list */}
              <ol className="hidden md:block divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {[t('missions.step1'), t('missions.step2'), t('missions.step3')].map((title) => (
                  <li key={title} className="py-3 md:py-4">
                    <div className="text-white text-[15px] md:text-[16.5px] font-semibold leading-tight tracking-[-0.005em]">
                      {title}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 md:mt-6 text-center md:text-left">
                <SectionLink href="/missions">{t('missions.cta')}</SectionLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          LEARN
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>{t('learn.eyebrow')}</Eyebrow>
            <SectionTitle>{t('learn.title')}</SectionTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-2 md:order-1 text-center md:text-left">
              {/* Mobile: phone + horizontal step grid (matches HOW IT WORKS) */}
              <div className="grid grid-cols-3 gap-x-3 w-full max-w-[420px] mx-auto md:hidden">
                {[t('learn.step1'), t('learn.step2'), t('learn.step3')].map((title) => (
                  <div key={title} className="text-center text-white text-[15px] font-semibold leading-tight tracking-[-0.005em]">
                    {title}
                  </div>
                ))}
              </div>
              {/* Desktop: divider list */}
              <ol className="hidden md:block divide-y divide-white/[0.06] border-y border-white/[0.06] text-left">
                {[t('learn.step1'), t('learn.step2'), t('learn.step3')].map((title) => (
                  <li key={title} className="py-3 md:py-4">
                    <div className="text-white text-[15px] md:text-[16.5px] font-semibold leading-tight tracking-[-0.005em]">
                      {title}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 md:mt-6">
                <SectionLink href="/learn">{t('learn.cta')}</SectionLink>
              </div>
            </div>
            <div className="order-1 md:order-2 mx-auto">
              <IPhone size="md" activeTab="hub" navLabels={navLabels}>
                <LearnScreen labels={learnLabels} planetNames={planetNames} />
              </IPhone>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SKY PAGE — four-up
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <Eyebrow>{t('skyPage.eyebrow')}</Eyebrow>
            <SectionTitle>{t('skyPage.title')}</SectionTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-8 md:gap-y-14 max-w-[920px] mx-auto">
            <SkyFeatureSlot title={t('skyPage.livePlanetMap')}>
              <IPhone size="sm" activeTab="sky" navLabels={navLabels}><SkyMapScreen labels={skyMapLabels} /></IPhone>
            </SkyFeatureSlot>
            <SkyFeatureSlot title={t('skyPage.arFinder')}>
              <IPhone size="sm" activeTab="sky" navLabels={navLabels}><SkyARScreen labels={skyARLabels} /></IPhone>
            </SkyFeatureSlot>
            <SkyFeatureSlot title={t('skyPage.events')}>
              <IPhone size="sm" activeTab="sky" navLabels={navLabels}><SkyEventsScreen labels={skyEventsLabels} /></IPhone>
            </SkyFeatureSlot>
          </div>

          <div className="mt-10 md:mt-16 text-center">
            <SectionLink href="/sky">{t('skyPage.cta')}</SectionLink>
          </div>
        </div>
      </section>

      {/* ============================================================
          MARKETPLACE
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <Eyebrow>{t('marketplace.eyebrow')}</Eyebrow>
            <SectionTitle>{t('marketplace.title')}</SectionTitle>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[
              {
                id: 'scope-bresser-76-300',
                name: 'Bresser Junior 76/300',
                spec: '76mm reflector · Beginner',
                price: '288',
                stars: '2,880',
                image: 'https://astroman.ge/wp-content/uploads/2024/11/222.jpg',
              },
              {
                id: 'scope-natgeo-60-700',
                name: 'NatGeo 60/700 AZ',
                spec: '60mm refractor · Alt-Az',
                price: '779',
                stars: '7,790',
                image: 'https://astroman.ge/wp-content/uploads/2025/11/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
              },
              {
                id: 'scope-foreseen-80',
                name: 'Foreseen 80mm Refractor',
                spec: '80mm aperture · Featured',
                price: '856',
                stars: '8,560',
                image: 'https://astroman.ge/wp-content/uploads/2024/08/Telescope.jpg',
              },
              {
                id: 'scope-nexstar-90slt',
                name: 'Celestron NexStar 90SLT',
                spec: '90mm GoTo · Advanced',
                price: '2,660',
                stars: '26,600',
                image: 'https://astroman.ge/wp-content/uploads/2024/11/1222.jpg',
              },
            ].map((p) => (
              <Link
                key={p.id}
                href={`/marketplace?product=${p.id}`}
                className="group flex flex-col rounded-[14px] bg-white/[0.025] border border-white/[0.07] p-3 md:p-4 hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors no-underline"
              >
                <div className="relative w-full aspect-[1.05] rounded-[10px] mb-3 md:mb-4 overflow-hidden bg-[#EFEAE0]">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 280px"
                    style={{ objectFit: 'contain', padding: '14px' }}
                    loading="lazy"
                  />
                </div>
                <div className="text-white text-[13.5px] md:text-[15px] font-semibold leading-[1.3] line-clamp-2">
                  {p.name}
                </div>
                <div className="text-[#6B7385] text-[12px] md:text-[12.5px] mt-1 leading-[1.4] line-clamp-1">
                  {p.spec}
                </div>
                <div className="flex items-baseline justify-between mt-3 md:mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="font-mono text-white tabular-nums text-[15px] md:text-[17px] font-bold">
                    {p.price}
                    <span className="text-[#9BA3B4] font-mono text-[12px] md:text-[13px] ml-0.5">
                      ₾
                    </span>
                  </span>
                  <span className="font-mono text-[#FFB347] tabular-nums text-[11px] md:text-[12px] tracking-[0.04em]">
                    ★ {p.stars}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 md:mt-12 text-center">
            <SectionLink href="/marketplace">{t('marketplace.cta')}</SectionLink>
          </div>
        </div>
      </section>

      {/* ============================================================
          TONIGHT AT A GLANCE
         ============================================================ */}
      <section className="px-4 md:px-8 py-12 md:py-20">
        <div className="max-w-[1040px] mx-auto">
          <div className="text-center mb-7 md:mb-10">
            <Eyebrow>{t('tonightAtAGlance.eyebrow')}</Eyebrow>
            <SectionTitle>{t('tonightAtAGlance.title')}</SectionTitle>
          </div>

          <TonightAtAGlance />
        </div>
      </section>

      {/* ============================================================
          COMPARISON
         ============================================================ */}
      <section className="px-4 md:px-8 py-16 md:py-[120px]">
        <div className="max-w-[880px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <Eyebrow>{t('comparison.eyebrow')}</Eyebrow>
            <SectionTitle>
              {t('comparison.title1')}
              <br />
              {t('comparison.title2')}
            </SectionTitle>
          </div>

          <ComparisonTable
            features={{
              skyMap: t('comparison.features.skyMap'),
              forecast: t('comparison.features.forecast'),
              astra: t('comparison.features.astra'),
              rewards: t('comparison.features.rewards'),
              marketplace: t('comparison.features.marketplace'),
            }}
            otherAppsLabel={t('comparison.otherApps')}
            stellarLabel={t('comparison.stellar')}
            footnote={t('comparison.footnote')}
          />
        </div>
      </section>

      {/* ============================================================
          COMMUNITY
         ============================================================ */}
      <section className="px-6 md:px-8 py-14 md:py-[120px] text-center">
        <div className="max-w-[1200px] mx-auto">
          <Eyebrow>{t('community.eyebrow')}</Eyebrow>
          <SectionTitle>{t('community.title')}</SectionTitle>
          <div className="mt-8 md:mt-12">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2.5 px-9 text-white font-semibold text-[17px] rounded-[14px] transition-all hover:brightness-[1.08] active:translate-y-[0.5px] no-underline"
              style={{
                paddingTop: 18,
                paddingBottom: 18,
                fontFamily: 'var(--font-cta, var(--font-body))',
                background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                boxShadow: '0 12px 36px rgba(91, 108, 255, 0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
              }}
            >
              {t('community.cta')}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
