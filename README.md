# Stellar — Observe the Sky, Earn on Solana

> The astronomy app that turns every telescope session into a verified on-chain discovery.

## What It Does

Stellar turns every telescope session into a verified on-chain discovery. Astronomers anywhere in the world can:

1. **Observe** — Check tonight's sky forecast, planet positions, and find clear windows
2. **Capture** — Photograph celestial objects with a phone or telescope camera
3. **Verify** — AI + sky oracle confirms real sky conditions at your location and time
4. **Earn** — Receive Stars (SPL token) and a compressed NFT proof sealed on Solana
5. **Spend** — Redeem Stars at partner telescope stores in your region

No wallets. No seed phrases. No crypto jargon. Users sign up with email and start observing. The Solana layer is invisible until we show them.

## Why Solana

- **Compressed NFTs** via Metaplex Bubblegum — each observation proof costs ~$0.000005 to mint
- **SPL tokens** — Stars are real, verifiable on-chain rewards, not a database counter
- **Privy embedded wallets** — email signup, zero friction, no Phantom download required

## Founder-Market Fit

Built by Rezi Modebadze, founder of [Astroman.ge](https://astroman.ge) — Georgia's first astronomy e-commerce store with 60,000+ social media followers and a physical retail location in Tbilisi. Stellar's first distribution channel is a warm audience of active telescope buyers who are already spending real money on gear.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Auth | Privy (email, Google, SMS → embedded Solana wallet) |
| AI | Claude API (claude-sonnet-4-6) — ASTRA companion + photo verification |
| NFTs | Metaplex Bubblegum compressed NFTs via Umi |
| Token | Custom STARS SPL token |
| Weather | Open-Meteo API |
| Astronomy | astronomy-engine (local JS calculations) |
| Database | Neon serverless Postgres via Drizzle ORM |
| Dealers | Astroman (Caucasus/Asia), Celestron (Americas), Levenhuk (Europe) |
| Deploy | Vercel |

## Live Demo

**[stellarrclub.vercel.app](https://stellarrclub.vercel.app)**

## How to Run Locally

```bash
git clone https://github.com/Rezimod/Stellar.git
cd Stellar
npm install
cp .env.example .env.local
# Fill in env vars (see .env.example)
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

## Demo Script (3 minutes)

1. **Sign up with email** — embedded wallet created invisibly (20s)
2. **Location detected** — marketplace shows Astroman products for Caucasus (10s)
3. **Switch to New York** — marketplace updates to Celestron products (10s)
4. **Tonight's Sky** — planet visibility + 7-day forecast for current location (20s)
5. **Start "Tonight's Sky" mission** — free observation, any sky photo (15s)
6. **Take photo** → sky oracle verifies → NFT minted on Solana (40s)
7. **View NFT in gallery** with Solana Explorer link (15s)
8. **Ask ASTRA** "What can I see tonight with a 70mm refractor?" → live response (20s)
9. **Show Stars balance** — real SPL token in profile (10s)
10. **Show partner stores** — Astroman (Caucasus), Celestron (Americas), Levenhuk (Europe) (10s)

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
      chat/               — Claude streaming
      sky/verify/         — Sky oracle (Open-Meteo + hash)
      mint/               — Compressed NFT minting
      award-stars/        — SPL token minting
      observe/            — Photo verification (Claude Vision)
      leaderboard/        — Real DB leaderboard
  lib/
    location.tsx          — GPS + region detection
    dealers.ts            — Dealer network + products
    mint-nft.ts           — Bubblegum minting (server)
    stars.ts              — Stars SPL token helpers
    sky-data.ts           — Weather + forecast
    planets.ts            — Planet positions
  components/
    LocationPicker.tsx    — Region selector
    sky/                  — Observation flow components
```

## Environment Variables

See `.env.example` for the full list. Key variables:

```
NEXT_PUBLIC_PRIVY_APP_ID=       # Privy dashboard
ANTHROPIC_API_KEY=              # Anthropic console
DATABASE_URL=                   # Neon dashboard
FEE_PAYER_PRIVATE_KEY=          # Base58 — run setup:bubblegum
MERKLE_TREE_ADDRESS=            # Set by: npm run setup:bubblegum
COLLECTION_MINT_ADDRESS=        # Set by: npm run setup:bubblegum
STARS_TOKEN_MINT=               # Set by: npm run setup:token
```

## Hackathon

- **Colosseum Frontier 2026** — Consumer Track
- **Builder:** Rezi (Revaz Modebadze) — founder of Astroman.ge

## License

MIT
