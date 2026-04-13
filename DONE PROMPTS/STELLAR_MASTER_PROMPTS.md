# STELLAR — Master Design & UX Upgrade Prompts
## Unified Expert Edition · April 2026

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + Privy + Solana  
**Goal:** Take Stellar from 5/10 → 8/10 visual quality. Indistinguishable from a VC-backed consumer product.  
**Benchmark:** Phantom, DRiP, Moonwalk Fitness, Jupiter — the 8 best Solana consumer apps analyzed and distilled.

> **HOW TO USE:** One new Claude Code conversation per prompt. Run in the numbered order — each prompt assumes the previous ones are complete. Never skip ahead. Each prompt starts with "Read these files before writing anything" — this is non-negotiable.

> **WHAT THESE PROMPTS DO NOT TOUCH:** Blockchain logic, mint flows, Privy auth config, API business logic, Supabase schema. Design only. The only exception is U5 (Sky Score API route) and U11/U12 (Dashboard).

> **THE ONE RULE:** Stellar's brand color is teal `#38F0FF`. One accent. Gold `#FFD166` is for Stars token display ONLY — not for buttons, borders, or branding. Every app that looks premium commits to one color. Phantom uses purple. Jupiter uses green. We use teal.

---

## EXECUTION ORDER & IMPACT

| # | Prompt | What It Fixes | Judge Impact | Status |
|---|---|---|---|---|
| U1 | Token System + CSS Foundation | Everything looks inconsistent | Unblocks all others | ✅ Done |
| U2 | Core UI Components | No reusable component system | Foundation for all pages | ✅ Done |
| U3 | Skeleton Loading + Card System | Spinners look amateur | Instant polish | ✅ Done |
| U4 | Page Transitions | Jarring, static page loads | App feels native | ✅ Done |
| U5 | Sky Score Engine | No hero metric for the app | Data-driven credibility | ✅ Done |
| U6 | Landing Page Polish | First thing judges see | First impression | ✅ Done |
| U7 | Mission Cards | Flat list, no visual hierarchy | Core engagement visual | ✅ Done |
| U8 | NFT Gallery | No images, just text metadata | Proof of on-chain substance | ✅ Done |
| U9 | Profile Page | No rank badge, no progress ring | Core gamification visual | ✅ Done |
| U10 | ASTRA Chat Polish | Generic text box, no personality | AI feature quality | ✅ Done |
| U11 | Onboarding Quiz | New users see everything at once | Personalization + retention | — |
| U12 | Authenticated Dashboard | No personalized home screen | App-like experience | — |
| U13 | Mission Flow Visuals | Spinner-only minting flow | Critical path polish | — |
| U14 | Success Screen + Confetti | No celebration moment | The dopamine hit | — |
| U15 | Social Share Cards | No sharing mechanic | Viral loop | — |
| U16 | Daily Sky Check-In | No daily hook | Retention mechanic | — |

**Total time: ~8 hours of Claude Code execution. Expected result: Stellar looks and feels like a funded product.**

---

---

## PHASE 0 — FOUNDATION ✅ COMPLETE (2026-04-12)

---

### PROMPT U1 — Global Design Token System + CSS Foundation

```
I'm building Stellar, a Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 astronomy app on Solana. I need to establish the complete visual foundation: design tokens, typography, CSS variables, and global utility classes.

The context: Stellar is an astronomy app for telescope owners. Dark space theme. The UI quality should match Phantom wallet, DRiP, or Moonwalk Fitness — not a hackathon project. We benchmarked 8 top Solana consumer apps and distilled their patterns.

THE SINGLE MOST IMPORTANT RULE: Stellar has ONE primary accent color — teal #38F0FF. Not two. Not three. ONE. Gold (#FFD166) is ONLY used for the Stars token number display. Every professional app (Phantom=purple, Jupiter=green, DRiP=teal) commits to one brand color. We commit to teal.

Read these files before writing anything:
  tailwind.config.ts (or tailwind.config.js — check which exists)
  src/app/globals.css
  src/app/layout.tsx
  package.json (check current font setup)

---

Step 1 — Update tailwind.config:

Read the existing config file FULLY. Extend the theme (do not replace existing values). If using Tailwind CSS 4 with @theme inline syntax in globals.css, adapt accordingly.

Add these exact values under theme.extend:

colors:
  stellar: {
    bg: '#050810',
    base: '#070B14',
    surface: '#0D1117',
    card: '#111827',
    'card-hover': '#1a2332',
    elevated: '#1F2937',
  }
  accent: {
    DEFAULT: '#38F0FF',
    dim: 'rgba(56, 240, 255, 0.10)',
    glow: 'rgba(56, 240, 255, 0.20)',
    border: 'rgba(56, 240, 255, 0.25)',
  }
  stars: {
    DEFAULT: '#FFD166',
    dim: 'rgba(255, 209, 102, 0.12)',
  }
  border-subtle: 'rgba(255, 255, 255, 0.04)'
  border-default: 'rgba(255, 255, 255, 0.08)'
  border-strong: 'rgba(255, 255, 255, 0.14)'
  text-primary: '#F1F5F9'
  text-secondary: '#94A3B8'
  text-muted: 'rgba(255, 255, 255, 0.35)'

fontFamily:
  display: ['var(--font-display)', 'system-ui', 'sans-serif']
  body: ['var(--font-body)', 'system-ui', 'sans-serif']
  mono: ['var(--font-mono)', 'ui-monospace', 'monospace']

borderRadius:
  'xl': '16px'
  '2xl': '20px'
  '3xl': '24px'

keyframes:
  fadeIn:
    '0%': { opacity: '0', transform: 'translateY(8px)' }
    '100%': { opacity: '1', transform: 'translateY(0)' }
  slideUp:
    '0%': { opacity: '0', transform: 'translateY(20px)' }
    '100%': { opacity: '1', transform: 'translateY(0)' }
  scaleIn:
    '0%': { opacity: '0', transform: 'scale(0.94)' }
    '100%': { opacity: '1', transform: 'scale(1)' }
  shimmer:
    '0%': { backgroundPosition: '-200% center' }
    '100%': { backgroundPosition: '200% center' }
  glowPulse:
    '0%, 100%': { boxShadow: '0 0 5px rgba(56,240,255,0.2)' }
    '50%': { boxShadow: '0 0 20px rgba(56,240,255,0.5), 0 0 40px rgba(56,240,255,0.15)' }
  pulseDot:
    '0%, 100%': { opacity: '1', transform: 'scale(1)' }
    '50%': { opacity: '0.4', transform: 'scale(0.8)' }
  bounceDot:
    '0%, 80%, 100%': { transform: 'translateY(0)' }
    '40%': { transform: 'translateY(-6px)' }

animation:
  'fade-in': 'fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
  'slide-up': 'slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
  'scale-in': 'scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
  shimmer: 'shimmer 1.8s ease-in-out infinite'
  'glow-pulse': 'glowPulse 2.5s ease-in-out infinite'
  'pulse-dot': 'pulseDot 1.4s ease-in-out infinite'
  'bounce-dot': 'bounceDot 1.2s ease-in-out infinite'

---

Step 2 — Update src/app/layout.tsx:

Add Google Fonts via next/font/google at the top of the file:

  import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google'

  const jakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-display',
    weight: ['500', '600', '700', '800'],
    display: 'swap',
  })
  const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-body',
    weight: ['400', '500', '600'],
    display: 'swap',
  })
  const jetbrains = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    weight: ['400', '500'],
    display: 'swap',
  })

In the JSX, add all three font variables to the <html> or <body> className — append them, do NOT replace any existing classes:
  className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable} ...existing classes`}

---

Step 3 — Rewrite the :root block in src/app/globals.css:

Check if a :root block already exists. If so, merge into it. Do not create a duplicate.

:root {
  /* Backgrounds */
  --bg-deep: #050810;
  --bg-base: #070B14;
  --bg-surface: #0D1117;
  --bg-card: #111827;
  --bg-card-hover: #1a2332;
  --bg-elevated: #1F2937;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  /* Text */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: rgba(255, 255, 255, 0.35);
  --text-faint: rgba(255, 255, 255, 0.18);

  /* PRIMARY ACCENT — ONE COLOR — teal */
  --accent: #38F0FF;
  --accent-dim: rgba(56, 240, 255, 0.10);
  --accent-glow: rgba(56, 240, 255, 0.20);
  --accent-border: rgba(56, 240, 255, 0.25);

  /* Stars token — gold ONLY for ✦ Stars numbers */
  --stars: #FFD166;
  --stars-dim: rgba(255, 209, 102, 0.12);
  --stars-border: rgba(255, 209, 102, 0.20);

  /* Status colors — functional only, never brand */
  --success: #34D399;
  --success-dim: rgba(52, 211, 153, 0.12);
  --warning: #FBBF24;
  --warning-dim: rgba(251, 191, 36, 0.12);
  --error: #F87171;
  --error-dim: rgba(248, 113, 113, 0.12);

  /* Gradients */
  --gradient-accent: linear-gradient(135deg, #38F0FF 0%, #0EA5E9 100%);
  --gradient-stars: linear-gradient(135deg, #FFD166 0%, #F59E0B 100%);
  --gradient-rank-observer: linear-gradient(135deg, #38F0FF 0%, #0EA5E9 100%);
  --gradient-rank-pathfinder: linear-gradient(135deg, #A855F7 0%, #6366F1 100%);
  --gradient-rank-celestial: linear-gradient(135deg, #FFD166 0%, #F59E0B 100%);

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  --shadow-card-hover: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,240,255,0.12);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
  --shadow-glow-accent: 0 0 20px rgba(56,240,255,0.20);
  --shadow-glow-stars: 0 0 20px rgba(255,209,102,0.20);

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Typography */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Motion */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 500ms;
}

---

Step 4 — Add utility classes to globals.css (append after existing styles, do NOT remove anything):

/* --- Typography --- */
.font-display { font-family: var(--font-display); }
.font-body    { font-family: var(--font-body); }
.font-mono    { font-family: var(--font-mono); }

/* --- Base body --- */
body {
  font-family: var(--font-body);
  background-color: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.025em;
}

code, pre, .font-mono {
  font-family: var(--font-mono);
}

/* --- Card system (the single most reused class in the app) --- */
.card-base {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: background var(--duration-normal) var(--ease-out-expo),
              border-color var(--duration-normal) var(--ease-out-expo),
              box-shadow var(--duration-normal) var(--ease-out-expo),
              transform var(--duration-normal) var(--ease-out-expo);
}
.card-base:hover {
  background: var(--bg-card-hover);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}
.card-base.card-interactive {
  cursor: pointer;
}

/* --- Button system --- */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--gradient-accent);
  color: #070B14;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  min-height: 48px;
  border: none;
  cursor: pointer;
  transition: filter var(--duration-fast), transform var(--duration-fast);
}
.btn-primary:hover  { filter: brightness(1.12); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform: none; filter: none; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  min-height: 48px;
  cursor: pointer;
  transition: border-color var(--duration-fast), color var(--duration-fast), transform var(--duration-fast);
}
.btn-ghost:hover  { border-color: rgba(255,255,255,0.30); color: var(--text-primary); transform: translateY(-1px); }
.btn-ghost:active { transform: translateY(0); }
.btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

.btn-accent-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  min-height: 48px;
  cursor: pointer;
  transition: background var(--duration-fast), filter var(--duration-fast), transform var(--duration-fast);
}
.btn-accent-ghost:hover { filter: brightness(1.15); transform: translateY(-1px); }

/* --- Badge pills (from DRiP/Phantom pattern) --- */
.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-display);
  letter-spacing: 0.01em;
}
.badge-accent  { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent-border); }
.badge-stars   { background: var(--stars-dim); color: var(--stars); border: 1px solid var(--stars-border); }
.badge-success { background: var(--success-dim); color: var(--success); }
.badge-warning { background: var(--warning-dim); color: var(--warning); }
.badge-error   { background: var(--error-dim); color: var(--error); }
.badge-muted   { background: rgba(255,255,255,0.06); color: var(--text-muted); }

/* --- Glow effects --- */
.glow-accent { box-shadow: var(--shadow-glow-accent); }
.glow-stars  { box-shadow: var(--shadow-glow-stars); }

/* --- Animations --- */
.animate-fade-in  { animation: fadeIn 400ms var(--ease-out-expo) forwards; }
.animate-slide-up { animation: slideUp 500ms var(--ease-out-expo) forwards; }
.animate-scale-in { animation: scaleIn 300ms var(--ease-out-expo) forwards; }

/* Stagger delays */
.stagger-1 { animation-delay: 60ms; }
.stagger-2 { animation-delay: 120ms; }
.stagger-3 { animation-delay: 180ms; }
.stagger-4 { animation-delay: 240ms; }
.stagger-5 { animation-delay: 300ms; }
.stagger-6 { animation-delay: 360ms; }

/* Keep elements invisible until animation fires */
[class*="animate-"]:not(.animation-done) { opacity: 0; }

/* --- Live pulsing dot (for "Live on Solana" badge) --- */
.live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: pulseDot 1.4s ease-in-out infinite;
}

/* --- Scrollbar (dark theme standard) --- */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }

/* --- Selection color --- */
::selection { background: var(--accent-dim); color: var(--accent); }

---

Step 5 — Verify build:
Run: npm run build
Fix any TypeScript or CSS errors before marking done. Do not leave broken builds.

Do NOT modify any page files, component files, or API routes in this prompt.
```

---

### PROMPT U2 — Core Astronomy UI Components (ScoreRing, StatCard, ForecastStrip, StreakBadge, LoadingRing)

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. I need 5 foundational UI components that are unique to Stellar's astronomy context. These components will be reused across every page. They must use the CSS variables established in the previous prompt (U1).

Read these files before writing anything:
  src/app/globals.css (CSS variables — you must use them, never hardcode hex values)
  src/components/ (list the directory — understand existing structure)
  src/app/layout.tsx (check font variables are set up)
  src/lib/types.ts (existing type definitions — do not duplicate)

Do NOT install any new packages. All components: React + SVG + CSS only.

---

COMPONENT 1: src/components/ui/ScoreRing.tsx

'use client'

This is the visual centerpiece of Stellar — a circular score ring like ShutEye's Sleep Score ring but for sky conditions. Used on Dashboard, Profile, Verification screen, Mission complete.

Props:
  interface ScoreRingProps {
    value: number           // 0 to max (visible score)
    max?: number            // default 100
    size?: number           // px diameter, default 160
    strokeWidth?: number    // px, default 10
    color?: string          // 'gradient' | any CSS color | CSS var. Default 'gradient'
    glowColor?: string      // glow rgba. Default 'rgba(56,240,255,0.25)'
    label?: string          // e.g. "Sky Score"
    sublabel?: string       // e.g. "Excellent"
    animate?: boolean       // animate arc and number on mount, default true
    showPercent?: boolean   // append % to number, default false
    children?: React.ReactNode  // override center content
    className?: string
  }

Implementation:
  - SVG viewBox="0 0 {size} {size}", position relative, display block
  - Background circle: cx/cy = size/2, r = radius, stroke="rgba(255,255,255,0.06)", strokeWidth, fill="none"
  - Foreground arc: same cx/cy/r, strokeLinecap="round", transform="rotate(-90 {cx} {cy})"
    - stroke: if color==='gradient' use stroke="url(#sg_{uniqueId})" else use color prop
    - strokeDasharray = circumference (2 * π * r)
    - strokeDashoffset: animate from circumference (empty) to circumference*(1 - value/max)
    - CSS transition on stroke-dashoffset: 1200ms var(--ease-out-expo)
    - On mount: useEffect → requestAnimationFrame → set state to trigger transition
  - SVG <defs>: linearGradient id="sg_{uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%"
      stop offset="0%" stopColor="#38F0FF"
      stop offset="100%" stopColor="#0EA5E9"
    (Use useId() from React 18 for the unique id — avoids SSR collisions)
  - Glow: SVG filter with feDropShadow matching glowColor, applied to foreground arc
  - Center overlay (absolute, inset-0, flex items-center justify-center, pointer-events-none):
    - If children: render children
    - Else: flex column, items-center, gap-0.5
        large number: useCountUp(0, value, 1000ms) → animated counter
        font-family: var(--font-display), font-weight 700, fontSize: size/5
        color: if color==='gradient' use var(--accent) else use color prop
        if showPercent: append '%' in smaller text
        if label: text-[10px] var(--text-secondary) font-display uppercase tracking-wider
        if sublabel: text-[10px] var(--text-muted) font-body
  - useCountUp: internal function (not exported), uses useEffect + requestAnimationFrame
    counts from 0 to target over duration ms. Returns current displayed integer.

Export default ScoreRing.

---

COMPONENT 2: src/components/ui/StatCard.tsx

'use client'

Data card with left accent bar — used in Profile stats row, Dashboard, Mission headers.

Props:
  interface StatCardProps {
    icon?: React.ReactNode
    label: string
    value: string | number
    suffix?: string           // e.g. "✦" or " days"
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string       // e.g. "+3 this week"
    accentColor?: string      // default var(--accent)
    onClick?: () => void
    className?: string
  }

Implementation:
  - Outer: card-base + p-4 + relative + optional onClick cursor-pointer
  - Left accent strip: absolute left-0 top-4 bottom-4, w-[3px], border-radius: 0 2px 2px 0
    background: accentColor prop (default var(--accent))
  - Content: pl-3, flex col, gap-1
  - Top row: icon (opacity-50, flex-shrink-0) + label (text-[11px] text-secondary uppercase tracking-wider font-display)
    flex items-center gap-2
  - Value row: value + suffix
    value: text-2xl font-bold font-display text-primary
    suffix: text-sm text-secondary ml-0.5 font-mono
  - Trend (if provided): text-[11px] flex items-center gap-1 mt-0.5
    up → var(--success) + "↑"
    down → var(--error) + "↓"
    neutral → var(--text-muted) + "→"
    + trendValue text

Export default StatCard.

---

COMPONENT 3: src/components/ui/ForecastStrip.tsx

'use client'

Horizontal scrolling 7-day forecast strip — Stellar's unique astronomy weather view.

Types (add at top of file):
  export interface ForecastDay {
    date: string              // ISO string
    dayLabel: string          // "Mon", "Tue" etc.
    cloudCover: number        // 0–100
    badge: 'go' | 'maybe' | 'skip'
    isToday?: boolean
  }

Props:
  interface ForecastStripProps {
    days: ForecastDay[]
    onDayClick?: (day: ForecastDay) => void
    className?: string
  }

Implementation:
  - Outer: relative, overflow hidden (for edge gradients)
  - Inner: flex flex-row gap-2 overflow-x-auto, scrollbar-hide (add class: [&::-webkit-scrollbar]{display:none})
  - Each day column: flex-shrink-0, w-14, flex flex-col items-center, gap-1.5, py-3, px-1, rounded-xl, cursor-pointer
    transition all 200ms var(--ease-out-expo)
    - isToday: border 1px solid var(--accent), background var(--accent-dim)
    - else: border 1px solid var(--border-subtle), background transparent
    - hover: border var(--border-strong), background rgba(255,255,255,0.04)
  - Day label: text-[10px] font-display font-medium var(--text-muted). Today: var(--accent)
  - Colored dot: w-3 h-3 rounded-full
    go → var(--success) + box-shadow 0 0 6px rgba(52,211,153,0.4)
    maybe → var(--warning)
    skip → var(--error)
  - Cloud text: text-[10px] font-mono var(--text-muted). "15%"
  - Left/right fade: two absolute divs, pointer-events-none, inset-y-0, w-8
    left: bg gradient from var(--bg-base) to transparent
    right: bg gradient from transparent to var(--bg-base)
  - onClick: call onDayClick(day) if provided

Export default ForecastStrip.
Export type ForecastDay.

---

COMPONENT 4: src/components/ui/StreakBadge.tsx

'use client'

Streak counter — inspired by Moonwalk Fitness. Shows consecutive nights observed.

Props:
  interface StreakBadgeProps {
    days: number
    frozen?: boolean   // streak preserved by a cloudy night pass
    className?: string
  }

Implementation:
  - Outer: inline-flex items-center gap-1.5, px-2.5 py-1, rounded-full
    background: days > 0 ? var(--stars-dim) : transparent
    border: days > 0 ? 1px solid var(--stars-border) : 1px solid var(--border-subtle)
  - Icon: if frozen → "❄️" text-sm. If days > 0 → "🔥" text-sm. If days === 0 → no icon.
  - Count: days > 0 ? days.toString() in text-sm font-bold font-display color var(--stars)
           days === 0 ? nothing
  - Suffix: "day streak" (days===1) or "days streak" (days>1) in text-[11px] var(--text-secondary)
           days === 0: "No streak" in text-[11px] var(--text-muted)
  - If days >= 7: add animate-glow-pulse to the outer container

Export default StreakBadge.

---

COMPONENT 5: src/components/ui/LoadingRing.tsx

'use client'

Branded loading state — shows while waiting for API responses or blockchain confirmations.

Props:
  interface LoadingRingProps {
    progress?: number          // 0–100 deterministic. Undefined = indeterminate spin.
    size?: number              // px, default 80
    message?: string           // static message, overrides facts
    facts?: string[]           // rotating astronomy facts
    factInterval?: number      // ms between facts, default 3200
    className?: string
  }

Default facts (use these if facts prop not provided):
  [
    "Jupiter has 95 known moons",
    "Light takes 8 minutes to reach Earth from the Sun",
    "Saturn's rings would stretch from Earth to the Moon",
    "The Andromeda Galaxy contains 1 trillion stars",
    "A teaspoon of neutron star weighs 6 billion tons",
    "The Milky Way and Andromeda will merge in 4.5 billion years",
    "Venus rotates backwards compared to most planets",
    "The Orion Nebula is 1,344 light-years away",
  ]

Implementation:
  - Outer: flex flex-col items-center gap-4 className prop
  - If progress is defined: render <ScoreRing value={progress} size={size} label="" animate={false} />
  - If progress is undefined: SVG indeterminate ring
      SVG size x size, viewBox "0 0 {size} {size}"
      Background circle: stroke rgba(255,255,255,0.06) strokeWidth 6 fill none
      Arc: stroke var(--accent) strokeWidth 6 strokeLinecap round fill none
        strokeDasharray: circumference * 0.3 (30% arc visible)
        CSS animation: spin 1.4s linear infinite (rotate 360deg)
        Apply rotation via CSS: style={{ animation: 'spin 1.4s linear infinite', transformOrigin: 'center' }}
        Add keyframes @keyframes spin { from { transform: rotate(-90deg) } to { transform: rotate(270deg) } }
        (inline style or add to globals — check globals first for existing spin keyframe)
  - Message area below ring:
      If message prop: render it in text-sm font-body var(--text-secondary) text-center
      Else: cycling facts with fade transition
        useState(currentIndex) + useEffect setInterval(factInterval)
        Fade: use key={currentIndex} on the text element + animate-fade-in class
  - Keep it simple — no dependencies.

---

After writing all 5 components:
  1. Create src/app/test-components/page.tsx that renders all 5 with sample data to verify they compile.
  2. Run npm run build — fix any errors.
  3. Delete the test page.
  4. Do NOT modify any existing components or pages.
```

---

### PROMPT U3 — Skeleton Loading System + Unified Card Component

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. I need two things:
  1. A skeleton loading system to replace all spinners across the app (Phantom, Jupiter, DRiP all use skeleton screens)
  2. A unified Card component to standardize card patterns across pages

Read these files before writing anything:
  src/app/globals.css (CSS variables — use them)
  src/components/ui/ (list the directory — don't duplicate existing components)
  src/app/missions/page.tsx (understand card patterns used)
  src/app/marketplace/page.tsx (understand card patterns used)

---

PART A: src/components/ui/Skeleton.tsx

A shimmer skeleton loading system. The shimmer is a gradient that slides left-to-right.

Add this keyframe to globals.css if not already there:
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

Export these named components from one file:

1. Skeleton — base placeholder
  Props: className?: string, variant?: 'text' | 'circular' | 'rectangular' (default 'text')
  Render: div with background "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)"
    background-size: 200% 100%, animation: shimmer 1.8s ease-in-out infinite
    text: rounded-md, h-4 w-full
    circular: rounded-full
    rectangular: rounded-xl

2. SkeletonCard — full card placeholder
  card-base div containing:
    Skeleton rectangular (aspect-square or aspect-video, w-full, rounded-t-xl rounded-b-none)
    div p-3 space-y-2:
      Skeleton text (h-3.5 w-3/4)
      Skeleton text (h-3 w-1/2)

3. SkeletonList — list rows
  Props: rows?: number (default 3), className?: string
  Each row: flex items-center gap-3, py-2
    Skeleton circular (w-10 h-10 flex-shrink-0)
    div flex-1 space-y-2:
      Skeleton text (h-3.5 w-2/3)
      Skeleton text (h-3 w-1/3)

4. SkeletonGrid — grid of SkeletonCards
  Props: cols?: number (default 2), count?: number (default 4), className?: string
  grid gap-3, grid-cols-{cols}, render {count} SkeletonCards
  (Use Tailwind grid-cols-2 default — do not generate dynamic class strings)

5. SkeletonProfile — profile page loading
  flex flex-col items-center gap-4 py-6:
    Skeleton circular (w-20 h-20)
    Skeleton text (h-5 w-28 mt-2)
    Skeleton text (h-3.5 w-20)
    grid grid-cols-3 gap-3 w-full mt-4:
      3x Skeleton rectangular (h-20 w-full)

6. SkeletonStatRow — 3 stat cards in a row
  grid grid-cols-3 gap-2:
    3x card-base with Skeleton text inside (h-8 w-full, h-3 w-2/3 mt-2)

---

PART B: src/components/ui/Card.tsx

Unified card component. After this, no page should use raw divs for cards — they should use this.

Export these named components from one file:

1. Card — base wrapper
  Props:
    children: React.ReactNode
    hover?: boolean (default true — enables hover effect)
    onClick?: () => void
    padding?: 'none' | 'sm' | 'md' | 'lg' (default 'md')
    glow?: 'accent' | 'stars' | false (default false)
    className?: string
  Styles:
    card-base + padding (none:p-0, sm:p-3, md:p-4, lg:p-6)
    hover=true: cursor-pointer + card-base:hover effects already in CSS
    glow='accent': add glow-accent class
    glow='stars': add glow-stars class

2. CardBadge — overlay badge for top-right of card images
  Props: children, variant?: 'default' | 'accent' | 'stars' | 'success' | 'warning' | 'error'
  Styles: badge-pill + variant class (badge-accent, badge-stars, etc.)

3. CardStat — number display inside a card
  Props: label: string, value: string | number, suffix?: string, mono?: boolean (default true)
  Renders: div flex flex-col gap-0.5
    label: text-[10px] uppercase tracking-wider font-display text-secondary
    value row: span with value (text-xl font-bold font-display if !mono, font-mono if mono) + suffix (text-sm text-secondary ml-0.5)

4. CardImage — image/placeholder area
  Props:
    src?: string
    alt?: string
    fallbackIcon?: React.ReactNode
    aspectRatio?: 'square' | 'video' | 'wide' (default 'square')
    overlay?: React.ReactNode
    className?: string
  Styles:
    ratio: square=aspect-square, video=aspect-video, wide=aspect-[16/9]
    overflow-hidden, rounded-t-xl, relative, bg-stellar-surface
    If src: <img> object-cover w-full h-full
    If !src: flex items-center justify-center, fallbackIcon at opacity-20, text-4xl
    overlay: absolute inset-0

Export: Card, CardBadge, CardStat, CardImage

---

After writing both files:
  1. Run npm run build — fix any errors.
  2. Do NOT refactor any existing pages to use these yet — that happens per-page in later prompts.
```

---

### PROMPT U4 — Page Transition System + Stagger Reveals

```
I'm building Stellar, a Next.js 15 astronomy app. Every top Solana app (Phantom, Jupiter, DRiP) has smooth content reveal animations. Currently Stellar has none — content appears instantly. I need to add a page-level animation system.

Read these files before writing anything:
  src/app/globals.css (check if fadeIn, slideUp keyframes exist from U1)
  src/app/layout.tsx (understand the app wrapper)
  src/app/page.tsx (understand home page structure)
  src/app/missions/page.tsx (understand mission page structure)
  src/components/ui/ (list — check for existing animation components)

---

Step 1 — Create src/components/ui/PageTransition.tsx:

'use client' component.

  interface PageTransitionProps {
    children: React.ReactNode
    delay?: number   // ms, default 0
    className?: string
  }

  Implementation:
    - On mount, applies animate-fade-in class
    - Uses a ref to add the class after mount (avoids SSR mismatch)
    - Container: div with opacity-0 initially, then animate-fade-in on mount
    - delay: passed as inline style animation-delay: {delay}ms
    - className: forwarded to container div

  Use case: wrap each page's content root in <PageTransition>.

---

Step 2 — Create src/components/ui/StaggerChildren.tsx:

'use client' component.

  interface StaggerChildrenProps {
    children: React.ReactNode
    baseDelay?: number    // ms before first child animates, default 80
    stagger?: number      // ms between each child, default 80
    animation?: 'fade-in' | 'slide-up' | 'scale-in'  // default 'slide-up'
    className?: string
  }

  Implementation:
    - Maps React.Children.toArray(children)
    - Each child wrapped in a div with:
        animate-{animation} class (from globals.css)
        inline style: animationDelay: `${baseDelay + index * stagger}ms`
        opacity: 0 initially (the CSS sets this, fill-mode: forwards keeps end state)
    - Container: className prop forwarded

  Use case: wrap lists, grids, sections where items should reveal sequentially.

---

Step 3 — Apply to these 4 pages. Read each file FULLY before editing. Make minimal changes — only add wrappers, never change content or logic:

src/app/page.tsx:
  - Import PageTransition, StaggerChildren
  - Wrap the root return div in <PageTransition>
  - Wrap the main sections (hero, feature cards, how it works, etc.) in <StaggerChildren baseDelay={100} stagger={80}>

src/app/missions/page.tsx:
  - Wrap root in <PageTransition>
  - Wrap the mission card list in <StaggerChildren stagger={60}>

src/app/nfts/page.tsx (if it exists — check):
  - Wrap root in <PageTransition>
  - Wrap NFT grid in <StaggerChildren stagger={50}>

src/app/profile/page.tsx:
  - Wrap root in <PageTransition>
  - Wrap main sections in <StaggerChildren baseDelay={80} stagger={80}>

---

Step 4 — Ensure globals.css has correct animation-fill-mode:

Find the .animate-fade-in, .animate-slide-up, .animate-scale-in rules.
Ensure each has: animation-fill-mode: forwards
This keeps elements visible after their animation ends.
If the rules already have 'forwards' in the shorthand (e.g., '400ms forwards'), they're fine.

---

Verify: npm run build passes. Every edited page must still render correctly with no hydration errors.
Do NOT add any new packages. Do NOT change content, data fetching, or business logic.
```

---

---

## PHASE 1 — SKY INTELLIGENCE ENGINE ✅ COMPLETE (2026-04-12)

---

### PROMPT U5 — Sky Score API + Calculation Engine

```
I'm building Stellar, a Next.js 15 astronomy app. I need a Sky Score system — a single 0–100 number representing tonight's observing conditions, like ShutEye's Sleep Score but for astronomy. This becomes the hero metric on the authenticated dashboard and mission verification screen.

Read these files FULLY before writing anything:
  src/lib/sky-data.ts (existing sky data functions — understand all exports)
  src/lib/types.ts (existing types — do not duplicate)
  src/app/api/sky/verify/route.ts (understand sky data shape from Open-Meteo)
  src/app/api/sky/forecast/route.ts (if it exists)
  src/app/globals.css (for color variable names)

---

Step 1 — Create src/lib/sky-score.ts:

export interface SkyScoreInput {
  cloudCover: number         // 0–100 percent
  visibility: number         // meters OR a numeric proxy (read existing code to see format)
  humidity: number           // 0–100 percent
  windSpeed: number          // m/s
  moonIllumination?: number  // 0–100 percent (optional)
  bortle?: number            // 1–9 (optional — from user's onboarding profile)
}

export interface SkyScoreFactor {
  label: string
  value: number              // 0–100 subscale
  weight: number             // 0–1
  description: string
}

export interface SkyScoreResult {
  score: number              // 0–100 final
  grade: 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor'
  emoji: string
  color: string              // CSS custom property string, e.g. 'var(--success)'
  factors: SkyScoreFactor[]
}

export function calculateSkyScore(input: SkyScoreInput): SkyScoreResult {
  Algorithm:

  1. Cloud factor (weight 0.40):
     value = cloudCover < 10 ? 100 : cloudCover > 80 ? 0 : Math.round(Math.max(0, 100 - cloudCover * 1.25))
     description: cloudCover < 20 ? "Clear skies" : cloudCover < 50 ? "Partially cloudy" : "Mostly cloudy"

  2. Visibility factor (weight 0.20):
     If visibility > 30000 → 100, > 20000 → 85, > 10000 → 65, > 5000 → 35, else 10
     description: "Excellent" | "Good" | "Fair" | "Poor" | "Very poor"

  3. Humidity factor (weight 0.15):
     value = Math.max(0, Math.round(100 - Math.max(0, input.humidity - 30) * 1.4))
     description: humidity < 30 ? "Dry air — good" : humidity < 60 ? "Moderate humidity" : "High humidity"

  4. Wind factor (weight 0.10):
     windSpeed < 3 → 100 ("Calm"), < 8 → 80 ("Light breeze"), < 15 → 50 ("Moderate"), < 25 → 20 ("Windy"), else 5 ("Very windy")

  5. Moon factor (weight 0.10, skip if no moonIllumination → redistribute 0.10 evenly to cloud + visibility):
     value = Math.round(100 - input.moonIllumination!)
     description: illumination < 20 ? "New moon — dark sky" : illumination < 60 ? "Partial moon" : "Full moon — bright"

  6. Bortle factor (weight 0.05, skip if no bortle → redistribute to cloud):
     value = Math.round(Math.max(0, Math.min(100, (10 - input.bortle!) * 12.5)))
     description: `Bortle ${bortle} — ${bortle <= 3 ? 'Dark sky' : bortle <= 6 ? 'Suburban sky' : 'Urban sky'}`

  Weight redistribution: if a factor is skipped, distribute its weight proportionally among active factors.

  Final score: Math.round(weighted sum), clamp 0–100.

  Grade + color:
    >= 88 → Exceptional, "✨", 'var(--success)'
    >= 72 → Excellent,   "⭐", 'var(--success)'
    >= 52 → Good,        "👍", 'var(--accent)'
    >= 32 → Fair,        "🌤️", 'var(--warning)'
    else  → Poor,        "☁️",  'var(--error)'

  Return: { score, grade, emoji, color, factors: [...each active factor with label, value, weight, description] }
}

Also export:
  export function skyScoreGrade(score: number): SkyScoreResult['grade'] { /* same thresholds */ }
  export function visibilityToMeters(visibilityStr: string): number {
    // Map string ratings to meters if the existing code uses strings
    const map: Record<string, number> = { 'Excellent': 30000, 'Good': 15000, 'Fair': 7000, 'Poor': 3000 }
    return map[visibilityStr] ?? parseInt(visibilityStr) ?? 10000
  }

---

Step 2 — Create src/app/api/sky/score/route.ts:

GET handler. Query params: lat (required), lon (required).

  1. Validate lat/lon: if missing or NaN, return 400 JSON error
  2. Fetch from Open-Meteo (use same URL base as existing sky routes in the codebase):
       current=cloud_cover,visibility,relative_humidity_2m,wind_speed_10m
       Match the exact Open-Meteo URL format already used in this project.
  3. Parse response into SkyScoreInput. Check what field names Open-Meteo returns by reading the existing API routes.
  4. Optionally get moon illumination: check if astronomy-engine is available in the project
     (grep src/lib for moon-related exports). If found, call it. If not, omit moonIllumination.
  5. Call calculateSkyScore(input)
  6. Return NextResponse.json({ ...result, location: { lat, lon }, timestamp: new Date().toISOString() })
  7. Add headers: Cache-Control: public, s-maxage=300, stale-while-revalidate=600

  On fetch error: return NextResponse.json({ score: 50, grade: 'Fair', emoji: '🌤️', color: 'var(--warning)', factors: [], location: { lat, lon }, timestamp: new Date().toISOString() }, { status: 200 })
  Never throw — always return a valid response.

---

Step 3 — Append to src/lib/types.ts (do not modify existing types):

  export type SkyGrade = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor'

  export interface SkyScore {
    score: number
    grade: SkyGrade
    emoji: string
    color: string
  }

---

Verify:
  npm run build must pass.
  Test: curl "http://localhost:3000/api/sky/score?lat=41.72&lon=44.83"
  Should return valid JSON with score 0–100, grade string, and factors array.
```

---

---

## PHASE 2 — PAGE OVERHAULS ✅ COMPLETE (2026-04-12)

---

### PROMPT U6 — Landing Page Polish (First Impression)

```
I'm building Stellar, a Next.js 15 astronomy app competing in the Colosseum Frontier hackathon. The landing page is the first thing judges see. It needs to look like a funded consumer product — like Phantom or DRiP quality — not a prototype.

Read these files FULLY before writing anything:
  src/app/page.tsx (the ENTIRE file — understand every section, every component used)
  src/app/globals.css (CSS variables and utility classes)
  src/components/ (list — understand what components exist)
  src/components/ui/ (list — use our new card-base, btn-primary, badge-pill etc.)

Do NOT change content meaning, copy text, routing, or auth logic.
Only change visual styling and animation — no functional changes.

---

Apply these visual upgrades section by section. Read the current structure first, then apply:

1. HERO SECTION:
   - Ensure the h1 / main title uses font-display (Plus Jakarta Sans), font-weight 800
   - Add a large radial glow orb behind the title:
     absolute div, w-[500px] h-[500px] rounded-full, centered,
     background: radial-gradient(circle, rgba(56,240,255,0.06) 0%, transparent 70%)
     pointer-events-none, z-0
   - "Live on Solana Devnet" badge: badge-pill + badge-accent + a live-dot span
   - Primary CTA button: btn-primary class
   - Secondary CTA: btn-ghost class
   - Wrap hero in StaggerChildren baseDelay={0} stagger={80}

2. FEATURE / BENEFIT CARDS (Sky, Missions, ASTRA, Marketplace):
   - Replace all card divs with card-base class
   - Icons: wrap in a 40x40 rounded-lg div with background var(--accent-dim), color var(--accent)
   - Card titles: font-display font-semibold
   - Wrap grid in StaggerChildren stagger={60}

3. "HOW IT WORKS" / STEPS SECTION (if it exists):
   - Step numbers: replace plain text with a 28x28 rounded-full div
     background: var(--accent-dim), color: var(--accent), font-display font-bold text-sm
   - Add a thin 1px vertical connecting line between steps (absolute positioned, left-[13px], bg var(--border-default))
   - Wrap in StaggerChildren stagger={80}

4. TONIGHT'S SKY WIDGET / PREVIEW (if it exists):
   - Add a "Live" badge-pill badge-accent with live-dot in the top-right corner
   - Wrap in card-base

5. MISSIONS PREVIEW (if it exists):
   - Each mission card: card-base
   - Stars badge: badge-pill badge-stars with "✦" prefix
   - "View all missions →" link: text-accent, no underline, font-display font-medium

6. ASTRA CHAT PREVIEW (if it exists):
   - Apply message bubble styles consistent with the chat page
   - User bubble: bg var(--accent-dim), border var(--accent-border), rounded-2xl rounded-br-sm
   - ASTRA bubble: bg rgba(255,255,255,0.04), rounded-2xl rounded-bl-sm

7. REWARDS / NFTS SECTION (if it exists):
   - Stars amounts: font-mono, color var(--stars)
   - Rank names: badge-pill badge-accent or badge-muted by tier

8. FOOTER (if it exists):
   - "Built on Solana" text + teal dot or Solana logo treatment
   - Links: text-secondary hover:text-primary transition-colors

9. GLOBAL: Wrap the entire page in <PageTransition> component.

After changes: npm run build must pass. No content removed. No routing changed.
```

---

### PROMPT U7 — Mission Cards Visual Upgrade (Game-Style)

```
I'm building Stellar, a Next.js 15 astronomy app. The mission cards need to look like challenge cards from Moonwalk Fitness or StepN — with visual difficulty indicators, completion states, and reward display. Currently they're probably flat list items.

Read these files FULLY before writing anything:
  src/app/missions/page.tsx (the ENTIRE file)
  src/components/sky/MissionActive.tsx (if it exists — understand mission data shape)
  src/lib/types.ts (mission type definitions)
  src/app/globals.css (CSS variables)
  src/components/ui/ (Card, StatCard, SkeletonGrid, Skeleton components)

Do NOT change mission data fetching, auth logic, mission activation, or state management.
Only change the JSX render of mission cards.

---

Step 1 — Add a page header stats bar:
  Read how missions count and Stars balance are currently displayed (or read from state/context).
  Replace with a stats row: grid grid-cols-3 gap-2, at the top of the missions list:
    StatCard: completed count, label "Completed", icon Telescope (lucide)
    StatCard: Stars balance, label "Stars ✦", icon Star (lucide), accentColor="var(--stars)"
    StatCard: rank name, label "Rank", icon Award (lucide), accentColor="var(--accent)"

Step 2 — Redesign each mission card:

Each card (card-base, overflow-hidden, flex flex-row, p-0):

  LEFT STRIP (w-1.5, flex-shrink-0, full height):
    Beginner:     background var(--success)
    Intermediate: background var(--accent)
    Hard:         background #A855F7
    Expert:       background var(--stars)
    (Map difficulty label to color — check how difficulty is stored in the mission object)

  CONTENT (flex-1, p-4, flex flex-col gap-2):
    Row 1 (flex items-start justify-between gap-2):
      Left: mission emoji (text-xl) + mission name (text-sm font-semibold font-display text-primary)
        flex items-center gap-2
      Right: difficulty badge-pill
        Beginner → badge-success text
        Intermediate → badge-accent text
        Hard → badge-pill + bg purple-dim text purple
        Expert → badge-stars text

    Row 2: description (text-xs var(--text-secondary), line-clamp-2, font-body)

    Row 3 (flex items-center justify-between, mt-1):
      Left: "✦ +{stars}" — text-sm font-bold font-mono color var(--stars)
      Right (based on status):
        Completed: badge-success "✓ Completed" (badge-pill)
        Available: btn-primary small (py-2 px-4 text-xs, min-height 36px) "Start →"
        Locked: text-xs text-muted flex items-center gap-1 "🔒 {prerequisite}"

  Completed missions: add a subtle green glow on the left strip (box-shadow 1px 0 8px rgba(52,211,153,0.4))
  Locked missions: opacity-50, no hover, cursor-default

Step 3 — Quiz section (if quizzes exist on this page):
  Separate the quiz cards with a section label:
    "Knowledge Quizzes" — text-[11px] uppercase tracking-widest font-display text-secondary mb-3 mt-6
  Quiz card: same structure but Row 3 right side shows "10 questions · 100✦" in text-xs text-muted

Step 4 — Empty state (if no missions):
  Centered div: telescope emoji text-5xl + "No missions available" font-display text-xl + subtitle text-secondary

Step 5 — Wrap mission list in <StaggerChildren stagger={50}>

Verify: npm run build passes. Mission activation still works.
```

---

### PROMPT U8 — NFT Gallery Overhaul (DRiP-Pattern with Generated Star Map Thumbnails)

```
I'm building Stellar, a Next.js 15 astronomy app. The NFT gallery shows observation NFTs minted on Solana. Currently the cards have no image — just text metadata. DRiP and Magic Eden's galleries are the gold standard. I need to match that quality.

Read these files FULLY before writing anything:
  src/app/nfts/page.tsx (the ENTIRE file)
  src/lib/types.ts (NFT/observation types)
  src/app/globals.css (CSS variables)
  src/components/ui/ (Card, CardImage, Skeleton, SkeletonGrid components)

Do NOT change NFT data fetching, wallet connections, or Solana Explorer links.
Only change the visual render.

---

Step 1 — Create a GeneratedStarMap component (inline in nfts/page.tsx, not extracted):

A deterministic SVG generated from observation metadata. No images required.

  interface StarMapProps {
    targetName: string       // used to seed the visual
    date: string             // used for variation
    cloudCover?: number      // 0-100 — affects how many stars are visible
    className?: string
  }

  Implementation:
    - Container: div with className, overflow-hidden, relative, style background:
      `radial-gradient(ellipse at 30% 40%, rgba(56,240,255,0.06) 0%, transparent 50%),
       radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.06) 0%, transparent 50%),
       linear-gradient(180deg, #070B14 0%, #050810 100%)`
    - SVG (100% width and height, position absolute, inset-0):
      Generate 25–40 small star dots deterministically from targetName + date string
      Hash function: simple string sum % N for positions
      Stars: circles r=0.3 to 1.5, fill white, opacity 0.1 to 0.8
      If cloudCover > 60: reduce star count and add horizontal gradient overlay (cloud effect)
      Add 1–3 larger "feature stars" near center (r=2, opacity 1, with radial glow filter)
      For "Moon" targets: add a large circle near top-right (r=18, fill rgba(255,255,255,0.15))
      For "Jupiter/Saturn/Planet" targets: add a small colored dot (r=3, fill var(--accent))
    - Target emoji: absolute bottom-3 left-3, text-3xl, z-10 (for visual anchor)
    - Date text: absolute bottom-3 right-3, text-[9px] font-mono text-muted/50

    Hash function (simple, deterministic):
      function hashStr(s: string): number {
        let h = 0
        for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
        return Math.abs(h)
      }
      Use hashStr(targetName + date) to seed all visual elements.

---

Step 2 — Header section:
  "My Observations" — text-2xl font-bold font-display
  + count badge-pill badge-muted "{count} NFTs"
  Sort toggle: two small buttons "Recent" | "Stars" — badge-pill, selected state badge-accent
  Keep existing sort logic or implement date-desc default.

Step 3 — Stats bar (if NFTs exist):
  grid grid-cols-3 gap-2, card-base p-3 text-center each:
    Total NFTs (font-mono text-xl font-bold)
    Stars Earned (sum of all star attributes, color var(--stars))
    Best Clear Night (lowest cloudCover across all NFTs — badge-success "Clear")

Step 4 — NFT Grid (grid-cols-2 gap-3):

Each card: card-base overflow-hidden p-0

  TOP (60% of card): GeneratedStarMap component
    aspectRatio: "0 0 100 100", full width, height 160px (fixed)

  BOTTOM (40%, p-3):
    NFT name: text-[13px] font-semibold font-display text-primary truncate
    Attribute pills row (flex flex-wrap gap-1 mt-1.5):
      Target: badge-pill badge-accent — "{target}"
      Cloud: cloudCover < 20 ? badge-success "Clear" : cloudCover < 50 ? badge-warning "Partial" : badge-error "Cloudy"
      Stars: badge-pill badge-stars "✦ {stars}"
    Explorer link: mt-2, text-[10px] font-mono text-accent flex items-center gap-1 hover:underline
      ExternalLink icon (12px)

  Card hover: scale-[1.02] + shadow-glow-accent (add to card-base hover if not already scoped)

Step 5 — Empty state:
  py-16 flex flex-col items-center gap-4 text-center:
    "🔭" text-6xl
    "No observations yet" font-display text-xl font-semibold
    "Complete a sky mission to seal your first discovery on Solana" text-secondary text-sm max-w-xs
    btn-primary → /missions "Start Observing →"

Step 6 — Loading state:
  Replace any spinner with <SkeletonGrid cols={2} count={4} />

Step 7 — Wrap grid in <StaggerChildren stagger={50}> for card reveal animation.

Verify: npm run build passes. Explorer links still work. NFT data still fetched correctly.
```

---

### PROMPT U9 — Profile Page Redesign (Moonwalk + ShutEye Hybrid)

```
I'm building Stellar, a Next.js 15 astronomy app. The profile page needs a complete visual redesign. Benchmark: Moonwalk Fitness profile (rank system, streaks) + ShutEye's "Me" tab (circular stat rings, history calendar).

Read these files FULLY before writing anything:
  src/app/profile/page.tsx (the ENTIRE file — read every line)
  src/components/ui/ScoreRing.tsx (3 rings in a row for stats)
  src/components/ui/StatCard.tsx
  src/components/ui/StreakBadge.tsx
  src/components/ui/Skeleton.tsx (SkeletonProfile, SkeletonStatRow)
  src/hooks/useAstronomerProfile.ts (if it exists)
  src/lib/types.ts
  src/app/globals.css

Understand: How does this page currently get Stars balance? Missions completed? Rank? Auth?
Read ALL of that before touching a line of code.
Keep ALL existing data fetching, auth checks, state management, sign-out logic.
ONLY rewrite the JSX return block.

---

New JSX layout (single column, max-w-lg mx-auto, px-4 py-6, space-y-6):
Wrap entire return in <PageTransition>.

SECTION 1 — Profile Hero (card-base, py-8 px-6, text-center, flex flex-col items-center gap-3):

  Avatar ring:
    div relative w-20 h-20:
      Outer ring: absolute inset-0 rounded-full
        border-2 with gradient based on rank:
          Stargazer → border-[rgba(255,255,255,0.15)] (dim, no rank yet)
          Observer  → use gradient: background: linear-gradient(var(--bg-base), var(--bg-base)) padding-box, linear-gradient(135deg, #38F0FF, #0EA5E9) border-box
          Pathfinder → same technique with purple: #A855F7 → #6366F1
          Celestial → same with gold: #FFD166 → #F59E0B
      Inner: w-full h-full rounded-full bg-stellar-surface flex items-center justify-center
        First letter of email or display name — text-2xl font-bold font-display text-primary

  Below avatar:
    username / email text-sm font-display font-medium
    Rank badge-pill with rank-colored badge class + rank emoji + rank name
    StreakBadge component

SECTION 2 — Stats Rings (flex justify-around py-2):

  3x ScoreRing, size=88, strokeWidth=6:

  Ring 1: Observations
    value = completedMissionsCount, max = 10 (or 50 — check what's realistic)
    color = "var(--accent)"
    label = "Missions"
    sublabel = "{count} total"

  Ring 2: Stars Earned
    value = min(starsBalance, 1000), max = 1000
    color = "var(--stars)"
    label = "Stars ✦"
    sublabel = "{balance} earned"

  Ring 3: Rank Progress
    Rank thresholds: Observer@1mission, Pathfinder@3, Celestial@5, Legend@10
    progress = (completedMissionsCount / nextRankThreshold) * 100, clamp 0–100
    value = Math.round(progress), max = 100
    color = "var(--accent)"  (or gradient)
    label = "Next Rank"
    sublabel = "{current}/{next} missions"

SECTION 3 — Observation Calendar:

  Title: "Observation History" text-[11px] uppercase tracking-widest font-display text-secondary mb-3
  Current month + year: text-sm font-display font-semibold text-primary

  Calendar grid:
    7-col header: Sun Mon Tue Wed Thu Fri Sat — text-[9px] text-muted uppercase, text-center, mb-1
    Day cells: grid grid-cols-7 gap-1
      Each cell: w-8 h-8 rounded-lg text-[11px] font-mono text-center flex items-center justify-center

      Observed day (date matches a completed mission date):
        background var(--accent-dim), color var(--accent)
        ring: ring-1 ring-inset ring-accent-border
      Today: border border-dashed border-border-strong, text-primary
      Other day: text-muted
      Empty padding cells (before month starts): invisible

    Data: extract observation dates from completed missions (how they're currently stored — adapt to the actual data shape)
    If no mission dates available: show empty calendar with today highlighted only.

SECTION 4 — Recent Observations (last 3 NFTs):

  Title row: flex items-center justify-between mb-2
    "My Observations" text-sm font-display font-semibold
    "View All →" text-xs text-accent → /nfts

  Flex row, gap-2, overflow-x-auto:
    Each: card-base min-w-[140px] p-3 flex-shrink-0
      Target name: text-xs font-semibold truncate
      Date: text-[10px] text-muted font-mono
      Stars: text-[11px] font-mono text-stars mt-1

  If no NFTs: small card-base p-4 text-center text-xs text-muted
    "Complete your first mission to earn an NFT"

SECTION 5 — Equipment (from onboarding, if useAstronomerProfile hook exists):

  Read useAstronomerProfile — if profile exists:
    Title: "Your Setup" text-sm font-display font-semibold
    Pills row: flex flex-wrap gap-1.5
      Equipment, environment, interests as badge-pill badge-muted
    "Edit Profile" btn-ghost text-xs py-1.5 px-3 → calls resetProfile() to restart onboarding

  If no useAstronomerProfile hook: skip this section entirely.

SECTION 6 — Account (card-base p-4 space-y-3):

  Keep ALL existing logic:
    Wallet address copy button
    View on Solana Explorer link
    Language toggle (if i18n exists)
    Sign Out button (btn-ghost, text-error color)

  Visually:
    Each row: flex items-center justify-between, py-2, border-b border-subtle last:border-0
    Labels: text-xs font-display text-secondary
    Values: text-xs font-mono text-primary

Loading state: return <SkeletonProfile /> while data loads.

Verify: npm run build. Auth still works. Sign out still works. Explorer links still work.
```

---

### PROMPT U10 — ASTRA Chat Visual Polish (Premium AI Companion)

```
I'm building Stellar, a Next.js 15 astronomy app with an AI companion named ASTRA powered by Claude. The chat UI needs to feel like a premium AI product — like Perplexity or Character.ai — not a generic chatbot.

Read these files FULLY before writing anything:
  src/app/chat/page.tsx (the ENTIRE file)
  src/app/api/chat/route.ts (understand streaming — do NOT change this)
  src/app/globals.css (CSS variables)
  src/components/ (list — understand existing structure)

Do NOT change: API calls, streaming logic, message state management, send handlers.
Only change: visual rendering of messages, input area, header.

---

Step 1 — Header redesign:

Replace the existing chat header with:
  sticky top-0 z-10, bg: rgba(7,11,20,0.85) backdrop-blur-xl, border-b border-subtle
  py-3 px-4, flex items-center gap-3

  ASTRA avatar: w-8 h-8 rounded-full bg-accent-dim border border-accent-border
    flex items-center justify-center, text-accent text-sm font-mono "✦"

  Text column:
    "ASTRA" — text-sm font-bold font-display text-primary
    "AI Astronomer · Powered by Claude" — text-[10px] text-muted font-body

  Online indicator: ml-auto, flex items-center gap-1.5
    live-dot class (pulsing green dot)
    "Online" text-[10px] text-success font-mono

---

Step 2 — Message bubbles:

Read how messages are currently rendered (the message list / scroll area).
Keep the data structure. Only change the JSX for each message bubble.

User messages:
  self-end max-w-[78%]
  bg var(--accent-dim), border 1px solid var(--accent-border)
  rounded-2xl rounded-br-sm, px-4 py-2.5
  text-sm font-body text-primary
  Animate in: animate-slide-up stagger based on index

ASTRA messages:
  self-start max-w-[85%]
  Outer: flex items-end gap-2

  Avatar (for first message in a group, or every ASTRA message — check pattern):
    w-6 h-6 rounded-full bg-accent-dim border border-accent-border flex-shrink-0
    flex items-center justify-center text-accent text-[10px] "✦"

  Bubble:
    bg rgba(255,255,255,0.04), border 1px solid var(--border-default)
    rounded-2xl rounded-bl-sm, px-4 py-2.5
    text-sm font-body text-primary leading-relaxed
    Animate in: animate-fade-in

---

Step 3 — Typing indicator (shown while ASTRA is responding):

Render an ASTRA-style bubble but with 3 animated dots instead of text:
  Same self-start layout as ASTRA messages
  Inside bubble: flex items-center gap-1.5, py-1
    3x span: w-1.5 h-1.5 rounded-full bg-white/30
    Each with animate-bounce-dot and stagger-1, stagger-2, stagger-3

Show this indicator: read how the existing code detects "loading" or "streaming" state and show during that state.

---

Step 4 — Input area:

sticky bottom-0, bg rgba(7,11,20,0.9) backdrop-blur-xl
border-t border-subtle, px-4 py-3

Inner: flex items-end gap-3

  Textarea (not input):
    flex-1, bg rgba(255,255,255,0.06), border 1px solid var(--border-default)
    rounded-xl, px-4 py-3, text-sm font-body text-primary
    placeholder text-muted, resize-none
    focus: border-color var(--accent-border), outline none
    min-height 44px, max-height 160px
    auto-resize height on content change

  Send button:
    w-10 h-10 flex-shrink-0, rounded-xl
    bg var(--gradient-accent), flex items-center justify-center
    disabled: opacity-35 cursor-not-allowed
    ArrowUp icon (lucide, 18px, color #070B14)

---

Step 5 — Suggestion chips (only shown when no messages yet):

flex flex-wrap gap-2 px-4 pb-3 (above input area, or between header and empty message area)

4 chips:
  "What's visible tonight? 🌙"
  "Best telescope for beginners? 🔭"
  "Explain the Bortle scale"
  "Why is the sky dark at night?"

Each: btn-ghost, text-xs, py-1.5 px-3, min-height auto
On click: populate the textarea with the chip text (or directly submit — check existing send handler)

---

Step 6 — Smooth scroll:
After each new message renders: scroll message container to bottom.
Use useEffect with ref on the message container div.
Add smooth scroll behavior.

Verify: npm run build. Streaming still works. Messages send and display correctly.
```

---

---

## PHASE 3 — PERSONALIZATION & ONBOARDING

---

### PROMPT U11 — Onboarding Quiz (3-Screen First-Run Flow)

```
I'm building Stellar, a Next.js 15 astronomy app. New users need a 3-screen onboarding quiz that runs once after first login — like ShutEye's personalization flow. It creates psychological investment and personalizes the experience.

Read these files FULLY before writing anything:
  src/app/layout.tsx
  src/app/page.tsx
  src/lib/types.ts
  src/hooks/ (list directory)
  src/components/ (list directory)
  src/components/ui/LoadingRing.tsx
  src/app/globals.css

Do NOT install any packages. localStorage for persistence. Pure React.

---

Step 1 — Append to src/lib/types.ts (do not modify existing types):

  export interface AstronomerProfile {
    equipment: 'naked-eye' | 'binoculars' | 'small-telescope' | 'large-telescope'
    environment: 'city' | 'suburb' | 'rural' | 'remote'
    interests: Array<'planets' | 'moon' | 'deep-sky' | 'astrophotography' | 'learning'>
    location: { lat: number; lon: number } | null
    completedAt: string
  }

---

Step 2 — Create src/hooks/useAstronomerProfile.ts:

  'use client' (add directive at top)

  const STORAGE_KEY = 'stellar-astronomer-profile'

  export function useAstronomerProfile() {
    const [profile, setProfileState] = useState<AstronomerProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setProfileState(JSON.parse(raw))
      } catch { /* ignore */ }
      setLoading(false)
    }, [])

    const saveProfile = useCallback((p: AstronomerProfile) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      setProfileState(p)
    }, [])

    const resetProfile = useCallback(() => {
      localStorage.removeItem(STORAGE_KEY)
      setProfileState(null)
    }, [])

    return {
      profile,
      loading,
      saveProfile,
      resetProfile,
      hasCompletedOnboarding: !loading && !!profile,
    }
  }

---

Step 3 — Create src/components/onboarding/OnboardingQuiz.tsx:

'use client'

Props: { onComplete: (profile: AstronomerProfile) => void }

State: step: 1 | 2 | 3 | 'loading', + selected values per step, location state

Full-screen overlay: fixed inset-0, bg var(--bg-deep), z-50, flex flex-col

Top bar:
  Step dots — 3 small circles, w-6 h-1.5 rounded-full
  Completed: bg var(--accent), Current: bg var(--accent) (slightly wider?), Future: bg var(--border-strong)
  flex justify-center gap-2, pt-6

Content: flex-1, flex flex-col items-center justify-center, px-6, max-w-md mx-auto w-full

All screens share:
  Title: text-2xl font-bold font-display text-primary
  Subtitle: text-sm text-secondary font-body mt-1.5 mb-6
  Each screen: key={step} + animate-fade-in class (triggers re-animation on step change)

Screen 1 — "What do you observe with?":
  4 option cards in 2x2 grid (grid-cols-2 gap-3):
    { id: 'naked-eye',       emoji: '👁️',  label: 'Naked Eye',       desc: 'No equipment' }
    { id: 'binoculars',      emoji: '🔭',  label: 'Binoculars',      desc: '7x50 or similar' }
    { id: 'small-telescope', emoji: '🌌',  label: 'Small Telescope', desc: 'Under 5" aperture' }
    { id: 'large-telescope', emoji: '⭐',  label: 'Large Telescope', desc: '5"+ aperture' }
  Each card: card-base p-4 text-center cursor-pointer
    emoji text-3xl, label text-sm font-semibold font-display mt-2, desc text-[11px] text-muted
    Selected: border-color var(--accent), background var(--accent-dim), box-shadow var(--shadow-glow-accent)
  Request geolocation in background: navigator.geolocation.getCurrentPosition(...)

Screen 2 — "Where do you observe?":
  4 option cards:
    { id: 'city',   emoji: '🏙️', label: 'City',   desc: 'Bortle 8–9' }
    { id: 'suburb', emoji: '🏘️', label: 'Suburb', desc: 'Bortle 5–7' }
    { id: 'rural',  emoji: '🌾', label: 'Rural',  desc: 'Bortle 3–4' }
    { id: 'remote', emoji: '⛰️', label: 'Remote', desc: 'Bortle 1–2' }
  If location obtained: badge-pill badge-success "📍 Location detected" below grid

Screen 3 — "What excites you most?" (multi-select):
  Subtitle: "Pick one or more"
  5 pill options (flex flex-wrap justify-center gap-2):
    { id: 'planets', emoji: '🪐', label: 'Planets' }
    { id: 'moon', emoji: '🌙', label: 'The Moon' }
    { id: 'deep-sky', emoji: '🌌', label: 'Deep Sky' }
    { id: 'astrophotography', emoji: '📷', label: 'Astrophotography' }
    { id: 'learning', emoji: '📚', label: 'Learning' }
  Each: btn-ghost rounded-full px-4 py-2 text-sm flex items-center gap-2
    Selected: btn-accent-ghost

Loading screen:
  <LoadingRing size={80} />
  "Building your sky profile..." font-display text-lg font-semibold mt-4
  After 2800ms: build AstronomerProfile and call onComplete(profile)

Continue button (all screens):
  btn-primary full-width mt-6
  Screen 1+2: "Continue →"
  Screen 3: "Start Exploring →"
  Disabled until selection(s) made (opacity 0.35)

---

Step 4 — Create src/components/onboarding/OnboardingGate.tsx:

'use client'

  import { useAstronomerProfile } from '@/hooks/useAstronomerProfile'
  import OnboardingQuiz from './OnboardingQuiz'
  import { usePrivy } from '@privy-io/react-auth'  // or whatever auth hook this project uses — check missions/page.tsx

  interface OnboardingGateProps { children: React.ReactNode }

  export default function OnboardingGate({ children }: OnboardingGateProps) {
    const { profile, loading, saveProfile, hasCompletedOnboarding } = useAstronomerProfile()
    const { authenticated, ready } = usePrivy()  // adapt to actual auth hook

    if (!ready || loading) return null

    if (authenticated && !hasCompletedOnboarding) {
      return <OnboardingQuiz onComplete={saveProfile} />
    }

    return <>{children}</>
  }

Read src/app/missions/page.tsx to understand the exact auth hook pattern — mirror it exactly.

---

Verify: npm run build passes. Do NOT integrate into app layout yet.
```

---

### PROMPT U12 — Authenticated Dashboard (Sky Score Hero Home Screen)

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. Authenticated users need a personalized home screen instead of the generic landing page. Like ShutEye's home screen — a Sky Score ring, tonight's conditions, 7-day forecast strip, quick stats.

Read these files FULLY before writing anything:
  src/app/page.tsx (the ENTIRE file — every line)
  src/app/layout.tsx
  src/components/ui/ScoreRing.tsx
  src/components/ui/StatCard.tsx
  src/components/ui/ForecastStrip.tsx
  src/components/ui/StreakBadge.tsx
  src/components/ui/LoadingRing.tsx
  src/components/onboarding/OnboardingGate.tsx
  src/components/onboarding/OnboardingQuiz.tsx
  src/hooks/useAstronomerProfile.ts
  src/lib/sky-score.ts
  src/lib/types.ts
  src/app/sky/page.tsx (understand sky data format + API routes used)
  src/app/missions/page.tsx (understand auth pattern + data access)
  src/app/globals.css

Also list: src/hooks/ and src/lib/ directories.

---

Step 1 — Create src/components/dashboard/Dashboard.tsx:

'use client'

This is the authenticated home screen. Single column, max-w-lg mx-auto, px-4 py-6 space-y-5.
Wrap in <PageTransition>.

Data fetching (useEffect on mount):
  Get location from useAstronomerProfile().profile?.location OR default to {lat: 41.72, lon: 44.83}
  a) Sky score: fetch(`/api/sky/score?lat=${lat}&lon=${lon}`) → setSkyScore(result)
  b) Forecast: fetch(`/api/sky/forecast?lat=${lat}&lon=${lon}`) → map to ForecastDay[] format
     If forecast route doesn't exist, use /api/sky/verify as fallback → create a single-day ForecastDay
  c) Stars + missions: use the same pattern as missions/page.tsx to get user stats
  d) Planet data: fetch(`/api/sky/planets?lat=${lat}&lon=${lon}`) → if this route doesn't exist, skip gracefully

State:
  skyScore: SkyScoreResult | null
  forecast: ForecastDay[]
  loading: boolean (true initially)
  starsBalance: number
  missionsCount: number
  streakDays: number (0 if not tracked yet)

Loading state: Show <LoadingRing message="Reading the sky..." className="py-16 mx-auto" />

SECTION 1 — Greeting + Sky Score (animate-fade-in stagger-1):
  Top row: flex items-center justify-between
    Left: greeting text — "Good evening, {rank}" or "Good morning, Observer"
      (determine "morning/afternoon/evening/night" from new Date().getHours())
      text-sm text-secondary font-body
    Right: <StreakBadge days={streakDays} />

  ScoreRing centered (mt-4):
    size=180, value=skyScore?.score ?? 0, color="gradient"
    label="Sky Score", sublabel=skyScore?.grade ?? "Loading..."
    animate=true

  Grade row below ring (mt-3 text-center):
    {skyScore?.emoji} {skyScore?.grade} — text-sm text-secondary font-body

SECTION 2 — Forecast (animate-slide-up stagger-2):
  "This Week" — section label (text-[11px] uppercase tracking-widest font-display text-secondary mb-2)
  <ForecastStrip days={forecast} />
  If forecast is empty: 7 placeholder pill dots in a row (skeleton-like, bg border-subtle rounded-full)

SECTION 3 — Planets visible tonight (animate-slide-up stagger-3):
  "Visible Tonight" — section label
  Horizontal scroll row, gap-2:
    If planet data: each planet card-base min-w-[90px] p-3 text-center flex-shrink-0
      Planet emoji (text-2xl)
      Name (text-xs font-semibold font-display)
      Rise/transit info (text-[10px] text-muted font-mono)
    If no planet route or no data: 3 fallback cards for Moon, Jupiter, Saturn with "–" times

SECTION 4 — Your Stats (animate-slide-up stagger-4):
  grid grid-cols-3 gap-2:
    StatCard: label="Missions", value={missionsCount}, icon=<Telescope size={16}/>, accentColor="var(--accent)"
    StatCard: label="Stars ✦", value={starsBalance}, icon=<Star size={16}/>, accentColor="var(--stars)"
    StatCard: label="Rank", value={rankName}, icon=<Award size={16}/>, accentColor="var(--accent)"
  (rankName: determine from missionsCount same as profile page)

SECTION 5 — Quick Actions (animate-slide-up stagger-5):
  grid grid-cols-2 gap-3:
    <Link href="/missions">
      div: btn-accent-ghost w-full py-3 rounded-xl text-center text-sm font-display font-semibold
      "🔭 Start Mission"
    <Link href="/chat">
      div: similar styling but use var(--accent-dim) bg + var(--accent-border) border
      "✦ Ask ASTRA"

---

Step 2 — Update src/app/page.tsx:

Read the ENTIRE existing page.tsx.
Understand the auth hook pattern (usePrivy or equivalent).
Import: Dashboard, OnboardingGate.

Conditional render:
  if (!ready): return <LoadingRing className="min-h-screen flex items-center justify-center" />
  if (authenticated): return <OnboardingGate><Dashboard /></OnboardingGate>
  if (!authenticated): return [existing landing page JSX — keep ALL of it unchanged]

CRITICAL: The existing landing page code must not be changed or removed. Wrap it in the else branch.
The page must be 'use client' — check if it already is, add if needed.

---

Verify:
  npm run build passes.
  Unauthenticated → landing page (unchanged).
  Authenticated, first time → OnboardingQuiz → Dashboard.
  Authenticated, returning → Dashboard directly.
  Dashboard loads sky score and renders ScoreRing correctly.
  If any API is missing: graceful fallback, never crash.
```

---

---

## PHASE 4 — MISSION FLOW & CELEBRATION

---

### PROMPT U13 — Mission Flow Visual Upgrade (Step Indicator + Verification ScoreRing)

```
I'm building Stellar, a Next.js 15 astronomy app. The mission observation flow (MissionActive.tsx + Verification.tsx) needs visual upgrades to feel like a premium mobile app. Currently it likely shows spinners and plain text during key moments.

Read these files FULLY before writing anything:
  src/components/sky/MissionActive.tsx (the ENTIRE file — every step, every state value, every handler)
  src/components/sky/Verification.tsx (the ENTIRE file)
  src/components/ui/ScoreRing.tsx
  src/components/ui/LoadingRing.tsx
  src/lib/sky-score.ts (calculateSkyScore, visibilityToMeters)
  src/lib/types.ts
  src/app/globals.css

Do NOT modify: handleMint(), handleCapture(), handleVerify(), any API calls, blockchain interactions, step flow order, or state management.
Only modify: the JSX render of each step's visual content.

---

Step 1 — Read MissionActive.tsx fully. Identify:
  - All possible step/state values (idle, briefing, camera, uploading, verifying, verified, minting, done, error — or whatever names are used)
  - The current step variable name and type
  - All props passed down
  - Where the main overlay/modal renders

---

Step 2 — Add step progress indicator at the top of the overlay:

Define outside component:
  const MISSION_STEPS = [
    { label: 'Brief', key: ['idle', 'briefing'] },
    { label: 'Capture', key: ['camera', 'uploading'] },
    { label: 'Verify', key: ['verifying', 'verified'] },
    { label: 'Seal', key: ['minting'] },
    { label: 'Done', key: ['done'] },
  ]
  Adapt key arrays to the actual state values found in the file.

  getCurrentStepIndex(step: string): number — returns index 0–4

Render at the very top of the overlay JSX (before any step-specific content):
  div: flex items-center justify-center gap-0 px-6 pt-5

  For each MISSION_STEPS entry:
    Dot: w-2 h-2 rounded-full transition-all duration-300
      Completed (index < current): bg var(--accent), opacity-1
      Current (index === current): w-2.5 h-2.5, bg var(--accent), box-shadow var(--shadow-glow-accent)
      Future (index > current): bg var(--border-strong), opacity-0.4

    Connector (between dots): flex-1, h-px
      mx-1, bg:
        Completed connectors: var(--accent) opacity-0.5
        Upcoming: var(--border-subtle)

  Below dots (text-center, mt-1.5):
    MISSION_STEPS[current].label — text-[10px] font-mono text-muted uppercase tracking-widest

---

Step 3 — Upgrade the 'verifying' render:

Find the JSX block rendered when step === 'verifying' (or equivalent).
Replace any spinner with:
  div: flex flex-col items-center gap-4 py-8
  <LoadingRing size={72} message="Analyzing sky conditions..." />
  p: "This may take a moment" text-[11px] text-muted font-body mt-2

---

Step 4 — Upgrade the 'verified' render in Verification.tsx:

Read Verification.tsx fully. Understand the sky data prop shape — what fields exist.

At the VERY TOP of the component render (before the existing metric grid):
  Calculate sky score:
    const skyInput = {
      cloudCover: sky.cloudCover,  // adapt to actual field name
      visibility: typeof sky.visibility === 'string' ? visibilityToMeters(sky.visibility) : (sky.visibility ?? 10000),
      humidity: sky.humidity ?? 50,
      windSpeed: sky.windSpeed ?? 5,
    }
    const skyScore = calculateSkyScore(skyInput)

  Render above existing metric grid:
    div: flex justify-center mb-4
    <ScoreRing size={120} value={skyScore.score} color="gradient"
      label="Sky Score" sublabel={skyScore.grade} />

  Do NOT remove the existing metric grid — the ScoreRing goes above it.

---

Step 5 — Upgrade the 'minting' render:

Replace any spinner with:
  div: flex flex-col items-center gap-4 py-8
  <LoadingRing size={80} facts={undefined} message="Sealing your discovery on Solana..." />
  p: mission.emoji + " " + mission.name — text-base font-display font-semibold text-primary
  p: "Your NFT is being minted — this takes up to 60 seconds" — text-xs text-muted font-body mt-3

---

Verify: npm run build passes. Every step still advances correctly. Mint still works.
```

---

### PROMPT U14 — Success Screen + Confetti (The Dopamine Hit)

```
I'm building Stellar, a Next.js 15 astronomy app. The mission success screen is the single most important moment in the app — when a user mints their first NFT. It needs to feel like leveling up in a premium mobile game. Currently it probably shows a plain success message.

Read these files FULLY before writing anything:
  src/components/sky/MissionActive.tsx (find the 'done' step render block — read it fully)
  src/app/globals.css (check for existing animation keyframes)
  src/lib/types.ts
  The SkyScoreResult shape from src/lib/sky-score.ts

Do NOT change: NFT data, Explorer links, Stars earned, onClose handler, Farcaster share button (if exists).
Only redesign the JSX for step === 'done'.

---

Step 1 — Add confetti keyframe to globals.css (if not already there):

@keyframes confettiBurst {
  0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
}

---

Step 2 — Redesign the 'done' step JSX:

Full-screen or modal overlay background:
  background: radial-gradient(ellipse at center, rgba(56,240,255,0.05) 0%, transparent 60%), var(--bg-base)

Confetti burst (render 16 divs, no library, CSS-only):
  Each: position absolute, top 50%, left 50%
  w-2 h-2 rounded-sm (mix circle and square — alternate index % 2)
  Colors: cycle through [var(--accent), var(--stars), var(--success), #A855F7, #F87171] using index % 5
  CSS custom properties (inline style):
    --tx: random -80px to +80px (deterministic: use index to calculate, e.g. index * 23 - 80)
    --ty: random -120px to +40px (e.g. -(index * 17 + 30) for varied heights)
    --rot: (index * 45)deg
  animation: confettiBurst 800ms var(--ease-out-expo) both
  animationDelay: (index * 40)ms
  pointer-events-none

Content (flex flex-col items-center gap-4, text-center, relative z-10):

  0ms — Checkmark circle (animate-scale-in):
    w-20 h-20 rounded-full bg-accent-dim border-2 border-accent flex items-center justify-center
    Inside: SVG checkmark that draws itself
      path d="M6 12 l4 4 l8-8" stroke var(--accent) strokeWidth 2.5 strokeLinecap round strokeLinejoin round fill none
      stroke-dasharray 24, stroke-dashoffset 24
      CSS transition stroke-dashoffset 600ms var(--ease-out-expo) delay 200ms → 0

  200ms — Title (animate-slide-up stagger-1):
    "Discovery Sealed" — text-2xl font-bold font-display text-primary
    "✦" inline in text-accent

  400ms — Target info (animate-fade-in stagger-2):
    mission emoji + mission name — text-base text-secondary font-body

  600ms — Stars counter (animate-scale-in stagger-3):
    "+{starsEarned} ✦" — text-4xl font-bold font-mono text-stars
    Add animate-glow-pulse (stars golden glow pulsing)

  800ms — Sky Score (if skyScore was captured during verify step):
    Pass skyScore through state from verified → done
    If available: small ScoreRing size=80 strokeWidth=6 value={skyScore.score} sublabel={skyScore.grade}
    If not available: skip this

  1000ms — Explorer link (animate-fade-in stagger-5):
    If txSignature exists: "View on Solana Explorer" text-xs text-accent hover:underline
      ExternalLink icon 12px inline

  1200ms — Action buttons (animate-slide-up stagger-6):
    btn-primary full-width "View My NFTs → /nfts"
    btn-ghost full-width "Continue Exploring"
    If Farcaster share exists: keep it, add purple accent styling

Spacing: py-12 px-6, max-w-xs mx-auto

Verify: npm run build passes. All buttons still work. Explorer links still open correctly.
```

---

---

## PHASE 5 — COMPETITIVE DIFFERENTIATORS ✅ COMPLETE (2026-04-12)

---

### PROMPT U15 — Social Share Cards (Observations go viral)

```
I'm building Stellar, a Next.js 15 astronomy app on Solana. I need a social share feature — when a user mints an observation NFT, they can share it to X (Twitter) or Farcaster. The share should generate a beautiful card image using the existing observation metadata.

Read these files FULLY before writing anything:
  src/components/sky/MissionActive.tsx (the 'done' step — where share button will go)
  src/app/nfts/page.tsx (NFT data shape)
  src/lib/types.ts (NFT/observation types)
  src/app/globals.css (CSS variables)

---

Step 1 — Create src/app/api/share/og/route.tsx:

This is a Next.js ImageResponse route (uses next/og) that generates a 1200x630 Open Graph image.

Query params:
  target: string (e.g. "Moon", "Jupiter")
  score: string (e.g. "78")
  grade: string (e.g. "Excellent")
  stars: string (e.g. "150")
  date: string (ISO)
  emoji: string (e.g. "🌙")

Check if next/og (ImageResponse) is available in this Next.js 15 project:
  import { ImageResponse } from 'next/og'
  If not available, skip this step and note it in a comment.

Image design (1200x630):
  Background: dark navy gradient (#050810 → #0D1117)
  Top-left: "STELLAR" wordmark (text-5xl font-bold, color: #38F0FF)
  Top-right: "stellarrclub.vercel.app" (text-xl, color: rgba(255,255,255,0.4))
  Center: large emoji (target) text-[120px]
  Below emoji: "{target} Observation" text-4xl font-bold white
  Score ring (CSS simulation — div with border-radius):
    Circular div, border 6px solid #38F0FF, width 100 height 100
    Inside: "{score}" text-3xl font-bold #38F0FF
  Grade: "{grade}" text-2xl color #34D399
  Bottom: "✦ {stars} Stars earned · Sealed on Solana" text-xl color rgba(255,255,255,0.6)
  Bottom-right: Solana logo color "#9945FF" with "Solana" text

Return new ImageResponse(jsx, { width: 1200, height: 630 })

---

Step 2 — Create src/lib/share.ts:

  export function buildShareImageUrl(params: {
    target: string, score: number, grade: string, stars: number, date: string, emoji: string
  }): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'
    const q = new URLSearchParams({
      target: params.target,
      score: String(params.score),
      grade: params.grade,
      stars: String(params.stars),
      date: params.date,
      emoji: params.emoji,
    })
    return `${base}/api/share/og?${q}`
  }

  export function buildTwitterShareUrl(params: {
    target: string, score: number, grade: string, stars: number, appUrl: string
  }): string {
    const text = `I just sealed my ${params.target} observation on Stellar! Sky Score: ${params.score}/100 (${params.grade}) · Earned ✦${params.stars} Stars 🔭\n\n@StellarrClub #Solana #Astronomy`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(params.appUrl)}`
  }

  export function buildFarcasterShareUrl(params: {
    target: string, score: number, stars: number, appUrl: string
  }): string {
    const text = `Sealed my ${params.target} observation on @StellarrClub! Sky Score ${params.score}/100 · ✦${params.stars} Stars earned on Solana`
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(params.appUrl)}`
  }

---

Step 3 — Add share buttons to the 'done' success screen in MissionActive.tsx:

Read the 'done' step's current buttons. After the existing buttons, add:

  A "Share" row (flex gap-2, full width):

  X (Twitter) button:
    btn-ghost with Twitter bird icon (X icon or "𝕏" text) + "Share on X"
    onClick: window.open(buildTwitterShareUrl({...}), '_blank')

  If Farcaster button doesn't already exist:
    btn-ghost with "⬡ Farcaster" text, purple tint (border purple/30)
    onClick: window.open(buildFarcasterShareUrl({...}), '_blank')

  Pass mission data (target name, sky score, stars earned) from component state.

---

Verify: npm run build passes. Share URLs open correctly. No existing functionality broken.
```

---

### PROMPT U16 — Daily Sky Check-In (Daily Engagement Hook)

```
I'm building Stellar, a Next.js 15 astronomy app. DRiP has daily NFT drops. Moonwalk has daily step goals. Stellar needs a daily hook. I need a "Tonight's Sky Check-In" feature — users tap one button daily to log the conditions. Simple, quick, builds streak.

Read these files FULLY before writing anything:
  src/app/missions/page.tsx (understand page layout + auth + data patterns)
  src/components/ui/ (available components)
  src/lib/sky-score.ts
  src/lib/types.ts
  src/app/globals.css

This is a new feature. Keep it minimal — do not add to missions page if it already has a lot going on. Add it to the dashboard (src/components/dashboard/Dashboard.tsx) instead, as a new section.

---

Step 1 — Create src/lib/daily-checkin.ts:

  const CHECKIN_KEY = 'stellar-daily-checkins'

  export interface DailyCheckIn {
    date: string           // YYYY-MM-DD
    skyScore?: number
    skyGrade?: string
    lat?: number
    lon?: number
  }

  export function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  export function getCheckIns(): DailyCheckIn[] {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(CHECKIN_KEY) ?? '[]') } catch { return [] }
  }

  export function hasCheckedInToday(): boolean {
    return getCheckIns().some(c => c.date === getTodayKey())
  }

  export function saveCheckIn(data: Omit<DailyCheckIn, 'date'>): void {
    const all = getCheckIns().filter(c => c.date !== getTodayKey())
    all.push({ ...data, date: getTodayKey() })
    // Keep last 365 days
    const recent = all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 365)
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(recent))
  }

  export function getStreakDays(): number {
    const checkIns = getCheckIns().sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    const today = getTodayKey()
    for (let i = 0; i < checkIns.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().slice(0, 10)
      if (checkIns[i]?.date === expectedStr) streak++
      else break
    }
    return streak
  }

---

Step 2 — Create src/components/dashboard/DailyCheckIn.tsx:

'use client'

Props: { lat: number; lon: number; onCheckIn?: () => void }

State: checked (boolean), skyScore (SkyScoreResult | null), loading (boolean)

On mount: check hasCheckedInToday() → if yes, set checked=true, show "Checked in today" state.

UI — card-base p-4 (two states):

NOT CHECKED IN:
  Flex items-center justify-between
  Left: "🔭" text-2xl + flex col gap-0.5
    "Tonight's Check-In" text-sm font-semibold font-display
    "Log tonight's sky conditions" text-xs text-secondary
  Right: btn-primary "Check In" py-2 px-4 text-sm
    onClick:
      setLoading(true)
      fetch sky score from /api/sky/score?lat=&lon=
      saveCheckIn({ skyScore: result.score, skyGrade: result.grade, lat, lon })
      setChecked(true), setSkyScore(result), setLoading(false)
      onCheckIn?.()
  During loading: loading spinner inside button, disabled

CHECKED IN:
  Flex items-center gap-3
  Left: w-10 h-10 rounded-full bg-success-dim flex items-center justify-center text-success "✓" text-lg
  Center: flex col
    "Checked in today" text-sm font-semibold font-display text-success
    if skyScore: "{score}/100 · {grade}" text-xs text-secondary
    "Come back tomorrow to continue your streak" text-xs text-muted
  Right: badge-pill badge-success "{streak} day streak"

---

Step 3 — Integrate into Dashboard:

In src/components/dashboard/Dashboard.tsx:
  Import DailyCheckIn from '@/components/dashboard/DailyCheckIn'
  Import getStreakDays, hasCheckedInToday from '@/lib/daily-checkin'

  In state: add streakDays (initialize from getStreakDays())
  After check-in: refresh streakDays and update StreakBadge

  Add <DailyCheckIn lat={lat} lon={lon} onCheckIn={() => setStreakDays(getStreakDays())} />
  as SECTION 0 (very first section, before score ring) — or between score and forecast.

---

Verify: npm run build passes. Check-in state persists across refresh. Streak counts correctly.
```

---

---

## APPENDIX — WHAT WE STOLE AND WHY

| App | Pattern Taken | Applied In |
|---|---|---|
| **Phantom** | Skeleton loading everywhere | U3 |
| **Phantom** | Passkey → silent wallet (already via Privy) | Existing |
| **Phantom** | Receipt-style success screen | U14 |
| **Jupiter** | Monospace font for all numbers | U1 |
| **Jupiter** | ONE primary accent color discipline | U1 |
| **Jupiter** | Inline errors, not modals | All prompts |
| **DRiP** | 2-col NFT grid with image-heavy cards | U8 |
| **DRiP** | Daily claim mechanic with countdown | U16 |
| **DRiP** | Rarity pills on NFT cards | U8 |
| **DRiP** | XP/level always visible in nav | U9 |
| **Moonwalk** | Rank badge with gradient border by tier | U9 |
| **Moonwalk** | Streak flame counter | U2, U16 |
| **Moonwalk** | Challenge cards with left difficulty stripe | U7 |
| **Moonwalk** | 3-column stats grid on profile | U9 |
| **StepN** | Achievement unlock celebration animation | U14 |
| **Magic Eden** | Collection banner + stats row | U8 |
| **ShutEye** | Circular score ring as hero metric | U2, U5, U12 |
| **ShutEye** | Personalization quiz on first run | U11 |
| **ShutEye** | Authenticated home vs marketing page | U12 |
| **Phantom/DRiP** | Social share card generation | U15 |

## DESIGN DECISIONS (Don't debate these mid-execution)

1. **ONE accent: teal #38F0FF.** Gold is Stars-only. Period.
2. **Plus Jakarta Sans** for display — tech product, not editorial. Modern, sharp, premium.
3. **DM Sans** for body — clean, readable, highly legible at 13–15px.
4. **JetBrains Mono** for all numbers, addresses, scores — alignment and credibility.
5. **Card radius 16px** — Phantom uses 12–16px. Magic Eden uses 12px. 16px is the sweet spot for a product that's warm but professional.
6. **Glass morphism sparingly** — hero elements and modals only. Overused glass looks cheap.
7. **Animations under 500ms** — anything slower feels like lag. Phantom does 200–350ms. We do 250–500ms.
8. **No emojis as decorations** — emojis only when they carry meaning (planet names, mission targets, loading facts). Never as generic decorations.

---

*Generated April 12, 2026. Based on deep analysis of Phantom, Jupiter, DRiP, Moonwalk Fitness, StepN, Tensor, Magic Eden, and Phantom Collectibles Gallery. Benchmarked against Colosseum Frontier hackathon consumer track criteria.*
