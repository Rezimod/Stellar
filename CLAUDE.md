# STELLAR — AI-Powered Astronomy App on Solana

## What This Is
Stellar is the all-in-one astronomy app for telescope owners and space enthusiasts. It combines a 7-day sky forecast, real-time planet tracker, AI space companion (ASTRA), prediction markets on celestial events, a real product marketplace from Astroman, and an offline-mode Android companion for dark-sky sites — all powered by invisible Solana infrastructure.

Built for the **Colosseum Frontier Hackathon** (April 6 – **May 11, 2026**). Consumer track. Today is 2026-05-09 — three days to ship.

## The Founder
Rezi (Revaz Modebadze) — founder of Astroman (astroman.ge), Georgia's first astronomy e-commerce store. Physical store in Tbilisi, ~$150K inventory, 60K Facebook followers. Placed 2nd + sponsor prize at Superteam Georgia hackathon (March 2026). Solo builder.

## Core Philosophy
**"Utility first, crypto second."** This is a genuinely useful astronomy tool. The Solana layer is invisible — users sign up with email, get an auto-created wallet, pay with credit cards, and never see seed phrases or gas fees. They don't know they're on-chain until we show them.

## Tech Stack
- **Framework:** Next.js 15 + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS 4
- **Auth + Wallets:** Privy SDK (`@privy-io/react-auth` + `@privy-io/server-auth`) — email/Google/SMS, embedded Solana wallets. Privy App ID: `cmnnk6n2c002d0cl47skaaz0d`. Solana wallet-adapter (Phantom/Backpack/Solflare) is also wired; `/api/mint` and `/api/award-stars` accept either Privy token or wallet pubkey.
- **AI (three providers, by route):**
  - ASTRA chat (`/api/chat`) — **OpenAI gpt-4o-mini** with tool calls into sky forecast + planet positions.
  - Photo verification (`/api/observe/verify`) — **Claude Sonnet 4.6** (`@anthropic-ai/sdk`) for vision analysis.
  - Star naming (`/api/star/claim`) — **Claude Haiku 4.5**.
- **Sky Data:** Open-Meteo (7-day weather) + `astronomy-engine` (planet positions, rise/transit/set, lunar phase).
- **Blockchain:** `@solana/web3.js`, `@solana/pay`, `@solana/spl-token`, `@metaplex-foundation/mpl-bubblegum` (compressed NFTs), `@coral-xyz/anchor` (markets program).
- **Database:** **Drizzle ORM + Neon Postgres** is primary (`drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`). Supabase is also wired for legacy paths/auxiliary storage. Schema in `src/lib/schema.ts`.
- **Rate limiting:** Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`).
- **3D / maps:** Three.js (planet/star scenes), Leaflet + react-leaflet (`/darksky` light-pollution map).
- **Testing:** Vitest + React Testing Library (unit), Playwright (e2e — `e2e/smoke.spec.ts`).
- **i18n:** next-intl (English + Georgian, partial coverage — see Architecture Decisions §4).
- **Deploy:** Vercel, auto from `main`.

## Repo Layout
```
/                              monorepo-ish root
├─ src/                        Next.js 15 web app (stellarrclub.vercel.app)
├─ apps/field/                 Stellar Field — Expo Android companion (Tether QVAC track)
├─ stellar-toolkit/            standalone scripts/tests/visual audit utilities
├─ scripts/                    one-off setup (bubblegum tree, Stars token, demo seed, star catalog)
├─ docs/                       qvac-integration, qvac-demo-script, qvac-submission, observation-verification
├─ data/                       static data files
├─ e2e/                        Playwright smoke tests
└─ public/
```

A sibling repo `stellar-markets-program/` (not in this tree) holds the Anchor program for prediction markets, deployed to **devnet at `Bcufe9vy6V3Vn4eqBQqdmRKzJgEcHdVxHci6ursiTkvi`**.

## Available skills
- /planner
- /executor
- /reviewer
- /qa
- /solana-blockchain — Solana dApp dev: @solana/kit v5, Anchor, Privy wallets, Helius RPC, gasless flows
- /metaplex-bubblegum — cNFT minting: Bubblegum + Umi, Merkle trees, DAS API, Discovery Attestations
- /ux-ui-design — Production UI: dark cosmic theme, WCAG 2.1 AA, mobile-first, design tokens, animation
- /testing-debugging — Vitest, RTL, Playwright, LiteSVM, hypothesis-driven debugging
- /smart-contract-security — Anchor program security: account validation, PDA seeds, arithmetic, CPI reentrancy

## Default workflow
For non-trivial tasks: **planner → executor → reviewer → qa**.

## Working style
- Preserve existing design and structure
- Prefer minimal diffs
- Reuse existing components and patterns
- Avoid unnecessary refactors
- Mobile-first
- Optimize for demo readiness (Colosseum judges → real telescope owners)
- Always handle loading, empty, and error states

## Key Architecture Decisions
1. **Privy-first auth, wallet-adapter as fallback.** Default flow: email signup → embedded Solana wallet auto-created (`embeddedWallets: { createOnLogin: 'users-without-wallets' }`). External-wallet paths remain wired via `WalletAdapterProvider`. New flows should default to Privy.
2. **Gasless transactions.** Server-side fee payer (`FEE_PAYER_PRIVATE_KEY`) covers all tx costs on devnet. Users never need SOL.
3. **Card-first payments.** Default = credit card via Privy fiat onramp. SOL payment is secondary.
4. **i18n status: partial.** `next-intl` is wired (`messages/en.json` + `ka.json`). Newer surfaces (`/sky`, `/missions`, parts of `/marketplace`, `/observe`) use `useTranslations`. Older surfaces (home, `/hub`, several landing sections, marketing copy) are still hardcoded English. When adding new strings, prefer translation keys; don't retroactively translate untouched files unless asked.
5. **Dark cosmic theme.** Deep space background tinted near-black (`oklch(0.15 0.015 260)`), card surfaces ~`#1A1F2E`, accent purple `#8B5CF6`, teal `#14B8A6`, amber `#F59E0B`. Light theme shipped for daytime planning. Full design context in `.impeccable.md`.
6. **Two-runtime AI: same Astra, two homes.** Web Astra runs on cloud (OpenAI + Claude). Field Astra runs on-device via QVAC (Llama 3.2 1B + Whisper) for offline use at dark-sky sites. Same Privy account, same Supabase observation history. See `docs/qvac-integration.md`.

## App Structure (real)
```
src/app/
├─ layout.tsx              Root: PrivyProvider, NextIntlProvider, theme
├─ page.tsx                Home / dashboard
├─ chat/                   ASTRA AI companion
├─ club/                   Club / membership surface
├─ contact/                Contact page
├─ darksky/                Light-pollution map (Leaflet)
├─ earn/                   Stars earning flows
├─ feed/                   Activity feed
├─ field/                  QVAC Field app landing (APK download)
├─ hub/                    Hub / quick-access
├─ leaderboard/            Stars leaderboard
├─ learn/                  Constellations, lessons (card grid + popups)
├─ m/                      Short-link / share routes
├─ marketplace/            Astroman product catalog
├─ markets/                Prediction markets on celestial events (Anchor program)
├─ missions/               Quizzes (Solar System, Constellations, Telescopes)
├─ network/                Network / friends
├─ nfts/                   Discovery Attestation gallery (DAS API)
├─ observations/           Observation history
├─ observe/                Observe flow (capture + verify + mint)
├─ profile/                User profile, wallet, history
├─ proof/                  Public proof pages
├─ settings/               Notifications, theme (light/dark), language
├─ sky/                    7-day sky forecast + planet tracker
├─ star/                   Name a Star NFT product
├─ u/                      Public user profiles
└─ api/                    See API Routes below

src/components/
├─ auth/, club/, darksky/, dashboard/, feed/, home/, landing/, layout/,
   learn/, marketplace/, nav/, network/, observe/, onboarding/, profile/,
   providers/, shared/, sky/, ui/   one folder per surface
└─ LocationPicker.tsx       global region picker

src/lib/                   54 modules — sky, planets, stars, markets, observations,
                           privy, db (drizzle), schema, rate-limit, exif,
                           astronomy-check, observations-dedup, etc.

messages/{en,ka}.json      i18n
i18n/request.ts            next-intl config
```

## Features — current status (2026-05-09)

### Shipped
- **Privy auth + embedded wallets** — email/Google signup, wallet auto-create, profile shows account
- **7-day sky forecast** + Go/Maybe/Skip badges per night
- **Planet tracker** — Mercury–Saturn + Moon, rise/transit/set, altitude
- **ASTRA chat** (`/api/chat`) — OpenAI gpt-4o-mini with sky/planet tool calls
- **Marketplace** — Astroman catalog, card payment via Privy, dual GEL+SOL pricing
- **Discovery Attestations** — Bubblegum cNFT mint on verified observations
- **Observation verification** — Claude Sonnet vision + EXIF + hash dedup + reverse-image + visibility check + rate limit
- **Stars SPL token + leaderboard** — `/api/award-stars`, `/api/stars-balance`, gamification
- **Missions** — quizzes (EN + KA)
- **Name a Star** — on-chain star naming NFT (`/star`, Claude Haiku 4.5)
- **Prediction markets pivot** — `/markets` surface + Anchor program on devnet (`Bcufe9vy6V3Vn4eqBQqdmRKzJgEcHdVxHci6ursiTkvi`); resolver route, admin UI, /my-positions, Vercel cron
- **Light-pollution map** — `/darksky` Leaflet overlay
- **Stellar Field (Tether QVAC track)** — Expo Android app at `apps/field`, on-device Llama 3.2 1B + Whisper, RAG over Messier/constellations/telescope FAQ. Awaiting `npm install` + Android build.
- **Settings** — notifications section, working light theme

### In flight (3 days to deadline)
- **Observation verification v2** — sky-alignment compass handshake + sessionId nonce binding + plate-solve stub + tiered Stars rewards. See `docs/observation-verification.md`. **MVP scope locked, not yet built.**
- **Field APK build + Tether submission** — model bundle, demo recording (`docs/qvac-demo-script.md`), upload to Superteam Earn before May 11 23:59 UTC

### Backlog (post-hackathon)
- Age gate (Explorer Mode <13, Young Astronomer 13–17)
- Real Astrometry.net plate-solve wiring (currently stubbed)
- C2PA device attestation, telescope-serial bind, stake-and-slash anti-fraud
- Mainnet migration

## API Routes (real)
```
/api/award-stars          award Stars on event (Privy or wallet)
/api/chat                 OpenAI gpt-4o-mini chat with tool calls
/api/club                 club membership flows
/api/darksky              light-pollution data
/api/feed                 activity feed
/api/leaderboard          Stars leaderboard
/api/metadata             NFT metadata
/api/mint                 Bubblegum cNFT mint (Discovery Attestation)
/api/network              social graph
/api/nft-image            cNFT image generation
/api/nfts                 user cNFT gallery via DAS API
/api/observe/verify       photo verification (Claude vision + EXIF + dedup + visibility)
/api/observe/log          observation log
/api/observe/history      user observation history
/api/og                   OpenGraph images
/api/orders               marketplace orders
/api/price/sol            SOL/GEL price (Jupiter)
/api/products             Astroman catalog
/api/redeem-code          promo codes
/api/share                share links
/api/sky/forecast         7-day Open-Meteo
/api/sky/planets          current planet positions
/api/solana-pay           Solana Pay tx generation
/api/star/claim           Name a Star (Claude Haiku 4.5)
/api/stars-balance        SPL token balance
/api/stars                Stars meta
/api/streak               daily streak
/api/subscribe            email subscribe
/api/telescopes           telescope DB
/api/users                user profile
/api/wallet               wallet info
```

## Environment Variables
```
# Auth
NEXT_PUBLIC_PRIVY_APP_ID=          # cmnnk6n2c002d0cl47skaaz0d
PRIVY_APP_SECRET=                  # server-only, never NEXT_PUBLIC_

# AI
ANTHROPIC_API_KEY=                 # Claude (Sonnet 4.6 verify, Haiku 4.5 star naming)
OPENAI_API_KEY=                    # gpt-4o-mini for ASTRA chat

# Database
DATABASE_URL=                      # Neon Postgres (primary, via Drizzle)
SUPABASE_URL= / SUPABASE_ANON_KEY= / NEXT_PUBLIC_SUPABASE_URL= / NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Solana
SOLANA_RPC_URL=                    # devnet
FEE_PAYER_PRIVATE_KEY=             # base58, gasless tx payer
MERKLE_TREE_ADDRESS=               # set by `npm run setup:bubblegum`
COLLECTION_MINT_ADDRESS=           # set by `npm run setup:bubblegum`
STARS_TOKEN_MINT=                  # set by `npm run setup:token`

# Public
NEXT_PUBLIC_MERCHANT_WALLET=
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=
NEXT_PUBLIC_HELIUS_RPC_URL=        # enables DAS API / NFT gallery
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
NEXT_PUBLIC_FIELD_APK_URL=         # Stellar Field APK direct link

# Markets
RESOLVER_SECRET=                   # /api/resolver auto-oracle
ADMIN_SECRET=                      # /api/admin manual resolver
NEXT_PUBLIC_ADMIN_WALLET=

# Rate limit
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Verification (optional)
GOOGLE_VISION_API_KEY=             # reverse-image / web-detection on uploads
```

## Useful scripts
```
npm run dev              # next dev
npm run build            # next build
npm run test:smoke       # Playwright e2e
npm run db:push          # Drizzle schema → Neon
npm run db:studio        # Drizzle Studio
npm run setup:bubblegum  # create Merkle tree + collection
npm run setup:token      # create Stars SPL token
npm run setup:stars      # import star catalog
npm run seed:demo        # seed demo data
```

## Coding Rules
- TypeScript strict mode, no `any`
- All UI text via next-intl (`useTranslations('namespace')`) for new code
- Privy hooks: `usePrivy()`, `useWallets()`, `useLogin()`
- Server components by default; `'use client'` only when hooks/interactivity required
- Mobile-first responsive design with Tailwind
- One file per component, ~150 lines max
- Every new page/component: descriptive commit. **Auto-push to main after every completed task** (per Nika's standing rule — Vercel auto-deploys).
- Validate at system boundaries only (user input, external APIs). Don't validate trusted internal calls.
- No backwards-compat shims, no feature flags, no speculative abstractions

## Globalization Notes
Region detection lives in `src/lib/location.tsx` (caucasus / north_america / global) and `src/lib/dealers.ts` (multi-dealer products). `src/components/LocationPicker.tsx` is the global picker. `src/hooks/useLocation.ts` (lat/lng only) is a separate hook used by sky data; marketplace uses the region-aware context. Don't break either.

## Hackathon ops
- **Deadline:** May 11, 2026, 23:59 UTC (Colosseum Frontier — consumer track)
- **Tether QVAC track:** separate submission via Superteam Earn, same deadline
- **Activity tracking:** Colosseum scores daily commits — keep main moving
- **Live URL:** https://stellarrclub.vercel.app
- **Devnet only** during hackathon. Mainnet migration is post-hackathon.

## Design Context

Full design context lives in `.impeccable.md` at the project root. Read that file before any design work. Summary:

- **Primary user of every page: an Astroman telescope buyer asking "can I use my new scope tonight?"** Not a crypto degen, not a prediction-market trader. They spent $800 on a Dobsonian and want to aim it at something worthwhile.
- **Brand personality: patient / precise / earned.** Opposite of hype. Every number is measured by a real instrument. No countdown timers, no "trending" theater, no gambling-skin patterns.
- **Reference: nasa.gov.** Anti-reference: Kalshi / Polymarket / generic shadcn dashboards.
- **Theme: dark, but not pure black.** Tinted near-black around `oklch(0.15 0.015 260)` — a night-sky color, not VSCode's. Light theme shipped for daytime planning.
- **Font stack (global, every page):**
  - **Hero titles + all headings** (`h1`–`h6`, `.display`): `Orbitron` **Medium (500)** — exact font, no substitutions.
  - **Paragraphs + body / UI copy**: `Geist` **Medium (500)** — exact font, no substitutions.
  - **Numbers / data / mono**: `JetBrains Mono`.
  - **Georgian (KA locale)**: `Noto Sans Georgian`.
  - Fonts are wired through token vars in `src/app/globals.css`: `--font-display` → Orbitron, `--font-body` / `--font-cta` → Geist. Any new component must use those vars (or the utilities `.font-display` / `.font-body`) — never hardcode `Inter`, `Saira`, `Source Serif 4`, `Public Sans`, `Cormorant Garamond`, `Fraunces`, or `Space Grotesk`.
- **Banned patterns:** glass-card-in-glass-card nesting, violet/indigo glow shadows, gradient text (`background-clip: text`), `border-left: 3px solid ...` accent stripes, microcopy below 12px, identical card grids repeated.
- **Design principles:**
  1. Verdict first, detail on demand
  2. Numbers earn their position (no decorative stats)
  3. No glass, no glow, no gradients
  4. Photograph where you can, illustrate where you must
  5. Mono for data, sans for voice, serif only for the verdict

## Reference docs in this repo
- `docs/qvac-integration.md` — Tether QVAC track architecture (judge-facing)
- `docs/qvac-demo-script.md` — 75s demo recording shot list
- `docs/qvac-submission.md` — Superteam Earn submission body
- `docs/observation-verification.md` — anti-fraud roadmap (compass handshake + nonce binding + plate-solve + tiered Stars)
