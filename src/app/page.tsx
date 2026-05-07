import Image from 'next/image';
import Link from 'next/link';
import HeroSkyPanel from '@/components/home/HeroSkyPanelLazy';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] md:text-[13px] font-semibold tracking-[0.22em] uppercase text-[#FFD166] mb-5">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[30px] md:text-[56px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white mb-4 md:mb-6">
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] md:text-[18px] leading-[1.55] text-[#9BA3B4] max-w-[620px] mx-auto">
      {children}
    </p>
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

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[#FFD166] font-mono text-[11.5px] md:text-[12.5px] hover:gap-3 transition-all no-underline"
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
          <svg width={cfg.mark * 0.55} height={cfg.mark * 0.55} viewBox="0 0 12 12" fill="#FFD166">
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

function PhoneBottomNav({ size, active }: { size: IPhoneSize; active: AppTab }) {
  const cfg =
    size === 'sm'
      ? { h: 32, icon: 12, label: 6, gap: 1.5, dashW: 10, dashH: 1.2, padTop: 4 }
      : size === 'md'
      ? { h: 40, icon: 15, label: 7.5, gap: 2, dashW: 13, dashH: 1.5, padTop: 5 }
      : { h: 48, icon: 18, label: 9, gap: 2.5, dashW: 16, dashH: 1.6, padTop: 6 };

  const tabs: AppTab[] = ['sky', 'missions', 'home', 'feed', 'hub'];
  const labels: Record<AppTab, string> = {
    sky: 'Sky',
    missions: 'Missions',
    home: 'Home',
    feed: 'Feed',
    hub: 'Hub',
  };

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
        const color = isActive ? '#FFD166' : 'rgba(255,255,255,0.42)';
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
                  background: '#FFD166',
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
  children,
}: {
  size?: IPhoneSize;
  image?: string;
  imageAlt?: string;
  imageSizes?: string;
  activeTab?: AppTab;
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
              <PhoneBottomNav size={size} active={activeTab} />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ─── Mockup screens (rendered inside IPhone) ────────────────────── */

function MissionsScreen() {
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
        <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Missions</span>
        <span className="text-[#FFD166] text-[9.5px] font-mono tabular-nums">2 / 7</span>
      </div>
      <div className="mt-1 text-white text-[14px] font-bold leading-tight">Seven targets.</div>
      <div className="text-white/50 text-[10px]">Finish all seven → free telescope</div>

      <div className="mt-2 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-[#FFD166]" style={{ width: '28%' }} />
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
              <span className="text-[#FFD166] text-[8.5px] font-mono tabular-nums">+{t.stars}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearnScreen() {
  const planets = [
    { name: 'Moon',    img: '/images/planets/moon.jpg' },
    { name: 'Mercury', img: '/images/planets/mercury.jpg' },
    { name: 'Venus',   img: '/images/planets/venus.jpg' },
    { name: 'Mars',    img: '/images/planets/mars.jpg' },
    { name: 'Saturn',  img: '/images/planets/saturn.jpg' },
    { name: 'Uranus',  img: '/images/planets/uranus.jpg' },
  ];
  return (
    <div className="flex flex-col">
      <div className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Field guide</div>
      <div className="mt-1 text-white text-[14px] font-bold leading-tight">Solar System</div>
      <div className="text-white/50 text-[10px]">Tap a planet · take a quiz</div>

      <div className="mt-2.5 relative rounded-[10px] overflow-hidden border border-white/10">
        <div className="relative aspect-[16/9]">
          <Image src="/images/planets/jupiter.jpg" alt="Jupiter" fill sizes="220px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
            <div>
              <div className="text-white text-[11px] font-bold leading-none">Jupiter</div>
              <div className="text-white/70 text-[7.5px] font-mono mt-0.5 uppercase tracking-wider">Up tonight · 38°</div>
            </div>
            <span className="text-[#5EEAD4] text-[7.5px] font-mono uppercase tracking-wider">Featured</span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {planets.map((p) => (
          <div key={p.name} className="flex flex-col items-center gap-1">
            <div className="relative w-full aspect-square rounded-[8px] overflow-hidden bg-black/30">
              <Image src={p.img} alt={p.name} fill sizes="60px" className="object-cover" />
            </div>
            <span className="text-white/80 text-[8.5px] leading-none">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-[10px] bg-white/[0.04] border border-white/10 px-2.5 py-1.5 flex items-center justify-between">
        <div>
          <div className="text-white/55 text-[8px] font-mono uppercase tracking-wider">Quiz</div>
          <div className="text-white text-[10px] leading-tight">Constellations · 10 Q</div>
        </div>
        <span className="text-[#FFD166] font-mono text-[9.5px] tabular-nums">+100 ★</span>
      </div>
    </div>
  );
}

function SkyMapScreen() {
  const stars: Array<[number, number, number]> = [
    [22, 28, 0.5], [70, 22, 0.7], [82, 58, 0.5], [33, 72, 0.6],
    [60, 78, 0.7], [18, 56, 0.5], [55, 18, 0.5], [78, 80, 0.5],
    [44, 50, 0.4], [28, 42, 0.4], [62, 38, 0.5], [85, 40, 0.4],
    [40, 84, 0.4], [72, 65, 0.4], [25, 80, 0.4],
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">Tbilisi</span>
        <span className="text-[#5EEAD4] text-[8px] font-mono">7 visible</span>
      </div>
      <div className="mt-0.5 text-white text-[11px] font-bold leading-tight">Sky map</div>

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

          <circle cx="38" cy="42" r="3.2" fill="none" stroke="#FFD166" strokeWidth="0.5" opacity="0.6" />
          <circle cx="38" cy="42" r="1.8" fill="#FFD166" />
          <text x="38" y="36" fill="#FFD166" fontSize="3" textAnchor="middle" fontFamily="monospace" fontWeight="bold">JUP</text>

          <circle cx="65" cy="55" r="1.4" fill="#B07FE8" />
          <text x="65" y="50" fill="#B07FE8" fontSize="2.6" textAnchor="middle" fontFamily="monospace">SAT</text>

          <circle cx="48" cy="68" r="2.6" fill="#E2F8FF" opacity="0.85" />
          <circle cx="76" cy="34" r="1.2" fill="#FFE0A3" />
        </svg>
      </div>
    </div>
  );
}

function SkyARScreen() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">AR</span>
        <span className="text-[#FFD166] text-[8px] font-mono">SE 142°</span>
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
            <div className="w-[42px] h-[42px] rounded-full border border-[#FFD166]/70" />
            <div className="absolute inset-0 m-auto w-[7px] h-[7px] rounded-full bg-[#FFD166] shadow-[0_0_10px_#FFD166]" />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-[#FFD166]/70" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-px h-2 bg-[#FFD166]/70" />
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-px w-2 bg-[#FFD166]/70" />
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-px w-2 bg-[#FFD166]/70" />
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
              <div className="text-[#FFD166] text-[9px] font-bold leading-none">Jupiter</div>
              <div className="text-white/55 text-[7px] font-mono mt-0.5">alt 38° · mag −2.1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkyForecastScreen() {
  const days = [
    { d: 'M', label: 'Go',    color: '#5EEAD4', pct: 88 },
    { d: 'T', label: 'Go',    color: '#5EEAD4', pct: 82 },
    { d: 'W', label: 'Maybe', color: '#FFD166', pct: 60 },
    { d: 'T', label: 'Skip',  color: '#94A3B8', pct: 28 },
    { d: 'F', label: 'Go',    color: '#5EEAD4', pct: 90 },
    { d: 'S', label: 'Maybe', color: '#FFD166', pct: 55 },
    { d: 'S', label: 'Go',    color: '#5EEAD4', pct: 84 },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-[8px] font-mono uppercase tracking-wider">7 days</span>
        <span className="text-[#5EEAD4] text-[8px] font-mono">Tonight: Go</span>
      </div>
      <div className="mt-0.5 text-white text-[11px] font-bold leading-tight">Forecast</div>

      <div className="mt-2 flex flex-col gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-white/55 text-[8px] font-mono w-2.5">{d.d}</span>
            <div className="flex-1 h-[5px] rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
            </div>
            <span className="text-[7px] font-mono uppercase w-7 text-right" style={{ color: d.color }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 rounded-[8px] bg-white/[0.04] border border-white/10 p-1.5">
        <div className="grid grid-cols-3 text-[6.5px] text-white/55 font-mono uppercase">
          <span>Cloud</span><span>Moon</span><span>See</span>
        </div>
        <div className="grid grid-cols-3 text-[9px] text-white mt-0.5 font-mono">
          <span>14%</span><span>22%</span><span>Good</span>
        </div>
      </div>
    </div>
  );
}

function SkyFeatureSlot({
  step,
  title,
  caption,
  children,
}: {
  step?: string;
  title: string;
  caption: string;
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
      <div
        className="mt-1.5 text-[#9BA3B4] text-[12.5px] md:text-[13.5px] leading-[1.5] max-w-[180px]"
        dangerouslySetInnerHTML={{ __html: caption }}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-[#0A1735] text-white -mt-14 pt-14 overflow-x-hidden">

      {/* ============================================================
          HERO — solar system animation, do not modify
         ============================================================ */}
      <section className="relative px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 70% 50%, rgba(255, 209, 102, 0.10) 0%, transparent 50%), radial-gradient(circle at 30% 60%, rgba(176, 127, 232, 0.08) 0%, transparent 50%)',
          }}
        />
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

        <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-10 md:gap-12 items-center">
          <div>
            <h1 className="text-[36px] md:text-[72px] font-extrabold leading-[1.05] md:leading-[1] tracking-[-0.025em] text-white mb-5 md:mb-8">
              Find every{' '}
              <span className="bg-gradient-to-r from-[#B07FE8] to-[#5EEAD4] bg-clip-text text-transparent">
                planet
              </span>
              . Earn rewards.
            </h1>

            <p className="text-[15px] md:text-[18px] leading-[1.65] text-[#9BA3B4] mb-7 md:mb-9 max-w-[440px]">
              Find what&apos;s up tonight. Photograph it. Redeem Stars for a real telescope.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-[460px]">
              <Link
                href="/sky"
                className="flex-1 inline-flex items-center justify-center px-8 py-[18px] text-white/90 font-semibold text-[15px] tracking-[0.005em] rounded-[14px] no-underline transition-all active:translate-y-[0.5px] hover:bg-white/[0.06] hover:text-white"
                style={{
                  fontFamily: 'var(--font-cta, var(--font-body))',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                Start observing
              </Link>
              <Link
                href="/missions"
                className="flex-1 inline-flex items-center justify-center px-8 py-[18px] text-white font-semibold text-[15px] tracking-[0.005em] rounded-[14px] no-underline transition-all active:translate-y-[0.5px] hover:brightness-[1.08]"
                style={{
                  fontFamily: 'var(--font-cta, var(--font-body))',
                  background: 'linear-gradient(135deg, #FF8A1F 0%, #F25C05 100%)',
                  boxShadow: '0 10px 32px rgba(242, 92, 5, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                Earn stars
              </Link>
            </div>
          </div>

          <div className="hidden md:flex relative items-center justify-center">
            <HeroSkyPanel />
          </div>
        </div>

        <div className="relative max-w-[960px] mx-auto mt-14 md:mt-24">
          <div className="text-center mb-5 md:mb-7 text-[10.5px] md:text-[11px] font-mono uppercase tracking-[0.22em] text-[#6B7385]">
            Backed by Astroman — authorized dealer
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
          HOW IT WORKS
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>Three steps. One night.</SectionTitle>
            <SectionSub>Sign in, step outside, get rewarded for what you find.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-2 md:order-1">
              <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {[
                  { title: 'Sign in',       caption: 'Email or Google.' },
                  { title: 'Find a target', caption: 'We tell you where to look.' },
                  { title: 'Earn Stars',    caption: 'Redeem for real telescopes.' },
                ].map((s) => (
                  <li key={s.title} className="py-3.5 md:py-5">
                    <div className="text-white text-[16px] md:text-[19px] font-semibold leading-tight tracking-[-0.005em]">
                      {s.title}
                    </div>
                    <div className="text-[#9BA3B4] text-[13px] md:text-[14.5px] leading-[1.5] mt-1">
                      {s.caption}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 md:mt-6">
                <SectionLink href="/missions">Start observing →</SectionLink>
              </div>
            </div>
            <div className="order-1 md:order-2 mx-auto">
              <IPhone size="md" image="/landing/missions.png" imageAlt="Tonight's mission: Jupiter" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MISSIONS
         ============================================================ */}
      <section className="relative px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>Missions</Eyebrow>
            <SectionTitle>Seven targets. Free scope.</SectionTitle>
            <SectionSub>Stars are earned, not airdropped.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-1 mx-auto">
              <IPhone size="md" activeTab="missions">
                <MissionsScreen />
              </IPhone>
            </div>
            <div className="order-2">
              <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {[
                  { title: 'Pick a target',        caption: 'Sorted by what&rsquo;s up tonight.' },
                  { title: 'Photograph it',        caption: 'Phone clip works on any scope.' },
                  { title: 'Oracle verifies',      caption: 'Time + place must match.' },
                  { title: 'Stars in your wallet', caption: 'Finish all seven — scope is free.' },
                ].map((s) => (
                  <li key={s.title} className="py-3 md:py-4">
                    <div
                      className="text-white text-[15px] md:text-[16.5px] font-semibold leading-tight tracking-[-0.005em]"
                      dangerouslySetInnerHTML={{ __html: s.title }}
                    />
                    <div
                      className="text-[#9BA3B4] text-[13px] md:text-[14px] leading-[1.5] mt-1"
                      dangerouslySetInnerHTML={{ __html: s.caption }}
                    />
                  </li>
                ))}
              </ol>
              <div className="mt-5 md:mt-6">
                <SectionLink href="/missions">See all missions →</SectionLink>
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
            <Eyebrow>Learn</Eyebrow>
            <SectionTitle>Know what you&apos;re looking at.</SectionTitle>
            <SectionSub>Field guide free. Quizzes pay Stars.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center max-w-[1000px] mx-auto">
            <div className="order-2 md:order-1 text-center md:text-left">
              <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06] text-left">
                {[
                  { title: 'Tap an object',  caption: 'Real photos. Best time to see it.' },
                  { title: 'Read the guide', caption: 'How to find it. What you&rsquo;ll see.' },
                  { title: 'Take the quiz',  caption: '10 questions. 100 Stars per pass.' },
                ].map((s) => (
                  <li key={s.title} className="py-3 md:py-4">
                    <div
                      className="text-white text-[15px] md:text-[16.5px] font-semibold leading-tight tracking-[-0.005em]"
                      dangerouslySetInnerHTML={{ __html: s.title }}
                    />
                    <div
                      className="text-[#9BA3B4] text-[13px] md:text-[14px] leading-[1.5] mt-1"
                      dangerouslySetInnerHTML={{ __html: s.caption }}
                    />
                  </li>
                ))}
              </ol>
              <div className="mt-5 md:mt-6">
                <SectionLink href="/learn">Open the field guide →</SectionLink>
              </div>
            </div>
            <div className="order-1 md:order-2 mx-auto">
              <IPhone size="md" activeTab="hub">
                <LearnScreen />
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
            <Eyebrow>The Sky page</Eyebrow>
            <SectionTitle>Tonight, in three screens.</SectionTitle>
            <SectionSub>Can I go out? Where do I aim?</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-8 md:gap-y-14 max-w-[920px] mx-auto">
            <SkyFeatureSlot title="Live planet map" caption="Tap a planet to lock it.">
              <IPhone size="sm" activeTab="sky"><SkyMapScreen /></IPhone>
            </SkyFeatureSlot>
            <SkyFeatureSlot title="AR finder" caption="Walk the reticle onto target.">
              <IPhone size="sm" activeTab="sky"><SkyARScreen /></IPhone>
            </SkyFeatureSlot>
            <SkyFeatureSlot title="7-day forecast" caption="Skip cloudy nights.">
              <IPhone size="sm" activeTab="home"><SkyForecastScreen /></IPhone>
            </SkyFeatureSlot>
          </div>

          <div className="mt-10 md:mt-16 text-center">
            <SectionLink href="/sky">Open the Sky page →</SectionLink>
          </div>
        </div>
      </section>

      {/* ============================================================
          MARKETPLACE
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <Eyebrow>Marketplace</Eyebrow>
            <SectionTitle>The shop is in the app.</SectionTitle>
            <SectionSub>Pay by card, SOL, or the Stars you earned tonight.</SectionSub>
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
                  <span className="font-mono text-[#8B5CF6] tabular-nums text-[11px] md:text-[12px] tracking-[0.04em]">
                    ★ {p.stars}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 md:mt-12 text-center">
            <SectionLink href="/marketplace">Open the marketplace →</SectionLink>
          </div>
        </div>
      </section>

      {/* ============================================================
          COMPARISON
         ============================================================ */}
      <section className="px-4 md:px-8 py-14 md:py-[120px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Eyebrow>The difference</Eyebrow>
            <SectionTitle>SkySafari shows. Stellar pays.</SectionTitle>
            <SectionSub>Plenty show the sky. One closes the loop.</SectionSub>
          </div>

          <div className="max-w-[760px] mx-auto rounded-[18px] border border-white/[0.07] overflow-hidden bg-[#0F1A35]/50">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.07] bg-white/[0.02]">
              <div />
              <div className="text-[#6B7385] text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-center">SkySafari · Star Walk</div>
              <div className="text-[#FFD166] text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-center">Stellar</div>
            </div>
            {[
              { f: 'Sky chart',                them: true,  us: true  },
              { f: '7-day cloud forecast',     them: false, us: true  },
              { f: 'AR finder',                them: 'some', us: true },
              { f: 'Verified photo missions',  them: false, us: true  },
              { f: 'Earn rewards',             them: false, us: true  },
              { f: 'Redeem for real gear',     them: false, us: true  },
            ].map((row) => (
              <div key={row.f} className="grid grid-cols-[1.4fr_1fr_1fr] items-center px-4 md:px-6 py-3 md:py-3.5 border-b border-white/[0.05] last:border-b-0">
                <div className="text-white text-[13.5px] md:text-[15px]">{row.f}</div>
                <div className="flex justify-center">
                  {row.them === true ? (
                    <svg className="w-4 h-4 text-[#9BA3B4]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7" /></svg>
                  ) : row.them === 'some' ? (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9BA3B4]">Some</span>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#5C6478]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  )}
                </div>
                <div className="flex justify-center">
                  {row.us === true ? (
                    <svg className="w-4 h-4 text-[#5EEAD4]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#5C6478]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          VISION
         ============================================================ */}
      <section className="relative px-4 md:px-8 py-16 md:py-[120px] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(107,63,160,0.18) 0%, transparent 55%)',
          }}
        />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="text-center mb-14 md:mb-20">
            <Eyebrow>Vision</Eyebrow>
            <SectionTitle>
              Astroman is the shop.{' '}
              <span className="bg-gradient-to-r from-[#B07FE8] to-[#5EEAD4] bg-clip-text text-transparent">
                Stellar is the layer.
              </span>
            </SectionTitle>
            <SectionSub>Utility first. Crypto invisible.</SectionSub>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <div className="bg-[#0F1A35] border border-white/[0.07] rounded-[18px] p-6 md:p-8">
              <div className="text-[20px] md:text-[22px] font-bold text-white mb-3">Utility first</div>
              <p className="text-[14px] leading-[1.6] text-[#9BA3B4]">
                Real astronomy app. Email sign-in. No seed phrase, no gas.
              </p>
            </div>

            <div className="bg-[#0F1A35] border border-white/[0.07] rounded-[18px] p-6 md:p-8">
              <div className="text-[20px] md:text-[22px] font-bold text-white mb-3">Earned, not airdropped</div>
              <p className="text-[14px] leading-[1.6] text-[#9BA3B4]">
                Sky oracle proves the photo. Stars redeem for telescopes.
              </p>
            </div>

            <div className="bg-[#0F1A35] border border-white/[0.07] rounded-[18px] p-6 md:p-8">
              <div className="text-[20px] md:text-[22px] font-bold text-white mb-3">Open to every shop</div>
              <p className="text-[14px] leading-[1.6] text-[#9BA3B4]">
                Astroman today. Every dealer tomorrow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
         ============================================================ */}
      <section className="px-6 md:px-8 py-20 md:py-[120px] text-center">
        <div className="max-w-[1200px] mx-auto">
          <Eyebrow>Start tonight</Eyebrow>
          <SectionTitle>The sky is open.</SectionTitle>
          <p className="text-[15px] md:text-[18px] leading-[1.6] text-[#9BA3B4] max-w-[560px] mx-auto mb-8 md:mb-12">
            Sign in with email. Step outside. Take your first observation.
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
