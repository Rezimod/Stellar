# STELLAR ✦ — Astronomy, on chain.

**The companion app for everyone with a sky above them and a camera in their pocket.**

**Hackathon:** Colosseum Frontier 2026 (April 6 – May 11, 2026)
**Builder:** Rezi (Revaz Modebadze) — founder of Astroman.ge, Georgia's first astronomy e-commerce store
**Live:** [stellarrclub.vercel.app](https://stellarrclub.vercel.app)
**GitHub:** [github.com/Morningbriefrezi/Stellar](https://github.com/Morningbriefrezi/Stellar)
**X:** [@StellarClub26](https://x.com/StellarClub26)
**Network:** Solana devnet (hackathon MVP) → mainnet at launch

---

## 1. What Stellar Is

Stellar is the all-in-one astronomy app for telescope owners, smartphone photographers, and anyone with a sky above them. Get tonight's forecast for your exact coordinates, photograph what you see, earn rewards you can spend on real telescopes and gear at Astroman.

The product is a real piece of software a person uses outside, at night, with a phone in one hand and an eyepiece in the other. The Solana layer is invisible — users sign up with email, get an embedded wallet automatically, never see a seed phrase, and never pay a gas fee. They don't know they're on chain until we tell them.

The hard work is the verification pipeline: a deterministic Sky Oracle that hashes location + time + weather, Claude Vision that classifies the photo, EXIF + GPS cross-checks that confirm the device was where and when it claims, and a compressed-NFT seal on Solana that makes the whole record immutable and queryable.

That pipeline is the moat. Anyone can show you the sky. Stellar verifies that you actually went outside and looked.

---

## 2. The Founder Story

Rezi Modebadze runs [Astroman](https://astroman.ge) — Georgia's first astronomy e-commerce store. Physical retail in Tbilisi. ~$150K of telescope and accessory inventory. 60,000+ social followers across Facebook and Instagram. A real customer base of telescope buyers who message him almost every clear night asking the same thing: *"is tonight good for observing?"*

Stellar is the answer to that question, productized.

Rezi built Stellar solo. Previously placed 2nd + sponsor prize at the Superteam Georgia hackathon in March 2026. Lives in Tbilisi. Speaks Georgian, Russian, English. Knows the customers because he sells to them.

This founder profile is what makes the distribution claim non-fiction. Stellar isn't a hackathon project that hopes a community will appear. It launches with a founder who already has 60,000 astronomers paying attention and a physical store where the rewards get spent.

---

## 3. How It Works (The Loop)

1. **Observe.** User opens Stellar. Sees tonight's sky for their coordinates: planet positions (Mercury–Saturn + Moon, rise/transit/set), 7-day cloud-cover forecast, dark window, Bortle estimate, Go/Maybe/Skip per night. ASTRA AI (built on Claude) suggests targets — *"Saturn at 22°, clear until 1am, try the Cassini division if you have a 6-inch."*

2. **Capture.** User goes outside, points their phone or telescope-mounted camera at the recommended target, takes a photo.

3. **Verify.** The verification pipeline runs:
   - **Sky Oracle hash** — deterministic SHA-256 over (latitude, longitude, ISO timestamp, cloud cover, visibility, transparency). Reproducible by anyone with the same inputs. This binds the observation to a specific sky condition.
   - **Claude Vision classification** — does the photo actually contain the claimed target? Distinguishes screenshots, stock photos, and stars-from-Google from a real capture. Returns confidence + identified subject.
   - **EXIF cross-check** — phone GPS and timestamp must match the user's session location and time. Catches replay attacks.
   - **Rarity / quality grade** — common, uncommon, rare, legendary, based on target difficulty + image quality.

4. **Earn.** A compressed NFT (Metaplex Bubblegum) is minted on Solana — costs ~$0.000005 per mint, includes the oracle hash, target, rarity, and a thumbnail of the photo. Stars (an SPL token) are awarded to the user's embedded wallet based on rarity.

5. **Redeem.** Stars are spendable at Astroman for telescopes, eyepieces, Barlows, finders, moon lamps, books. Real products, real discounts, fulfilled by Rezi's existing logistics.

That's the entire core loop. Everything else — Stargazer Challenges, ASTRA chat, the network map, the AR finder — is optional layering on top.

---

## 4. Why Crypto Is Structurally Necessary

This is the question that disqualifies most consumer crypto products. Stellar answers it cleanly.

1. **Tamper-proof observation records.** Once a sky observation is sealed on chain, no one — not Stellar, not Astroman, not Rezi — can edit it. The compressed NFT is the proof you observed M42 from Tbilisi at 22:47 on April 18, 2026, with the sky in that specific condition. A centralized database has no equivalent guarantee. For users building a long-term observation log, this matters: the record outlives the company.

2. **Programmable, transferable rewards.** Stars is an SPL token, not a database row. It moves between wallets without Stellar's permission. It can be spent at Astroman, but it can also be held, gifted, or (eventually) traded. Centralized loyalty points cannot do any of that.

3. **Trustless settlement for Stargazer Challenges.** Section 9 covers the bonus mechanic. The short version: when strangers stake on opposing sides of a celestial-event question, no operator can favor one side. Smart-contract settlement is the whole point.

4. **Open verification primitive.** The oracle-hash + cNFT pattern is the start of a public sky-observation database that other apps could query. Centralized infrastructure cannot offer that.

Remove the blockchain from Stellar and the verification primitive collapses into a centralized log nobody trusts. Keep it, and observations become permanent records the user owns.

---

## 5. The Verification Pipeline (Detail)

This is the technical heart of the product. Worth going deep.

**Step 1 — Sky Oracle.** Before the user starts capturing, the app fetches sky conditions for their coordinates from Open-Meteo (cloud cover, visibility, transparency proxy) and timestamps them. These five inputs are concatenated and SHA-256 hashed:

```
hash = sha256(lat | lon | iso_timestamp | cloud_cover | visibility)
```

The hash is deterministic. Anyone with the same inputs gets the same output. This is the "weather oracle" — it pins the observation to a specific sky condition that can be independently verified later.

**Step 2 — Claude Vision photo analysis.** The user's photo is sent to Claude Vision with a system prompt that asks: *"Does this photo plausibly contain {target} as observed from {coordinates} at {time}?"* The model returns:
- Confidence score (0–100)
- Identified subject(s)
- Notes (e.g., *"appears to be a stock photo of Saturn — texture too crisp, no star-trail consistent with handheld phone exposure"*)
- Pass / fail / manual-review

This is the screenshot detector. It catches obvious fakes — Google Image results, planetarium app screenshots, smudged lens captures of nothing. It is not perfect, but it raises the cost of fraud above the value of a few free Stars.

**Step 3 — EXIF + session cross-check.** Phone EXIF (GPS, timestamp, camera) is compared to the session's claimed location and time window. Mismatches flag for manual review.

**Step 4 — Rarity grading.** Combines target difficulty (Moon = common, M42 = uncommon, Crab Nebula = rare) with photo quality (Vision-derived sharpness, framing, exposure). Determines Stars award.

**Step 5 — On-chain seal.** A compressed NFT is minted via Metaplex Bubblegum. Metadata includes: oracle hash, target, rarity, mission ID, capture timestamp, IPFS-pinned thumbnail. ~$0.000005 per mint. Owned by the user's Privy embedded wallet.

The whole pipeline runs in 5–15 seconds depending on Claude Vision latency. The user sees a "Sealing your discovery…" animation, then a success screen with the NFT preview and a Solana Explorer link.

---

## 6. Astroman Distribution

Stellar's go-to-market is not "find users on Twitter." It's the existing Astroman customer base.

- **60K+ social followers** across Astroman's Facebook and Instagram, all interested in astronomy
- **Active customer base** of Georgian telescope buyers who already trust Rezi and shop at his store
- **Physical retail in Tbilisi** where Stars get redeemed in person — a moat no pure-digital competitor has
- **Direct relationships with Georgian schools and astronomy clubs** for cohort onboarding
- **Founder credibility** in the Solana ecosystem after the Superteam Georgia placement

Launch sequence: blog post on astroman.ge → email to existing customers → social posts in Georgian → school visits with telescope demos that ship Stellar accounts to students. Real users, not waitlist signups.

Internationally, the same pattern is the v2 plan: partner with one regional dealer per region (High Point Scientific in the US, Levenhuk in Europe, etc.) so every market has a local store where Stars are redeemable.

---

## 7. Who It's For

Concentric circles of engagement, all centered on the telescope buyer.

**Circle 1 — Astroman customers.** A person who walks into the Tbilisi store, buys an 8" Dobsonian, asks "what should I look at tonight?" They install Stellar, see tonight's targets, photograph the Moon, mint their first NFT, get Stars credited to spend on a Barlow next time.

**Circle 2 — Smartphone-only sky watchers.** Someone with no telescope but a phone camera and curiosity. Uses the AR sky finder, learns where Jupiter is, photographs it through binoculars, earns Stars on the more accessible naked-eye missions.

**Circle 3 — Active observers.** Builds an observation log over months. Each NFT is a piece of their personal astronomy history. Climbs the leaderboard. Uses ASTRA daily.

**Circle 4 — Stargazer Challenge participants.** A subset of Circle 3 who enjoy the bonus mechanic — staking Stars on celestial-event outcomes. Optional, fun, not required.

**Circle 5 — Educators and clubs.** Astronomy clubs use Stellar as a structured observation logger for their events. Schools use it as a hands-on STEM tool with verifiable record of student observations.

The key insight: every circle gets value from the core loop without ever needing to interact with the markets / challenges layer. Markets are an additive bonus, not the funnel.

---

## 8. Core Features

### Tonight's Sky (`/sky`)
The home of the product. Live planet positions, 7-day forecast, dark-window timeline, Go/Maybe/Skip per night, AR finder. The single screen Astroman customers open most.

### Observe & Capture (`/observe/[mission]`)
Guided capture flow for each mission (Moon, Jupiter, Saturn, Orion, Pleiades, Andromeda, Crab Nebula, free observation). Brief → camera → verify → seal → result. Each completion mints a cNFT and awards Stars.

### My Discoveries (`/gallery`)
The user's compressed NFTs, queried via Helius DAS API. Their personal observation history.

### ASTRA AI Companion (`/chat`)
Claude-powered chat with live tool-calling: real planet positions (astronomy-engine), real weather (Open-Meteo), real Bortle estimates. Knows the user's coordinates. Bilingual (English / Georgian).

### Network (`/network`)
Live map of all observer nodes. Real-time count of cNFTs minted. The DePIN visualization.

### Marketplace (`/marketplace`)
Astroman product catalog. Pay with card (default), Solana Pay, or Stars. Stars redemption is the closing of the loop.

### Stargazer Challenges (`/markets`)
The optional bonus mechanic. See Section 9.

---

## 9. Stargazer Challenges (Bonus Mechanic)

Stellar includes an opt-in weekly challenge layer where users stake Stars on the outcomes of upcoming celestial and atmospheric events: meteor shower peaks, clear-sky windows, solar activity, comet brightness, named space-mission milestones.

Mechanically, each challenge is a binary parimutuel pool — YES or NO. Users place positions in Stars (no real money). At a fixed close time, positions lock. At a fixed resolution time, an oracle reads the event outcome and the on-chain `resolve_market` instruction pays out the winning side.

Resolution sources:

- **Open-Meteo** (cloud cover, weather conditions)
- **NOAA SWPC** (Kp index, solar flares, geomagnetic activity)
- **IMO** (meteor shower peak ZHR reports)
- **astronomy-engine** (deterministic celestial mechanics — altitudes, illuminations, transit times)
- **NASA / SpaceX** (mission outcomes)
- **Claude Vision** (photo-verified outcome questions)

**Observer advantage.** Users who complete a related sky mission earn a 1.5× payout multiplier on the corresponding challenge. This is the bridge between the core observation loop and the challenge layer — observation gives an information edge that converts to better expected value.

**Why this is a bonus, not the headline.** Three reasons:

1. **Most users never need it.** The core loop (observe → verify → earn → redeem) is the value prop. Challenges are for the subset who enjoy stake-based forecasting.
2. **Regulatory caution.** Devnet + Stars (free-earned, not real money) means zero gambling exposure. Mainnet migration to USDC is a v2 question, not a v1 question. Keeping challenges as an opt-in bonus protects the core product from the regulatory uncertainty around real-money stake-based forecasting.
3. **Brand fit.** Stellar's brand is patient, precise, earned — opposite of degen forecasting. Challenges sit beneath that, not on top.

The protocol works end-to-end on devnet — markets created, positions placed, resolutions triggered, payouts distributed — with real Solana Explorer transaction signatures. The same Anchor program deploys to mainnet with USDC in v2 unchanged.

---

## 10. Technical Architecture

### On-chain (Solana)

- **Markets / Challenges program** (Anchor) — binary parimutuel, PDA-owned vaults, Stars SPL integration. Deployed to devnet at `Bcufe9vy6V3Vn4eqBQqdmRKzJgEcHdVxHci6ursiTkvi`. Forked from `SivaramPg/solana-simple-prediction-market-contract` (open-source, 48 tests, proven pattern).
- **Bubblegum cNFTs** — observation proofs, ~$0.000005 per mint via state compression. Helius + Metaplex.
- **Stars SPL Token** — 0 decimals, no fixed supply, minted by program authority on observation completion.
- **Privy embedded wallets** — email/Google login → Solana wallet auto-created → user signs all transactions invisibly via gasless server-side fee payer.

### Off-chain

- **Next.js 15 / React 19 / TypeScript / Tailwind 4**
- **Privy SDK** — auth, embedded wallets, fiat onramp
- **Claude API (Sonnet 4.6)** — ASTRA chat, photo verification, target classification
- **astronomy-engine** — deterministic celestial mechanics, no API call
- **Open-Meteo** — global weather forecasts
- **Sky Oracle (internal)** — deterministic SHA-256 hash binding location + time + sky condition
- **Neon Postgres + Drizzle** — user data, mission progress, cached on-chain state
- **Helius DAS API** — query user's compressed NFT portfolio
- **Vercel Cron** — hourly resolution job for Stargazer Challenges
- **next-intl** — English + Georgian, expandable to more languages

### Data sources

- **Open-Meteo** — weather (free, no API key)
- **astronomy-engine** — celestial positions (NPM library)
- **NOAA SWPC** — solar/geomagnetic
- **IMO** — meteor shower reports
- **Claude Vision** — photo classification
- **NASA / SpaceX public APIs** — mission timelines

---

## 11. Why This Wins Frontier 2026

1. **Real product first.** Stellar passes the "would anyone use this if you removed the crypto?" test cleanly — yes, the sky forecast and AR finder are useful regardless. The crypto layer makes the product better but isn't load-bearing on day-one usefulness.
2. **Crypto is structurally necessary** for the verification primitive (tamper-proof observation records, transferable rewards, trustless challenge settlement) — passes the kill question.
3. **Distribution from day one.** Astroman's existing 60K audience + physical store + Tbilisi community is unique to this submission. No competitor has an existing business behind their hackathon project.
4. **Demo moments resolve live during judging week.** Lyrid meteor peak (April 22–23), real planet visibility, real photos by real users. Judges see verified observations land in real time.
5. **Honest about scope.** Devnet + Stars is the right MVP target — ship the protocol cleanly without legal or liquidity overhead, prove the verification pipeline, migrate to mainnet + USDC in v2.
6. **Reuses existing on-chain infrastructure.** Sky Oracle is the resolver, cNFTs are the records, Privy is onboarding, Claude is the verification engine, Stars is the currency, Astroman is the redemption venue. Every piece is wired.

---

## 12. Pitch (60 seconds)

> Most astronomy apps show you the sky. They tell you Saturn is up at 9pm. They draw constellations on your phone. None of them know whether you actually went outside.
>
> Stellar does. Photograph what you saw, and the app verifies the capture against your coordinates, your timestamp, and a deterministic weather hash for that exact moment. The verified observation gets sealed on Solana as a compressed NFT — five-thousandths of a cent per mint. You earn Stars, an SPL token, that you spend at Astroman, Georgia's astronomy store, on real telescopes and gear.
>
> The Solana layer is invisible. Sign up with email. Wallet created automatically. No seed phrase. No gas. Just an astronomy app that happens to give you ownership of every clear night.
>
> Distribution is Astroman.ge — 60,000 followers, a physical Tbilisi store, a founder who answers "is tonight good?" calls every clear night. Stellar is the answer, productized.
>
> Astronomy, on chain. Live on Solana mainnet at launch.

---

## 13. Roadmap

**Weeks 1–4 post-hackathon** — Mainnet migration (Markets + Challenges program, Stars SPL), Astroman email campaign to seed first 500 real users, blog post on the verification pipeline, iOS app prep.

**Months 2–6** — International dealer partnerships (Celestron / High Point Scientific for Americas, Levenhuk for Europe), USDC overlay for Stargazer Challenges (Stars for free play, USDC for real stakes), mobile PWA hardening, second language (Russian or Spanish).

**Months 6–12** — Public sky-observation data feed (queryable cNFT index), creator-led mission proposals, accelerator pitch (Colosseum or aligned Solana fund).

---

*Last updated: May 4, 2026 — devnet MVP shipping for Colosseum Frontier 2026 submission*
*Maintained by Rezi Modebadze*
