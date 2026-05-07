# Tether QVAC Track — Submission Package

This file is reference material for filling out the Superteam Earn submission form. **Not for the codebase or judges directly** — it's for Rezi when filling the form.

---

## Project name
**Stellar Field**

## Track
**Tether Frontier — QVAC Edge AI**

## One-liner (≤140 chars)
> Stellar Field runs a 1B-parameter Llama plus Whisper entirely on-device, so astronomers under dark skies with no signal still have an AI guide.

## Project URL
- Web (main hackathon entry): https://stellarrclub.vercel.app
- Field APK landing: https://stellarrclub.vercel.app/field

## Demo video URL
- YouTube unlisted: **{{paste-link-after-recording}}**
- Filmed: airplane-mode ON, real on-device LLM inference + Whisper transcription
- Length: ~75 seconds

## APK download
- GitHub Release: **{{paste-after-`gh release create`}}**
- Direct asset URL: **{{paste-after-`gh release create`}}**

## GitHub repo
- https://github.com/morningbriefrezi/Stellar-rezimod (or wherever the repo lives)
- Relevant subdirectory: `apps/field/`
- Judge-facing technical writeup: `docs/qvac-integration.md`

---

## Why this project fits QVAC

(Use this as the long-form description on the submission form.)

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

## What's verified end-to-end on-device
- [ ] App boots, dark cosmic UI, no crashes
- [ ] Llama model downloads from CDN on first launch
- [ ] Streaming chat completion works at usable speeds
- [ ] Local RAG citation chip appears below answers
- [ ] Whisper voice transcription captures audio + transcribes locally
- [ ] Observation save flow persists locally + queues for sync
- [ ] **Airplane mode ON: chat + voice still work fully** (the prize-eligible artifact)

## Known scope cuts (be transparent in submission)
- Per-question TTS playback (would need ONNX TTS plugin; cut for May 11 deadline)
- NMT translation between EN/KA in offline mode (cut)
- iOS build (Xcode blocked on macOS Ventura 13.1)
- On-camera Discovery Attestation cNFT mint from Field app (web-side only this round)

---

## Submission checklist (do these in order)

1. [x] App builds locally, prebuild succeeds end-to-end
2. [ ] Phone connected, `adb devices` shows it
3. [ ] APK installs cleanly via `adb install`
4. [ ] On-device verification 9-step run-through passes (see `docs/qvac-demo-script.md`)
5. [ ] Build release APK: `cd apps/field && ./gradlew assembleRelease`
6. [ ] Create GitHub release: `gh release create v0.1.0-field --title "Stellar Field 0.1.0 (Tether QVAC track)" --notes-file docs/qvac-integration.md apps/field/android/app/build/outputs/apk/release/app-release.apk`
7. [ ] Copy direct asset URL from `gh release view v0.1.0-field --json assets`
8. [ ] Set `NEXT_PUBLIC_FIELD_APK_URL` on Vercel: `vercel env add NEXT_PUBLIC_FIELD_APK_URL production` (paste URL when prompted)
9. [ ] Redeploy: `vercel --prod`
10. [ ] Verify https://stellarrclub.vercel.app/field shows the Download button
11. [ ] Record 75s demo (see `docs/qvac-demo-script.md`)
12. [ ] Upload to YouTube unlisted, copy link
13. [ ] Fill Superteam Earn submission form using this file's fields
14. [ ] Submit before May 11, 23:59 UTC
