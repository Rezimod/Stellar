# STELLAR — Full Project Overview

**Hackathon:** Colosseum Frontier 2026 (April 6 – May 11, 2026) · Consumer Track  
**Builder:** Rezi (Revaz Modebadze) — founder of Astroman (astroman.ge), Georgia's first astronomy e-commerce store  
**Live URL:** stellarrclub.vercel.app  

---

## What the App Does

Stellar is a consumer astronomy app that combines a 7-day sky forecast, real-time planet tracker, AI space companion, and a physical product marketplace — all powered by invisible Solana infrastructure. Users sign up with email or Google (no wallets, no seed phrases), complete sky observation missions by photographing celestial objects, and earn Stars tokens and NFT attestations for verified discoveries.

**Core philosophy:** Utility first, crypto second. Users never see blockchain interactions unless they look for them.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| Animations | CSS keyframes + canvas (star field) |
| i18n | next-intl — English + Georgian |
| State | Custom `useAppState` hook (React context + localStorage) |
| Icons | lucide-react |

### Backend
| Layer | Technology |
|---|---|
| API | Next.js Route Handlers (Edge-compatible) |
| Database | Neon (serverless Postgres) via Drizzle ORM |
| AI — Chat | Anthropic Claude API (`claude-sonnet-4-6`) with tool calling |
| AI — Photo Verification | Claude vision API (multimodal) |
| Weather | Open-Meteo API (free, no key required) |
| Planet math | astronomy-engine (local JS library) |
| Rate limiting | In-memory middleware (`src/middleware.ts`) |

### Auth & Wallets
| Layer | Technology |
|---|---|
| Auth | Privy SDK (`@privy-io/react-auth`) |
| Login methods | Email, Google, SMS |
| Wallets | Privy embedded Solana wallets — auto-created on signup |
| Key principle | No Phantom, no wallet-adapter, no seed phrases visible to user |

### Blockchain
| Layer | Technology |
|---|---|
| Network | Solana (devnet during hackathon) |
| RPC | Helius (or public devnet fallback) |
| NFT minting | Metaplex Bubblegum + Umi — compressed NFTs (cNFTs) |
| SPL token | Custom STARS token on devnet (SPL) |
| On-chain proofs | Memo program — observation data written to chain |
| Fee model | Server-side fee payer wallet covers all gas — users pay nothing |
| NFT indexing | Helius DAS API (`getAssetsByOwner`) |

### Infrastructure
| Layer | Technology |
|---|---|
| Deploy | Vercel (auto-deploy from `main`) |
| DB | Neon serverless Postgres |
| Env secrets | Vercel env vars + `.env.local` locally |

---

## All Pages

### `/` — Home (Dashboard)
**What it shows:**
- Animated star field canvas in hero section
- Live sky preview widget (tonight's cloud cover, visibility)
- "How It Works" explainer — 4 steps: Observe → Verify → Earn → Spend
- Links to Missions and Marketplace
- ASTRA AI promo section

**User actions:**
- Click "Start Observing" → goes to `/missions`
- Click "Browse Shop" → goes to `/marketplace`
- If signed in: shows personalized greeting with wallet address

---

### `/sky` — Sky Forecast
**What it shows:**
- Tonight's highlights — best observation window, moon phase, overall conditions
- Sun/Moon rise & set times bar
- 7-day forecast grid — each day rated Go / Maybe / Skip based on cloud cover
- Planet grid — Mercury through Saturn + Moon, with rise/transit/set times and altitude
- Upcoming astronomical events banner

**Data sources:**
- Weather: Open-Meteo API (30-min cache)
- Planet positions: `astronomy-engine` library (calculated server-side, no external API)

**User actions:**
- Browse forecast days
- Click planet cards to expand detail (altitude, visibility window, fun fact)
- View sunrise/sunset times for current location

---

### `/chat` — ASTRA AI Companion
**What it shows:**
- Chat interface with ASTRA (the AI astronomer persona)
- Streaming responses
- Tool call results shown inline (planet positions, forecast data)

**How it works:**
- Claude API (`claude-sonnet-4-6`) with streaming
- System prompt injects ASTRA persona, instructs response in user's language (EN/KA)
- Claude has two tools it can call autonomously:
  - `get_planet_positions` — runs astronomy-engine for current positions
  - `get_sky_forecast` — fetches Open-Meteo 7-day data
- Rate limited: 10 requests/minute per IP

**User actions:**
- Type any astronomy question in English or Georgian
- ASTRA responds with real tonight's data
- ASTRA never mentions it's Claude

---

### `/missions` — Sky Missions + Quizzes
**What it shows (unauthenticated):**
- Locked mission list preview
- Tonight's sky conditions (live from Open-Meteo)
- Sign-in prompt

**What it shows (authenticated):**
- Stats bar (missions completed, Stars earned, rank)
- Mission list with start buttons
- Knowledge quiz section
- Rewards section (unlocked/locked with progress)
- Observation log (recent missions)

**Available Missions:**
| Mission | Target | Type | Stars | Difficulty |
|---|---|---|---|---|
| The Moon | Lunar surface | Naked eye | 50 | Beginner |
| Jupiter | Galilean moons | Telescope | 75 | Beginner |
| Pleiades (M45) | Star cluster | Naked eye | 60 | Beginner |
| Orion Nebula (M42) | Deep sky | Telescope | 100 | Intermediate |
| Saturn | Ring system | Telescope | 100 | Intermediate |
| Andromeda Galaxy (M31) | Deep sky | Telescope | 175 | Hard |
| Crab Nebula (M1) | Supernova remnant | Telescope | 250 | Expert |

**Available Quizzes:**
- Solar System (10 questions, 10 Stars per correct)
- Constellations (10 questions, 10 Stars per correct)
- Telescopes (10 questions, 10 Stars per correct)
- All quizzes in English + Georgian

**Mission flow when started:**
1. User taps "Start" on a mission
2. MissionActive overlay opens with mission briefing + hint
3. User goes outside, observes, takes photo
4. Photo analyzed by Claude vision API + sky oracle
5. Stars awarded, NFT minted on Solana
6. Mission marked complete in app state

**User actions:**
- Start any mission
- Take/upload a photo of the sky target
- Take knowledge quizzes
- View unlocked rewards
- View observation history

---

### `/observe` — Camera Observation Flow
**What it shows:**
- Full-screen observation flow component (`ObserveFlow`)
- Camera capture or file upload
- Sky verification status
- Verification result with confidence score

**How verification works:**
1. User submits photo + GPS coordinates
2. `POST /api/observe/verify` runs:
   - Claude vision API analyzes image (is it a real night sky photo? what object?)
   - `astronomy-check` lib verifies that the claimed object is actually visible tonight at the user's coordinates
   - Returns confidence: `high` / `medium` / `low` / `rejected`
3. Stars awarded based on confidence (high = 80, medium = 40, low = 15, rejected = 0)
4. Anti-cheat: rejects screenshots, AI-generated images, photos taken in daylight

**User actions:**
- Open camera to capture observation
- Upload existing photo
- View verification result
- Mint NFT from verified observation

---

### `/marketplace` — Astroman Product Store
**What it shows:**
- Product grid — real Astroman.ge products (telescopes, moon lamps, projectors, accessories)
- Stars redemption widget (if signed in)
- GEL prices for all products

**Products (static catalog from `src/lib/products.ts`):**
- Telescopes: Bresser 76/300, Bresser 50/360, National Geographic 60/700, Celestron 60EQ, Celestron AstroMaster 70, National Geographic 130/650, Celestron AstroMaster 114
- Moon Lamps: 15cm, 20cm versions
- Projectors: Galaxy / star ceiling projectors
- Accessories: Eyepiece kits, filters, tripods

**Stars redemption tiers (on `/api/redeem-code`):**
| Stars Required | Reward |
|---|---|
| 250 ✦ | Free Moon Lamp code |
| 500 ✦ | 10% telescope discount |
| 1000 ✦ | 20% telescope discount |

**User actions:**
- Browse products by category
- Click product to see detail (price in GEL + approximate SOL)
- If signed in: redeem Stars for discount codes
- External link to purchase on astroman.ge

---

### `/profile` — User Profile
**What it shows:**
- Stars balance (from on-chain SPL token balance)
- User rank (Stargazer → Observer → Pathfinder → Celestial)
- Stats: missions completed, Stars, rank
- Observation count + streak (days in a row)
- Recent observations
- Mission history with Solana explorer links
- Wallet address (in collapsible "Advanced" section)
- Sign out button

**Rank system:**
| Rank | Requirement |
|---|---|
| Stargazer | 0 missions |
| Observer | 1+ missions |
| Pathfinder | 3+ missions |
| Celestial | 5+ missions |

**User actions:**
- Copy wallet address to clipboard
- View wallet on Solana Explorer
- Redeem Stars for discount codes
- Sign out (two-step confirmation)
- Navigate to full observation history

---

### `/nfts` — My Observations (NFT Gallery)
**What it shows (unauthenticated):**
- Demo NFT cards (blurred/locked)
- Sign-in prompt

**What it shows (authenticated):**
- All compressed NFTs owned by the user's Solana wallet
- Filtered to Stellar collection (by `NEXT_PUBLIC_COLLECTION_MINT_ADDRESS`)
- Each NFT shows: target object, date, cloud cover %, Stars earned
- Link to Solana Explorer for each NFT

**How NFTs are fetched:**
- Direct Helius DAS API call: `getAssetsByOwner`
- Filtered by collection mint address
- Attributes decoded from on-chain metadata

**User actions:**
- View all earned observation NFTs
- Click "View on Explorer" to see on Solana Explorer
- Retry if loading fails

---

### `/leaderboard` — Observer Rankings
**What it shows:**
- Top 3 podium (gold/silver/bronze)
- Full ranked list with observation count + Stars
- Time filter tabs: This Week / This Month / All Time
- "You" highlighted in the list

**Current state:** Static mock data (real leaderboard from DB is planned)

**User actions:**
- Switch time period tabs
- View rankings

---

### `/darksky` — Dark Sky Network
**What it shows:**
- Light pollution map of Georgia (SVG world map)
- 6 location readings (Tbilisi, Kazbegi, Mestia, Kutaisi, Batumi, Borjomi)
- Bortle scale classification per location (Pristine → City)
- Stats bar: total readings, dark sites, countries
- CTA to contribute via missions

**User actions:**
- View map of Georgia's dark sky sites
- Read Bortle ratings per city
- Click "Start a Mission" → goes to `/missions`

---

### `/club` — Membership Onboarding (3-step flow)
**What it shows:**
- Step 1: Wallet setup (view Privy embedded wallet)
- Step 2: Mint Stellar Club membership (on-chain Memo transaction)
- Step 3: Register telescope (brand/model/aperture → on-chain proof)

**User actions:**
- Progress through 3-step onboarding
- Mint membership proof on Solana
- Register telescope gear on-chain

---

### `/observations` — Full Observation History
- Complete list of all observations logged to Supabase/Neon
- Linked from `/profile`

### `/proof` — Observation Proof Page
- View full proof details for a specific observation
- Shows sky oracle hash, confidence, on-chain tx

---

## All API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Claude AI streaming chat (ASTRA persona, tool calling) |
| `/api/sky/forecast` | GET | 7-day Open-Meteo forecast by lat/lon |
| `/api/sky/planets` | GET | Current planet positions via astronomy-engine |
| `/api/sky/sun-moon` | GET | Sunrise/sunset/moonrise/moonset times |
| `/api/sky/verify` | GET | Current sky conditions + oracle hash for mission verification |
| `/api/observe/verify` | POST | Claude vision photo verification (multimodal) |
| `/api/observe/log` | POST | Log observation to DB + award Stars on-chain |
| `/api/observe/history` | GET | Fetch user's observation history from DB |
| `/api/mint` | POST | Mint compressed NFT (Bubblegum) for verified observation |
| `/api/stars-balance` | GET | Read SPL token balance for a wallet address |
| `/api/award-stars` | POST | Server-side Stars minting (SPL token mintTo) |
| `/api/redeem-code` | POST | Validate Stars balance → return discount code |
| `/api/products` | GET | Product catalog |
| `/api/price/sol` | GET | SOL/USD price (Jupiter API) |
| `/api/streak` | GET | Calculate consecutive observation days for wallet |
| `/api/club/activate` | POST | Activate club membership |
| `/api/metadata/observation` | GET | NFT metadata JSON for Bubblegum URI |
| `/api/metadata/collection` | GET | Collection-level NFT metadata |
| `/api/og/sky` | GET | Open Graph image for social sharing |

---

## Where and Why Blockchain Is Used

### 1. Embedded Solana Wallet (Privy)
**Where:** Created automatically when user signs up with email/Google  
**Why:** Every user gets a real Solana wallet without knowing it — enables all on-chain actions silently

### 2. Observation Proof (Memo Program)
**Where:** `/lib/solana.ts` → `createOnChainProof()`  
**Why:** Immutable, timestamped record of each sky observation — proves you actually observed a target on a specific night from specific coordinates. Written to chain using Solana Memo program with JSON payload (target, location, oracle hash, stars)

### 3. Compressed NFT Minting (Metaplex Bubblegum)
**Where:** `/lib/mint-nft.ts` → `/api/mint`  
**Why:** Each verified observation gets minted as a cNFT (Discovery Attestation). Compressed NFTs cost ~$0.001 each instead of $0.10+, making mass minting viable. NFTs are owned by the user's wallet and visible on any Solana NFT explorer  
**Stack:** Metaplex Bubblegum + Umi framework, Merkle tree for storage, collection mint for grouping

### 4. Stars Token (SPL Token)
**Where:** `/api/observe/log` → `awardStarsOnChain()`, `/api/stars-balance`  
**Why:** Stars are a real SPL token on devnet. When user earns Stars for missions, the server mints SPL tokens directly to their wallet. Balance is read from chain for leaderboard and redemption validation  
**Stack:** `@solana/spl-token` (getOrCreateAssociatedTokenAccount, mintTo)

### 5. Gasless Transactions
**Where:** All server-side Solana operations  
**Why:** A server-controlled fee payer keypair (`FEE_PAYER_PRIVATE_KEY`) covers all transaction fees. Users never need SOL. Enables true consumer UX

### 6. Sky Oracle Hash
**Where:** `/api/sky/verify` → embedded in every NFT's metadata  
**Why:** Tamper-evidence. The oracle hash is a SHA-256 of (lat, lon, cloudCover, hourSlot), proving that the sky conditions at the time of observation were independently verifiable. Embedded on-chain in both the Memo proof and NFT metadata URI

---

## Rewards System

| Reward | Requirement | Value |
|---|---|---|
| First Light | Complete 1 mission | 10% off astroman.ge |
| Lunar Explorer | Observe the Moon | Free Moon Lamp (85 GEL) |
| Celestial | Complete 5 missions (moon, jupiter, orion, saturn, pleiades) | Free custom framed star map (180 GEL) |
| Galaxy Hunter | Observe Andromeda Galaxy | 100 GEL store voucher |
| Supernova Master | Capture Crab Nebula | Win a brand new telescope |

Rewards are unlocked in-app and redeemable at the physical Astroman store in Tbilisi.

---

## Database Schema (Neon/Postgres via Drizzle)

```
observation_log
  id          UUID (PK)
  wallet      TEXT
  target      TEXT
  stars       INTEGER
  confidence  TEXT (high/medium/low/minted)
  mint_tx     TEXT (nullable — Solana tx hash)
  created_at  TIMESTAMP WITH TIMEZONE
```

---

## Security & Rate Limiting

- `/api/chat` — 10 requests/min per IP (middleware)
- `/api/observe/verify` — 5 requests/min per IP (middleware)
- `/api/mint` — 1 mint per wallet+target per hour (DB rate limit)
- `/api/redeem-code` — validates on-chain Stars balance before returning code
- Photo verification anti-cheat: Claude rejects screenshots, AI-generated images, and daytime photos
- Sky oracle: cloudCover > 70% blocks minting (can't mint in cloudy conditions)

---

## Navigation

**Desktop nav (top bar):** Sky · Learn · Marketplace · Missions · Profile  
**Mobile bottom nav:** Sky · Missions · [Home center button] · Learn · Profile  
**Footer:** Sky · Dark Sky Map · Missions · ASTRA AI · Marketplace · Astroman ↗  

---

## What Is NOT Yet Built

- Real-time leaderboard from DB (currently static mock data)
- SOL payment at checkout (GEL-only for now)
- Farcaster Frames integration (metadata tags present, endpoint not built)
- Club membership page fully connected to Privy flow
- Push notifications for clear sky nights
- Age gate (Explorer Mode / Young Astronomer)
- Name a Star NFT product

---

## Key Environment Variables

```
NEXT_PUBLIC_PRIVY_APP_ID=          # Privy dashboard — cmnnk6n2c002d0cl47skaaz0d
ANTHROPIC_API_KEY=                 # Claude API
DATABASE_URL=                      # Neon connection string
SOLANA_RPC_URL=                    # Helius devnet RPC
FEE_PAYER_PRIVATE_KEY=             # Server wallet (base58) — covers all gas
STARS_TOKEN_MINT=                  # SPL token mint address (devnet)
MERKLE_TREE_ADDRESS=               # Bubblegum Merkle tree for cNFTs
COLLECTION_MINT_ADDRESS=           # cNFT collection mint
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS= # Same, exposed to client for NFT filtering
NEXT_PUBLIC_HELIUS_RPC_URL=        # Helius RPC (client-side NFT fetching)
INTERNAL_API_SECRET=               # Bearer token for /api/mint authorization
```
