# STELLAR — Visual Redesign Master Prompts

## Complete Brand Identity + Page-by-Page Rebuild

**Context:** These prompts are designed for Claude Code / Claude conversations. Run them in order. Each prompt depends on the brand system established in Prompt 0. Copy-paste one prompt per conversation.

**App:** Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
**Current state:** Functional app with inconsistent visual design, no unified brand system, weak animations, generic dark theme.
**Goal:** Production-grade visual identity that looks like it was designed by a funded startup, not a hackathon project.

---

## HOW TO USE

1. Run **Prompt 0** first — it creates the design system files (CSS variables, tokens, shared components)
2. Run **Prompts 1–10** in any order — each rebuilds one page using the design system
3. Run **Prompt 11** last — it adds the global animation layer and polish

> Each prompt is self-contained. Start a new conversation for each one. Always tell Claude to read the design system files first before editing any page.

---

## PROMPT 0 — Brand Identity + Design System Foundation

```
I'm rebuilding the visual identity of Stellar, a Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 astronomy app. It's a consumer app where users observe the night sky through telescopes, complete missions, earn tokens, and buy equipment. The app runs on Solana but blockchain is invisible — users sign up with email via Privy.

Before writing ANY code, study these reference apps for visual patterns (do NOT copy — extract principles):

ASTRONOMY APP REFERENCES (for content patterns + dark sky aesthetic):
- Star Walk 2: Night-mode red/dark interface, constellation line art, elegant data overlays on sky backgrounds, "Sky Live" dashboard with planet visibility cards
- Stellarium Mobile: Minimal planetarium UI, clean data presentation, deep navy backgrounds, scientific but accessible typography
- SkySafari: "Tonight's Best" list pattern, calendar event cards, object detail sheets with photo + data + description, observing list management
- Night Sky (Apple): Celestial compass navigation, premium glass-morphism cards, Apple-quality micro-interactions, AR integration cues
- PhotoPills: Planning tools UI, time-scrubber interface, location-aware widgets, photographer-oriented precision aesthetic

WEB3 / CONSUMER APP REFERENCES (for interaction patterns + brand energy):
- Cosmos (cosmos.network): Space-themed brand with planet illustrations, vibrant gradient backgrounds, 3D interactive elements, strong typography hierarchy
- Phantom wallet: Clean dark mode, smooth transaction animations, trust-building micro-interactions, card-based layout
- Jupiter (jup.ag): Data-dense but clean, animated backgrounds, neon accent colors on deep dark, real-time data presentation
- Stepn: Gamification UI — progress rings, achievement badges, streak counters, energy system visualization, reward unlocks
- Duolingo: Best-in-class gamification — XP bars, streak flames, character celebrations, lesson completion ceremonies, daily goals

DESIGN DIRECTION:
The aesthetic is "Observatory Control Room meets Premium Consumer App" — imagine if NASA's mission control was redesigned by the team behind Apple's Night Sky app, then given the gamification layer of Duolingo.

Key principles:
- Dark-first (users use this outside at night — preserve night vision)
- Data-rich but not cluttered (astronomy data needs breathing room)
- Celebration moments (earning Stars, minting NFTs, completing missions should FEEL amazing)
- Trust signals (blockchain data shown as elegant verification badges, not raw hashes)
- Georgian + English bilingual (layout must accommodate both scripts)

---

Now create the following files:

### FILE 1: src/styles/design-tokens.css

CSS custom properties for the entire app. Every color, shadow, radius, spacing value in the app should reference these tokens.

Color system (all HSL for easy manipulation):
- Background layers: space-black (#050A12), panel-dark (#0A1628), card (#0F1D32), card-hover (#142440), surface (#1A2D4D)
- Text: primary (rgba(255,255,255,0.92)), secondary (rgba(255,255,255,0.55)), muted (rgba(255,255,255,0.25)), disabled (rgba(255,255,255,0.12))
- Brand accent "Nebula Teal": #38F0FF (primary interactive), with hover: #5CF4FF, pressed: #2AD4E0, glow: rgba(56,240,255,0.15)
- Reward gold "Star Gold": #FFD166 (Stars token, achievements), with hover: #FFD98A, glow: rgba(255,209,102,0.15)
- Success "Aurora Green": #34D399, with glow: rgba(52,211,153,0.12)
- Warning "Solar Amber": #F59E0B
- Danger "Mars Red": #EF4444
- Verification "Oracle Blue": #818CF8
- Sky condition colors: go: #34D399, maybe: #F59E0B, skip: #EF4444
- Bortle scale: 1: #00FF88, 2: #44FF77, 3: #88FF44, 4: #CCDD00, 5: #FFDD00, 6: #FFAA00, 7: #FF7700, 8: #FF4400, 9: #FF0000
- Glass: background rgba(15,29,50,0.65), border rgba(255,255,255,0.06), blur 16px

Typography (load via next/font/google):
- Display/hero: "Instrument Serif" (Google Fonts) — for page titles, hero text, celebration screens
- Heading: "DM Sans" weight 500/600/700 — for section headers, card titles, nav
- Body: "DM Sans" weight 400 — for paragraphs, descriptions
- Mono: "JetBrains Mono" — for oracle hashes, wallet addresses, technical data
- Georgian: "Noto Sans Georgian" — for KA locale (pairs well with DM Sans latin)

Sizes (use rem, mobile-first):
- text-xs: 0.6875rem (11px)
- text-sm: 0.8125rem (13px)
- text-base: 0.9375rem (15px)
- text-lg: 1.125rem (18px)
- text-xl: 1.5rem (24px)
- text-2xl: 2rem (32px)
- text-hero: 2.75rem (44px)

Spacing scale: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

Border radius: sm: 8px, md: 12px, lg: 16px, xl: 20px, 2xl: 24px, full: 9999px

Shadows:
- card: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)
- card-hover: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(56,240,255,0.08)
- glow-teal: 0 0 20px rgba(56,240,255,0.15), 0 0 60px rgba(56,240,255,0.05)
- glow-gold: 0 0 20px rgba(255,209,102,0.15), 0 0 60px rgba(255,209,102,0.05)
- inner: inset 0 1px 0 rgba(255,255,255,0.04)

Transitions:
- fast: 120ms ease-out
- default: 200ms ease-out
- slow: 350ms ease-out
- spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1)

Z-index scale: base: 0, card: 10, sticky: 20, nav: 30, overlay: 40, modal: 50, toast: 60

---

### FILE 2: src/styles/animations.css

Reusable CSS @keyframes and utility classes for the entire app:

Page transitions:
- fade-in: opacity 0→1, translateY 8px→0, 400ms ease-out
- fade-in-up: opacity 0→1, translateY 20px→0, 500ms ease-out
- fade-in-scale: opacity 0→1, scale 0.96→1, 350ms ease-out
- slide-in-right: translateX 24px→0, opacity 0→1, 350ms ease-out
- slide-in-left: translateX -24px→0, opacity 0→1, 350ms ease-out

Stagger pattern (for lists/grids — apply via CSS custom property):
- .stagger-children > *:nth-child(1) { animation-delay: 0ms }
- .stagger-children > *:nth-child(2) { animation-delay: 60ms }
- ...through :nth-child(12) { animation-delay: 660ms }

Celebration animations:
- mint-success: scale 0→1.1→1, rotate 0→5→0, with subtle bounce, 600ms
- stars-earned: scale 0.8→1.2→1, with golden glow pulse, 800ms
- rank-up: scale 0.9→1, with expanding ring + particle burst (CSS only), 1000ms
- confetti-burst: use pseudo-elements for 8 small squares that fly outward and fade, 1200ms

Micro-interactions:
- pulse-glow: box-shadow pulsing from 0 opacity to 0.15 and back, 2s infinite
- shimmer: background-position sweep left-to-right, 2s infinite (for loading skeletons)
- float: translateY ±4px, 3s ease-in-out infinite (for floating elements)
- spin-slow: rotate 360deg, 20s linear infinite (for loading)
- breathe: scale 1→1.03→1, 4s ease-in-out infinite (for active/live indicators)

Sky-specific:
- twinkle: opacity cycling 0.3→1→0.3 at random-feeling intervals using steps(), 3s infinite
- orbit: rotate 360deg around a point, 60s linear infinite
- meteor: translateX+translateY diagonal sweep with fade trail, 1.5s ease-in once

Button states:
- .btn-press: on :active, scale 0.97, transition 80ms
- .btn-glow: on hover, add box-shadow glow matching the button's accent color

---

### FILE 3: src/components/ui/Card.tsx

Base card component used everywhere. Props:
- variant: 'default' | 'glass' | 'interactive' | 'reward' | 'mission'
- glow: 'none' | 'teal' | 'gold' | 'green' (optional subtle glow border)
- hover: boolean (enables scale + shadow on hover, default true)
- padding: 'sm' | 'md' | 'lg'
- as: 'div' | 'button' | 'a' (polymorphic)
- children, className

Styling:
- default: bg card, border 1px rgba(255,255,255,0.06), rounded-xl, shadow-card
- glass: bg glass, backdrop-blur, border glass
- interactive: default + hover:scale-[1.02] + hover:shadow-card-hover + hover:border-teal/10 transition
- reward: gold border glow, inner shimmer on hover
- mission: teal left-border accent (3px solid nebula-teal)

Inner highlight: all cards get a subtle inset top border (1px rgba(255,255,255,0.04)) for depth.

---

### FILE 4: src/components/ui/Button.tsx

Unified button system. Props:
- variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'reward'
- size: 'sm' | 'md' | 'lg'
- icon: ReactNode (optional leading icon)
- iconRight: ReactNode (optional trailing icon)
- loading: boolean
- disabled: boolean
- fullWidth: boolean

Styles:
- primary: bg gradient (teal-500 to teal-400), text space-black, font-semibold, rounded-xl. Hover: brightness 1.1 + glow-teal shadow. Active: scale 0.97.
- secondary: bg transparent, border 1px rgba(255,255,255,0.12), text white. Hover: border teal/20, bg rgba(56,240,255,0.04). Active: scale 0.97.
- ghost: bg transparent, text secondary. Hover: text primary, bg rgba(255,255,255,0.04).
- danger: bg mars-red/10, text mars-red, border mars-red/20. Hover: bg mars-red/20.
- reward: bg gradient (gold-400 to gold-500), text space-black. Hover: glow-gold shadow.

Loading: spinner icon replaces content, button stays same width (min-width preserved).
Sizes: sm: h-8 px-3 text-xs, md: h-10 px-4 text-sm, lg: h-12 px-6 text-base

---

### FILE 5: src/components/ui/Badge.tsx

For status indicators, counts, labels. Props:
- variant: 'default' | 'teal' | 'gold' | 'green' | 'amber' | 'red' | 'oracle'
- size: 'sm' | 'md'
- dot: boolean (shows a small animated dot before text)
- pulse: boolean (adds pulse-glow animation)

---

### FILE 6: src/components/ui/Skeleton.tsx

Loading skeleton with shimmer animation. Props:
- variant: 'text' | 'card' | 'avatar' | 'bar' | 'custom'
- width, height (for custom)
- lines: number (for text variant)

Uses the shimmer animation from animations.css.

---

### FILE 7: src/components/layout/Header.tsx

Unified top navigation. Structure:
- Fixed top, h-14, bg space-black/80, backdrop-blur-xl, border-bottom 1px rgba(255,255,255,0.06)
- Left: Logo mark (✦ icon or small SVG star) + "STELLAR" in DM Sans 600, letter-spacing 0.08em, text-sm
- Center (desktop only): Nav links — Sky · Missions · Marketplace · ASTRA (text-sm, DM Sans 500, text-secondary, hover:text-primary, active:text-teal with small dot indicator below)
- Right: Stars balance badge (✦ count in gold), Profile avatar circle (first letter of email, teal bg)
- Mobile: hamburger menu icon on right, slides in from right with glass bg

Active page indicator: thin 2px teal line below the active nav item, animated with layoutId or CSS transition on width.

---

### FILE 8: src/components/layout/BottomNav.tsx

Mobile-only fixed bottom navigation. Structure:
- Fixed bottom, h-16, bg space-black/90, backdrop-blur-xl, border-top 1px rgba(255,255,255,0.06)
- 5 items: Sky (telescope icon) · Missions (target icon) · [Center: floating teal circle home button with ✦ icon] · ASTRA (sparkles icon) · Profile (user icon)
- Active: icon + label teal, inactive: icon + label text-muted
- Center button: 56px circle, bg teal gradient, elevated with shadow, -12px translate above the bar. On tap: spring scale animation.
- Items show icon (20px lucide) + label (9px text, uppercase, letter-spacing 0.05em)

---

### FILE 9: src/components/layout/Footer.tsx

Desktop footer at page bottom (hidden on mobile where BottomNav shows). Structure:
- bg panel-dark, border-top 1px rgba(255,255,255,0.04), py-12
- 4 columns: Explore (Sky, Missions, Dark Sky Map, ASTRA AI) · Shop (Marketplace, Astroman.ge ↗) · Community (Leaderboard, Share) · About (GitHub ↗, Colosseum ↗)
- Bottom bar: "Built in Tbilisi 🇬🇪" left, "Powered by Solana" right with small Solana logo SVG
- All links: text-muted, hover:text-secondary, text-xs

---

### FILE 10: src/components/ui/StarsCounter.tsx

Animated Stars token display used in header, profile, mission completion. Props:
- count: number
- size: 'sm' | 'md' | 'lg'
- animated: boolean (counts up on change)
- showDelta: boolean (shows +N floating up on increment)

When count increases:
- Number rolls up digit by digit (slot machine effect)
- "+N" floats up and fades out in gold
- Brief gold glow pulse on the ✦ icon
- Small confetti burst on large increments (>50)

---

### FILE 11: src/components/ui/SkyBadge.tsx

Conditions badge for "Go" / "Maybe" / "Skip" sky quality:
- Go: green dot + "Clear Sky" + animated breathe glow
- Maybe: amber dot + "Partly Cloudy"
- Skip: red dot + "Overcast"
- Each gets appropriate bg tint + border color from the token system

---

After creating all 11 files, update src/app/layout.tsx to:
1. Import the design-tokens.css and animations.css globally
2. Load the Google Fonts via next/font/google (Instrument Serif, DM Sans, JetBrains Mono, Noto Sans Georgian)
3. Apply the font CSS variables to the body
4. Set body background to --color-space-black
5. Include the Header and BottomNav (mobile) in the layout shell

Do NOT modify any page files (page.tsx) — those come in subsequent prompts.
Read the existing layout.tsx, globals.css, and any existing component files before writing to preserve existing functionality (Privy provider, metadata, etc.).
```

---

## PROMPT 1 — Home Page (/)

```
I'm redesigning the home page of Stellar, a Next.js 15 astronomy app.

Read these files FIRST before writing anything:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/components/ui/Card.tsx
  src/components/ui/Button.tsx
  src/components/layout/Header.tsx
  src/app/page.tsx (current home page)
  src/app/layout.tsx

Use ONLY the design system components and tokens from the files above. Do not introduce new colors, fonts, or arbitrary values.

Redesign src/app/page.tsx with this structure:

SECTION 1 — Hero (full viewport height):
- Animated star field canvas background (keep existing if present, or create: 200 stars with twinkle animation, parallax on mouse move)
- Centered content over stars:
  - "STELLAR" in Instrument Serif, text-hero, letter-spacing -0.02em, white
  - Subtitle: "Observe the night sky. Seal your discoveries on Solana." in DM Sans 400, text-lg, text-secondary
  - Two buttons side by side: "Start Observing" (primary, large) → /missions, "Tonight's Sky" (secondary, large) → /sky
  - Below buttons: live sky condition badge (SkyBadge component) fetched from /api/sky/verify with user's location
- Gentle scroll indicator at bottom (chevron-down icon, float animation)

SECTION 2 — Tonight's Highlights (scrolls into view):
- Section title: "Tonight" in Instrument Serif, text-2xl, with animated underline that draws in on scroll
- 3-column grid (stagger animation on scroll):
  - Planet visibility cards (top 3 visible planets) — Card variant="interactive", shows planet emoji, name, visibility window, altitude badge
  - Data from /api/sky/planets (or static fallback)

SECTION 3 — How It Works (4 steps):
- Horizontal step flow with connecting line:
  1. 🔭 Observe — "Point your telescope at a celestial target"
  2. ✓ Verify — "Sky oracle confirms clear conditions"
  3. ✦ Earn — "Receive Stars tokens and discovery NFTs"
  4. 🛒 Spend — "Redeem at Georgia's first astronomy store"
- Each step: Card variant="glass", icon in teal circle (48px), title in DM Sans 600, description in text-secondary
- Connecting line: thin dashed line between cards with animated dash-offset

SECTION 4 — ASTRA AI Teaser:
- Full-width Card variant="glass" with teal glow
- Left: sparkles icon + "Meet ASTRA" in Instrument Serif + "Your AI astronomer — ask anything about tonight's sky" in text-secondary
- Right: mock chat bubble showing example Q&A
- CTA: Button variant="primary" → /chat

SECTION 5 — Marketplace Preview:
- "From Astroman" section title with astroman.ge link
- 3 featured product cards (horizontal scroll on mobile), each with product image placeholder, name, GEL price, "View" ghost button
- "Browse All" link → /marketplace

All sections use stagger-children for entrance animations triggered by Intersection Observer (or CSS scroll-timeline if supported). Implement scroll observation via a simple useEffect with IntersectionObserver — add class 'in-view' when section enters viewport.

Page must be responsive: single column on mobile, multi-column on desktop (md: breakpoint).
```

---

## PROMPT 2 — Sky Forecast Page (/sky)

```
I'm redesigning the sky forecast page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/components/ui/* (all UI components)
  src/app/sky/page.tsx (current page)
  src/lib/sky-data.ts
  src/lib/planets.ts

Redesign src/app/sky/page.tsx:

HEADER AREA:
- Page title: "Tonight's Sky" in Instrument Serif, text-2xl
- Below: current location name + last-updated timestamp in text-muted, text-xs
- Right-aligned: SkyBadge showing current conditions (Go/Maybe/Skip)

SECTION 1 — Tonight's Summary Card:
- Full-width Card variant="glass" with glow="teal" if conditions are Go
- Interior layout — 3 columns:
  - Left: Large moon phase icon (SVG circle with shadow for current phase) + phase name + illumination %
  - Center: "Best Window" — time range when conditions are optimal, shown as a horizontal bar with gradient from sunset to sunrise, highlighted section for best observing
  - Right: Key stats column: Cloud Cover %, Humidity %, Visibility (Excellent/Good/Fair/Poor), Wind speed

SECTION 2 — Sun & Moon Timeline:
- Horizontal timeline bar spanning full width
- Gradient: deep blue (night) → orange (sunrise/sunset) → deep blue
- Markers at sunrise, sunset, moonrise, moonset positions with icons
- Current time indicator (animated pulse dot)
- Show times below each marker in text-xs mono

SECTION 3 — 7-Day Forecast Grid:
- 7 cards in horizontal scroll (mobile) or grid (desktop)
- Each day card (Card variant="interactive"):
  - Day name (Mon, Tue...) + date
  - Large sky condition icon (moon+stars for clear, cloud for cloudy, rain for rain)
  - SkyBadge (Go/Maybe/Skip)
  - Cloud cover % as thin progress bar at bottom with color from sky condition tokens
  - Today's card: teal border accent
- Stagger entrance animation

SECTION 4 — Planet Tracker:
- Section title: "Planets Tonight" in Instrument Serif
- Grid of planet cards (2 columns mobile, 3 desktop, 4 wide):
  Each card (Card variant="interactive"):
  - Planet emoji (large, 32px)
  - Planet name in DM Sans 600
  - Visibility badge: "Visible" (green dot) or "Below Horizon" (muted)
  - Rise/Transit/Set times in 3-column mini layout, text-xs mono
  - Current altitude as a small arc visualization (half circle with dot at current position)
  - Hover: card lifts + shows "best viewing time" tooltip
- Sort: visible planets first, then below-horizon

SECTION 5 — Upcoming Events Banner:
- If any events within 7 days: Card variant="reward" with gold accent
- Event name, date, brief description
- "Set Reminder" button (ghost, stores to localStorage)

All data from existing API routes (/api/sky/forecast, /api/sky/planets, /api/sky/sun-moon). Show Skeleton components while loading.
```

---

## PROMPT 3 — Missions Page (/missions)

```
I'm redesigning the missions page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/components/ui/* (all UI components)
  src/app/missions/page.tsx (current page)
  src/components/sky/MissionActive.tsx
  src/lib/types.ts
  src/lib/constants.ts (mission definitions)

Redesign src/app/missions/page.tsx:

IF NOT AUTHENTICATED:
- Centered lock screen:
  - Telescope icon (lucide, 48px, text-muted)
  - "Sign in to start observing" in Instrument Serif, text-xl
  - "Complete sky missions, earn Stars, and collect discovery NFTs" in text-secondary
  - Login button (primary, large) triggering Privy login
  - Background: subtle star field with low-opacity twinkle animation

IF AUTHENTICATED:

SECTION 1 — Stats Bar (sticky below header on scroll):
- Horizontal layout, bg panel-dark, border-bottom, py-3:
  - Missions completed: icon + count / total
  - Stars earned: StarsCounter component
  - Current rank: rank name + small progress bar to next rank
  - Streak: flame icon + day count (or "Start a streak!" if 0)
- On mobile: horizontally scrollable

SECTION 2 — Tonight's Conditions:
- Compact Card variant="glass" showing:
  - SkyBadge (Go/Maybe/Skip) + cloud cover % + visibility
  - If conditions are Go: pulsing green border + "Great night to observe!"
  - If Skip: muted border + "Check back tomorrow" + next clear night date

SECTION 3 — Observation Missions:
- Section title: "Sky Missions" + mission count badge
- Mission cards as vertical list (not grid — better for mobile scanning):
  Each mission (Card variant="mission" with teal left border):
  - Left: mission emoji (40px) in a circle with subtle bg tint
  - Center: mission name (DM Sans 600) + target type badge (Naked Eye / Telescope) + difficulty badge (Beginner/Intermediate/Hard/Expert) + "✦ N Stars" in gold
  - Right: status indicator:
    - Not started: "Start" button (primary, sm)
    - Completed: green checkmark + "Sealed ✓" text + Solana explorer link icon
    - Locked (if any prerequisites): lock icon + requirement text
  - Completed missions: reduced opacity, green left border instead of teal, checkmark overlay
  - Stagger entrance animation for the list

SECTION 4 — Knowledge Quizzes:
- Section title: "Test Your Knowledge" + quiz count
- 3 quiz cards in horizontal scroll:
  Each (Card variant="interactive"):
  - Quiz emoji + name + "10 questions" + "✦ 100 Stars" potential
  - Progress: if partially done, show progress bar + "N/10"
  - CTA: "Start Quiz" or "Continue" button
  - Completed: gold border + score display

SECTION 5 — Rewards:
- Section title: "Rewards" in Instrument Serif
- Reward cards (Card variant="reward" if unlocked, "default" if locked):
  - Reward name + requirement + value
  - Locked: grayscale, lock icon overlay, progress bar showing % to unlock
  - Unlocked: gold glow, confetti-burst animation on first reveal, "Claim" button
  - Claimed: checkmark + claimed date

SECTION 6 — Recent Activity Log:
- Collapsible section: "Recent Observations"
- List of recent completed missions with: target, date, Stars earned, tx link (if minted)
- Max 5 shown, "View all" → /observations
```

---

## PROMPT 4 — Mission Active Overlay (MissionActive.tsx)

```
I'm redesigning the active mission flow overlay in Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/components/ui/* (all UI components)
  src/components/sky/MissionActive.tsx (current full file — read every line)
  src/components/sky/Verification.tsx
  src/lib/types.ts

Redesign src/components/sky/MissionActive.tsx visuals (keep ALL logic, state management, API calls, and step flow unchanged — only change JSX/CSS):

SHARED OVERLAY SHELL:
- Full-screen fixed overlay, bg space-black, z-50
- Top bar: back arrow (ghost button) + mission name + close X
- Content area: centered, max-w-md, px-4

STEP: 'briefing':
- Mission emoji large (64px) with float animation
- Mission name in Instrument Serif, text-xl
- Target + difficulty badges
- "✦ N Stars" reward preview in gold
- Mission description/hint in text-secondary
- Tip card (Card variant="glass"): observing advice specific to the target
- "Begin Observation" button (primary, large, full-width) with telescope icon
- Below: "You'll need to photograph {target} to verify your observation"

STEP: 'camera' / 'capture':
- Camera viewfinder area: rounded-2xl, 1:1 aspect ratio, border 2px dashed rgba(255,255,255,0.12)
- Corner brackets overlay (4 L-shaped corners in teal, like a camera viewfinder)
- Center crosshair (thin + shape, very subtle)
- Below viewfinder: "Point at {target} and capture" in text-secondary
- Capture button: large circle (64px), white border, teal fill, pulsing breathe animation. On press: shutter animation (brief white flash + scale)
- Alternative: "Upload Photo" ghost button below

STEP: 'verifying':
- Centered spinner: orbital animation (3 dots orbiting a center point)
- "Verifying sky conditions..." text with ellipsis animation
- Below: 3-step progress (location ✓ → sky check ◌ → oracle hash ◌) with step-by-step animation as each completes

STEP: 'verified':
- Verification result card (redesign of Verification.tsx):
  - Photo thumbnail (rounded-xl, small)
  - Metric grid (2x2): Cloud Cover %, Visibility, Temperature, Oracle Hash (truncated, mono font)
  - Sky Oracle badge: green dot + "Open-Meteo · verified" + timestamp
  - Overall: "Sky Verified ✓" in aurora-green if passed
- "Seal on Solana ✦ +{stars}" button: reward variant, large, full-width, gold shimmer on hover
- If mint error: amber error text below button

STEP: 'minting':
- Full-screen celebration buildup:
  - NFT card preview assembling (metadata appearing line by line with typewriter effect)
  - Progress: "Sealing on Solana..." with animated Solana logo
  - Fake transaction steps appearing: "Creating attestation... Minting NFT... Confirming..."

STEP: 'done':
- CELEBRATION SCREEN (this is the most important screen in the whole app):
  - Confetti burst animation (CSS particles, 12 pieces, gold + teal colors, flying outward)
  - Large teal checkmark in circle with mint-success scale animation
  - "Discovery Sealed" in Instrument Serif, text-xl, fade-in-up delay 200ms
  - Mission emoji + name, fade-in-up delay 300ms
  - Stars earned: "+{N} ✦" in Star Gold, large, stars-earned animation with glow, delay 400ms
  - If rank up: "Rank Up!" badge with rank-up animation, delay 500ms
  - Solana Explorer link: teal text with external link icon, fade-in delay 600ms
  - Two buttons (stagger in): "View NFTs" (secondary) + "Done" (primary)
  - Share on Farcaster button: purple-tinted ghost button below
  - Background: subtle golden radial gradient pulsing outward from center

ALL STEPS: smooth crossfade transition between steps (opacity + slight translateY)
```

---

## PROMPT 5 — ASTRA Chat Page (/chat)

```
I'm redesigning the ASTRA AI chat page in Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/components/ui/* (all UI components)
  src/app/chat/page.tsx (current chat page)

Redesign src/app/chat/page.tsx:

LAYOUT:
- Full height (100vh - header), flex column
- Chat area: scrollable, flex-grow, px-4, py-6
- Input area: fixed bottom, bg panel-dark, border-top, px-4 py-3

EMPTY STATE (no messages yet):
- Centered in chat area:
  - Sparkles icon (48px) with slow orbit animation
  - "ASTRA" in Instrument Serif, text-2xl, text-teal
  - "Your AI Astronomer" in text-secondary
  - 4 suggestion chips in 2x2 grid (Card variant="interactive", compact):
    "What can I see tonight?" · "Best telescope for beginners?" · "When is the next meteor shower?" · "Tell me about Jupiter"
  - Each chip: on tap, sends that message

MESSAGES:
- User messages: right-aligned, bg teal/10, border teal/20, rounded-2xl rounded-br-md, text-primary, max-w-[80%]
- ASTRA messages: left-aligned, bg card, border rgba(255,255,255,0.06), rounded-2xl rounded-bl-md, max-w-[85%]
  - ASTRA avatar: small sparkles icon in teal circle (24px) floating left of first message
  - Tool call results (planet positions, forecasts): rendered as compact Card variant="glass" inline within the message, with appropriate data visualization
- Streaming indicator: 3 dots with stagger bounce animation in an ASTRA-styled bubble
- Message entrance: fade-in-up animation, 200ms

INPUT AREA:
- Textarea (auto-resize, max 4 lines): bg card, rounded-xl, border rgba(255,255,255,0.08), placeholder "Ask ASTRA anything..."
- Send button: teal circle (40px) with arrow-up icon, disabled state when empty
- Character limit indicator (subtle, only shows near limit)
- Below input: "ASTRA uses real sky data for your location" in text-xs text-muted
```

---

## PROMPT 6 — Marketplace Page (/marketplace)

```
I'm redesigning the marketplace page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/components/ui/* (all UI components)
  src/app/marketplace/page.tsx (current page)
  src/lib/products.ts (product data)

Redesign src/app/marketplace/page.tsx:

HEADER:
- "Astroman" in Instrument Serif + subtitle "Georgia's First Astronomy Store" + small Georgian flag emoji
- "Shop on astroman.ge ↗" link

STARS REDEMPTION BAR (if authenticated):
- Sticky bar below header: Card variant="reward"
- Current Stars balance (StarsCounter) + available rewards preview
- "250 ✦ = Free Moon Lamp" / "500 ✦ = 10% Off" — show nearest achievable tier with progress bar

PRODUCT GRID:
- Category filter tabs: All · Telescopes · Moon Lamps · Projectors · Accessories
  - Tab bar: horizontal scroll, each tab is a pill shape, active = teal bg + white text, inactive = transparent + text-secondary
- Product cards (Card variant="interactive", 2-col mobile, 3-col desktop):
  - Product image area: 1:1 aspect ratio, bg card, rounded-t-xl (use product emoji as large centered placeholder if no image: 🔭 for telescopes, 🌕 for moon lamps, 🌌 for projectors)
  - Below image: product name (DM Sans 600), model subtitle (text-muted)
  - Price: GEL price large + approximate SOL equivalent small muted
  - "View on Astroman" button (ghost, sm) → external link
  - If product is a reward target: gold badge "Earn with 250 ✦"

Bottom CTA: Card variant="glass" — "Visit Astroman store in Tbilisi" + address + map link
```

---

## PROMPT 7 — Profile Page (/profile)

```
I'm redesigning the profile page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/components/ui/* (all UI components)
  src/app/profile/page.tsx (current page)

Redesign src/app/profile/page.tsx:

HERO SECTION:
- Avatar: large circle (80px) with user's first initial, gradient bg (teal to blue), border 2px white/10
- User email below
- Rank badge: current rank name in a styled badge, appropriate color per rank
- Rank progress: horizontal progress bar showing progress to next rank, label "N more missions to {next rank}"

STATS GRID (2x2 on mobile, 4-column on desktop):
Each stat (Card variant="glass"):
- Icon (lucide, 20px, teal)
- Value (large, DM Sans 700)
- Label (text-xs, text-muted)
Stats: Total Observations · Stars Earned (live from chain) · Current Streak · NFTs Collected

STARS SECTION:
- Card variant="reward":
  - StarsCounter (large, animated)
  - "On-chain SPL token balance" in text-xs text-muted mono
  - Redemption tiers as horizontal progress: marks at 250, 500, 1000 with reward labels
  - "Redeem" button if eligible

ACHIEVEMENTS / REWARDS:
- Grid of reward cards, showing locked/unlocked state
- Same structure as missions page rewards section

RECENT ACTIVITY:
- Last 5 observations list
- Each: target emoji + name + date + Stars earned + Solana explorer link (if minted)

WALLET SECTION (collapsible "Advanced"):
- Wallet address in mono font, truncated with copy button
- "View on Solana Explorer" link
- Network badge: "Devnet" in amber

SIGN OUT:
- Red ghost button at bottom, with confirmation step
```

---

## PROMPT 8 — NFT Gallery Page (/nfts)

```
I'm redesigning the NFT gallery page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/components/ui/* (all UI components)
  src/app/nfts/page.tsx (current page)

Redesign src/app/nfts/page.tsx:

PAGE HEADER:
- "My Discoveries" in Instrument Serif, text-2xl
- NFT count badge (teal)
- Right: "View on Solana" link to wallet's NFT page

IF NO NFTs:
- Centered empty state:
  - Telescope icon (48px) with float animation
  - "No discoveries yet" in Instrument Serif
  - "Complete a sky mission to seal your first observation on Solana" in text-secondary
  - Button: "Start a Mission" → /missions

NFT GRID (2-col mobile, 3-col desktop):
Each NFT (Card variant="interactive"):
- Top section: dark bg with planet/constellation SVG illustration generated from target name:
  - Moon → crescent SVG
  - Jupiter → circle with bands
  - Saturn → circle with ring
  - Generic: star cluster dot pattern
  Background: subtle radial gradient matching target type color
- NFT name: "Stellar: {Target}" in DM Sans 600
- Attribute pills row: date, cloud cover %, location (truncated)
- Stars earned badge in gold
- If has Bortle data: Bortle badge with appropriate color
- If has Image Confidence: provenance badge (teal/amber/slate)
- Bottom: "Explorer ↗" link in text-xs teal

LOADING STATE:
- Grid of Skeleton variant="card" (6 items), shimmer animation

Detail modal (on card click):
- Full NFT metadata display
- Larger target illustration
- All attributes in clean key-value layout
- Oracle hash in mono
- Solana Explorer link (prominent)
- Share button (Farcaster compose URL)
```

---

## PROMPT 9 — Dark Sky Page (/darksky)

```
I'm redesigning the Dark Sky Network page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/components/ui/* (all UI components)
  src/app/darksky/page.tsx (current page)

Redesign src/app/darksky/page.tsx:

PAGE HEADER:
- "Dark Sky Network" in Instrument Serif, text-2xl
- Subtitle: "Mapping light pollution across Georgia" in text-secondary
- Right: "API" link to /api/darksky/data

STATS BAR (3 cards in row):
Each (Card variant="glass", compact):
- Stat cards: Total Readings · Locations · Dark Sky Sites (Bortle ≤ 3)
- Large number + label + relevant icon

MAP SECTION:
- Full-width map container (Leaflet, CDN loaded)
- Dark tile layer (CartoDB dark_all or similar dark basemap, NOT default OpenStreetMap bright)
  URL: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
- Circle markers colored by Bortle scale (use design token colors)
- Custom popup styled to match app: dark bg, rounded, border, DM Sans font
- Initial center on Georgia (42.3, 43.5), zoom 7

BORTLE LEGEND (overlay, bottom-right of map):
- Card variant="glass", compact
- Title: "Bortle Scale" in mono
- 9 rows: colored dot + number + label:
  1-2: Pristine · 3-4: Rural · 5: Transition · 6-7: Suburban · 8-9: City
- Subtle, does not block map interaction

CONTRIBUTE CTA (below map):
- Card variant="reward":
- "Help map Georgia's dark skies"
- "Complete a sky mission to add your reading to the network"
- Button: "Start a Mission" → /missions

Page must work with 0 data rows (show empty map + "No readings yet" overlay)
```

---

## PROMPT 10 — Leaderboard Page (/leaderboard)

```
I'm redesigning the leaderboard page of Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/components/ui/* (all UI components)
  src/app/leaderboard/page.tsx (current page)

Redesign src/app/leaderboard/page.tsx:

PAGE HEADER:
- "Leaderboard" in Instrument Serif, text-2xl
- Time filter tabs: This Week · This Month · All Time (pill-style, same as marketplace categories)

TOP 3 PODIUM:
- Three cards positioned as podium: #2 (left, shorter), #1 (center, tallest with crown), #3 (right, shortest)
- Each card:
  - Rank number in large font (gold for #1, silver-gray for #2, bronze for #3)
  - Avatar circle with initial
  - Truncated wallet address (mono, text-xs)
  - Observation count + Stars count
  - #1 card: gold glow border, crown emoji, slightly scaled up
- Stagger entrance: #1 first, then #2 and #3 slide in from sides

FULL RANKING LIST:
Below podium, full list (Card variant="default"):
- Each row: rank # + avatar + wallet address + observations + Stars
- Alternate row bg for readability
- Current user's row: highlighted with teal left border + "You" badge
- If user not in top 20: show their rank separately below with "Your Rank: #N"

EMPTY STATE (no data):
- "Rankings update daily" message
- "Be the first observer" CTA → /missions
```

---

## PROMPT 11 — Global Animation Polish + Performance

```
I'm doing a final animation and performance polish pass on Stellar.

Read these files FIRST:
  src/styles/design-tokens.css
  src/styles/animations.css
  src/app/layout.tsx
  src/components/layout/Header.tsx
  src/components/layout/BottomNav.tsx

This prompt adds the finishing layer across the entire app. Do NOT rewrite any pages — only add/modify the shared files.

### 1. Page Transition System
Create src/components/layout/PageTransition.tsx:
- Wraps page children with fade-in-up animation on mount
- Uses CSS animation (not a library) — opacity 0→1 + translateY 8→0, 350ms ease-out
- Add to layout.tsx wrapping {children}

### 2. Scroll-Triggered Reveals
Create src/hooks/useInView.ts:
- Custom hook using IntersectionObserver
- Returns [ref, isInView] where isInView becomes true once when element enters viewport (threshold 0.1)
- Used by page sections to add 'in-view' class that triggers CSS animations
- Respects prefers-reduced-motion: if set, all elements are immediately visible

### 3. Skeleton Loading
Update src/components/ui/Skeleton.tsx if needed:
- Ensure shimmer gradient matches card bg → surface → card colors
- Add variant "planet" (circle) and "forecast" (horizontal bar with date + icon placeholder)

### 4. Haptic Feedback Cues (mobile):
Create src/hooks/useHaptic.ts:
- Wraps navigator.vibrate() with try-catch
- light(): 10ms, medium(): 25ms, heavy(): 50ms
- Used on: button taps, mission complete, NFT mint, Stars increment

### 5. Night Vision Protection:
Add to design-tokens.css:
- prefers-color-scheme: dark media query (app is always dark, but ensure system dark mode doesn't override)
- Maximum brightness cap on any white element (no pure #FFFFFF — brightest allowed is rgba(255,255,255,0.92))
- Red-shift mode toggle (optional): shifts all teal accents to deep red for telescope sessions (astronomers use red lights to preserve night vision)

### 6. Performance Checklist:
- All images: use next/image with priority on above-fold
- All icons: lucide-react tree-shakes, verify no full bundle import
- Star field canvas: runs at 30fps max, pauses when not in viewport (IntersectionObserver)
- Animations: all use transform/opacity only (no layout-triggering properties)
- Fonts: display: 'swap' on all Google Font loads
- Add will-change: transform to animated elements, remove after animation completes

### 7. Toast System
Create src/components/ui/Toast.tsx:
- Fixed bottom-center (above BottomNav on mobile)
- Variants: success (teal), error (red), info (blue), reward (gold)
- Entrance: slide-in-up + fade, exit: slide-down + fade
- Auto-dismiss: 4s default, 8s for errors
- Used for: "Stars earned!", "NFT minted!", "Connection error", etc.

### 8. Loading States
Create src/components/ui/PageLoader.tsx:
- Full-page centered loader for route transitions
- Orbital animation (3 dots circling) + "Loading..." text
- Matches space-black background seamlessly
```

---

## VISUAL IDENTITY SUMMARY

When all prompts are complete, the app should have:

**Colors:** Deep space black foundation, nebula teal as primary interactive, star gold for rewards/achievements, aurora green for success states. No pure whites. No gray cards — everything has a blue-space tint.

**Typography:** Instrument Serif for titles and celebration moments (gives it an editorial observatory feel). DM Sans for everything else (clean, modern, good at small sizes). JetBrains Mono for blockchain data. Noto Sans Georgian for KA locale.

**Motion:** Page-level stagger reveals on scroll. Celebration animations on mission completion (the most important moment in the app). Micro-interactions on buttons and cards. Star twinkle in backgrounds. No motion if prefers-reduced-motion.

**Components:** Every visual element flows from the same token system. Cards have 5 variants for different contexts. Buttons have 5 variants. Badges handle all status states. The StarsCounter animates on every change.

**Layout:** Header + BottomNav mobile shell. Content max-width for readability. Generous spacing. Cards as primary containers for all data.
