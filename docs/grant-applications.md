# Stellar — Grant Applications (paste-ready)

Live URL: **stellarr.club** · GitHub: github.com/Rezimod/Stellar

> **Confirm before submitting:**
> - "57 submissions" figure for the Tether/QVAC win
> - Real audience numbers (this doc uses 45K+ buyers / 70K+ social; CLAUDE.md says 60K FB)
> - Exact date/year of the Superteam Georgia placement (recorded as March 2026)
>
> **Accuracy note (important for the Anthropic apps):** Claude is the *trust layer*
> (photo verification = Sonnet 4.6 vision; star naming = Haiku 4.5). ASTRA chat
> currently runs on OpenAI gpt-4o-mini — framed honestly below as a credits-funded
> migration to Claude. Do not claim Claude powers the chat today; the public repo
> shows otherwise.

---

## APPLICATION 1 — Anthropic Startup Program ($25K Claude credits)

**Company / what you're building**
Stellar (stellarr.club) is a consumer astronomy app that turns telescope sessions into verified discoveries. Users complete sky-observation missions — the Moon, Jupiter, Saturn, deep-sky targets — and earn rewards redeemable at Astroman.ge, Georgia's largest astronomy retailer. The app pairs a 7-day sky forecast and real-time planet tracker with ASTRA, an AI astronomer, and Field Mode, an offline on-device AI companion for dark-sky sites with no signal.

**How we use Claude**
Claude is our **trust layer** — the intelligence that makes our reward system credible:
1. **Photo verification (Claude Sonnet 4.6, vision).** Claude analyzes every observation photo to confirm a genuine night-sky capture of the claimed target, rejecting screenshots, AI-generated images, and daytime photos. This is the anti-cheat backbone of the entire reward economy — without it, the rewards are not trustworthy. It runs behind deterministic pre-checks (EXIF, hash dedup, rate limits) so Claude is called only on real candidates.
2. **Star naming (Claude Haiku 4.5).** Claude generates the on-chain inscription when a user names a star tied to a verified observation.

**How credits will be used**
Two things: (a) scale Claude Vision verification to thousands of beta users without throttling during our most critical growth window, and (b) **migrate ASTRA, our conversational astronomer, onto Claude.** ASTRA currently runs on a smaller third-party model; credits let us move it to Claude Sonnet with tool calling (planet positions, 7-day sky quality) so a beginner's first night succeeds with real, location-specific guidance. Our worst-case AI cost is well under $1 per active user per month, so credits carry us through the Q3 2026 mainnet launch and the rollout to our Astroman customer list.

**Stage & traction**
- 1st place, Tether Frontier Hackathon — QVAC track (May 2026, 57 submissions)
- 2nd place + sponsor prize, Superteam Georgia Hackathon (2026)
- Full feature set live on devnet (missions, marketplace, ASTRA, Field Mode)
- Distribution moat: built on Astroman.ge — 45K+ telescope buyers since 2018, 70K+ social audience, a physical Tbilisi store for redemption
- Q3 2026: mainnet launch + beta to the Astroman customer list

**Team**
- Revaz (Rezi) Modebadze — Founder/CEO; owner-operator of Astroman.ge
- Dachi Saganelidze — Co-founder, Marketing & Finance; Director at Milliken Agency Services

---

## APPLICATION 2 — Anthology Fund (Anthropic × Menlo) — $25K credits + $100K

Reuse the company description, **How we use Claude**, traction, and team from Application 1. Add:

**Why now / the market**
Amateur astronomy hardware is a large, fragmented global market with no dominant software layer connecting buyers to ongoing engagement. Most telescopes are used a handful of times and then shelved. Stellar solves the "I bought a telescope, now what?" problem with guided missions, AI assistance, and rewards that bring users back to the sky and back to the store. AI is core, not cosmetic: Claude Vision is what makes the reward system trustworthy, and Claude-powered ASTRA is what makes a beginner's first night succeed.

**Why us / unfair advantage**
Stellar is the only consumer astronomy app built on top of an actual retailer. Astroman.ge gives us a day-one warm list of 45K+ telescope owners and 70K+ social followers — distribution no competing app can buy. We acquire users at near-zero CAC and monetize through a 20% commission on equipment sold through the app, sponsored missions tied to brand product launches, and Stellar Pro ($7/mo). Unit economics are profitable at 10K MAU.

**The ask**
$25K in Claude credits + $100K investment to fund the Q3 2026 mainnet launch and the beta-to-scale rollout across the Astroman list. We'd also value an introduction to the Solana Mobile team for eventual dApp Store distribution.

---

## APPLICATION 3 — Solana Mobile Builder Grant ($10K)

**What we're building**
Stellar (stellarr.club) is a mobile-first consumer astronomy app. Its standout feature, **Field Mode**, runs a complete AI astronomer entirely on-device — Llama 3.2 1B (Q4_0) with semantic RAG over a 77-chunk astronomy corpus and Whisper voice notes — so it works at dark-sky observing sites where there is no cell signal and cloud AI fails. Field Mode won 1st place in the Tether Frontier Hackathon QVAC track (May 2026, 57 submissions).

**Why mobile / why Solana Mobile**
Astronomy happens outdoors, at night, far from infrastructure — the exact conditions where a mobile-first, offline-capable app matters most. Stellar uses Privy embedded Solana wallets (email signup, no seed phrases) and mints compressed-NFT observation attestations via Metaplex Bubblegum, with a server fee-payer covering all gas so users never touch SOL. Consumer-grade Solana UX designed for the phone in your pocket under the stars. We're targeting the Solana dApp Store as a distribution channel post-mainnet.

**How we use Solana**
- Privy embedded wallets, auto-created on email signup (no seed phrases visible)
- Metaplex Bubblegum compressed NFTs (~$0.000005 per mint) for observation attestations
- STARS SPL token for rewards
- Helius DAS API for NFT indexing
- Server-side fee-payer for a fully gasless user experience

**Milestones this grant funds**
APK hardening and Play Store / Solana dApp Store submission prep, expansion of the on-device RAG corpus, and the Q3 2026 mainnet migration.

**Team**
- Revaz (Rezi) Modebadze — Founder/CEO; owner-operator of Astroman.ge
- Dachi Saganelidze — Co-founder, Marketing & Finance

---

## OVERFLOW — Alchemy Solana Infrastructure Fund ($25K)

Lead with the **How we use Solana** block from Application 3 (Bubblegum cNFTs, SPL token, Helius DAS, gasless fee-payer) plus the traction block from Application 1. Frame the ask around infrastructure scaling for the mainnet migration. Roll to next week if it would weaken the core three.
