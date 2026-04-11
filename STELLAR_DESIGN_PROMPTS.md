# STELLAR — Design & UX Upgrade Prompts
## ShutEye-Inspired Consumer App Transformation

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
**Goal:** Transform Stellar from hackathon project into polished consumer app
**Prerequisite:** Prompts 1–6 from LATEST_PROMPTS.md should be complete (core on-chain loop working)

> HOW TO USE: One new conversation per prompt. Run in order. Each prompt builds on the previous.
> These prompts are DESIGN-ONLY — they do not touch blockchain logic, API routes, or mint flows.
> Every prompt starts with "Read these files before writing anything" — this is critical for Claude Code to understand existing patterns.

---

## PHASE 1 — Design Foundation: Typography, Colors, Components

---

### PROMPT D1 — Typography + Color System + CSS Variables

```
I'm building Stellar, a Next.js 15 + React 19 + Tailwind CSS 4 astronomy app. I need to upgrade the visual foundation: typography, color system, and global CSS variables. The app has a dark space theme (bg #070B14). I want it to feel like a premium consumer app — think ShutEye or Oura Ring — not a hackathon prototype.

Read these files before writing anything:
  src/app/layout.tsx
  src/app/globals.css
  tailwind.config.ts (or tailwind.config.js — check which exists)
  src/app/page.tsx (to understand current styling patterns)
  package.json (check current font setup)

---

Step 1 — Add Google Fonts to src/app/layout.tsx:

Import from next/font/google:
  import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google'

Configure:
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

Add all three font variables to the <html> or <body> className:
  className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable}`}

Do NOT remove any existing class names from <html> or <body> — append to them.

---

Step 2 — Add CSS custom properties to src/app/globals.css:

Add this block at the very top of the file, BEFORE any existing @tailwind or @import directives. If :root already exists, merge into it — do not create a duplicate :root block.

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

  /* Accents */
  --accent-teal: #34D399;
  --accent-teal-dim: rgba(52, 211, 153, 0.12);
  --accent-teal-glow: rgba(52, 211, 153, 0.25);
  --accent-gold: #FFD166;
  --accent-gold-dim: rgba(255, 209, 102, 0.12);
  --accent-cyan: #38F0FF;
  --accent-cyan-dim: rgba(56, 240, 255, 0.10);
  --accent-amber: #F59E0B;
  --accent-red: #EF4444;
  --accent-purple: #8B5CF6;

  /* Gradients */
  --gradient-score: linear-gradient(135deg, #34D399 0%, #38F0FF 100%);
  --gradient-gold: linear-gradient(135deg, #FFD166 0%, #F59E0B 100%);
  --gradient-card: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-glow-teal: 0 0 20px rgba(52, 211, 153, 0.15);
  --shadow-glow-gold: 0 0 20px rgba(255, 209, 102, 0.15);

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Typography scale */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Transitions */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 500ms;
}

Then add these utility classes AFTER existing styles (do not overwrite anything):

/* Typography utilities */
.font-display { font-family: var(--font-display); }
.font-body { font-family: var(--font-body); }
.font-mono { font-family: var(--font-mono); }

/* Card base */
.card-base {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.card-base:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-strong);
}

/* Glow effects */
.glow-teal { box-shadow: var(--shadow-glow-teal); }
.glow-gold { box-shadow: var(--shadow-glow-gold); }

/* Smooth page transitions */
.page-enter {
  animation: pageEnter var(--duration-normal) var(--ease-out-expo) forwards;
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Stagger animation utility */
.stagger-1 { animation-delay: 50ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 150ms; }
.stagger-4 { animation-delay: 200ms; }
.stagger-5 { animation-delay: 250ms; }

---

Step 3 — Update Tailwind config:

Read the existing tailwind config file. Extend the theme (do not replace):
  - Add fontFamily: { display: ['var(--font-display)'], body: ['var(--font-body)'], mono: ['var(--font-mono)'] }
  - Add colors if not already extended: surface: '#0D1117', card: '#111827'
  - Add borderRadius: { 'xl': '16px', '2xl': '20px' } (if not already there)

If using Tailwind CSS 4 with @theme, adapt accordingly — read the config format first.

---

Step 4 — Update global body styles:

In globals.css, update the body rule (or add if missing):
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
    letter-spacing: -0.02em;
  }

  code, pre, .mono {
    font-family: var(--font-mono);
  }

Do NOT change any existing Tailwind @import or @tailwind directives.
Do NOT remove any existing CSS rules — only add new ones.
Do NOT modify any page files in this prompt — only layout.tsx, globals.css, and tailwind config.

Verify the app still builds: run `npm run build` after changes. Fix any errors.
```

---

### PROMPT D2 — ScoreRing + StatCard + LoadingRing Components

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. I need three foundational UI components that will be reused across the entire app. These are inspired by ShutEye's circular score visualizations and data cards.

Read these files before writing anything:
  src/app/globals.css (for CSS variables — use them, don't hardcode colors)
  src/components/ (list the directory to understand existing component structure)
  src/app/layout.tsx (check font setup from Prompt D1)

---

Step 1 — Create src/components/ui/ScoreRing.tsx:

'use client' component.

Props interface:
  interface ScoreRingProps {
    value: number           // 0–100 (or 0–max)
    max?: number            // default 100
    size?: number           // px, default 160
    strokeWidth?: number    // px, default 8
    color?: string          // CSS color or gradient ID, default 'var(--accent-teal)'
    glowColor?: string      // glow color, default 'var(--accent-teal-glow)'
    label?: string          // text below the number, e.g. "Sky Score"
    sublabel?: string       // smaller text below label, e.g. "Excellent conditions"
    animate?: boolean       // default true — animate on mount
    showPercent?: boolean   // show % symbol after number, default false
    children?: React.ReactNode  // optional center content override
  }

Implementation:
  - SVG with viewBox = `0 0 ${size} ${size}`
  - Background circle: stroke var(--border-subtle), strokeWidth, no fill, opacity 0.3
  - Foreground arc: stroke = color prop, strokeWidth, strokeLinecap="round"
    - stroke-dasharray = circumference
    - stroke-dashoffset = circumference * (1 - value / max)
    - If animate=true: CSS transition on stroke-dashoffset, 1200ms ease-out-expo, starting from circumference (empty)
    - Use useEffect with requestAnimationFrame to trigger animation on mount
  - Center content (HTML overlay, absolutely positioned):
    - If children prop exists: render children
    - Otherwise: large number (font-display, font-bold, text size = size/4 px), + label + sublabel
  - SVG gradient definition (id="scoreGradient"):
    <defs>
      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#38F0FF" />
      </linearGradient>
    </defs>
    If color prop is "gradient", use stroke="url(#scoreGradient)"
  - Glow: apply a subtle filter drop-shadow matching glowColor

  - The number should animate from 0 to value over 1000ms (use useState + useEffect + requestAnimationFrame counter)
  - On value change: re-animate

Export default ScoreRing.

---

Step 2 — Create src/components/ui/StatCard.tsx:

'use client' component.

Props interface:
  interface StatCardProps {
    icon?: React.ReactNode    // lucide icon or emoji
    label: string             // e.g. "Observations"
    value: string | number    // e.g. "12" or 12
    suffix?: string           // e.g. "✦" or "days"
    trend?: 'up' | 'down' | 'neutral'  // optional trend indicator
    trendValue?: string       // e.g. "+3 this week"
    accentColor?: string      // border accent, default var(--accent-teal)
    onClick?: () => void
    className?: string
  }

Implementation:
  - Container: card-base class (from globals.css) + padding 16px + optional onClick cursor-pointer
  - Left accent: 2px wide vertical bar on the left edge, color = accentColor
  - Layout: vertical stack
    - Top row: icon (20x20, opacity 0.5) + label (text-xs, text-secondary, uppercase, tracking-wide, font-body)
    - Value row: value + suffix (text-2xl, font-display, font-bold, text-primary)
    - If trend exists: small row with arrow icon (TrendingUp/TrendingDown from lucide) + trendValue text
      - up = var(--accent-teal), down = var(--accent-red), neutral = var(--text-muted)
  - Hover: slight scale(1.01) + border-color change (use CSS transition)

Export default StatCard.

---

Step 3 — Create src/components/ui/LoadingRing.tsx:

'use client' component.

Props interface:
  interface LoadingRingProps {
    progress?: number         // 0–100, if undefined show indeterminate spin
    size?: number             // px, default 80
    message?: string          // current fact/status text
    facts?: string[]          // rotating astronomy facts
    factInterval?: number     // ms between fact rotations, default 3000
  }

Implementation:
  - If progress is defined: show a ScoreRing with that value, no label
  - If progress is undefined: show an indeterminate spinning ring
    - SVG circle with stroke-dasharray creating a gap, rotating via CSS animation (360deg, 1.5s linear infinite)
  - Below the ring: message text (or cycling facts)
  - Facts cycling: useState for currentFactIndex, useEffect with setInterval rotating through facts array
    - Fade transition between facts (opacity 0 → 1, 300ms)
  - Default facts (if not provided):
    [
      "Jupiter has 95 known moons",
      "Saturn's rings would stretch from Earth to the Moon",
      "The Orion Nebula is 1,344 light-years away",
      "Light from the Andromeda Galaxy left 2.5 million years ago",
      "A teaspoon of neutron star weighs 6 billion tons",
      "The Sun makes up 99.86% of the Solar System's mass",
      "There are more stars in the universe than grains of sand on Earth",
      "The Milky Way and Andromeda will merge in 4.5 billion years"
    ]
  - Container: flex column, items-center, gap-3

Export default LoadingRing.

---

Step 4 — Create src/components/ui/ForecastStrip.tsx:

'use client' component.

Props interface:
  interface ForecastDay {
    date: string              // ISO date string or display label
    dayLabel: string          // "Mon", "Tue", etc.
    cloudCover: number        // 0–100
    badge: 'go' | 'maybe' | 'skip'
  }
  interface ForecastStripProps {
    days: ForecastDay[]
    onDayClick?: (day: ForecastDay) => void
    className?: string
  }

Implementation:
  - Horizontal flex row with gap-2, overflow-x auto, scrollbar-hide
  - Each day: 56px wide column, rounded-xl, padding 8px vertical, text-center
    - Day label (text-xs, font-body, text-secondary): "Mon"
    - Colored dot (w-3, h-3, rounded-full, mx-auto, my-1):
      go → var(--accent-teal), maybe → var(--accent-amber), skip → var(--accent-red)
    - Cloud cover (text-[10px], font-mono, text-muted): "15%"
  - Today's column: highlighted border (var(--accent-teal), 1px solid), slightly brighter bg
  - Determine "today" by comparing date to current date
  - On click: call onDayClick if provided
  - Subtle horizontal scroll shadow on edges (gradient overlay at left/right if content overflows)

Export default ForecastStrip.

---

Step 5 — Create src/components/ui/StreakBadge.tsx:

'use client' component.

Props interface:
  interface StreakBadgeProps {
    days: number
    frozen?: boolean          // streak was saved by cloudy night
    className?: string
  }

Implementation:
  - Inline flex, items-center, gap-1.5
  - Fire emoji: 🔥 (or snowflake ❄️ if frozen)
  - Day count: text-sm, font-display, font-bold
    - Color: days > 0 ? var(--accent-gold) : var(--text-muted)
  - "day streak" / "days streak" suffix: text-xs, text-secondary
  - If days === 0: show "No streak" in text-muted, no emoji
  - Subtle glow effect if days >= 7: golden shadow

Export default StreakBadge.

---

Verify all components compile: create a temporary test page at src/app/test-ui/page.tsx that renders all 5 components with sample data. Check it loads without errors. Delete the test page after verifying.

Do NOT modify any existing components or pages.
Do NOT install any new npm packages — all of this uses React, SVG, and CSS only.
```

---

## PHASE 2 — Dashboard & Onboarding

---

### PROMPT D3 — Sky Score Calculation + API Route

```
I'm building Stellar, a Next.js 15 astronomy app. I need a Sky Score system — a single 0–100 number that represents tonight's observing conditions, inspired by ShutEye's Sleep Score. This score will be the hero metric on the dashboard and in mission completion screens.

Read these files before writing anything:
  src/app/api/sky/verify/route.ts (understand existing sky verification data)
  src/app/api/sky/forecast/route.ts (if it exists — understand forecast data shape)
  src/lib/sky-data.ts (existing sky calculation functions)
  src/lib/types.ts (existing type definitions)

---

Step 1 — Create src/lib/sky-score.ts:

Export interface SkyScoreInput {
  cloudCover: number        // 0–100 percent
  visibility: number        // meters
  humidity: number           // 0–100 percent
  windSpeed: number          // m/s
  moonIllumination?: number  // 0–100 percent (optional — not always available)
  bortle?: number            // 1–9 (optional — user may not have set this)
}

Export interface SkyScoreResult {
  score: number              // 0–100
  grade: 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor'
  emoji: string              // grade emoji
  color: string              // CSS color for the score ring
  factors: {
    label: string
    value: number            // 0–100 subscale
    weight: number           // 0–1
    description: string
  }[]
}

Export function calculateSkyScore(input: SkyScoreInput): SkyScoreResult

Algorithm:
  1. Cloud factor (weight 0.40):
     score = Math.max(0, 100 - (input.cloudCover * 1.2))
     Clamp to 0–100.
     If cloudCover < 10 → 100 (perfect clear)
     If cloudCover > 80 → 0

  2. Visibility factor (weight 0.20):
     if visibility > 30000 → 100
     if visibility > 20000 → 85
     if visibility > 10000 → 60
     if visibility > 5000 → 35
     else → 10

  3. Humidity factor (weight 0.15):
     score = Math.max(0, 100 - (Math.max(0, input.humidity - 30) * 1.5))
     Low humidity = high score. Above 30% starts reducing.

  4. Wind factor (weight 0.10):
     if windSpeed < 3 → 100
     if windSpeed < 8 → 80
     if windSpeed < 15 → 50
     if windSpeed < 25 → 20
     else → 5

  5. Moon factor (weight 0.10, only if moonIllumination provided, else redistribute):
     score = 100 - input.moonIllumination!
     New moon = 100, full moon = 0.
     If not provided: redistribute weight evenly across other factors.

  6. Bortle factor (weight 0.05, only if bortle provided, else redistribute):
     score = Math.max(0, (10 - input.bortle!) * 12.5)
     Bortle 1 = 112.5 clamped to 100, Bortle 9 = 12.5

  Final: weighted sum of all factors, rounded to nearest integer, clamped 0–100.

  Grade:
    score >= 90 → 'Exceptional', emoji '✨', color 'var(--accent-teal)'
    score >= 75 → 'Excellent', emoji '🌟', color 'var(--accent-teal)'
    score >= 55 → 'Good', emoji '👍', color 'var(--accent-gold)'
    score >= 35 → 'Fair', emoji '🌤️', color 'var(--accent-amber)'
    else → 'Poor', emoji '☁️', color 'var(--accent-red)'

  Return: { score, grade, emoji, color, factors: [...each factor with label, value, weight, description] }

---

Step 2 — Create src/app/api/sky/score/route.ts:

GET handler. Query params: lat, lon (required).

Logic:
  1. Fetch sky conditions from Open-Meteo (same URL pattern as /api/sky/verify):
     current=cloud_cover,visibility,relative_humidity_2m,temperature_2m,wind_speed_10m
  2. Optionally fetch moon illumination: use the astronomy-engine library if available in the project.
     Check if src/lib/planets.ts exports a function that returns moon data.
     If so, call it. If not, skip moon factor.
  3. Call calculateSkyScore(input)
  4. Return JSON: { ...skyScoreResult, location: { lat, lon }, timestamp: new Date().toISOString() }

Headers: Cache-Control: public, s-maxage=300, stale-while-revalidate=600 (5-min cache)
On Open-Meteo failure: return a neutral score of 50 with grade 'Fair'.

---

Step 3 — Update src/lib/types.ts (add, do not modify existing):

Add at end of file:
  export type SkyGrade = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor'

  export interface SkyScore {
    score: number
    grade: SkyGrade
    emoji: string
    color: string
  }

---

Do NOT modify any existing API routes or component files.
Do NOT install any new packages.
Test: curl http://localhost:3000/api/sky/score?lat=41.72&lon=44.83 should return a valid SkyScoreResult JSON.
```

---

### PROMPT D4 — Onboarding Quiz (3-Screen Flow)

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. I need a 3-screen onboarding quiz that runs once after first login, inspired by ShutEye's personalization quiz. This creates psychological investment and customizes the experience.

Read these files before writing anything:
  src/app/layout.tsx (understand app wrapper structure)
  src/app/page.tsx (understand home page)
  src/lib/types.ts (existing types)
  src/hooks/ (list directory — check for useAppState or similar state hooks)
  src/components/ (list directory — understand component structure)
  src/components/ui/ScoreRing.tsx (use this for the loading animation)
  src/components/ui/LoadingRing.tsx (use this for the profile building screen)
  src/app/globals.css (for CSS variables)

---

Step 1 — Add types to src/lib/types.ts (append, do not modify existing):

export interface AstronomerProfile {
  equipment: 'naked-eye' | 'binoculars' | 'small-telescope' | 'large-telescope'
  environment: 'city' | 'suburb' | 'rural' | 'remote'
  interests: ('planets' | 'moon' | 'deep-sky' | 'astrophotography' | 'learning')[]
  location: { lat: number; lon: number } | null
  completedAt: string   // ISO timestamp
}

---

Step 2 — Create src/components/onboarding/OnboardingQuiz.tsx:

'use client' component.

Props:
  interface OnboardingQuizProps {
    onComplete: (profile: AstronomerProfile) => void
  }

State:
  - step: 1 | 2 | 3 | 'loading' | 'done'
  - equipment, environment, interests selections
  - location: { lat, lon } | null (from geolocation API)

Screen layout (all screens share):
  - Full viewport overlay: fixed inset-0, bg var(--bg-deep), z-50
  - Step indicator at top: 3 small dots, current dot filled teal, others dim
  - Content centered vertically with max-w-md mx-auto
  - Each screen fades in (page-enter animation from globals.css)

Screen 1 — "What do you observe with?"
  - Title (font-display, text-2xl, font-bold): "What do you observe with?"
  - Subtitle (text-secondary, text-sm): "We'll customize your missions and recommendations"
  - 4 option cards in 2x2 grid:
    { id: 'naked-eye', emoji: '👁️', label: 'Naked Eye', desc: 'No equipment needed' }
    { id: 'binoculars', emoji: '🔭', label: 'Binoculars', desc: '7x50 or similar' }
    { id: 'small-telescope', emoji: '🔭', label: 'Small Telescope', desc: 'Under 5" aperture' }
    { id: 'large-telescope', emoji: '🌌', label: 'Large Telescope', desc: '5" aperture or more' }
  - Each card: card-base, 100% width in its grid cell, padding 16px, text-center
    - Emoji at top (text-3xl)
    - Label (font-display, text-sm, font-semibold)
    - Desc (text-xs, text-muted)
    - Selected state: border var(--accent-teal), bg var(--accent-teal-dim), glow-teal
  - "Continue" button at bottom (full width, bg gradient-score, rounded-xl, py-3)
    - Disabled until selection made (opacity 0.3)
  - Also request geolocation in background on this screen:
    navigator.geolocation.getCurrentPosition(pos => setLocation({lat: pos.coords.latitude, lon: pos.coords.longitude}), () => {})

Screen 2 — "Where do you usually observe?"
  - Same layout structure as screen 1
  - 4 option cards in 2x2 grid:
    { id: 'city', emoji: '🏙️', label: 'City', desc: 'Bortle 8-9' }
    { id: 'suburb', emoji: '🏘️', label: 'Suburb', desc: 'Bortle 5-7' }
    { id: 'rural', emoji: '🌾', label: 'Rural', desc: 'Bortle 3-4' }
    { id: 'remote', emoji: '⛰️', label: 'Remote', desc: 'Bortle 1-2' }
  - If location was obtained: show small text "📍 Location detected" in teal below the grid
  - "Continue" button

Screen 3 — "What excites you most?"
  - Title: "What excites you most?"
  - Subtitle: "Pick one or more — we'll personalize your feed"
  - 5 option pills in a flex-wrap row (multi-select — user can pick 1+):
    { id: 'planets', emoji: '🪐', label: 'Planets' }
    { id: 'moon', emoji: '🌙', label: 'The Moon' }
    { id: 'deep-sky', emoji: '🌌', label: 'Deep Sky' }
    { id: 'astrophotography', emoji: '📷', label: 'Astrophotography' }
    { id: 'learning', emoji: '📚', label: 'Learning' }
  - Each pill: rounded-full, px-4 py-2, border var(--border-default), flex items-center gap-2
    - Selected: border var(--accent-teal), bg var(--accent-teal-dim)
  - "Complete Setup" button (disabled if 0 selected)

Loading Screen — "Building your sky profile..."
  - After screen 3 completes, show for 3 seconds:
  - LoadingRing component (from ui/) centered, with rotating astronomy facts
  - Title: "Building your sky profile..." (font-display, text-lg)
  - After 3 seconds: construct AstronomerProfile object and call onComplete(profile)

---

Step 3 — Create src/hooks/useAstronomerProfile.ts:

Custom hook that reads/writes the profile to localStorage:
  key: 'stellar-astronomer-profile'

  export function useAstronomerProfile() {
    const [profile, setProfile] = useState<AstronomerProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const stored = localStorage.getItem('stellar-astronomer-profile')
      if (stored) {
        try { setProfile(JSON.parse(stored)) } catch { /* ignore */ }
      }
      setLoading(false)
    }, [])

    const saveProfile = (p: AstronomerProfile) => {
      localStorage.setItem('stellar-astronomer-profile', JSON.stringify(p))
      setProfile(p)
    }

    const resetProfile = () => {
      localStorage.removeItem('stellar-astronomer-profile')
      setProfile(null)
    }

    return { profile, loading, saveProfile, resetProfile, hasCompletedOnboarding: !!profile }
  }

---

Step 4 — Create a wrapper that shows onboarding when needed:

Create src/components/onboarding/OnboardingGate.tsx:

'use client' component.

  import { useAstronomerProfile } from '@/hooks/useAstronomerProfile'
  import OnboardingQuiz from './OnboardingQuiz'

  export default function OnboardingGate({ children }: { children: React.ReactNode }) {
    const { profile, loading, saveProfile, hasCompletedOnboarding } = useAstronomerProfile()
    // Also check auth — import usePrivy or equivalent auth hook
    // Only show onboarding if: authenticated AND !hasCompletedOnboarding AND !loading

    if (loading) return null  // or minimal loading state
    if (!hasCompletedOnboarding && /* authenticated check */) {
      return <OnboardingQuiz onComplete={saveProfile} />
    }
    return <>{children}</>
  }

Read the auth pattern in src/app/missions/page.tsx or similar to understand how authentication is checked (usePrivy, etc). Mirror that pattern.

Do NOT integrate OnboardingGate into layout.tsx yet — that happens in the next prompt when we build the dashboard. Just make sure it exports cleanly and compiles.

---

Do NOT modify any existing pages or components.
Do NOT install any new packages.
Verify: `npm run build` passes with no errors.
```

---

### PROMPT D5 — Authenticated Dashboard (Home Page Transformation)

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The home page currently shows a marketing landing page to all users. I need to split it: authenticated users see a live dashboard (like ShutEye's home screen), unauthenticated users keep the existing landing page.

Read these files FULLY before writing anything:
  src/app/page.tsx (current home page — understand every section)
  src/app/layout.tsx (understand app wrapper)
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
  src/app/api/sky/score/route.ts
  src/app/sky/page.tsx (understand sky data patterns)
  src/app/missions/page.tsx (understand auth pattern + mission data access)
  src/app/globals.css (for CSS variables)

Also list these directories:
  src/components/
  src/hooks/
  src/lib/

---

Step 1 — Create src/components/dashboard/Dashboard.tsx:

'use client' component. This is the authenticated home screen.

Imports needed:
  - ScoreRing, StatCard, ForecastStrip, StreakBadge from @/components/ui/
  - useAstronomerProfile from @/hooks/
  - Icons from lucide-react: Telescope, Star, Award, ChevronRight, Sparkles
  - useRouter from next/navigation
  - useState, useEffect from react

Data fetching (all in useEffect on mount):
  a) Sky Score: fetch('/api/sky/score?lat=${lat}&lon=${lon}') using profile.location or default 41.72,44.83
  b) Forecast: fetch('/api/sky/forecast?lat=${lat}&lon=${lon}') — check if this route exists. If not, use /api/sky/verify as fallback.
  c) App state: check how missions/profile page accesses completed missions, Stars count, streak. Mirror that pattern.

State:
  - skyScore: SkyScoreResult | null
  - forecast: ForecastDay[] (empty array default)
  - loading: boolean (true initially)

Layout (single column, max-w-lg mx-auto, px-4, py-6, space-y-5):

Section 1 — Greeting + Score:
  - Top row: "Good evening, Observer" (or profile rank name) + StreakBadge at right
    (Determine "morning/afternoon/evening/night" from current hour)
  - ScoreRing centered: size=180, value=skyScore.score, color="gradient"
    label: "Sky Score", sublabel: skyScore.grade
  - Below ring: skyScore.emoji + skyScore.grade text (text-sm, text-secondary)

Section 2 — Tonight's Planets:
  - Section title: "Visible Tonight" (font-display, text-sm, font-semibold, text-secondary, uppercase tracking-wide)
  - Horizontal scroll row of planet cards:
    Fetch planet data from /api/sky/planets?lat=${lat}&lon=${lon} (check if this route exists)
    Each card: card-base, min-w-[100px], p-3, text-center
      - Planet emoji (text-xl)
      - Planet name (text-xs, font-semibold)
      - "Rises 9:14 PM" or "Visible now" (text-[10px], text-muted)
    Only show planets with altitude > 0 or riseTime tonight
    If route doesn't exist: show 3 placeholder cards with moon + jupiter + saturn

Section 3 — 7-Day Forecast:
  - Section title: "This Week"
  - ForecastStrip component with forecast data
  - If no forecast data: show 7 placeholder dots

Section 4 — Active Mission (if any):
  - Check app state for any in-progress mission
  - If found: card-base with mission emoji + name + Stars + "Continue →" button
  - If none: "Start a mission tonight" card with Telescope icon + arrow → /missions

Section 5 — Your Stats:
  - 3 StatCards in a row (grid-cols-3, gap-2):
    - Observations: count, Telescope icon
    - Stars: total, Star icon, accentColor=var(--accent-gold)
    - Rank: current rank name, Award icon, accentColor=var(--accent-purple)

Section 6 — Quick Actions:
  - 2 buttons side by side (grid-cols-2, gap-3):
    - "Start Mission": bg var(--accent-teal-dim), border var(--accent-teal), text var(--accent-teal), → /missions
    - "Ask ASTRA": bg var(--accent-cyan-dim), border var(--accent-cyan), text var(--accent-cyan), → /chat
    Both: rounded-xl, py-3, text-center, text-sm, font-display, font-semibold

All sections use page-enter animation with stagger classes for sequential reveal.

---

Step 2 — Update src/app/page.tsx:

Read the FULL existing page.tsx. Understand every component and section.

Modify to conditionally render:
  - Import usePrivy (or whatever auth hook the app uses — check missions/page.tsx for the pattern)
  - Import Dashboard from @/components/dashboard/Dashboard
  - Import OnboardingGate from @/components/onboarding/OnboardingGate

  If authenticated:
    return (
      <OnboardingGate>
        <Dashboard />
      </OnboardingGate>
    )
  
  If not authenticated:
    return the existing landing page JSX (keep it ALL — do not remove any marketing content)

  If auth state is loading:
    return a minimal loading state (LoadingRing centered on page)

CRITICAL: Keep all existing landing page code intact. Wrap it in a condition, don't delete it.

---

Step 3 — Verify everything works:

  - npm run build must pass
  - Unauthenticated: should see the existing landing page (no changes)
  - Authenticated (first time): should see onboarding quiz → then dashboard
  - Authenticated (returning): should see dashboard directly
  - Dashboard should load sky score and display it in the ScoreRing
  - If any API routes are missing (planets, forecast), use graceful fallbacks — never crash

---

Do NOT modify any API routes.
Do NOT modify any existing components except src/app/page.tsx (conditional rendering only).
Do NOT install any new packages.
```

---

## PHASE 3 — Mission Flow & Profile Polish

---

### PROMPT D6 — Mission Flow Visual Upgrade

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The mission observation flow in MissionActive.tsx needs a visual upgrade to feel like a premium consumer app. I'm adding step indicators, circular gauge visualizations during verification, and a gamified loading screen during minting.

Read these files FULLY before writing anything:
  src/components/sky/MissionActive.tsx (the ENTIRE file — understand all steps, states, and handlers)
  src/components/sky/Verification.tsx
  src/components/ui/ScoreRing.tsx
  src/components/ui/LoadingRing.tsx
  src/lib/types.ts
  src/lib/sky-score.ts (calculateSkyScore function)
  src/app/globals.css (CSS variables)

---

Step 1 — Add step progress indicator to MissionActive.tsx:

At the top of the component render (before any step content), add a step indicator bar:

Define the step sequence as a constant array (outside the component):
  const STEP_LABELS = ['Brief', 'Capture', 'Verify', 'Seal', 'Done']

Create a small sub-component or inline JSX for the indicator:
  - Horizontal flex row, justify-center, gap-1, py-3, px-4
  - Each step: a small dot + optional connector line
    - Dot: w-2 h-2 rounded-full
      - Completed steps: bg var(--accent-teal), opacity 1
      - Current step: bg var(--accent-teal), w-2.5 h-2.5, ring effect (box-shadow glow)
      - Future steps: bg var(--border-strong), opacity 0.4
    - Connector between dots: h-[1px], flex-1, bg var(--border-subtle)
      - Completed connectors: bg var(--accent-teal), opacity 0.5
  - Below dots: current step label (text-[10px], text-muted, font-mono, text-center)

Map MissionState to step index:
  'idle'|'briefing' → 0, 'camera'|'uploading' → 1, 'verifying'|'verified' → 2, 'minting' → 3, 'done' → 4
  (adjust based on actual MissionState values in the file — read them first)

Place the indicator at the very top of the overlay, before the content area.

---

Step 2 — Upgrade the 'verifying' step render:

Currently this likely shows a simple spinner or text. Replace with:
  - LoadingRing component (centered, indeterminate mode)
  - Text below: "Analyzing sky conditions..." (font-display, text-sm)
  - Subtle pulse animation on the text (opacity 0.5 → 1, 1.5s infinite)

---

Step 3 — Upgrade the 'verified' step render (Verification.tsx):

Read Verification.tsx fully. Understand the current layout (metric grid with cloud cover, visibility, etc).

Add to the TOP of the Verification component (above existing metric grid):
  - Import ScoreRing from @/components/ui/ScoreRing
  - Import calculateSkyScore from @/lib/sky-score
  - Calculate sky score from the sky prop data:
    const skyScore = calculateSkyScore({
      cloudCover: sky.cloudCover,
      visibility: visMeters (parse from sky.visibility string or use a numeric value),
      humidity: sky.humidity,
      windSpeed: sky.windSpeed,
    })
  - Render ScoreRing: size=120, value=skyScore.score, color="gradient"
    label: "Sky Score", sublabel: skyScore.grade
  - Center it above the existing metric grid

  NOTE: Check how 'visibility' is stored in the sky prop. It might be a string like 'Excellent' or a number.
  If it's a string rating, map it: Excellent→25000, Good→15000, Fair→7000, Poor→3000
  If it's already a number (visMeters), use it directly.

Do NOT remove the existing metric grid — the ScoreRing goes ABOVE it as a hero element.

---

Step 4 — Upgrade the 'minting' step render:

Currently this likely shows a spinner. Replace with:
  - Full centered layout:
  - LoadingRing with rotating astronomy facts, size=100
  - Title: "Sealing your discovery..." (font-display, text-base, font-semibold)
  - Subtitle: mission emoji + mission name (text-secondary, text-sm)
  - Below: "This may take up to 60 seconds" (text-xs, text-muted, mt-4)

---

Step 5 — Upgrade the 'done' step render:

Read the existing 'done' step code carefully. Keep all existing functionality (Explorer link, NFT button, onClose).

Visual upgrade:
  - Add confetti burst on mount (CSS-only, no library):
    Create 12–16 small colored dots that animate outward from center:
    Each dot: absolute positioned, w-2 h-2, rounded-full, random color from [teal, gold, cyan, purple]
    Animation: from center → random direction 100-200px outward + fade out, 800ms ease-out, forwards
    Use CSS @keyframes with custom properties for direction (or generate inline styles)
    The dots should appear briefly and disappear — celebration effect.

  - ScoreRing at top: show the Sky Score from the verification step (pass it through state)
    size=140, value=skyScore.score, color="gradient"
  - Below ring: "Discovery Sealed" (font-display, text-xl)
  - Mission name + stars earned (already exists — keep it)
  - Explorer link (already exists — keep it)
  - Buttons (already exist — keep, just ensure they use card-base styling)

  - Add Farcaster share button if it exists (from Prompt 8) — keep it unchanged

---

Do NOT modify handleMint(), handleCapture(), or any other handler logic.
Do NOT modify API calls or blockchain interactions.
Do NOT modify step flow order or add/remove steps.
Only modify the RENDER output of each step for visual improvement.
Do NOT install any new packages.
Verify: npm run build passes.
```

---

### PROMPT D7 — Profile Page Redesign

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The profile page needs a complete visual redesign inspired by ShutEye's "Me" tab — with circular stat rings, an observation calendar, and better visual hierarchy.

Read these files FULLY before writing anything:
  src/app/profile/page.tsx (the ENTIRE file — understand all data, state, and rendering)
  src/components/ui/ScoreRing.tsx
  src/components/ui/StatCard.tsx
  src/components/ui/StreakBadge.tsx
  src/hooks/useAstronomerProfile.ts
  src/lib/types.ts
  src/app/globals.css (CSS variables)
  src/app/nfts/page.tsx (understand NFT fetching pattern)

Also check: how does the profile page currently access Stars balance, missions completed, rank?
Read the state hooks/context used.

---

Rewrite the RENDER of src/app/profile/page.tsx.
Keep all existing data fetching, auth checks, state management, and sign-out logic.
Only rewrite the JSX return.

New layout (single column, max-w-lg mx-auto, px-4, py-6, space-y-6, page-enter animation):

Section 1 — Profile Hero:
  - Centered column:
    - Avatar ring: 80x80 circle with rank-colored gradient border (2px)
      - Inside: first letter of user's email or display name (text-2xl, font-display, font-bold)
      - Border colors by rank:
        Stargazer → var(--border-strong) (dim)
        Observer → var(--accent-teal)
        Pathfinder → var(--accent-gold)
        Celestial → var(--accent-purple)
    - Username / email (text-sm, font-display, mt-2)
    - Rank badge: pill with rank name + emoji
      (styled same as existing rank display but using rounded-full pill shape with rank color bg-dim)
    - StreakBadge component (mt-1)

Section 2 — Stats Ring Row:
  - 3 ScoreRing components in a row (flex justify-around):
    - Observations: value=count, max=50, size=90, label="Missions", color="var(--accent-teal)"
    - Stars: value=starsBalance, max=1000, size=90, label="Stars ✦", color="var(--accent-gold)"
    - Rank Progress: value=progress%, max=100, size=90, label="Next Rank", color="var(--accent-purple)"
      (progress = missions completed / next rank threshold * 100)
      (thresholds: Observer@1, Pathfinder@3, Celestial@5 — use existing rank logic)
      sublabel: "3/5 to Celestial" or whatever the next rank is

Section 3 — Observation Calendar:
  Create an inline calendar component (do not extract to separate file):
  - Title: "Observation History" (font-display, text-sm, font-semibold, text-secondary)
  - Display current month name + year
  - 7-column grid (Sun–Sat headers, text-[10px], text-muted)
  - Day cells: 32x32, rounded-lg, text-xs, text-center
    - Observation day: bg var(--accent-teal-dim), text var(--accent-teal), ring 1px teal
    - Today: border 1px dashed var(--text-muted)
    - Other days: text-muted
    - Empty cells (padding): invisible
  - Data: get observation dates from completed missions (however missions are currently stored — localStorage or state hook)
  - If no observation data is accessible: show empty calendar with just today highlighted

Section 4 — Recent NFTs Preview:
  - Title row: "My Observations" + "View All →" link to /nfts (text-xs, text-teal)
  - Show 3 most recent NFTs as small horizontal cards (flex row, gap-2, overflow hidden)
    Each: card-base, min-w-[140px], p-3
    - Target name (text-xs, font-semibold)
    - Date (text-[10px], text-muted)
    - Small ScoreRing (size=36, value=random 60-95, strokeWidth=3) — or just a colored dot
  - If no NFTs: "Complete your first mission to earn an observation NFT" with arrow → /missions

Section 5 — Equipment (from onboarding profile):
  - Title: "Your Setup"
  - Read from useAstronomerProfile()
  - Show: equipment type + environment + interests as small pills
  - "Edit" button that calls resetProfile() and triggers onboarding again
  - If no profile: "Complete your astronomer profile" button → triggers onboarding

Section 6 — Account:
  - card-base container with:
    - Wallet address row: truncated address + copy button (keep existing copy logic)
    - "View on Explorer" link (keep existing)
    - Language toggle (if i18n exists — keep existing)
    - "Sign Out" button (keep existing sign-out logic — it likely has confirmation)

---

CRITICAL: Keep ALL existing data fetching and state management. Only rewrite the JSX layout.
If the page uses 'use client' with hooks like useState, useEffect, usePrivy — keep them all.
Do NOT modify how Stars balance is fetched (whether from chain or state).
Do NOT modify sign-out logic.
Do NOT install any new packages.
Verify: npm run build passes.
```

---

## PHASE 4 — Navigation, ASTRA Chat, & Polish

---

### PROMPT D8 — Bottom Navigation Redesign

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The bottom navigation needs to be redesigned for clarity and to match the new dashboard-first architecture.

Read these files before writing anything:
  src/components/ (list full directory — find the nav component)
  src/components/nav/ or src/components/layout/ (wherever the bottom nav lives)
  src/app/layout.tsx
  src/app/globals.css

Find the bottom navigation component. It might be called BottomNav, MobileNav, Navigation, or similar.
Read the ENTIRE file.

---

Redesign the bottom navigation:

New tab structure (5 tabs):
  1. Tonight: icon Moon (from lucide-react), href "/" — this is the dashboard
  2. Observe: icon Telescope, href "/missions"
  3. ASTRA: icon Sparkles, href "/chat" — center tab, special styling
  4. Shop: icon ShoppingBag, href "/marketplace"
  5. Me: icon User, href "/profile"

Visual design:
  - Container: fixed bottom-0, w-full, z-40
    - Background: var(--bg-surface) with backdrop-filter blur(16px) and -webkit-backdrop-filter
    - Top border: 1px solid var(--border-subtle)
    - Safe area padding: pb-[env(safe-area-inset-bottom)] for iOS notch devices
    - Height: 64px (not including safe area)

  - Tab items: flex row, justify-around, items-center, h-full
    Each tab:
      - flex flex-col items-center justify-center gap-0.5
      - Icon: 22x22 (strokeWidth 1.5)
      - Label: text-[10px], font-body, font-medium
      - Inactive: color var(--text-muted)
      - Active: color var(--accent-teal), icon filled or thicker stroke
        - Active indicator: small dot (w-1 h-1, rounded-full, bg var(--accent-teal)) above the icon

  - ASTRA (center tab) special treatment:
    - Slightly larger icon area: w-12 h-12, rounded-2xl, -mt-3 (raised above other tabs)
    - Background: var(--accent-cyan-dim), border 1px solid rgba(56,240,255,0.2)
    - Icon color: var(--accent-cyan) always (even inactive)
    - No label text — just the icon
    - Subtle pulse animation when on /chat page

  - Active state detection: use usePathname() from next/navigation
    Compare pathname to each tab's href. For "/" match exactly, for others use startsWith.

---

Also check if there's a DESKTOP nav (top bar). If it exists:
  - Update its links to match the same 5-section structure
  - Keep it as-is visually but update hrefs and labels if they've changed
  - Desktop nav should NOT have the raised center tab effect — that's mobile only

---

Remove any old nav items that no longer map to current pages (e.g., "Learn", "Sky" if they've been merged into "Tonight").
If "Dark Sky" or "Leaderboard" were in the nav, remove them — they're accessible from within pages but don't need a primary nav slot.

Do NOT modify any page files.
Do NOT install any packages.
Verify: npm run build passes. Check on mobile viewport (375px wide) that spacing looks correct.
```

---

### PROMPT D9 — ASTRA Chat Visual Upgrade

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The AI chat page (/chat) needs visual polish to feel like ShutEye's Dream Bot — conversation starters, styled bubbles, and inline result cards.

Read these files FULLY before writing anything:
  src/app/chat/page.tsx (the ENTIRE chat page)
  src/app/api/chat/route.ts (understand what tools are available and response format)
  src/app/globals.css (CSS variables)
  src/hooks/useAstronomerProfile.ts (to personalize starters)

---

Step 1 — Add conversation starters to src/app/chat/page.tsx:

When the chat is empty (no messages), show a welcome screen instead of a blank chat:

  - ASTRA avatar: centered, 64x64 circle, bg var(--accent-cyan-dim), border 1px solid rgba(56,240,255,0.2)
    - Inside: Sparkles icon (lucide) or ✨ emoji, 28px, color var(--accent-cyan)
  - Title: "ASTRA" (font-display, text-xl, font-bold, mt-3)
  - Subtitle: "Your AI astronomer — ask me anything about tonight's sky" (text-sm, text-secondary, text-center, max-w-xs)

  - Conversation starters (below, mt-6):
    Grid of 4 suggestion cards (grid-cols-2, gap-2, max-w-sm mx-auto):
    Each card: card-base, p-3, cursor-pointer, hover:border-var(--accent-cyan)
      - Emoji (text-lg): varies per card
      - Text (text-xs, text-secondary, mt-1): the suggestion text

    Default starters:
    { emoji: '🌙', text: "What can I see tonight?" }
    { emoji: '📅', text: "Best night to observe this week?" }
    { emoji: '🪐', text: "Is Jupiter visible right now?" }
    { emoji: '🔭', text: "What telescope for beginners?" }

    Personalized starters (if astronomer profile exists):
    Read from useAstronomerProfile(). If profile.interests includes:
      'planets' → replace card 3 with "Which planets are up tonight?"
      'deep-sky' → replace card 4 with "Best deep sky object tonight?"
      'astrophotography' → replace card 4 with "Tips for tonight's astrophotography?"
      'moon' → replace card 1 with "What moon phase is tonight?"

    On click: insert the text as a user message and submit (use existing chat submit logic)

  - When at least 1 message exists, hide the welcome screen and show the chat

---

Step 2 — Upgrade chat bubble styling:

Find the message rendering loop. Update the visual style:

  User messages:
    - Align right
    - bg var(--accent-teal-dim), border 1px solid rgba(52,211,153,0.15)
    - rounded-2xl rounded-br-md (sharp bottom-right corner)
    - text-sm, font-body, text-primary
    - max-w-[85%]
    - px-4 py-2.5

  ASTRA messages:
    - Align left
    - bg var(--bg-card), border 1px solid var(--border-default)
    - rounded-2xl rounded-bl-md (sharp bottom-left corner)
    - text-sm, font-body, text-primary
    - max-w-[85%]
    - px-4 py-2.5
    - Small ASTRA avatar to the left: w-6 h-6, rounded-full, bg var(--accent-cyan-dim)
      with tiny ✨ or Sparkles icon inside (12px)

  Streaming indicator (when ASTRA is typing):
    - 3 dots animation: three small circles (w-1.5 h-1.5, bg var(--accent-cyan))
      bouncing with staggered animation-delay (0s, 0.15s, 0.3s)
    - Placed inside an ASTRA-style bubble

---

Step 3 — Style the input area:

  - Container: sticky bottom-0, bg var(--bg-surface), backdrop-blur, border-top var(--border-subtle)
    - Padding: p-3, pb-[calc(12px+env(safe-area-inset-bottom))]
  - Input row: flex, gap-2
    - Text input: flex-1, bg var(--bg-card), border var(--border-default), rounded-xl
      - px-4 py-3, text-sm, font-body
      - placeholder: "Ask ASTRA anything..." color var(--text-muted)
      - Focus: border-color var(--accent-cyan), outline none
    - Send button: w-10 h-10, rounded-xl, bg var(--accent-cyan-dim), border rgba(56,240,255,0.2)
      - Icon: Send (lucide), 18px, color var(--accent-cyan)
      - Disabled when input is empty: opacity 0.3
      - Active/sending: opacity 0.5, pointer-events none

---

Step 4 — Add language badge:

If the app supports Georgian + English (check for i18n setup):
  Add a small language indicator in the header area of the chat:
  "ASTRA responds in your language" (text-[10px], text-muted)
  This reassures Georgian users.

---

Do NOT modify src/app/api/chat/route.ts or any API logic.
Do NOT modify the message sending/receiving logic — only the visual rendering.
Do NOT modify tool call handling — just make sure tool results still display.
Do NOT install any new packages.
Verify: npm run build passes. Chat should still stream responses correctly.
```

---

### PROMPT D10 — Mission List & Sky Page Polish

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. Two pages need visual polish to match the new design system: the Missions list (/missions) and the Sky forecast page (/sky).

Read these files FULLY before writing anything:
  src/app/missions/page.tsx (entire file)
  src/app/sky/page.tsx (entire file — if it exists. If sky data is on the home page, read that instead)
  src/components/ui/ScoreRing.tsx
  src/components/ui/ForecastStrip.tsx
  src/components/ui/StatCard.tsx
  src/lib/types.ts
  src/app/globals.css

---

## PART A — Missions Page (/missions)

Update the JSX rendering of src/app/missions/page.tsx. Keep all data, state, and logic.

Changes:

1. Stats bar at top:
   Replace current stats display with 3 ScoreRing components (small, inline):
   - Missions: value=completed, max=total, size=56, strokeWidth=4, color="var(--accent-teal)"
   - Stars: value=starsEarned, max=1000, size=56, strokeWidth=4, color="var(--accent-gold)"
   - Rank: (use StatCard instead — just the rank name in a pill badge)
   Layout: flex row, justify-around, card-base container, p-4

2. Mission cards:
   Each mission card gets these visual upgrades:
   - card-base class
   - Left column: mission emoji (text-2xl)
   - Center column: mission name (font-display, text-sm, font-semibold) + target type (text-xs, text-muted)
   - Right column: Stars reward in gold pill (bg var(--accent-gold-dim), text var(--accent-gold), text-xs, rounded-full, px-2 py-0.5)
   - Bottom of card: difficulty badge + equipment icon
     Difficulty badge: text-[10px], rounded-full, px-2 py-0.5
       Beginner → bg teal-dim, text teal
       Intermediate → bg gold-dim, text gold
       Hard → bg amber-dim, text amber
       Expert → bg purple-dim, text purple
     Equipment: 👁️ Naked eye / 🔭 Telescope (text-[10px], text-muted)
   - Completed missions: subtle checkmark overlay + reduced opacity (0.6) + "Completed" badge
   - On click: trigger existing mission start logic

3. Section headers:
   "Sky Missions" and "Knowledge Quizzes" headers:
   - font-display, text-xs, uppercase, tracking-widest, text-secondary, mb-3, mt-6

4. Quiz cards:
   Each quiz card:
   - card-base, p-4
   - Quiz name + question count (text-xs, text-muted)
   - Progress bar: slim (h-1, rounded-full) showing X/10 correct
     - Bar fill: bg var(--accent-teal), progress width as percentage
     - Bar background: bg var(--border-subtle)
   - Stars possible (text-xs, gold)
   - Completed quizzes: teal checkmark + "100 ✦ earned" text

5. Page header:
   - "Missions" (font-display, text-xl, font-bold)
   - Below: ForecastStrip component showing tonight's conditions (if sky data is available on this page)

---

## PART B — Sky Page (/sky)

If src/app/sky/page.tsx exists, update its rendering. If sky data lives elsewhere, note that and skip.

Changes:

1. Hero section:
   - ScoreRing (size=140) showing tonight's Sky Score at the top
   - Call /api/sky/score for the score, or calculate inline if sky data is available

2. Planet visibility:
   - Horizontal scroll row (same as dashboard planet cards)
   - Each planet card: card-base, min-w-[110px], p-3, text-center
     - Planet emoji (text-2xl)
     - Name (text-xs, font-semibold)
     - Status: "Visible now" (teal) / "Rises 9 PM" (text-muted) / "Below horizon" (text-muted, opacity 0.5)
     - Altitude (text-[10px], font-mono, text-muted): "Alt: 42°"

3. 7-day forecast:
   - Replace existing forecast grid with ForecastStrip component
   - If detailed daily data is shown (expanded view), keep it but style with card-base cards

4. Sunrise/sunset section:
   - Keep existing data
   - Style as a horizontal arc visualization if possible:
     - SVG semicircle showing sun's path from rise to set
     - Current time marker dot on the arc
     - Rise/set times at the endpoints
   - If too complex: keep as simple text cards with card-base styling

---

Do NOT modify any data fetching, API calls, or state logic.
Do NOT modify any mission start/completion handlers.
Do NOT install any new packages.
Verify: npm run build passes.
```

---

## PHASE 5 — Final Polish & Engagement Features

---

### PROMPT D11 — NFT Gallery Redesign + Marketplace Polish

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. The NFT gallery (/nfts) and Marketplace (/marketplace) need visual polish to match the new design system.

Read these files FULLY before writing anything:
  src/app/nfts/page.tsx (entire file)
  src/app/marketplace/page.tsx (entire file — find actual path if different)
  src/components/ui/ScoreRing.tsx
  src/app/globals.css
  src/lib/products.ts (or wherever products are defined)
  src/hooks/useAstronomerProfile.ts

---

## PART A — NFT Gallery (/nfts)

Update the rendering of the NFT gallery. Keep all data fetching and auth logic.

1. Page header:
   - "My Observations" (font-display, text-xl, font-bold)
   - Count badge: "12 discoveries" (text-xs, bg var(--accent-teal-dim), text var(--accent-teal), rounded-full, px-2 py-0.5)
   - Filter tabs below header (if more than 3 NFTs):
     All | Planets | Deep Sky | Moon
     Each tab: text-xs, font-display, px-3 py-1.5, rounded-full
     Active: bg var(--accent-teal-dim), text var(--accent-teal), border teal
     Inactive: text-muted, hover text-secondary
     Filter by checking NFT name/target attribute

2. NFT card redesign:
   - Grid: grid-cols-2, gap-3
   - Each card: card-base, overflow-hidden
     - Top section (h-24, bg gradient from target color):
       Generate a subtle color based on target name:
       Moon → blueish, Jupiter → orange-ish, Saturn → gold, Orion → purple, etc.
       Use a mapping object: { moon: '#1e3a5f', jupiter: '#5f3a1e', saturn: '#5f4f1e', orion: '#3a1e5f', ... }
       Default: var(--bg-elevated)
       Show target emoji centered (text-4xl, with slight text-shadow)
     - Bottom section (p-3):
       - Target name (text-sm, font-display, font-semibold, truncate)
       - Date (text-[10px], text-muted, font-mono)
       - Attributes row: cloud cover + stars as tiny pills
       - "Explorer ↗" link (text-[10px], text-cyan, mt-1)

3. Empty state:
   - Telescope icon (48px, text-muted, opacity 0.5)
   - "No observations yet" (font-display, text-lg)
   - "Complete a sky mission to seal your first discovery" (text-sm, text-secondary)
   - Button → /missions (same style as dashboard quick action buttons)

---

## PART B — Marketplace (/marketplace)

Update the rendering. Keep all product data and purchase logic.

1. If useAstronomerProfile is available:
   Add "Recommended for You" section at top:
   - Based on equipment level from profile:
     naked-eye → recommend binoculars
     binoculars → recommend small telescope
     small-telescope → recommend eyepiece kit or larger telescope
     large-telescope → recommend astrophotography accessories
   - Show 2 recommended products as featured cards (wider, card-base, with "Recommended" badge)

2. Stars redemption banner:
   If user has Stars balance:
   - card-base with gold accent border
   - "Your Stars: 850 ✦" (font-display, text-lg, gold)
   - Progress bar to next reward tier (h-1.5, rounded-full)
   - "250 more for 10% telescope discount" (text-xs, text-secondary)

3. Product cards:
   - card-base, overflow-hidden
   - Product image area (h-36, bg var(--bg-elevated), flex items-center justify-center)
     - If product has image URL: show image
     - If not: show category emoji (🔭, 🌙, ⭐, 🎒) large and centered
   - Info area (p-3):
     - Product name (text-sm, font-display, font-semibold, line-clamp-2)
     - Price: "₾ 299" (text-base, font-display, font-bold, text-primary)
     - Category badge (text-[10px], rounded-full, px-2, bg var(--bg-elevated), text-muted)
   - Hover: scale(1.02) transition

4. Category filter pills at top:
   All | Telescopes | Accessories | Lamps | Projectors
   Same style as NFT filter tabs

---

Do NOT modify any purchase/checkout logic.
Do NOT modify product data source.
Do NOT install any new packages.
Verify: npm run build passes.
```

---

### PROMPT D12 — Micro-Interactions, Transitions & Final Polish

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. This is the final polish pass — adding page transitions, micro-interactions, hover effects, and small details that make the app feel premium.

Read these files before writing anything:
  src/app/globals.css (current animations and variables)
  src/app/layout.tsx
  src/components/ (list all — identify which components have hover states)

---

Step 1 — Page transition wrapper:

Create src/components/ui/PageTransition.tsx:

  'use client' component.
  Simple wrapper that applies the page-enter animation to its children.

  interface PageTransitionProps {
    children: React.ReactNode
    className?: string
  }

  Implementation:
    - Wrapper div with class: "page-enter" + className
    - The page-enter animation is already defined in globals.css
    - Add a key prop based on pathname (usePathname) to re-trigger animation on navigation

  Export default PageTransition.

Then: search through all page files (src/app/*/page.tsx). In each page's main return JSX:
  - Wrap the outermost container in <PageTransition>
  - Do this for: /, /sky, /missions, /chat, /profile, /nfts, /marketplace, /darksky
  - Do NOT wrap pages that are overlays or modals

---

Step 2 — Card hover effects:

Update globals.css — enhance the card-base hover:

  .card-base {
    /* ... existing ... */
    transition: all var(--duration-fast) var(--ease-out-expo);
  }
  .card-base:hover {
    /* ... existing ... */
    transform: translateY(-1px);
  }
  .card-base:active {
    transform: translateY(0) scale(0.99);
  }

Add interactive card variant:
  .card-interactive {
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out-expo);
  }
  .card-interactive:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-elevated);
    transform: translateY(-2px);
  }
  .card-interactive:active {
    transform: translateY(0) scale(0.98);
  }

---

Step 3 — Button styles:

Add to globals.css:

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: var(--radius-xl);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 14px;
    background: var(--gradient-score);
    color: var(--bg-deep);
    border: none;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out-expo);
  }
  .btn-primary:hover {
    box-shadow: var(--shadow-glow-teal);
    transform: translateY(-1px);
  }
  .btn-primary:active {
    transform: translateY(0) scale(0.98);
  }
  .btn-primary:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: var(--radius-xl);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 14px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out-expo);
  }
  .btn-ghost:hover {
    border-color: var(--border-strong);
    color: var(--text-primary);
    background: var(--bg-card);
  }

---

Step 4 — Scrollbar styling:

Add to globals.css:

  /* Hide scrollbars for horizontal scroll containers */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Thin custom scrollbar for vertical content */
  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

---

Step 5 — Focus styles:

Add to globals.css:

  /* Accessible focus ring for keyboard navigation */
  *:focus-visible {
    outline: 2px solid var(--accent-teal);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* Remove default focus for mouse users */
  *:focus:not(:focus-visible) {
    outline: none;
  }

---

Step 6 — Loading states:

Add to globals.css:

  /* Skeleton loading shimmer */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--bg-card) 25%,
      var(--bg-card-hover) 50%,
      var(--bg-card) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-md);
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Pulse for loading text */
  .pulse-slow {
    animation: pulseSlow 2s ease-in-out infinite;
  }
  @keyframes pulseSlow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

---

Step 7 — Selection & text colors:

Add to globals.css:

  ::selection {
    background: var(--accent-teal-dim);
    color: var(--text-primary);
  }

---

Step 8 — Meta theme color:

In src/app/layout.tsx, find the metadata export or <head> section.
Add: <meta name="theme-color" content="#070B14" />
This makes the mobile browser chrome match the dark theme.

If using Next.js metadata export:
  themeColor: '#070B14'

---

Do NOT modify any component logic or data flows.
Do NOT install any packages.
Do NOT modify any API routes.
Verify: npm run build passes. Browse through all pages and check for visual consistency.
```

---

## RUNNING ORDER SUMMARY

| Prompt | Name | Time Est. | Dependencies |
|--------|------|-----------|--------------|
| D1 | Typography + Colors + CSS Variables | 30 min | None |
| D2 | ScoreRing + StatCard + LoadingRing + ForecastStrip + StreakBadge | 1 hour | D1 |
| D3 | Sky Score calculation + API route | 30 min | D1 |
| D4 | Onboarding Quiz (3-screen flow) | 1 hour | D2, D3 |
| D5 | Authenticated Dashboard | 1.5 hours | D2, D3, D4 |
| D6 | Mission Flow Visual Upgrade | 1 hour | D2, D3 |
| D7 | Profile Page Redesign | 1 hour | D2, D4 |
| D8 | Bottom Navigation Redesign | 30 min | D5 |
| D9 | ASTRA Chat Visual Upgrade | 45 min | D1 |
| D10 | Mission List + Sky Page Polish | 1 hour | D2, D3 |
| D11 | NFT Gallery + Marketplace Polish | 1 hour | D1, D4 |
| D12 | Micro-interactions + Final Polish | 45 min | All above |

**Total estimated: ~10 hours across 12 prompts**

Each prompt is self-contained. If something breaks, you can skip to the next prompt and come back. D1 and D2 are the foundation — everything else builds on them.

---

*These prompts transform Stellar from "functional hackathon project" into "consumer app that belongs on the App Store." Run them in order, one per Claude Code conversation, and verify `npm run build` passes after each one before moving to the next.*
