# Stellar — Observe the Sky, Earn on Solana

> The global astronomy app that brings telescope owners and sky lovers on-chain.

## What It Does

Stellar turns every telescope session into a verified on-chain discovery. Astronomers anywhere in the world can:

1. **Observe** — Check tonight's sky forecast, planet positions, and find clear windows
2. **Capture** — Photograph celestial objects with a phone or telescope camera
3. **Verify** — AI + sky oracle confirms real sky conditions at your location and time
4. **Earn** — Receive Stars (SPL token) and a compressed NFT proof sealed on Solana
5. **Spend** — Redeem Stars at partner telescope stores in your region

No wallets. No seed phrases. No crypto jargon. Users sign up with email and start observing.

## Why Solana

- **Compressed NFTs** via Metaplex Bubblegum — each observation proof costs ~$0.000005 to mint
- **SPL tokens** — Stars are real, tradeable tokens on Solana, not a database counter
- **Gasless UX** — server-side fee payer covers everything. Users never need SOL
- **Privy embedded wallets** — every user gets a Solana wallet invisibly on signup
- **Speed** — mint completes in <2 seconds. No waiting for block confirmations

## The Distribution Advantage

Stellar is built by [Astroman](https://astroman.ge), Georgia's first astronomy e-commerce store with 60,000+ social media followers and a physical retail location. This gives Stellar:

- **Immediate warm audience** of active telescope buyers
- **Real product rewards** — not speculative token utility, but actual telescopes and gear
- **Regional dealer network** — Astroman (Caucasus), High Point Scientific (US), with more partners onboarding

No other project on any chain targets amateur astronomy. Zero direct competition.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Auth | Privy (email, Google, SMS → embedded Solana wallet) |
| AI | Claude API — ASTRA companion with tool calling (live planet data + forecast) |
| AI Vision | Claude multimodal — photo verification + Bortle dark-sky classification |
| NFTs | Metaplex Bubblegum compressed NFTs via Umi |
| Token | Custom STARS SPL token (devnet) |
| Weather | Open-Meteo API (free, no key) |
| Astronomy | astronomy-engine (local JS calculations) |
| Database | Neon serverless Postgres via Drizzle ORM |
| Deploy | Vercel |

## Live Demo

**[stellarrclub.vercel.app](https://stellarrclub.vercel.app)**

## How to Run Locally

```bash
git clone https://github.com/Morningbriefrezi/Stellar.git
cd Stellar
npm install
cp .env.example .env.local
# Fill in env vars (see below)
npm run dev
```

### Setup Scripts

```bash
# 1. Fund a devnet wallet (need ~5 SOL for setup + minting)
solana airdrop 5 --url devnet

# 2. Create Bubblegum Merkle tree + collection
npm run setup:bubblegum

# 3. Create Stars SPL token
npm run setup:token
```

### Required Environment Variables

```
NEXT_PUBLIC_PRIVY_APP_ID=
ANTHROPIC_API_KEY=
DATABASE_URL=
SOLANA_RPC_URL=https://api.devnet.solana.com
FEE_PAYER_PRIVATE_KEY=
MERKLE_TREE_ADDRESS=
COLLECTION_MINT_ADDRESS=
STARS_TOKEN_MINT=
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=
NEXT_PUBLIC_HELIUS_RPC_URL=
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
```

## Demo Script (3 minutes)

1. **Sign up with email** — embedded wallet created invisibly (20s)
2. **Location detected** — "You're in Tbilisi" → marketplace shows Astroman products (10s)
3. **Switch to New York** — marketplace updates to High Point Scientific / Celestron products (10s)
4. **Tonight's Sky** — planet visibility + 7-day forecast for current location (20s)
5. **Start "Tonight's Sky" mission** — free observation, any sky photo (15s)
6. **Take photo** → sky oracle verifies → NFT minted on Solana (40s)
7. **View NFT in gallery** with Solana Explorer link (15s)
8. **Ask ASTRA** "What can I see tonight with a 70mm refractor?" → live tool-calling response (20s)
9. **Show Stars balance** — real SPL token in profile (10s)
10. **Show partner stores** — "Astroman ships to Caucasus, High Point to US" (10s)

## Project Structure

```
src/
  app/
    page.tsx              — Home dashboard
    sky/                  — Sky forecast + planet tracker
    missions/             — Mission list + observation flow
    chat/                 — ASTRA AI companion
    marketplace/          — Location-aware dealer marketplace
    nfts/                 — NFT gallery (Helius DAS)
    profile/              — User profile + Stars balance
    darksky/              — Light pollution map
    api/
      chat/               — Claude streaming + tool calling
      sky/verify/         — Sky oracle (Open-Meteo + hash)
      mint/               — Compressed NFT minting
      award-stars/        — SPL token minting
      metadata/           — NFT metadata JSON
      observe/            — Photo verification
      darksky/            — Bortle analysis + GeoJSON data
  lib/
    location.tsx          — GPS + region detection
    dealers.ts            — Dealer network + products
    solana.ts             — Solana helpers
    mint-nft.ts           — Bubblegum minting (server)
    sky-data.ts           — Weather + forecast
    planets.ts            — Planet positions
  components/
    LocationPicker.tsx    — Region selector
    sky/                  — Observation flow components
```

## Hackathon

- **Colosseum Frontier 2026** — Consumer Track
- **Builder:** Rezi (Revaz Modebadze) — [@astroman_geo](https://instagram.com/astroman_geo)
- **Previous:** 2nd place, Superteam Georgia Hackathon 2025

## License

MIT
