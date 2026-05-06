# QVAC Integration — Stellar

**Track:** Tether Frontier (Colosseum 2026)
**Submission deadline:** May 11, 2026
**Audience:** judges who don't want to read the codebase

---

## What Stellar is

Stellar is an AI-powered astronomy app for telescope owners, built on Solana. Founder operates Astroman (astroman.ge), Georgia's astronomy retailer — the integration is shaped by what real customers ask, not what fits a hackathon prompt.

The web app at **stellarrclub.vercel.app** is the planning surface: a 7-day sky forecast, planet tracker, AI Space Companion (Astra), marketplace, and on-chain Discovery Attestations for verified observations.

## The problem QVAC solves for us

Astronomers travel to dark-sky sites — mountains, deserts, rural fields. Cell signal there is exactly zero. Stellar's web Astra runs on the Claude API and goes dark the moment a user reaches the place they bought their telescope for. **Cloud AI fails where astronomers actually go.** That gap is the entire reason QVAC exists, and it's why Stellar Field, the QVAC-powered Android companion, is a load-bearing addition to the product, not a hackathon-shaped sidecar.

## Architecture: same Astra, two runtimes

```
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  stellarrclub.vercel.app    │       │  Stellar Field (Expo APK)    │
│  Next.js — planning         │       │  Android — observing         │
│                             │       │                              │
│  Cloud Astra (Claude API)   │       │  On-device Astra (QVAC)      │
│  • 7-day forecast           │       │  • @qvac/llm-llamacpp        │
│  • Planet tracker           │       │  • @qvac/embed-llamacpp      │
│  • Marketplace              │       │  • @qvac/transcription-      │
│  • Online chat              │       │    whispercpp                │
│                             │       │                              │
└──────────────┬──────────────┘       └────────────────┬─────────────┘
               │                                       │
               │           ┌─────────────────┐         │
               └──────────▶│   Supabase DB   │◀────────┘
                           │  shared backend │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │  Solana devnet  │
                           │  cNFT mints     │
                           └─────────────────┘
```

Same user. Same Privy embedded wallet (app ID `cmnnk6n2c002d0cl47skaaz0d`). Same Supabase observation history. From the user's perspective, Astra is one assistant — online she's fast and broad, offline she's local and focused on the sky in front of you. The split is invisible.

## What runs on the phone

### 1. Local LLM with RAG — `@qvac/llm-llamacpp` + `@qvac/embed-llamacpp`

- **Model:** Llama 3.2 1B Q4_0 (~700MB, downloaded once on first launch with progress UI)
- **Corpus:** 72 chunks across the Messier catalog (110 deep-sky objects), 88 constellations, telescope FAQ (collimation, eyepiece selection, troubleshooting), Astroman product manuals
- **Retrieval:** hybrid scoring — cosine similarity over QVAC embeddings + keyword overlap + a season-relevance bonus tied to the date the user is asking about
- **Citations:** every answer cites the corpus chunks it used. Markdown source format documented in `apps/field/rag/`.
- **Code:** [`apps/field/lib/companion.ts`](../apps/field/lib/companion.ts), [`apps/field/lib/qvac.ts`](../apps/field/lib/qvac.ts), [`apps/field/lib/rag.ts`](../apps/field/lib/rag.ts)

### 2. Voice observation logging — `@qvac/transcription-whispercpp`

At the eyepiece, hands on the focuser, eyes dark-adapted, you cannot type. Press, speak the observation (`"M31 Andromeda, 25mm Plossl, faint dust lane visible, seeing 7 of 10"`), release. Whisper transcribes locally. A second pass extracts targets (M/NGC/IC/named objects, planets), magnification, seeing, and transparency into a structured record. Saves to AsyncStorage offline; syncs to Supabase when back online; optionally mints as a Discovery Attestation cNFT.

- **Code:** [`apps/field/lib/voice-log.ts`](../apps/field/lib/voice-log.ts) (extraction in [`apps/field/lib/extract.ts`](../apps/field/lib/extract.ts))

### 3. Background sky checker — local QVAC reasoning loop

While the user is under the scope, a periodic on-device loop cross-references the planet tracker (via `astronomy-engine`) with the user's session and surfaces alerts: *"Saturn is now above 30° altitude — your scope's optimal range."* No server round-trip, no signal needed.

This is the demonstration that QVAC is not just a cloud-LLM fallback — it enables features that cloud AI literally cannot serve.

## Why this is purposeful integration

1. **Online and offline parity for one assistant.** Same persona, same prompt contract, same brand voice. Not a "lite mode."
2. **Multiple QVAC capabilities stacked in one pipeline.** LLM, embeddings/RAG, and Whisper STT all serve a single coherent product. The voice→transcript→Astra-Q&A→cNFT flow uses three of them in sequence.
3. **A real cost story.** Every offline session is a Claude call we don't make. For a user observing weekly under dark skies, that's a meaningful per-call saving with zero behavioral compromise.
4. **The web app stays untouched.** The QVAC integration is additive. None of Stellar's existing logic — sky forecast, marketplace, Discovery Attestations on Solana — required a rewrite for the prize.

## Repo layout

```
Stellar-rezimod/
├── apps/
│   └── field/                ← Expo + QVAC companion
│       ├── App.tsx
│       ├── app.json          ← @qvac/sdk/expo-plugin + minSdkVersion 29
│       ├── lib/
│       │   ├── qvac.ts       ← SDK init, model loading, progress UI
│       │   ├── companion.ts  ← LLM + RAG router
│       │   ├── voice-log.ts  ← Whisper STT pipeline
│       │   ├── extract.ts    ← target/magnification/seeing parser
│       │   ├── rag.ts        ← hybrid retrieval
│       │   └── observations.ts
│       ├── rag/              ← pre-built astronomy embeddings
│       └── package.json
├── src/                      ← existing Next.js web app (unchanged)
│   └── app/
│       ├── chat/             ← cloud Astra (Claude)
│       └── field/            ← APK download landing
├── docs/
│   └── qvac-integration.md   ← this file
└── TETHER_QVAC_TRACK.md      ← detailed plan, status, timeline
```

## Build and run (Android)

```bash
cd apps/field
npm install                       # restores QVAC + Privy + bare-* deps
npx expo prebuild --clean         # runs @qvac/sdk/expo-plugin (bare-pack)
npx expo run:android --device     # builds + installs on connected phone
```

QVAC's docs note the SDK does not run on emulators — only physical Android devices. Connect a phone with USB debugging on. First launch downloads Llama 3.2 1B (~700MB) with progress UI; offline chat works immediately afterward.

## Submission artifacts

- **GitHub repo:** this repository (public)
- **Demo video:** linked in the root README — 90 seconds, airplane-mode field shot
- **APK:** download from the `/field` route on the web app (also linked in submission)
- **This document:** technical overview for judges
- **Plan + status:** [`TETHER_QVAC_TRACK.md`](../TETHER_QVAC_TRACK.md)

## Packages used (judges grep for these)

- `@qvac/sdk`
- `@qvac/llm-llamacpp`
- `@qvac/embed-llamacpp`
- `@qvac/transcription-whispercpp`

Build-side dependencies pulled in by QVAC's Expo plugin: `react-native-bare-kit`, `bare-pack`, `bare-rpc`, `bare-buffer`, `bare-stream`, `expo-build-properties` (sets `minSdkVersion 29`, NDK pinning, OpenCL libs).
