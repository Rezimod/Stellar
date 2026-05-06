# ✦ Stellar — Astronomy, on chain.

**The companion app for everyone with a sky above them and a camera in their pocket.**

Get tonight's sky forecast, photograph what you see, earn rewards you can redeem for real telescopes and gear at [Astroman](https://astroman.ge), Georgia's first astronomy store. Built on Solana. Free to use.

[Live App](https://stellarrclub.vercel.app) · [Colosseum Frontier 2026](https://www.colosseum.org) · [Tether Frontier Track](docs/qvac-integration.md) · [Twitter/X](https://x.com/StellarClub26)

---

## How It Works

1. **Observe** — Open Stellar, see tonight's sky for your location: planet positions, cloud cover, dark window, what's worth pointing a telescope at.
2. **Verify** — Photograph what you see. AI checks the photo against your coordinates, time, and the live oracle hash for your sky — it knows the difference between Saturn over Tbilisi and a screenshot.
3. **Earn** — Verified observations mint a compressed NFT on Solana (~$0.000005/mint) and award Stars, the on-chain reward token.
4. **Redeem** — Spend Stars at Astroman: telescopes, eyepieces, Barlow lenses, moon lamps, books. Real products from a real store.

That's the loop. Optional layers — Stargazer Challenges, sky missions, ASTRA AI — sit on top.

---

## How Stellar Compares

| | SkySafari / Stellarium / Star Walk 2 | Stellar |
|---|---|---|
| **Shows you the sky** | ✓ | ✓ |
| **Live forecast for your coordinates** | Partial | ✓ |
| **Photo verification of what you saw** | — | ✓ (Claude Vision + EXIF + oracle hash) |
| **On-chain proof of observation** | — | ✓ (compressed NFT) |
| **Rewards for going outside** | — | Stars (SPL token) |
| **Connected to a real store** | — | Astroman (Tbilisi) — telescopes, gear |
| **Cost** | $30–$60 one-time / subscription | Free |

Sky atlases show you the sky. Stellar connects what you see to a real economy.

---

## Features

- **7-day sky forecast** — hourly cloud cover, seeing, transparency, dark window, Go/Maybe/Skip per night, location-aware (Open-Meteo + astronomy-engine).
- **Live planet tracker** — Mercury–Saturn + Moon, rise/transit/set, altitude, naked-eye / binocular / telescope visibility.
- **AR sky finder** — point your phone at the sky, the app overlays what you're aiming at.
- **AI photo verification** — Claude Vision checks your capture against your GPS, timestamp, EXIF, and the deterministic Sky Oracle hash for your location and time.
- **Compressed NFT proofs** — every verified observation sealed on Solana via Metaplex Bubblegum. ~$0.000005 per mint.
- **Stars SPL token** — real on-chain token (not localStorage points), redeemable at Astroman.
- **ASTRA AI Companion** — ask "what can I see tonight?" and ASTRA answers with live planet positions, weather, and Bortle context for your coordinates.
- **Sky missions** — guided observations of the Moon, Jupiter, Saturn, Orion, Pleiades, Andromeda, the Crab. Each completion earns Stars + an NFT.
- **Stargazer Challenges** — optional weekly leaderboards on celestial events (meteor shower peaks, clear-sky windows, solar activity). Stake Stars, place a position, win Stars back. Bonus mechanic, not the headline.
- **Zero-crypto UX** — sign up with email via Privy, embedded Solana wallet, gasless transactions, no seed phrase, no Phantom install.

---

## Stellar Field — On-Device AI for Dark Sites

*Tether Frontier Track submission ([technical writeup](docs/qvac-integration.md))*

Astronomers travel to dark-sky sites — mountains, deserts, rural fields — where cell signal is exactly zero. The cloud AI in our web app dies the moment a user reaches the place they bought their telescope for. **Stellar Field** is the Android companion that runs Astra entirely on the phone, powered by Tether QVAC.

- **Local LLM with RAG** — Llama 3.2 1B Q4_0 + a 72-chunk astronomy corpus (Messier catalog, constellation guide, telescope FAQ). Same Astra persona, no server. (`@qvac/llm-llamacpp` + `@qvac/embed-llamacpp`)
- **Voice notes at the eyepiece** — press, speak the observation, release. Whisper transcribes on-device. Saves as a structured record, queues for sync, optionally mints as a Discovery Attestation cNFT. (`@qvac/transcription-whispercpp`)
- **Background sky checker** — local QVAC loop watches planet altitudes via `astronomy-engine` and alerts when targets enter your scope's window — without a server round-trip.

The split is invisible to the user. Same Astra. Same Privy embedded wallet. Same Supabase observation history. Online she runs on Claude (fast and broad), offline on QVAC (free per call, works in airplane mode). The existing web app is untouched — Field Mode is additive.

[Download APK](https://stellarrclub.vercel.app/field) · [Technical writeup](docs/qvac-integration.md) · [Plan + status](TETHER_QVAC_TRACK.md)

---

## DePIN: Every Smartphone Is a Sky Sensor

Stellar is a Decentralized Physical Infrastructure Network where the physical infrastructure is the night sky itself, and the nodes are people with phones, cameras, and telescopes.

Every observation contributes a real datapoint — GPS coordinates, timestamp, photo, EXIF, AI-validated subject identification, weather hash. Each one becomes a compressed NFT on-chain: an immutable, geolocated record of what was visible from where, at what time, under what conditions.

| Node Type | Hardware | Data Contributed | Reward |
|---|---|---|---|
| **Passive** | Smartphone | GPS + timestamp + weather confirmation | 5–25 ✦ |
| **Observer** | Smartphone + eyes | Verified sky photo, AI-analyzed observation, cNFT proof | 50–250 ✦ |
| **Advanced** | Telescope + camera | High-resolution captures, Bortle readings, deep-sky imagery | 100–500 ✦ |

The network grows itself: more observers in more places means denser sky coverage, which makes the data more useful — for ASTRA's recommendations, for Stargazer Challenge resolution, and (eventually) for anyone who needs ground-truth observation data.

Live network map: [stellarrclub.vercel.app/network](https://stellarrclub.vercel.app/network).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind 4 |
| Auth | Privy embedded Solana wallets (email/Google login) |
| NFTs | Metaplex Bubblegum compressed NFTs |
| Token | Stars SPL token (0 decimals) |
| Markets program (for Challenges) | Custom Anchor program on Solana devnet |
| AI (online) | Claude API — ASTRA persona with tool calling (sky data + Vision verification) |
| AI (offline, Field Mode) | Tether QVAC — Llama 3.2 1B + Whisper, on-device via `@qvac/sdk` (Expo / Android) |
| Sky data | Open-Meteo (weather), astronomy-engine (celestial mechanics), NOAA SWPC (solar), IMO (meteors) |
| Database | Neon Postgres via Drizzle ORM |
| RPC | Helius |
| Deploy | Vercel |

---

## On-Chain Addresses (Devnet)

- **Markets / Challenges program:** `Bcufe9vy6V3Vn4eqBQqdmRKzJgEcHdVxHci6ursiTkvi`
- **Stars Token:** `3cnZEZAu2ENujwNNtA5phyqSi3JvAaHpyzExQiXw1YwW`
- **Fee Payer:** `BEGJbkPn7eEAKkjLTGh39usDiscM7P2BwQyXNToHdVVg`

---

## Distribution: Astroman

Stellar isn't built in a vacuum. It's built on top of [Astroman](https://astroman.ge), Georgia's first astronomy e-commerce store:

- Physical retail in Tbilisi
- ~$150K of telescope and astronomy inventory
- 60K+ social followers across Facebook and Instagram
- Direct relationships with Georgian schools, astronomy clubs, observers
- A founder who answers "is tonight good?" calls every day

Every Astroman customer is a potential Stellar user. Every Stellar observer becomes an Astroman customer when their Stars get spent.

---

## Running Locally

```bash
git clone https://github.com/Morningbriefrezi/Stellar.git
cd Stellar
npm install
cp .env.example .env.local  # Fill in your keys
npm run dev
```

Required environment variables: see `.env.example`.

---

## Builder

**Rezi (Revaz Modebadze)** — Founder of [Astroman](https://astroman.ge). Built solo for Colosseum Frontier 2026.

- 2nd place + sponsor prize, Superteam Georgia Hackathon (March 2026)
- [Twitter/X: @StellarClub26](https://x.com/StellarClub26)
- Tbilisi, Georgia
