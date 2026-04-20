# STELLARR — AI-Powered Astronomy App on Solana

## What This Is
Stellarr is the all-in-one astronomy app for telescope owners and space enthusiasts. It combines a 7-day sky forecast, real-time planet tracker, and AI space companion with a real product marketplace — all powered by invisible Solana infrastructure.

Built for the Colosseum Frontier Hackathon (April 6 – May 11, 2026). Consumer track.

## The Founder
Rezi (Revaz Modebadze) — founder of Astroman (astroman.ge), Georgia's first astronomy e-commerce store. Physical store in Tbilisi, ~$150K inventory, 60K Facebook followers. Placed 2nd + sponsor prize at Superteam Georgia hackathon (March 2026).

## Core Philosophy
**"Utility first, crypto second."** This is a genuinely useful astronomy tool. The Solana layer is invisible — users sign up with email, get an auto-created wallet, pay with credit cards, and never see seed phrases or gas fees. They don't know they're on-chain until we show them.

## Tech Stack
- **Framework:** Next.js 15 + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Auth + Wallets:** Privy SDK (@privy-io/react-auth) — email/Google/SMS login, embedded Solana wallets, NO wallet-adapter
- **AI:** Claude API (claude-sonnet-4-6) via @anthropic-ai/sdk
- **Sky Data:** Open-Meteo weather API (7-day forecast) + astronomy-engine (planet positions, celestial calculations)
- **Blockchain:** @solana/web3.js, @solana/pay, @metaplex-foundation/mpl-bubblegum (compressed NFTs)
- **Backend:** Supabase (users, orders, missions, observations)
- **i18n:** next-intl (English + Georgian)
- **Deploy:** Vercel

## Available skills

- /planner
- /executor
- /reviewer
- /qa
- /solana-blockchain — Solana dApp dev: @solana/kit v5, Anchor, Privy wallets, Helius RPC, gasless flows, on-chain programs
- /metaplex-bubblegum — Compressed NFT minting: Bubblegum + Umi, Merkle trees, DAS API, Discovery Attestations
- /ux-ui-design — Production UI: dark/cosmic theme, glassmorphism, WCAG 2.1 AA, mobile-first, design tokens, animations
- /testing-debugging — Testing + debugging: Vitest, React Testing Library, Playwright, LiteSVM, hypothesis-driven debug
- /smart-contract-security — Anchor program security: account validation, PDA seeds, arithmetic safety, CPI reentrancy, pre-launch hardening

## Default workflow

For non-trivial tasks, use this order:
1. planner
2. executor
3. reviewer
4. qa

## Working style

- Preserve existing design and structure
- Prefer minimal diffs
- Reuse existing components and patterns
- Avoid unnecessary refactors
- Keep the app mobile-friendly
- Optimize for demo readiness
- Consider loading, empty, and error states

## Key Architecture Decisions
1. **Privy, NOT wallet-adapter.** Users sign up with email → embedded Solana wallet created automatically. No Phantom download, no seed phrases. Config: `embeddedWallets: { createOnLogin: 'users-without-wallets' }`
2. **Gasless transactions.** Server-side fee payer wallet covers all tx costs. Users never need SOL.
3. **Card-first payments.** Default = credit card via Privy fiat onramp. SOL payment is secondary option.
4. **All UI strings through next-intl.** Never hardcode English text. Use translation keys: `t('sky.cloudCover')` etc. Georgian translations in `messages/ka.json`.
5. **Dark cosmic theme.** Deep space background (#0B0E17), card surfaces (#1A1F2E), accent purple (#8B5CF6), teal (#14B8A6), amber (#F59E0B).

## App Structure
```
src/
  app/
    layout.tsx          — Root layout with PrivyProvider + NextIntlProvider
    page.tsx            — Dashboard / home (sky highlights + AI greeting)
    sky/page.tsx        — 7-day sky forecast + planet tracker
    chat/page.tsx       — AI Space Companion
    marketplace/page.tsx — Astroman product catalog
    profile/page.tsx    — User profile, wallet info, observation history
  components/
    nav/                — Navigation, sidebar, language toggle
    sky/                — Sky condition cards, planet cards, forecast grid
    chat/               — Chat bubbles, input, streaming display
    marketplace/        — Product cards, cart, checkout
    ui/                 — Shared UI components (buttons, cards, badges)
  lib/
    privy.ts            — Privy configuration
    sky-data.ts         — Open-Meteo API + astronomy-engine calculations
    claude.ts           — Claude API route helper
    solana.ts           — Solana connection, pay, bubblegum helpers
    supabase.ts         — Supabase client
  messages/
    en.json             — English translations
    ka.json             — Georgian translations
  i18n/
    request.ts          — next-intl config
```

## Features (Priority Order)

### P0 — Must ship (Weeks 1-3)
1. **Privy auth** — email/Google signup, embedded wallet, profile page showing account
2. **7-day sky forecast** — Open-Meteo API, hourly cloud cover/seeing/transparency, Go/Maybe/Skip badges per day
3. **Planet tracker** — astronomy-engine, Mercury-Saturn + Moon, rise/transit/set times, altitude, visibility
4. **AI Space Companion** — Claude API chat with real-time sky data injected into system prompt, EN + KA
5. **Marketplace** — 10-15 Astroman products, card payment via Privy, dual GEL+SOL pricing (Jupiter API)

### P1 — Should ship (Week 3-4)
6. **Discovery Attestations** — Metaplex Bubblegum compressed NFT minting for verified observations
7. **Basic missions** — 3 quizzes (Solar System, Constellations, Telescopes), 10 questions each, EN + KA
8. **Digital products** — Custom star maps generated via astronomy-engine for any date/location

### P2 — Nice to have (if time)
9. **Gamification** — Stars points (SPL token), rank progression, leaderboard
10. **Age gate** — Explorer Mode (under-13, no wallet), Young Astronomer (13-17)
11. **Name a Star** — On-chain star naming NFT product

## API Routes
- `POST /api/chat` — Claude API streaming chat with sky data context
- `GET /api/sky/forecast` — 7-day Open-Meteo weather forecast
- `GET /api/sky/planets` — Current planet positions via astronomy-engine
- `GET /api/products` — Astroman product catalog from Supabase
- `POST /api/mint` — Discovery Attestation NFT minting (Bubblegum)
- `GET /api/price/sol` — SOL/GEL price from Jupiter

## Environment Variables Needed
```
NEXT_PUBLIC_PRIVY_APP_ID=        # From privy.io dashboard
ANTHROPIC_API_KEY=               # Claude API key
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
SOLANA_RPC_URL=                  # Helius or public devnet RPC
FEE_PAYER_PRIVATE_KEY=           # Server wallet for gasless txs (devnet)
```

## Coding Rules
- TypeScript strict mode, no `any` types
- All UI text via next-intl translation keys — `const t = useTranslations('namespace')`
- Privy hooks for auth: `usePrivy()`, `useWallets()`, `useLogin()`
- Server components by default, `'use client'` only when needed (hooks, interactivity)
- Mobile-first responsive design with Tailwind
- Every new page/component gets a commit with descriptive message
- Keep components small — one file per component, max ~150 lines

## Globalization Roadmap
See `GLOBAL_PROMPTS.md` in the project root for Phase 2 prompts (G1–G6).

Phase 2 repositions Stellar from Georgia-focused to global. Adds:
- `src/lib/location.tsx` — GPS region detection (caucasus / north_america / global)
- `src/lib/dealers.ts` — multi-dealer product system (Astroman + High Point Scientific)
- `src/components/LocationPicker.tsx` — region selector pill/modal
- Location-aware marketplace (G3), Free Observation mission (G4), global copy (G5), README (G6)

**Prerequisite:** Phase 1 on-chain core (LATEST_PROMPTS.md, prompts 1–6) must be working on devnet first.

**Conflicts to watch:**
- `src/hooks/useLocation.ts` (current, lat/lng only) vs new `src/lib/location.tsx` (region-aware) — both can coexist; sky data keeps using the hook, marketplace uses the new context
- `src/lib/products.ts` shape changes in G2 — `priceGEL` + bilingual names → `price` + `currency` + `dealerId` — marketplace components will need updates

## Current Status
- Hackathon started April 6, 2026
- Project registered on arena.colosseum.org
- Phase 1 (on-chain core) largely implemented: mint-nft, award-stars, sky verify, NFT gallery
- Solo builder currently — searching for frontend developer to join
- Need daily GitHub commits for Colosseum activity tracking

## Deployment
- Vercel: auto-deploy from main branch
- Current URL: stellarrclub.vercel.app
- Devnet for all Solana transactions during hackathon

## Design Context

Full design context lives in `.impeccable.md` at the project root. Read that file before any design work. Summary:

- **Primary user of every page: an Astroman telescope buyer asking "can I use my new scope tonight?"** Not a crypto degen, not a prediction-market trader. They spent $800 on a Dobsonian and want to aim it at something worthwhile.
- **Brand personality: patient / precise / earned.** Opposite of hype. Every number is measured by a real instrument. No countdown timers, no "trending" theater, no gambling-skin patterns.
- **Reference: nasa.gov.** Anti-reference: Kalshi / Polymarket / generic shadcn dashboards.
- **Theme: dark, but not pure black.** Tinted near-black around `oklch(0.15 0.015 260)` — a night-sky color, not VSCode's. Light theme shipped for daytime planning.
- **Font stack:** `Source Serif 4` display (headings/verdict only) + `Public Sans` body + `JetBrains Mono` numbers + `Noto Sans Georgian` for KA. **Do NOT** use Cormorant Garamond, Inter, Fraunces, Space Grotesk, or any font on Impeccable's reflex-reject list.
- **Banned patterns:** glass-card-in-glass-card nesting, violet/indigo glow shadows, gradient text (`background-clip: text`), `border-left: 3px solid ...` accent stripes, microcopy below 12px, identical card grids repeated.
- **Design principles:**
  1. Verdict first, detail on demand
  2. Numbers earn their position (no decorative stats)
  3. No glass, no glow, no gradients
  4. Photograph where you can, illustrate where you must
  5. Mono for data, sans for voice, serif only for the verdict
