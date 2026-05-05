# Tether QVAC Frontier Side Track — Stellar Integration Plan

**Track:** Tether Frontier Hackathon Track (10,000 USDt prize pool)
**Listing:** https://superteam.fun/earn/listing/tether-frontier-hackathon-track
**Submission deadline:** May 11, 2026
**Winner announcement:** May 13, 2026
**Project:** Stellar — AI-powered astronomy app on Solana

---

## 0. Status note (2026-05-05)

The full QVAC integration described in sections 1–6 below was implemented across Days 1–3 (commits `06bbca0`, `432a096`, `0f0b2e9`). All three QVAC capabilities are wired in code: local LLM inference, on-device Whisper STT, and an embedding-aware RAG retrieval over a 72-chunk astronomy corpus.

The on-device runtime did not ship in the first verification APK because EAS Build kept failing the **Prebuild** phase, where QVAC's Expo plugin invokes `bare-pack` to generate the worker.mobile.bundle.js. The QVAC Expo path is documented for `npx expo run:android --device` (a local Android Studio build), not EAS managed builds, and we don't have a local Android toolchain set up (macOS Ventura 13.1 blocks current Xcode; Android Studio install is queued for off-hours).

**Pivot taken:** the verification APK ships with `lib/qvac.ts` stubbed so we can validate the rest of the app on hardware (UI, audio recording, observation save, offline queue, RAG retrieval falls back to keyword scoring). The full QVAC integration is preserved in git history and documented below; restoring it is a single file revert plus the dep set in `package.json` from commit `2a69854`. See section 14 for the re-enablement plan.

---

## 1. The thesis (one paragraph)

Astronomers travel to dark-sky sites — mountains, deserts, rural fields — where cell signal is exactly zero. Stellar's current AI Space Companion runs on the Claude API and goes dark the moment a user reaches the place they bought their telescope for. **QVAC fixes that.** We ship a companion mobile app, **Stellar Field**, that runs on-device LLM, Whisper STT, and TTS via QVAC, so the AI works under the stars where users actually need it. This is not a forced fit; it is the exact problem QVAC was built to solve.

## 2. Why this wins each judging criterion

| Criterion | Weight | How Stellar scores |
|---|---|---|
| **Technical depth of QVAC integration** | 40% | Stack four QVAC capabilities in one offline pipeline: `@qvac/llm-llamacpp` (local LLM), `@qvac/embed-llamacpp` (RAG over an astronomy corpus), `@qvac/transcription-whispercpp` (voice notes at the eyepiece), `@qvac/tts-onnx` (hands-free guidance). RAG index pre-shipped and embedded on-device. Not a wrapper — the AI runs entirely on the phone. |
| **Product value** | 30% | Solves a pain every telescope owner has: AI that fails the moment you reach a dark site. Voice logging is independently useful — typing in the dark with red-light filter is awful. Founder is the operator of Astroman (Georgia's astronomy retailer) — distribution path is real, not hypothetical. |
| **Innovation** | 20% | Local AI as the *enabler* of a feature that cloud AI literally cannot serve. We're not "adding AI to X" — we're building something that only works *because* the AI is local. The Solana layer (Discovery Attestations for verified observations) plus QVAC voice→mint flow is genuinely novel. |
| **Demo quality** | 10% | Demo is killer and easy to film: airplane mode on, walk outside, app keeps working. Voice note → transcript → on-chain attestation in 30 seconds, fully offline. |

## 3. Critical platform constraint (read first)

**QVAC SDK does not run in browsers.** Per `docs.qvac.tether.io`, supported runtimes are:
- Node.js ≥ v22.17
- Bare runtime (Node-compatible globals)
- **Expo** (React Native)
- Native: Linux / macOS / Windows / Android / iOS via Vulkan

Stellar's existing Next.js web app **cannot host QVAC client-side.** Server-side Node integration would technically work but defeats the purpose ("must work offline or on-device") and the judges will see through it.

**Decision: build an Expo companion app, share Supabase backend with the web app.** The web stays the planning surface (online); the Expo app is the field surface (offline + on-device AI).

## 4. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  stellarrclub.vercel.app    │         │  Stellar Field (Expo)        │
│  Next.js web — planning     │         │  iOS / Android — observing   │
│                             │         │                              │
│  • 7-day forecast           │         │  • Offline AI Companion      │
│  • Planet tracker           │         │    @qvac/llm-llamacpp        │
│  • Marketplace              │         │    @qvac/embed-llamacpp      │
│  • Online Claude chat       │         │  • Voice observation log     │
│  • Profile / observations   │         │    @qvac/transcription-...   │
│                             │         │  • TTS sky guidance          │
│                             │         │    @qvac/tts-onnx            │
└──────────────┬──────────────┘         └────────────────┬─────────────┘
               │                                         │
               │           ┌─────────────────┐           │
               └──────────▶│   Supabase DB   │◀──────────┘
                           │  • users        │
                           │  • observations │
                           │  • missions     │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │  Solana devnet  │
                           │  • cNFT mints   │
                           │  (Bubblegum)    │
                           └─────────────────┘
```

**Auth:** Privy supports React Native via `@privy-io/expo`. Same `cmnnk6n2c002d0cl47skaaz0d` app ID, same embedded wallet, single user identity across web + mobile.

**Data sync:** Both clients read/write Supabase directly. Sky-data API routes on Vercel can be called by Expo when online; cached locally for offline use.

## 5. The four QVAC integrations

### 5.1 Offline AI Space Companion *(P0 — load-bearing)*
- **Packages:** `@qvac/llm-llamacpp` + `@qvac/embed-llamacpp`
- **Model:** Llama 3.2 1B Q4_0 (the QVAC quickstart default; ~700MB on first launch with progress UI)
- **RAG corpus** (pre-built, shipped with the app):
  - Messier catalog (110 deep-sky objects, descriptions + best viewing season)
  - Constellation guide (88 constellations, mythology + how to find)
  - Telescope FAQ (collimation, eyepiece selection, troubleshooting)
  - Astroman product manuals (the founder's own SKUs — distribution flywheel)
  - Stellar's existing observation tips
- **Behavior:** When online, route to Claude (current API). When offline OR user toggles "Field Mode," route to QVAC. Same prompt contract so UX is identical.
- **File:** `apps/field/lib/companion.ts`

### 5.2 Voice observation logging *(P0)*
- **Package:** `@qvac/transcription-whispercpp`
- **Why:** At the eyepiece, hands on the focuser, eyes dark-adapted, you cannot type. Voice-record `"M31 Andromeda, 25mm Plossl, faint dust lane visible, seeing 7/10, transparency 4/5"` and the app transcribes locally.
- **Output:** structured observation record → Supabase → optional mint as Discovery Attestation cNFT (existing Bubblegum pipeline).
- **File:** `apps/field/lib/voice-log.ts`

### 5.3 TTS sky guidance *(P1)*
- **Package:** `@qvac/tts-onnx`
- **Why:** Screen-off, dark-adaptation-preserving audio: *"Saturn rises in 12 minutes, 32 degrees southeast. Jupiter is currently at altitude 64 degrees, southwest."*
- **Trigger:** scheduled events from the planet tracker; user can also long-press a planet card to "speak it."
- **File:** `apps/field/lib/tts.ts`

### 5.4 Offline EN↔KA translation *(P2 — only if time permits)*
- **Package:** `@qvac/translation-nmtcpp`
- **Why:** Stellar already ships bilingual via next-intl. This lets the local LLM respond in Georgian without a server round-trip — a clean differentiator since most local LLMs are English-only.
- **File:** `apps/field/lib/translate.ts`

## 6. Repo structure

Convert the current single-app repo to a workspace:

```
Stellar-rezimod/
├── apps/
│   ├── web/                  ← existing Next.js app (move src/ here)
│   └── field/                ← NEW: Expo + QVAC companion
│       ├── app/              ← expo-router screens
│       ├── components/
│       ├── lib/
│       │   ├── qvac.ts       ← SDK init, model loading, progress UI
│       │   ├── companion.ts  ← LLM + RAG router
│       │   ├── voice-log.ts  ← Whisper STT pipeline
│       │   ├── tts.ts
│       │   ├── translate.ts
│       │   └── rag-corpus/   ← pre-built astronomy embeddings (.bin)
│       └── package.json
├── packages/
│   └── shared/               ← types, Supabase client, Privy config
└── package.json              ← npm workspaces
```

Alternative if workspace conversion is risky mid-hackathon: keep `apps/field` as a sibling folder with its own `package.json`, no workspace. Less elegant, lower risk.

## 7. Timeline (May 4 → May 11, 7 days)

| Day | Work | Ship gate | Status |
|---|---|---|---|
| **Tue May 5** | Bootstrap Expo app, install `@qvac/sdk` + `@privy-io/expo`, get Llama 3.2 1B loading on a real device with progress UI. Verify Privy login + embedded wallet work. | Local LLM responds to "Hello" on iPhone. | ✅ scaffold + typecheck; on-device verification blocked by Xcode/macOS, Android Studio path TBD off-hours |
| **Wed May 6** | Build RAG corpus: scrape/format Messier + constellation + FAQ data into chunks; embed with `@qvac/embed-llamacpp`; ship the index. Wire `companion.ts` router. | Offline chat answers "What is M31?" with corpus citation. | ✅ 72 chunks; hybrid retrieval (cosine + keyword + season bonus); citation chips in chat UI; markdown source format documented |
| **Thu May 7** | Whisper STT integration + voice-log UI (record button, waveform, transcript review screen). Save observations to Supabase. | Voice note → typed observation → DB row, all offline. | ✅ MicButton w/ pulse; expo-audio recorder; on-device Whisper via QVAC; target auto-extraction (M/NGC/IC/named/planet) + magnification + seeing/transparency parsing; Supabase save with AsyncStorage offline queue + sync; tab nav between Companion + Voice Log |
| **Fri May 8** | TTS for planet/sky alerts. Integrate with existing `astronomy-engine` planet tracker. Build the "Field Mode" toggle on the home screen. | App reads "Saturn rises in 12 minutes" out loud. | ⏳ |
| **Sat May 9** | Bridge to existing cNFT mint flow: voice-logged observation → Discovery Attestation on devnet. Polish onboarding (model download UX is the riskiest moment). | Full flow: airplane-mode voice note → on-chain mint when back online. | ⏳ |
| **Sun May 10** | Demo video (90s, airplane-mode field shot). README rewrite. Update `STELLAR_INFO.md` and `DEMO_SCRIPT.md`. Submission text on Superteam Earn + Colosseum. | Both submissions ready. | ⏳ |
| **Mon May 11** | Buffer day. Final QA, edge cases, submit before deadline. | Submitted. | ⏳ |

**Scope-cut order if behind:** drop translation (5.4) → drop TTS (5.3) → ship just LLM + RAG + voice logging. That core alone is a strong submission.

## 8. Pre-flight verifications (do these BEFORE day 1)

- [ ] Confirm `@privy-io/expo` works with our existing app ID `cmnnk6n2c002d0cl47skaaz0d`
- [ ] Run QVAC quickstart in a clean Expo project on a real iOS device (simulator may not have Vulkan parity)
- [ ] Measure Llama 3.2 1B Q4_0 first-token latency on iPhone — if > 5s, pre-warm on app launch
- [ ] Measure model download size + time on cellular (this is the #1 onboarding drop-off risk)
- [ ] Confirm Whisper model size / language support for Georgian (if KA STT is weak, voice-log is EN-only and we say so)
- [ ] Check QVAC license terms — confirm we can redistribute models in our app

## 9. What goes in the public GitHub repo (judging requirement)

Tether requires a "public GitHub repo with a working demo or video walkthrough." Our repo must contain:

1. **This file** — `TETHER_QVAC_TRACK.md` (the plan, the why, the architecture)
2. **`apps/field/README.md`** — how to run the Expo app locally, expected model download, troubleshooting
3. **`apps/field/lib/qvac.ts`** with clean comments explaining each capability used
4. **A demo video** linked in the root README — 90 seconds, airplane mode, narrated
5. **A `/docs/qvac-integration.md`** — short technical writeup for judges who don't want to read code: which packages, why each, where in the codebase
6. **Daily commits** (already required for Colosseum activity tracking; perfect side effect)
7. **`.env.example`** updated with any new keys
8. **Architecture diagram** (the ASCII one above is fine; an SVG is better)

## 10. Demo video script (90s)

```
0:00  Drone shot of telescope under Milky Way.
      VO: "I run Astroman, Georgia's astronomy store. Every customer
           asks the same thing: how do I use this thing tonight?"

0:10  Phone screen: Stellar web app, sky forecast.
      VO: "Stellar answers that — when you have signal."

0:18  Cut to dark field. Phone shows "No Service."
      VO: "But astronomers go where there is no signal.
           That's where the stars are."

0:25  Tap "Field Mode." Banner: "Running on-device with Tether QVAC."

0:30  Voice press-and-hold: "Saturn at 100x, Cassini Division clear,
                              seeing seven of ten."
      Transcript appears. Whisper, fully offline.

0:45  Chat: "What should I look at next?"
      LLM streams local response citing M22 (correct for the sky).

1:00  Long-press Saturn card. TTS speaks: "Saturn is currently at
      altitude 64 degrees southwest, setting in 38 minutes."

1:15  Show airplane-mode indicator throughout. Cut back to lit room,
      app syncs observation, mints cNFT.

1:25  End card: "Stellar Field. On-device AI, on-chain proof.
                 Powered by Tether QVAC and Solana."
```

## 11. Submission checklist (Superteam Earn listing)

- [ ] Public GitHub repo URL
- [ ] Demo video URL (YouTube unlisted is fine)
- [ ] Written description: 2 paragraphs — what + why QVAC
- [ ] Confirmation that the project is also submitted to Colosseum Frontier
- [ ] Reproducible build instructions in `apps/field/README.md`
- [ ] Mention QVAC packages used by name (judges grep for these)
- [ ] Submit by May 11, 2026 (8 days, 1 hour remaining as of listing snapshot)

## 12. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| QVAC + Expo has rough edges, undocumented gotchas | Medium | Day 1 is entirely de-risking; if it fails, fall back to a **Bare runtime CLI demo** for the Tether track only (lose elegance, keep eligibility) |
| Llama 3.2 1B is too dumb for astronomy Q&A | Low–Medium | RAG carries it; if quality is poor, swap to Qwen 2.5 3B Q4 if QVAC supports it |
| 700MB model download kills onboarding | High | Defer download until user explicitly enables Field Mode; show "this is a one-time download so the AI works offline forever" framing |
| Whisper accuracy poor in Georgian | Medium | Ship EN-only voice for v1, document as known limit |
| 7 days is tight solo | High | P2 features are explicitly droppable; core (5.1 + 5.2) is the must-ship |

## 13. Open questions to resolve in conversation

1. Are we comfortable adding an Expo app this late, or is a Bare/Node demo a safer bet for the Tether prize *only*, leaving the web app untouched?
2. Do we have iOS + Android test devices on hand?
3. Has Privy been swapped in already on the web app, or are we still on wallet-adapter? (Memory says migration not started — relevant because Field will be the first Privy surface to actually ship.)
4. Should we register this as a separate Colosseum project, or is Tether eligibility automatic given the main Stellar submission?

---

## 14. Re-enabling QVAC after the verification APK works

When the stubbed APK is verified on hardware (Days 4+ work depends on this), restoring full QVAC is a single short session:

1. **Set up the local Android toolchain.** Either:
   - Install Android Studio (works on macOS 13.1), connect Android phone via USB with debugging on, OR
   - Skip Android Studio: install the Android SDK command-line tools + JDK 17 manually
2. **Restore the QVAC code paths.**
   - `git show 2a69854 -- apps/field/package.json apps/field/app.json apps/field/metro.config.js apps/field/lib/qvac.ts apps/field/lib/privy.tsx apps/field/lib/user.ts apps/field/App.tsx | git apply` (or cherry-pick the relevant hunks)
   - `npm install` to repopulate the QVAC + Privy + bare-* + viem dep set
3. **Build via the documented path.**
   - `npx expo prebuild --clean` — runs the QVAC plugin, generates `worker.mobile.bundle.js`
   - `npx expo run:android --device` — builds + installs on the connected phone
4. **Verify:**
   - Llama 3.2 1B downloads on first launch
   - Chat answers cite corpus entries (e.g., M31 dust lane)
   - Voice log records, transcribes locally with Whisper, saves observation
5. **Re-build the EAS preview** for distribution if local works. The QVAC docs are clear that EAS may need extra bare-pack config; we'll know once the local path is proven.

The blockers have not been QVAC's correctness — they've been native build toolchain setup that isn't possible on this Mac without installing Android Studio (~1 hour). Doing that off-hours and resuming this is the cleanest path to the prize-eligible build.

---

*Last updated: 2026-05-05. Owner: Rezi. Status: pivoted to verification APK with stubbed AI; QVAC restoration pending Android Studio.*
