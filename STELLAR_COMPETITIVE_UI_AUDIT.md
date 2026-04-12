# STELLAR — Competitive UI/UX Audit & Design Upgrade Report

**Date:** April 12, 2026
**Scope:** Deep analysis of 8 leading Solana consumer apps → patterns extraction → gap analysis vs Stellar → Claude Code action prompts
**Goal:** Make Stellar look and feel like a VC-backed consumer app, not a hackathon project

---

## PART 1 — APPS ANALYZED

### 1. Phantom (phantom.com)
**What:** Solana's #1 wallet — 3M+ users, multi-chain
**Design DNA:** Dark theme (#1A1A2E base), purple accent (#AB9FF2), glass morphism cards, Inter font. Bottom tab nav, single-action screens, optimistic UI. Receipt-style transaction confirmations. Biometric auth flow.
**Key patterns:** Passkey login → silent wallet creation. "Success" screens before final confirmation. Token balances as hero numbers. Collectibles in grid gallery with lazy-loaded thumbnails. Settings buried deep — not in the way.

### 2. Jupiter (jup.ag)
**What:** Solana's #1 DEX aggregator — billions in monthly volume
**Design DNA:** Deep navy (#131A2A) with electric green (#19FB9B) accents. Bold sans-serif headings, monospace for numbers. Action-first: one giant swap button dominates. Charts use custom gradients. Mobile: bottom sheet pattern for token selection. Status bar shows live network health.
**Key patterns:** Single primary action per screen. Number formatting with commas + decimal precision. Loading skeletons (not spinners). Inline error messages below the relevant field.

### 3. DRiP (drip.haus)
**What:** Free compressed NFT drops — 4M+ collectibles distributed
**Design DNA:** Black (#0A0A0A) with bright pops per collection. Card-based gallery grid. Large artwork previews. Creator profiles with follow/subscribe CTA. "Claim" button always teal/green. XP progress bar in header. Seasonal themes change the accent palette.
**Key patterns:** Gallery grid with 2-col mobile / 3-col desktop. NFT cards: image fills 70% of card, metadata below. Daily claim mechanic with countdown timer. XP/level badge always visible in nav. Rarity labels as colored pills (Common=gray, Rare=blue, Legendary=gold).

### 4. Moonwalk Fitness (moonwalk.fit)
**What:** Walk-to-earn fitness gamification — $3.4M raised, Hack VC + Binance Labs
**Design DNA:** Dark theme with neon green (#00FF88) primary accent. Bold rounded sans-serif. Full-width stat cards with large numbers. Progress rings for daily goals. League/rank badges with metallic gradients.
**Key patterns:** 360 levels across 6 leagues. Daily streak counter prominent. Challenge cards with deposit amount + goal + duration. Leaderboard with rank badges (Bronze→Silver→Gold→Platinum→Diamond→Master). Activity feed timeline. XP progress bar beneath avatar. "Credits" system for non-crypto users.

### 5. StepN (stepn.com)
**What:** OG move-to-earn — Solana-native, millions of users at peak
**Design DNA:** Dark charcoal with mint green (#2EE4A5). Sneaker NFT cards as hero elements. Energy bar (game-style HUD). Level-up animations with particle effects. Map view for outdoor activity. Radial stat charts for sneaker attributes.
**Key patterns:** NFT-as-tool (sneaker = your game asset). Attribute spider charts. Energy countdown (limits daily earning). Repair/upgrade/mint actions in card detail view. Marketplace embedded in-app. Dual token economy (GST utility + GMT governance).

### 6. Tensor (tensor.trade)
**What:** Pro-grade NFT marketplace — took market share from Magic Eden
**Design DNA:** Pure black (#000) with lime green (#AAFF00) and white. Data-dense tables. Bloomberg-terminal aesthetic. Monospace font for prices. Sort/filter bar always visible.
**Key patterns:** Collection rows as data table (floor, volume, listed, owners). Instant bid/list buttons inline. Price charts per collection. "Sweep" button for bulk buying. Activity feed (sales, listings, bids) as real-time ticker.

### 7. Magic Eden (magiceden.io)
**What:** #1 multi-chain NFT marketplace
**Design DNA:** Deep purple (#1A0F2E) → black gradient. Magenta (#FF00FF) accent. Large collection banners. Clean card grid. Smooth page transitions. Embedded wallet option.
**Key patterns:** Collection detail: banner → stats row (floor, volume, listed, owners) → filter sidebar → grid. NFT card: image + name + price + "Buy Now" CTA. Activity tab with sale/list/bid filters. Rarity rank shown on card. "Make Offer" as secondary action.

### 8. Phantom Collectibles Gallery
**What:** NFT gallery within Phantom wallet
**Design DNA:** Same Phantom dark theme. Grid of NFT thumbnails grouped by collection. Tap to expand with full metadata. Share button generates social card. "Send" and "Burn" as actions.
**Key patterns:** Collection grouping with count badges. Compressed NFT support native. Metadata attributes as pill rows. Explorer link as small "View on Solana" text link, not prominent.

---

## PART 2 — UNIVERSAL PATTERNS (What Winners All Share)

### A. Color & Theme
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Base background | #070B14 to #0A0A0A (true dark, not gray) | ✅ #070B14 — good |
| Primary accent | ONE bold color (green, teal, purple, magenta) | ⚠️ Uses teal #38F0FF + gold #FFD166 — too many accents |
| Card background | rgba(255,255,255,0.03-0.06) with 1px border at 0.06-0.1 opacity | ⚠️ Needs audit |
| Text hierarchy | White (#FFFFFF) → Slate (#94A3B8) → Muted (#475569) | ⚠️ Needs tightening |
| Status colors | Green=success, Amber=warning, Red=error | ❌ Not systematic |

### B. Typography
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Display/headings | One distinctive serif or bold sans (NOT Inter) | ⚠️ Uses serif — good concept, needs refinement |
| Body text | Clean sans-serif, 14-16px, 1.5-1.6 line-height | ⚠️ Needs audit |
| Numbers/data | Monospace or tabular figures for alignment | ❌ Missing |
| Hierarchy levels | 3 max: Display → Body → Caption | ⚠️ Probably too many |

### C. Navigation
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Mobile bottom nav | 5 items max, center item can be special | ✅ Has this — Sky/Missions/Home/Learn/Profile |
| Active state | Filled icon + accent color, NOT just color change | ⚠️ Needs check |
| Desktop top nav | Horizontal, minimal, logo left, auth right | ✅ Has this |
| Page transitions | Fade or slide, 200ms max | ❌ Likely none |

### D. Cards & Containers
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Border radius | 12-16px (NOT 8px — too sharp, NOT 24px — too bubbly) | ⚠️ Uses rounded-2xl which is 16px — OK |
| Padding | 16-20px internal, consistent | ⚠️ Needs audit |
| Hover state | Subtle border brightening + translateY(-2px) | ❌ Likely missing |
| Glass morphism | backdrop-blur(16px) + rgba bg — used sparingly | ❌ Could add for hero |

### E. Buttons
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Primary CTA | Full-width on mobile, rounded-xl, min 48px height | ⚠️ Has CTAs — style needs check |
| Ghost/secondary | 1px border, transparent bg, same border-radius | ⚠️ Needs audit |
| Disabled state | 0.4 opacity, cursor-not-allowed | ❌ Likely inconsistent |
| Loading state | Spinner inside button, text changes to "..." | ❌ Needs check |
| Hover | Subtle brightness increase (filter: brightness(1.1)) | ❌ Likely missing |

### F. NFT Gallery (Critical for Stellar)
| Pattern | DRiP + Phantom + Magic Eden | Stellar Current |
|---|---|---|
| Grid layout | 2-col mobile, 3-col tablet, 4-col desktop | ⚠️ Has grid — layout unclear |
| Card structure | Image (70%) → Name → Key attribute → Action | ⚠️ Needs redesign |
| Image aspect | 1:1 square, object-fit: cover | ❌ No images for observation NFTs |
| Metadata display | 2-3 pills/badges below image | ⚠️ Shows attributes but not as pills |
| Empty state | Illustration + CTA to earn first NFT | ✅ Has "No observations yet" |
| Rarity/quality | Color-coded border or pill | ❌ Missing |
| Explorer link | Small, secondary, target="_blank" | ✅ Has this |

### G. Gamification (Critical — from Moonwalk + StepN + DRiP)
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| XP/Points display | Large number + token icon, always in header or profile | ⚠️ Shows Stars ✦ but layout unclear |
| Level/rank badge | Visual badge with metallic/gradient treatment | ⚠️ Has rank names but no visual badges |
| Streak counter | Flame icon + number, prominent on profile | ❌ Missing as visual element |
| Progress bar | Thin, colorful, shows % to next level | ❌ Missing |
| Leaderboard | Top 3 podium + scrollable list | ✅ Has mock leaderboard |
| Daily claim/action | Countdown timer + available-now animation | ❌ Missing |
| Achievement unlocks | Toast notification + confetti/particle effect | ❌ Missing |
| Activity feed | Timeline of recent actions with timestamps | ❌ Missing |

### H. Loading & State Management
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| Loading state | Skeleton screens (NOT spinners) | ❌ Likely uses spinners |
| Error state | Inline message + retry button | ⚠️ Some error handling |
| Empty state | Illustration + explanation + CTA | ✅ Has some |
| Success state | Checkmark animation + receipt-style info | ⚠️ Has "Discovery Sealed" screen |
| Optimistic UI | Show success immediately, confirm in background | ❌ Missing |

### I. Onboarding & Auth (from Phantom + Moonwalk + Privy patterns)
| Pattern | Industry Standard | Stellar Current |
|---|---|---|
| First screen | Value prop + single CTA ("Start" or "Sign in") | ✅ Has hero |
| Auth flow | Email/Google → wallet created silently | ✅ Uses Privy correctly |
| First action | Guide to first meaningful action within 60s | ⚠️ No guided onboarding |
| Tooltip/coach marks | Highlight key features for first-time users | ❌ Missing |

---

## PART 3 — STELLAR-SPECIFIC GAP ANALYSIS

### What Stellar Does WELL
1. **Zero wallet friction** — Privy embedded wallets, email login ✅
2. **Dark astronomy theme** — matches the content and feels premium ✅
3. **Rich feature set** — sky forecast, missions, AI chat, marketplace, NFTs ✅
4. **Clear navigation** — mobile bottom nav + desktop top nav ✅
5. **Content structure** — landing page tells the full story ✅
6. **i18n** — Georgian + English is a differentiator ✅

### What Needs Fixing (Priority Order)

#### 🔴 P0 — Visual Polish (Weekend sprint)
1. **Typography inconsistency** — Mix of serif/sans feels unintentional, not designed
2. **Too many accent colors** — Teal (#38F0FF) + Gold (#FFD166) + various others dilute brand
3. **Card styles vary across pages** — no consistent design token system
4. **Button styles inconsistent** — different radius, padding, colors per page
5. **No loading skeletons** — spinners feel amateur
6. **No hover/active states** — feels static, not interactive
7. **No page transitions** — jarring page loads

#### 🟡 P1 — UX Patterns (Week sprint)
1. **NFT gallery needs visual NFTs** — observation NFTs have no image, just text metadata. Need generated SVG star maps as NFT thumbnails
2. **Profile page lacks visual gamification** — no rank badge, no progress bar, no streak flame
3. **Leaderboard is static mock data** — kills credibility
4. **No achievement animations** — mission complete should feel like a celebration
5. **No onboarding flow** — new user sees everything at once, no guidance
6. **Mission cards don't show difficulty progression** — all look the same

#### 🟠 P2 — Competitive Differentiators (Multi-week)
1. **No social sharing** — no way to share observations to Twitter/Farcaster with generated cards
2. **No daily engagement hook** — Moonwalk has daily claims, DRiP has daily drops, Stellar has nothing pulling users back daily
3. **Marketplace feels disconnected** — products listed but no visual connection to missions/rewards
4. **ASTRA chat has no personality visually** — just a text box, no avatar, no typing indicator animation

---

## PART 4 — DESIGN TOKEN SYSTEM (What Stellar Needs)

```css
/* Core palette */
--bg-primary: #070B14;
--bg-card: rgba(255, 255, 255, 0.04);
--bg-card-hover: rgba(255, 255, 255, 0.07);
--border-subtle: rgba(255, 255, 255, 0.08);
--border-hover: rgba(255, 255, 255, 0.15);

/* Brand — commit to ONE accent */
--accent-primary: #38F0FF;       /* Stellar teal — THE brand color */
--accent-primary-dim: rgba(56, 240, 255, 0.12);
--accent-primary-border: rgba(56, 240, 255, 0.25);

/* Functional ONLY — not brand */
--stars-gold: #FFD166;            /* Stars token only */
--success: #34D399;
--warning: #FBBF24;
--error: #F87171;

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #94A3B8;
--text-muted: #475569;
--text-disabled: #334155;

/* Typography */
--font-display: 'Instrument Serif', Georgia, serif;
--font-body: 'DM Sans', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;

/* Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-full: 9999px;

/* Animation */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;

/* Shadows */
--shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);
--shadow-card-hover: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(56,240,255,0.15);
--shadow-glow: 0 0 20px rgba(56,240,255,0.15);
```

---

## PART 5 — COMPARISON MATRIX

| Feature / Quality | Phantom | Jupiter | DRiP | Moonwalk | StepN | **Stellar** |
|---|---|---|---|---|---|---|
| **Dark theme consistency** | 10/10 | 9/10 | 9/10 | 8/10 | 8/10 | **6/10** |
| **Typography system** | 9/10 | 8/10 | 8/10 | 7/10 | 7/10 | **5/10** |
| **Loading states** | 10/10 | 9/10 | 8/10 | 7/10 | 7/10 | **4/10** |
| **Button consistency** | 10/10 | 9/10 | 8/10 | 8/10 | 7/10 | **5/10** |
| **Animation/motion** | 9/10 | 8/10 | 7/10 | 7/10 | 9/10 | **3/10** |
| **NFT gallery** | 9/10 | N/A | 10/10 | N/A | 8/10 | **4/10** |
| **Gamification visual** | N/A | N/A | 8/10 | 10/10 | 10/10 | **5/10** |
| **Onboarding flow** | 9/10 | 7/10 | 8/10 | 8/10 | 9/10 | **4/10** |
| **Profile/account** | 8/10 | 7/10 | 8/10 | 9/10 | 9/10 | **5/10** |
| **Mobile-first** | 10/10 | 9/10 | 8/10 | 10/10 | 10/10 | **6/10** |
| **Blockchain invisible** | 10/10 | 6/10 | 9/10 | 9/10 | 7/10 | **8/10** |
| **Overall UX polish** | 9.5/10 | 8.5/10 | 8/10 | 8/10 | 8/10 | **5/10** |

**Stellar average: 5.0/10 → Target: 7.5+/10**

---

## PART 6 — CLAUDE CODE ACTION PROMPTS

These are copy-paste-ready prompts for Claude Code, ordered by impact. Run each in a new conversation.

---

### PROMPT A — Global Design Token System + CSS Reset

```
Read every CSS file and Tailwind config in this repo. I need you to create a unified design token system that makes Stellar look like a professional Solana consumer app (think Phantom, DRiP, Moonwalk quality).

Read these files first:
  tailwind.config.ts (or .js)
  src/app/globals.css
  src/app/layout.tsx

Step 1 — Update tailwind.config to add these exact design tokens:

Colors:
  stellar: {
    bg: '#070B14',
    card: 'rgba(255, 255, 255, 0.04)',
    'card-hover': 'rgba(255, 255, 255, 0.07)',
    border: 'rgba(255, 255, 255, 0.08)',
    'border-hover': 'rgba(255, 255, 255, 0.15)',
  },
  accent: {
    DEFAULT: '#38F0FF',
    dim: 'rgba(56, 240, 255, 0.12)',
    border: 'rgba(56, 240, 255, 0.25)',
  },
  stars: '#FFD166',

Font families:
  display: ['Instrument Serif', 'Georgia', 'serif'],
  body: ['DM Sans', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],

Border radius:
  Keep defaults but ensure 'xl' = 16px, '2xl' = 20px

Add custom keyframes for:
  fadeIn: 0%{opacity:0, transform:translateY(8px)} → 100%{opacity:1, transform:translateY(0)}
  slideUp: 0%{opacity:0, transform:translateY(16px)} → 100%{opacity:1, transform:translateY(0)}
  scaleIn: 0%{opacity:0, transform:scale(0.95)} → 100%{opacity:1, transform:scale(1)}
  glow: 0%{box-shadow:0 0 5px rgba(56,240,255,0.2)} → 50%{box-shadow:0 0 20px rgba(56,240,255,0.4)} → 100%{box-shadow:0 0 5px rgba(56,240,255,0.2)}

Animations:
  'fade-in': 'fadeIn 400ms cubic-bezier(0.16,1,0.3,1) forwards',
  'slide-up': 'slideUp 500ms cubic-bezier(0.16,1,0.3,1) forwards',
  'scale-in': 'scaleIn 300ms cubic-bezier(0.16,1,0.3,1) forwards',
  'glow': 'glow 2s ease-in-out infinite',

Step 2 — Update globals.css:

Add Google Fonts import at top:
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');

Set base body styles:
  body { font-family: 'DM Sans', system-ui, sans-serif; }
  h1, h2, h3 { font-family: 'Instrument Serif', Georgia, serif; }

Add utility classes:
  .card-base {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    transition: all 250ms cubic-bezier(0.16,1,0.3,1);
  }
  .card-base:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.15);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }
  .btn-primary {
    background: linear-gradient(135deg, #38F0FF 0%, #0EA5E9 100%);
    color: #070B14;
    font-weight: 600;
    border-radius: 12px;
    padding: 12px 24px;
    transition: all 200ms;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    color: #94A3B8;
    border-radius: 12px;
    padding: 12px 24px;
    transition: all 200ms;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #FFFFFF; }
  .text-display { font-family: 'Instrument Serif', Georgia, serif; }
  .text-mono { font-family: 'JetBrains Mono', monospace; }
  .badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
  }

Add scrollbar styling for dark theme:
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

Step 3 — Update layout.tsx:
  Add the Google Fonts <link> tags if @import doesn't work in CSS.
  Ensure body has className="bg-[#070B14] text-white antialiased"

Do not touch any other files. This is foundation only.
```

---

### PROMPT B — Skeleton Loading Components

```
Create a reusable skeleton loading system for Stellar. Currently the app uses spinners — they feel amateur. Every top Solana app (Phantom, Jupiter, DRiP) uses skeleton screens.

Create src/components/ui/Skeleton.tsx:

Export these components:

1. Skeleton — base animated placeholder
   Props: className?: string, variant?: 'text' | 'circular' | 'rectangular' (default 'text')
   Renders: div with rounded-md bg-white/[0.06] and a shimmer animation
   The shimmer: a gradient that slides left-to-right infinitely
   CSS animation: shimmer 1.5s ease-in-out infinite
   Keyframes: 0% background-position: -200% center → 100% background-position: 200% center
   Background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)
   background-size: 200% 100%

2. SkeletonCard — full card placeholder (for mission cards, NFT cards, product cards)
   Renders: card-base div containing:
     Skeleton rectangular (aspect-video, full width, rounded-t-xl)
     div padding-4:
       Skeleton text (h-4 w-3/4 mb-2)
       Skeleton text (h-3 w-1/2)

3. SkeletonList — multiple rows
   Props: rows?: number (default 3)
   Renders: N items each with:
     Skeleton circular (w-10 h-10) + div with two Skeleton text lines

4. SkeletonGrid — grid of SkeletonCards
   Props: cols?: number (default 2), count?: number (default 4)
   Renders: grid with gap-3, grid-cols-{cols}, {count} SkeletonCards

5. SkeletonProfile — for profile page loading
   Renders: centered layout with:
     Skeleton circular (w-20 h-20 mx-auto)
     Skeleton text (h-6 w-32 mx-auto mt-4)
     Skeleton text (h-4 w-24 mx-auto mt-2)
     div grid-cols-3 gap-4 mt-6:
       three Skeleton rectangular (h-20 rounded-xl)

No external dependencies. Pure Tailwind + CSS animations.
```

---

### PROMPT C — Unified Card Component

```
Read these files to understand the current card patterns used across the app:
  src/app/missions/page.tsx
  src/app/marketplace/page.tsx
  src/app/nfts/page.tsx
  src/app/page.tsx (home)

Create src/components/ui/Card.tsx with a unified card system:

1. Card — base wrapper
   Props: className?, children, hover?: boolean (default true), onClick?, padding?: 'sm' | 'md' | 'lg' (default 'md')
   Base styles: card-base class + padding based on prop
   If hover: add card-base:hover effects
   If onClick: add cursor-pointer

2. CardImage — top image area
   Props: src?: string, alt?: string, fallbackIcon?: ReactNode, aspectRatio?: 'square' | 'video' | 'wide' (default 'square'), overlay?: ReactNode
   If src: <img> with object-cover, rounded-t-xl
   If !src: dark placeholder div with fallbackIcon centered (opacity 30%)
   overlay: absolutely positioned content over the image (for badges, etc)

3. CardBadge — small pill badge
   Props: children, variant?: 'default' | 'accent' | 'stars' | 'success' | 'warning'
   default: bg-white/[0.08] text-white/60
   accent: bg-accent-dim text-accent border border-accent-border
   stars: bg-[#FFD166]/10 text-stars border border-[#FFD166]/20
   success: bg-emerald-500/10 text-emerald-400
   warning: bg-amber-500/10 text-amber-400

4. CardStat — number display
   Props: label: string, value: string | number, icon?: ReactNode
   Renders: small muted label on top, large white value below, optional icon left of value
   Value uses font-mono class for number alignment

Do NOT refactor existing pages yet — just create the components.
```

---

### PROMPT D — Profile Page Overhaul (Moonwalk-inspired)

```
Read src/app/profile/page.tsx fully. Then redesign it to match the quality of Moonwalk Fitness and StepN profile pages.

Current problems:
- Rank is just a text label, not visual
- No progress bar to next rank
- No streak visualization
- No visual avatar/badge area
- Stars balance doesn't feel like a real token
- Layout is probably a plain list

Redesign the page with these sections (top to bottom):

Section 1 — Hero card (full-width, card-base, py-8 text-center):
  - Rank badge: circular div (w-20 h-20) with gradient border matching rank color
    Stargazer: gray gradient
    Observer: blue gradient (#38F0FF to #0EA5E9)
    Pathfinder: purple gradient (#A855F7 to #6366F1)
    Celestial: gold gradient (#FFD166 to #F59E0B)
  - Inside circle: rank emoji or first letter of username
  - Rank name below badge: text-display text-lg
  - Progress bar to next rank: thin (h-1.5) rounded-full bar with accent color fill
    Show "3/5 missions to Pathfinder" text below
  - Username or "Observer" title
  - Wallet address: truncated, text-mono text-xs text-muted, tap to copy with toast

Section 2 — Stats grid (3 columns, gap-3):
  Card 1: Stars balance — large number in font-mono text-stars, "✦ Stars" label, small "On Solana Devnet" muted text
  Card 2: Observations — large number, "Sealed on chain" label
  Card 3: Streak — flame emoji + number + "days" label. If streak > 0, show flame in amber. If 0, show in muted.

Section 3 — Achievements row (horizontal scroll):
  Each achievement: small card (w-28) with:
    Icon/emoji (32px)
    Name (text-xs font-medium)
    Status: locked (opacity 30%, lock icon) or unlocked (full opacity, check icon)
  Use missions data to determine unlocked status

Section 4 — Recent observations (last 5):
  Each row: card-base with:
    Left: mission emoji + target name + date
    Right: Stars earned + Explorer link icon
  If no observations: empty state card

Section 5 — Settings section:
  "Advanced" collapsible:
    Wallet address (full, copyable)
    View on Solana Explorer link
  Sign out button: btn-ghost, full width, text-red-400

Import and use:
  getStarsBalance from @/lib/solana (if it exists)
  usePrivy, useWallets from Privy
  Skeleton components for loading states

Use animate-fade-in on sections with staggered animation-delay (0ms, 100ms, 200ms, etc.)
```

---

### PROMPT E — NFT Gallery Visual Overhaul (DRiP-inspired)

```
Read src/app/nfts/page.tsx fully. Then redesign it to match DRiP's gallery quality.

Current problems:
- NFT cards have no visual image — just text metadata
- No visual hierarchy between NFTs
- No collection stats header
- Cards probably all look the same

Redesign:

Section 1 — Header (sticky top):
  "My Observations" in text-display text-2xl
  Count badge: pill showing total count
  Sort/filter: "Recent" / "Rarest" toggle (just UI, sort by date desc or stars desc)

Section 2 — Stats bar (3 mini cards in a row):
  Total NFTs | Total Stars earned (sum from attributes) | Rarest observation (highest star value)

Section 3 — Grid (grid-cols-2 gap-3):
  Each NFT card redesign:
  
  Top 60% — Generated SVG placeholder (since we don't have real images):
    Dark gradient background (#0F172A to #070B14)
    Target emoji centered and large (text-4xl)
    Subtle star dots scattered (random positioned small circles at 0.1-0.3 opacity)
    Date text at bottom-right of image area, very small, muted
  
  Bottom 40% — Metadata:
    NFT name (text-sm font-semibold white, truncate)
    Row of attribute pills:
      Target: accent pill
      Cloud Cover: if <20% green pill "Clear", <50% amber "Partial", else red "Cloudy"
      Stars: gold pill with ✦ icon
    If "Image Confidence" attribute exists: provenance badge (teal/amber/slate)
    "View on Explorer" — text-xs text-accent, inline-flex with ExternalLink icon
  
  Card hover: scale(1.02) + shadow-glow effect

Empty state (no NFTs):
  Large telescope emoji (text-6xl)
  "No observations yet" in text-display
  "Complete a sky mission to seal your first discovery on Solana" in text-secondary
  "Start Observing" btn-primary → /missions

Loading state: SkeletonGrid with cols=2 count=4

Use animate-fade-in with staggered delays per card (index * 50ms, max 400ms)
```

---

### PROMPT F — Mission Cards Visual Upgrade

```
Read src/app/missions/page.tsx fully. The mission cards need to look like game challenge cards (think Moonwalk's challenge cards or StepN's sneaker cards).

Current: missions are probably simple list items with emoji + name + stars.

Redesign each mission card:

Structure:
  card-base with overflow-hidden
  
  Left section (w-16): 
    Difficulty gradient strip (full height, 4px wide):
      Beginner: #34D399 (green)
      Intermediate: #38F0FF (teal)
      Hard: #A855F7 (purple)
      Expert: #F59E0B (gold)
  
  Content section (flex-1, p-4):
    Row 1: emoji (text-2xl) + name (text-sm font-semibold) + difficulty badge pill
    Row 2: description (text-xs text-secondary, line-clamp-2)
    Row 3: bottom row with:
      Left: "✦ +{stars}" in text-stars font-mono font-bold
      Right: 
        If completed: green check badge "Completed"
        If locked: lock icon + "Requires: {prerequisite}"
        If available: "Start →" btn-primary small

  Completed missions: add subtle green left border glow
  Available missions: normal
  Locked missions: opacity-60, no hover effect

Quiz section should be visually separate:
  Subheading "Knowledge Quizzes" with brain emoji
  Quiz cards: similar structure but with "10 questions · 100✦" meta text

Stats bar at top of page:
  Three stats in a row: Missions completed / Stars earned / Current rank
  Use CardStat component pattern

Add staggered fade-in animations on the mission list.
```

---

### PROMPT G — Success Screen + Achievement Animations

```
Read src/components/sky/MissionActive.tsx — specifically the step === 'done' render block.

The success screen after minting an NFT is the most important moment in the app. It needs to feel like a celebration — like leveling up in a game.

Redesign the 'done' step:

Background: full screen, #070B14 with subtle radial gradient (accent color at 5% opacity, centered)

Animation sequence (use CSS animations with delays):

0ms: Backdrop fades in
200ms: Checkmark circle scales in (animate-scale-in)
  - Circle: w-20 h-20, bg-accent-dim, border-2 border-accent
  - Inside: animated SVG checkmark that draws itself (stroke-dasharray + stroke-dashoffset animation)
  
400ms: Title slides up (animate-slide-up)
  "Discovery Sealed ✦" in text-display text-2xl

500ms: Target info fades in
  "{mission.emoji} {mission.name}" in text-secondary

600ms: Stars earned counter (animate-scale-in)
  "+{stars} ✦" — large, text-stars, font-mono, text-3xl font-bold
  Add subtle glow animation on the number

800ms: Confetti burst — CSS-only confetti using multiple pseudo-elements
  Or: use a simple particle effect with 8-12 small colored dots that expand outward and fade
  Colors: accent, stars-gold, emerald, purple

1000ms: Solana Explorer link fades in (if real tx)
  "View on Solana Explorer" with ExternalLink icon
  text-xs text-accent hover:underline

1200ms: Action buttons slide up
  "View My NFTs" — btn-primary, full width
  "Continue" — btn-ghost, full width
  "Share on Farcaster" — purple styled button (if exists)

The whole sequence should feel smooth and celebratory — like unlocking an achievement in a mobile game.

For the confetti: create a simple CSS animation:
  @keyframes confetti-burst {
    0% { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
  }
  Use 12 small divs (6px circles) with different --x and --y custom properties
  Random accent colors
  Duration: 800ms, ease-out

Do not change any logic — only the visual render of step === 'done'.
```

---

### PROMPT H — Smooth Page Transitions + Staggered Reveals

```
Read src/app/layout.tsx and understand the current page structure.

Add smooth page-level animations across the entire app without installing any new packages.

Step 1 — Create src/components/ui/PageTransition.tsx:
  'use client'
  A wrapper component that applies animate-fade-in to its children on mount.
  Props: children, delay?: number (ms), className?: string
  Uses a simple opacity + translateY animation via CSS class

Step 2 — Create src/components/ui/StaggerChildren.tsx:
  'use client'
  Props: children, baseDelay?: number (default 0), stagger?: number (default 80)
  Wraps each child in a div with animation-delay set to baseDelay + (index * stagger)
  Each child gets the animate-slide-up class with opacity-0 initially
  animation-fill-mode: forwards so they stay visible

Step 3 — Apply to key pages:
  src/app/page.tsx (home): Wrap each section in StaggerChildren
  src/app/missions/page.tsx: Wrap mission card list in StaggerChildren
  src/app/nfts/page.tsx: Wrap NFT grid in StaggerChildren
  src/app/profile/page.tsx: Wrap each section in StaggerChildren

Step 4 — Add to globals.css:
  .animate-slide-up {
    animation: slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-fade-in {
    animation: fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  [style*="animation-delay"] {
    opacity: 0;
  }

This creates the "polished app" feel where content reveals itself smoothly rather than appearing all at once. Phantom, Jupiter, and every top app does this.

Do not change any content or logic — only add animation wrappers.
```

---

### PROMPT I — ASTRA Chat Visual Polish

```
Read src/app/chat/page.tsx fully. The AI chat needs to feel like a premium AI assistant, not a basic text box.

Redesign:

Header:
  "ASTRA" with a small teal dot (online indicator, animated pulse)
  Subtitle: "AI Astronomer · Powered by Claude" in text-xs text-muted
  No back button here — use the nav

Message bubbles:
  User messages: bg-accent-dim text-white, rounded-2xl rounded-br-md, max-w-[80%], self-end
  ASTRA messages: bg-white/[0.04] text-white, rounded-2xl rounded-bl-md, max-w-[85%], self-start
  ASTRA avatar: small teal circle (w-6 h-6) with "✦" inside, left of first message in a group

Typing indicator (when ASTRA is thinking):
  Three dots animation (the classic iOS-style)
  Inside an ASTRA-style bubble
  Dots: 6px circles, bg-white/30, staggered bounce animation

Input area:
  Sticky bottom, bg-[#070B14]/90 backdrop-blur-xl
  Input: bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3
  Send button: teal circle (w-10 h-10) with arrow icon, disabled state when empty
  Placeholder: "Ask ASTRA anything..." in text-muted

Quick suggestion chips (only shown when no messages):
  Row of pill buttons with suggested questions:
    "What's visible tonight?"
    "Best telescope for beginners?"
    "Explain the Bortle scale"
  Tappable, styled as btn-ghost but smaller (text-xs, py-1.5 px-3)

Add smooth scroll-to-bottom on new messages.
Add animate-slide-up on each new message as it appears.

Do not change the API logic or streaming — only the visual layer.
```

---

### PROMPT J — Landing Page Polish (Final Impression)

```
Read src/app/page.tsx fully. The landing page is the first thing judges and users see. It needs to look VC-backed, not hackathon.

Apply these changes WITHOUT changing the content structure:

1. Hero section:
   - Add subtle animated gradient orb behind the title (large blur circle, accent color at 8% opacity, slow float animation)
   - Title: ensure it uses text-display (Instrument Serif)
   - CTA buttons: btn-primary for "Start Observing", btn-ghost for "Tonight's Sky"
   - "Live on Solana Devnet" badge: badge-pill with accent styling + small animated dot

2. Feature cards (Sky, Missions, ASTRA, Shop):
   - Use card-base class for all
   - Add hover effects (card-base:hover)
   - Icons should be in accent color
   - Stagger fade-in animation

3. "How It Works" section:
   - Steps should have a connecting line (thin vertical line between steps)
   - Step numbers: accent colored circles
   - Use animate-slide-up with stagger

4. Tonight's Sky widget:
   - Make it feel like a live data card
   - Small "Live" badge with pulsing green dot in top right
   - If no data: SkeletonCard placeholder

5. Mission preview list:
   - Apply the mission card design from Prompt F
   - Only show 3-4 missions
   - "See all missions →" link at bottom

6. ASTRA preview:
   - Style the fake chat bubbles like the real chat design (Prompt I)
   - Add typing indicator at the end of the preview

7. Rewards section:
   - Cards should have subtle gradient borders matching their reward tier
   - Stars amounts should use font-mono text-stars

8. Footer:
   - Clean, minimal, two-column on desktop
   - "Built on Solana" with small Solana logo mark
   - Social links if any

Apply animate-slide-up with StaggerChildren to every major section.
Ensure all cards use the unified card-base class.
Ensure all headings use text-display (Instrument Serif).
Ensure all buttons use btn-primary or btn-ghost consistently.
```

---

## PART 7 — IMPLEMENTATION ORDER

| Order | Prompt | Time | Impact |
|---|---|---|---|
| 1 | **A** — Design Tokens + CSS | 30min | Foundation for everything |
| 2 | **B** — Skeleton Loading | 20min | Instant polish upgrade |
| 3 | **C** — Card Components | 20min | Reusable foundation |
| 4 | **H** — Page Transitions | 20min | Makes everything feel smooth |
| 5 | **J** — Landing Page Polish | 45min | First impression for judges |
| 6 | **D** — Profile Page | 45min | Core gamification visual |
| 7 | **F** — Mission Cards | 30min | Core engagement visual |
| 8 | **E** — NFT Gallery | 45min | Proof of on-chain substance |
| 9 | **G** — Success Animations | 30min | The dopamine hit moment |
| 10 | **I** — ASTRA Chat Polish | 30min | AI feature visual quality |

**Total estimated time: ~5 hours of Claude Code execution**
**Expected result: Stellar goes from 5/10 → 7.5+/10 visual quality**

---

## PART 8 — WHAT TO STEAL FROM EACH APP

| App | Steal This | For This Page |
|---|---|---|
| **Phantom** | Passkey → silent wallet → balance hero | Already have via Privy ✅ |
| **Phantom** | Receipt-style success screens | Mission complete (Prompt G) |
| **Phantom** | Skeleton loading everywhere | All pages (Prompt B) |
| **Jupiter** | Single primary action per screen | Missions flow |
| **Jupiter** | Monospace for all numbers | Design tokens (Prompt A) |
| **Jupiter** | Inline error messages | Mint flow errors |
| **DRiP** | Gallery grid with image-heavy cards | NFT gallery (Prompt E) |
| **DRiP** | XP progress bar in header | Profile (Prompt D) |
| **DRiP** | Daily engagement mechanic | Future: daily sky check-in |
| **DRiP** | Rarity pills on NFT cards | NFT gallery (Prompt E) |
| **Moonwalk** | 360-level rank system visual | Profile rank badge (Prompt D) |
| **Moonwalk** | Streak flame counter | Profile (Prompt D) |
| **Moonwalk** | Challenge cards with visual difficulty | Mission cards (Prompt F) |
| **Moonwalk** | Stats grid (3 columns, big numbers) | Profile + missions header |
| **StepN** | Achievement unlock animations | Success screen (Prompt G) |
| **StepN** | Energy/progression HUD | Future: daily observation energy |
| **Tensor** | Data-dense but clean layouts | Leaderboard page |
| **Magic Eden** | Collection banner + stats row | NFT gallery header (Prompt E) |

---

*This audit is based on analysis of 8 Solana consumer apps conducted April 12, 2026. Design patterns extracted from public websites, app stores, and documented UI patterns.*
