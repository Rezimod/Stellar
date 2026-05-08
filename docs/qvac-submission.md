# Tether QVAC Track — Superteam Earn Submission

**Status:** paste-ready. The only outstanding placeholder is `{{YOUTUBE_URL}}` — fill it after recording the demo and uploading as Unlisted.

This file is the script for filling out the Superteam Earn form on Monday. Open the form in one window, this file in the other, and copy each block into its matching field.

---

## Submission day — paste-ready field map

> Tether's Superteam Earn track form changes slightly across cohorts. Match each block below to the closest field on the form. If a field is missing, drop the block; if a field is present but unlisted here, copy the relevant lines from the **Long description** block.

### Title / Project name
```
Stellar Field
```

### Track
```
Tether Frontier — QVAC Edge AI
```

### One-liner / Tagline (≤140 chars)
```
On-device Llama 3.2 1B + Whisper for astronomers under dark skies — Stellar's offline AI guide where cell signal ends.
```

### Live URL
```
https://stellarrclub.vercel.app/field
```

### GitHub repository
```
https://github.com/Rezimod/Stellar
```

### Demo video (YouTube — Unlisted)
```
{{YOUTUBE_URL}}
```

### APK download (direct)
```
https://github.com/Rezimod/Stellar/releases/download/v0.1.0-field/app-release.apk
```

### GitHub Release page
```
https://github.com/Rezimod/Stellar/releases/tag/v0.1.0-field
```

### Long description / Project details

> Paste this whole block into the main "Description" / "Project details" field. It is structured to read top-to-bottom in ~90 seconds — the same time budget as the demo video.

```
Stellar Field is the offline-mode Android companion to Stellar — an AI-powered astronomy app for telescope owners, built on Solana. It runs a 1-billion-parameter Llama model and Whisper speech-to-text entirely on-device via Tether's QVAC SDK, so observers under dark skies with zero cell signal still have a real AI guide at the eyepiece.

Why this is purposeful, not hackathon-shaped:
Astronomy is one of the few consumer use-cases where the target user is literally outside cell range during the activity. Telescope owners drive 2–3 hours from city light pollution to Bortle 1–3 dark-sky sites in mountains, deserts, or rural fields. There is no LTE there, often not even SMS. Cloud AI — including Stellar's web-side Astra running on the Claude API — goes dark at exactly the moment a user reaches the place they bought their telescope for.

Stellar Field closes that gap. On first launch it downloads Llama 3.2 1B Q4 (~700MB) and a Whisper transcription model (~150MB). After that, no network is needed. Chat streams locally. Voice-log transcribes locally. A pre-built RAG index over the Messier catalog (110 deep-sky objects), 88 constellations, and telescope troubleshooting reference data lets answers cite real sources, not guesses.

Architecture: same Astra, two runtimes.
The web app at stellarrclub.vercel.app keeps using the Claude API for cloud sessions where it makes sense — explaining concepts, brainstorming, fielding general questions. Stellar Field is a separate Expo app for the dark-sky use case. Same Astra persona, same Privy embedded Solana wallet (App ID cmnnk6n2c002d0cl47skaaz0d), same Supabase observation history. From the user's perspective, Astra is one assistant; the cloud/edge split is invisible.

What runs on the phone via QVAC:
1. Local LLM with hybrid RAG (`@qvac/llm-llamacpp` + `@qvac/embed-llamacpp`) — cosine similarity over QVAC embeddings + keyword overlap + season-relevance bonus, with citation chips below every answer.
2. Voice observation logging (`@qvac/transcription-whispercpp`) — press, speak ("M31 Andromeda, 25mm at 100x, seeing 7/10"), release. A second pass extracts target, magnification, and seeing into a structured record.

Three QVAC capabilities stacked in one pipeline: LLM, embeddings/RAG, and Whisper STT all serve a single coherent product. The voice → transcript → Astra-Q&A → cNFT flow uses all three in sequence.

The cost story:
For an active observer who chats with the AI 20 times per night, 5 nights per month, that's ~1,200 Claude API calls/month — roughly $12/user/month at current rates. For Astroman (Georgia's astronomy retailer, the founder's other business with ~$150K inventory and 60K Facebook followers), that bleeds margin off every telescope sold. QVAC moves the cost to zero after the one-time model download.

Verified end-to-end on a Poco X3 NFC (Snapdragon 732G, Cortex-A76+A55, 6GB RAM) on 2026-05-07: APK installs and launches, Llama 3.2 1B downloads + mmaps + streams chat tokens, Whisper transcribes voice, voice-log target auto-extraction works, and most importantly — airplane-mode chat still streams. Cloud AI literally cannot reach this user; QVAC can.
```

### Tech stack (short version)
```
Expo SDK 54 (React Native 0.76+) · @qvac/sdk@0.9.2 with bare-runtime worker · @qvac/llm-llamacpp · @qvac/embed-llamacpp · @qvac/transcription-whispercpp · Llama 3.2 1B Q4 · Whisper Base/Tiny EN · Privy embedded Solana wallets · Supabase · Solana devnet (Metaplex Bubblegum cNFTs).
Web companion: Next.js 15, React 19, Tailwind 4, OpenAI gpt-4o-mini for cloud Astra, Anthropic Claude Sonnet 4.6 for vision verification.
```

### Team
```
Solo builder — Revaz "Rezi" Modebadze.
Founder of Astroman (astroman.ge), Georgia's first astronomy e-commerce store.
Placed 2nd + sponsor prize at Superteam Georgia hackathon (March 2026).
Twitter / contact: per Earn profile.
```

---

## Why this project fits QVAC (long-form, kept for reference)

> Use this section if the form has a separate "Why this fits the track" / "Edge AI fit" field. Otherwise the points are already covered in the Long description above.

> Astronomy is one of the few consumer use-cases where the *target user is literally outside cell range during the activity*. Telescope owners drive 2-3 hours from city light pollution to dark-sky sites — Bortle 1-3 zones in mountain ranges, deserts, or rural areas. There is no LTE there, often not even SMS. Cloud AI is, by definition, useless to them at the moment they most need it.
>
> Stellar Field runs a Llama 3.2 1B Q4 model entirely on-device via QVAC's bare-runtime worker. Combined with a local RAG index over astronomy reference data (NASA databases, deep-sky observation catalogs) and Whisper for hands-free voice logging while the user is at the eyepiece, it gives observers a real assistant *where they actually use telescopes*.
>
> Beyond the offline angle, on-device inference is also the right *economic* answer. Each Claude API call costs $0.001-0.01. An active observer who chats with the AI 20 times per night at 5 nights a month = 1200 calls/month = ~$12/month per user. For a Georgian astronomy retailer (Astroman, the founder's other business), that bleeds the margin off every telescope sold. QVAC moves the cost to zero after model download.
>
> Architecture: the main Stellar consumer app (the Colosseum Frontier hackathon entry) keeps using the Claude API for cloud sessions where it makes sense — explaining concepts, brainstorming, fielding general questions. Stellar Field is a separate Expo app (`apps/field/`) for the dark-sky use case. Same Astra persona, same Privy embedded wallet, same Supabase backend. The cloud/edge split is the deliberate design choice — not "cram everything into QVAC" but "use each runtime where it actually wins."

---

## Tech specifics for technical judges

- **Framework:** Expo SDK 54 (React Native 0.76+)
- **QVAC SDK:** `@qvac/sdk@0.9.2` with bare-runtime worker bundle
- **Plugins enabled:** `llamacpp-completion`, `llamacpp-embedding`, `whispercpp-transcription` (3 of 8 built-ins, tree-shaken)
- **Models:** Llama 3.2 1B Q4 (~700MB), Whisper Base/Tiny EN (~150MB), embedding model nomic-v1.5
- **Architecture:** arm64-v8a only (no x86, no emulator support)
- **NDK:** 29.0.14206865 (QVAC plugin pin)
- **Identity / wallet:** Privy embedded Solana wallet (same App ID as web app: `cmnnk6n2c002d0cl47skaaz0d`)
- **Cloud sync:** Supabase for observation logs (writes when online, queues when offline)
- **Verified hardware:** Poco X3 NFC (Snapdragon 732G, Cortex-A76+A55, 6GB RAM) — chipsets without DOTPROD/`asimddp` (e.g. Helio G80) are known to fail llama.cpp activate(); see `docs/qvac-debug/` for the rep-bound bug report.

## What's verified end-to-end on-device

- [x] App boots, dark cosmic UI, no crashes
- [x] Llama model downloads from CDN on first launch
- [x] Streaming chat completion works at usable speeds
- [x] Local RAG citation chip appears below answers
- [x] Whisper voice transcription captures audio + transcribes locally
- [x] Observation save flow persists locally + queues for sync
- [x] **Airplane mode ON: chat + voice still work fully** (the prize-eligible artifact)

## Known scope cuts (be transparent in submission)

- Per-question TTS playback (would need ONNX TTS plugin; cut for May 11 deadline)
- NMT translation between EN/KA in offline mode (cut)
- iOS build (Xcode blocked on macOS Ventura 13.1)
- On-camera Discovery Attestation cNFT mint from Field app (web-side only this round)

---

## Submission checklist (do these in order)

1. [x] App builds locally, prebuild succeeds end-to-end
2. [x] Phone connected, `adb devices` shows it (Poco X3 NFC, persisted)
3. [x] APK installs cleanly via `adb install`
4. [x] On-device verification 9-step run-through passes
5. [x] Build release APK: `cd apps/field && ./gradlew assembleRelease`
6. [x] Create GitHub release with the APK as an asset
7. [x] Set `NEXT_PUBLIC_FIELD_APK_URL` on Vercel and redeploy
8. [x] Verify https://stellarrclub.vercel.app/field shows the Download button
9. [ ] Record 75s demo on the Poco (see `docs/qvac-demo-script.md`)
10. [ ] Upload to YouTube **Unlisted**, copy link, paste into `{{YOUTUBE_URL}}` above
11. [ ] Open Superteam Earn form, copy each block from "Submission day — paste-ready field map" into the matching field
12. [ ] Submit before May 11, 23:59 UTC

---

## YouTube post-record metadata (paste at upload time)

**Title:**
```
Stellar Field — Tether QVAC Track Demo (Frontier Hackathon)
```

**Description:**
```
Stellar Field is the offline-mode Android companion to Stellar — an AI-powered astronomy app for telescope owners, built on Solana. It runs a 1-billion-parameter Llama model and Whisper speech-to-text entirely on-device via Tether's QVAC SDK, so observers under dark skies with zero cell signal still have a real AI guide at the eyepiece.

Why this is purposeful, not hackathon-shaped:
Astronomy is one of the few consumer use-cases where the target user is literally outside cell range during the activity. Telescope owners drive 2–3 hours from city light pollution to Bortle 1–3 dark-sky sites in mountains, deserts, or rural fields. There is no LTE there, often not even SMS. Cloud AI — including Stellar's web-side Astra running on the Claude API — goes dark at exactly the moment a user reaches the place they bought their telescope for.

Stellar Field closes that gap. Same Astra persona, same Privy embedded Solana wallet, same Supabase observation history — but on the phone, locally, no signal needed.

Recorded on a Poco X3 NFC. Airplane mode is toggled ON during the recording to prove on-device inference.

GitHub: https://github.com/Rezimod/Stellar
APK: https://github.com/Rezimod/Stellar/releases/tag/v0.1.0-field
Web companion: https://stellarrclub.vercel.app/field
```

**Visibility:** Unlisted (judges need a clickable link without it being indexed).
