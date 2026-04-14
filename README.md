# Stellar — AI-Verified Telescope Observations on Solana

> AI-verified telescope observations on Solana. Photograph → Verify → Mint NFT → Earn Stars.

## What Makes This Different

- **Claude Vision anti-cheat** — every photo submission runs through Claude's vision model to detect screenshots, digitally-generated images, and liveness spoofing before minting
- **Compressed NFTs at ~$0.000005/mint** — Metaplex Bubblegum on Solana devnet; this is actual on-chain proof-of-observation, not just token gating
- **Real distribution** — Stars tokens are redeemable for physical telescope equipment at [Astroman.ge](https://astroman.ge) (Georgia's first astronomy store, 60K+ followers, active retail inventory)

## Live Demo

**[stellarrclub.vercel.app](https://stellarrclub.vercel.app)**

## How It Works

1. **Observe** — Check tonight's sky forecast, planet positions, and find clear windows
2. **Capture** — Photograph the sky with your phone
3. **Verify** — Claude Vision + sky oracle confirms real conditions at your location and time
4. **Mint** — Compressed NFT sealed on Solana with an on-chain weather oracle hash
5. **Earn** — Stars SPL tokens awarded per verified observation
6. **Spend** — Redeem Stars at partner telescope stores in your region

No wallets. No seed phrases. Users sign up with email and start observing. The Solana layer is invisible until we show them.

## Architecture

```mermaid
graph TD
    A[User] -->|Email / Google login| B[Privy Auth]
    B --> C[Embedded Solana Wallet — auto-created]
    A -->|Phone camera| D[Photo]
    D -->|FormData: file, lat, lon, capturedAt| E[/api/observe/verify]
    E -->|Claude Vision| F[Confidence Score + Anti-cheat]
    A -->|Location + timestamp| G[/api/sky/verify]
    G -->|Open-Meteo API| H[Oracle Hash — SHA-256]
    F & H -->|Verified| I[/api/mint]
    I -->|Bubblegum + Umi| J[Compressed NFT on Solana Devnet]
    I -->|SPL Token| K[Stars minted to user wallet]
    K -->|/api/stars-balance| L[Marketplace — redeem for real gear]
```

Plain-text equivalent:
```
User → Privy Auth → Email/Google login → Embedded Solana wallet
User → Camera → Claude Vision (/api/observe/verify) → Confidence score
User → /api/sky/verify (Open-Meteo) → Oracle hash (SHA-256)
Server → Bubblegum + Umi → Compressed NFT on Solana devnet
Server → SPL Token → Stars minted to user wallet
User → /api/stars-balance → Marketplace → Redeem discount codes
```

## Screenshots

| Home / Sky Forecast | Mission + Camera | Mint Success | ASTRA Chat |
|---|---|---|---|
| *(stellarrclub.vercel.app)* | *(Mission flow)* | *(Explorer link + confetti)* | *(Live planet data)* |

## Setup

```bash
git clone https://github.com/Rezimod/Stellar.git
cd Stellar
npm install
cp .env.example .env.local
# Fill in env vars — see .env.example
npm run dev
```

Optional devnet setup (required for on-chain features):

```bash
# Fund devnet wallet (~5 SOL needed)
solana airdrop 5 --url devnet

# Create Bubblegum Merkle tree + collection NFT
npm run setup:bubblegum

# Create Stars SPL token
npm run setup:token
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Auth + Wallets | Privy — email/Google/SMS login, embedded Solana wallets |
| AI | Claude API (claude-sonnet-4-6) — ASTRA companion + photo verification |
| NFTs | Metaplex Bubblegum compressed NFTs via Umi |
| Rewards | Custom STARS SPL token |
| Weather | Open-Meteo API (free, no key required) |
| Astronomy | astronomy-engine (local JS — no external API) |
| Database | Neon serverless Postgres via Drizzle ORM |
| i18n | next-intl (English + Georgian) |
| Deploy | Vercel |

## Environment Variables

See `.env.example` for the full list. Key variables:

```
NEXT_PUBLIC_PRIVY_APP_ID=       # Privy dashboard → app settings
ANTHROPIC_API_KEY=              # Anthropic console
DATABASE_URL=                   # Neon dashboard → connection string
FEE_PAYER_PRIVATE_KEY=          # Base58 devnet wallet key
MERKLE_TREE_ADDRESS=            # Output of: npm run setup:bubblegum
COLLECTION_MINT_ADDRESS=        # Output of: npm run setup:bubblegum
STARS_TOKEN_MINT=               # Output of: npm run setup:token
SOLANA_RPC_URL=                 # Helius devnet RPC or https://api.devnet.solana.com
```

## Project Structure

```
src/
  app/
    page.tsx              — Home dashboard + sky highlights
    sky/                  — 7-day forecast + planet tracker
    missions/             — Mission list + observation flow
    chat/                 — ASTRA AI companion
    marketplace/          — Location-aware dealer marketplace
    nfts/                 — NFT gallery (Helius DAS API)
    profile/              — User profile + Stars balance
    api/
      chat/               — Claude streaming
      sky/verify/         — Sky oracle (Open-Meteo + SHA-256 hash)
      observe/verify/     — Photo verification (Claude Vision)
      mint/               — Compressed NFT minting (Bubblegum)
      award-stars/        — SPL token minting
      leaderboard/        — Real DB leaderboard
  lib/
    mint-nft.ts           — Bubblegum + Umi minting (server-side)
    stars.ts              — Stars SPL token helpers
    location.tsx          — GPS + region detection (caucasus / north_america / global)
    dealers.ts            — Multi-dealer product system
    sky-data.ts           — Open-Meteo weather + forecast
    planets.ts            — Planet positions via astronomy-engine
  components/
    sky/                  — MissionActive, Camera, Verification, ObserveFlow
    LocationPicker.tsx    — Region selector pill/modal
```

## Founder

Built by Rezi Modebadze, founder of Astroman.ge — Georgia's first astronomy store.

## Hackathon

**Colosseum Frontier 2026** — Consumer Track  
Submitted by: Rezi (Revaz Modebadze)

## License

MIT
