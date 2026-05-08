# Stellar — Demo Video Plan + Pitch Script

**Target length:** 3 minutes  
**Use case:** Colosseum Frontier 2026 submission video

---

## Pitch Script (3 minutes)

```
[0:00–0:20] — The Hook
"I'm Rezi. I run Astroman.ge — Georgia's first astronomy store,
60,000 followers, physical inventory. Every night, customers ask:
'Is tonight good for observing?' Now they can find out — and prove they went outside."

[0:20–0:50] — The Product (show app)
"Stellar gives you a 7-day sky forecast with real planet positions.
When conditions are right, you start a mission, photograph the sky,
and an AI verifies your photo — detecting screenshots, fake images,
and checking the object is actually visible at your coordinates."

[0:50–1:20] — The Blockchain Layer (show minting)
"A verified observation mints a compressed NFT on Solana.
Cost: $0.000005 per mint. That's not a typo. Metaplex Bubblegum.
The NFT includes an on-chain weather oracle hash — independently reproducible proof
that you observed on that night, at those conditions."

[1:20–1:40] — The Business Model (show marketplace + Stars)
"Stars earned from observations are redeemable at Astroman.ge —
real discounts on real telescopes. This closes the loop:
you verify an observation, earn on-chain tokens, spend them at a store."

[1:40–2:00] — ASTRA AI (show chat)
"Ask ASTRA what's visible tonight and it calls live astronomy APIs —
actual planet positions, actual sky forecast. It knows what you can see."

[2:00–2:20] — Differentiation
"Most crypto apps have no distribution. I have 60,000 astronomy followers,
a physical store in Tbilisi, and real products for rewards.
The blockchain layer is invisible to users — they sign up with email,
get a wallet automatically, and never see a seed phrase."

[2:20–2:45] — Hackathon + Roadmap
"Built in 5 weeks for Colosseum Frontier. Ships globally:
Celestron for the Americas, Levenhuk for Europe, Astroman for the Caucasus.
Next: iOS app, mainnet, 3 regional dealer partnerships."

[2:45–3:00] — Close
"Stellar. Astronomy, on chain. Live on Solana mainnet."
```

---

## Demo Screen Recording Path

Record in this exact order using a **pre-funded devnet account** with at least one existing NFT in the gallery.

| Step | Screen | Duration |
|------|--------|----------|
| 1 | Home page — dashboard with sky highlights | 2s |
| 2 | Sky forecast — planet positions + 7-day grid | 5s |
| 3 | Click mission — Brief screen | 3s |
| 4 | Camera opens — capture sky photo | 5s |
| 5 | "Analyzing sky + photo..." loader | 5s (let run) |
| 6 | Verification result — confidence badge + identified object | 5s |
| 7 | "Seal Discovery" — mint animation | let run |
| 8 | Success screen — confetti, Explorer link, Stars earned | 8s |
| 9 | Click "View My NFTs" — gallery shows new NFT | 5s |
| 10 | ASTRA chat — type "What can I see tonight?" → live response | 10s |
| 11 | Marketplace — switch region, show products | 5s |
| 12 | Profile — Stars balance | 3s |

**Total screen time: ~60s of demo content.** Add voiceover from pitch script above.

---

## Pre-Recording Checklist

- [ ] Devnet account funded with SOL (for fee payer, not user-facing)
- [ ] At least one prior NFT in the gallery so it's not empty
- [ ] Stars balance > 0 on the demo account
- [ ] Demo runs end-to-end without errors on `stellarrclub.vercel.app`
- [ ] Mint animation plays correctly (not stuck on "sim_" fallback)
- [ ] Explorer link on success screen opens a real devnet transaction
- [ ] Share buttons produce correct URLs
- [ ] Pitch script read aloud — confirm under 3 minutes with a timer
- [ ] Screen recording software ready (OBS, QuickTime, or Loom)
- [ ] Microphone tested

---

## Submission Notes

- Upload video to YouTube (unlisted) or Loom before submitting to Colosseum
- Link `stellarrclub.vercel.app` as the live demo URL
- GitHub repo must have daily commits for Colosseum activity tracking
