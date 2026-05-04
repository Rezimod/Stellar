# Stellar Field

Companion mobile app for [Stellar](https://stellarrclub.vercel.app) — runs on-device AI for astronomers in the field, where there is no signal.

Built with **Expo (SDK 54)** + **[Tether QVAC](https://qvac.tether.io)** for local LLM inference, embeddings, and (later) Whisper STT + TTS. Shares Privy auth and Supabase backend with the Stellar web app.

## Why this exists

Astronomers travel to dark-sky sites — mountains, deserts, rural fields — where cell signal is exactly zero. Stellar's web AI runs on the Claude API and goes dark the moment a user reaches the place they bought their telescope for. Stellar Field fixes that by running everything on the phone via QVAC.

This is the Tether Frontier Hackathon side track entry. See [`../../TETHER_QVAC_TRACK.md`](../../TETHER_QVAC_TRACK.md) for the full plan.

## Architecture

```
apps/field/
├── App.tsx                    Entry point. Wraps in PrivyProvider, mounts FieldChatScreen.
├── components/
│   ├── FieldChatScreen.tsx    Main UI: mode toggle, chat transcript, composer.
│   └── ModelLoadingBanner.tsx Download/load progress banner.
├── lib/
│   ├── qvac.ts                QVAC SDK wrapper — model loading, completion stream, embeddings.
│   ├── companion.ts           Routes between online (Claude) and offline (QVAC) chat.
│   ├── rag.ts                 On-device RAG retrieval over the astronomy corpus.
│   ├── privy.tsx              Embedded Solana wallet via @privy-io/expo.
│   ├── supabase.ts            Shared backend with the web app.
│   └── env.ts                 Read EXPO_PUBLIC_* config.
├── rag/corpus/index.json      Hand-curated astronomy chunks (Messier, constellations, FAQs).
├── scripts/build-rag-index.ts Optional: rebuild corpus from rag/sources/*.md with embeddings.
└── app.json                   Expo config (mic permission, dark theme, bundle ids).
```

## Three companion modes

The chat screen has a mode toggle:

- **AUTO** — pings the network; uses Claude API when online, QVAC when offline.
- **FIELD** — forces on-device QVAC even when online. Use this for the demo; also useful for privacy or when conserving signal.
- **ONLINE** — always Claude API; falls back gracefully if no network.

## Local setup

```bash
# from repo root
cd apps/field
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (optional for Day 1)

npm install --legacy-peer-deps
npx expo start
```

Open in Expo Go (iOS/Android) or run on a simulator. **Note:** QVAC's native modules will only work in a real Expo Dev Client build, not Expo Go. To get local LLM working end-to-end:

```bash
npx expo prebuild
npx expo run:ios     # or run:android — requires Xcode / Android Studio
```

## First-launch model download

On first run, QVAC fetches **Llama 3.2 1B (Q4_0 quantized, ~700MB)**. Progress is shown in the banner at the top. The model is cached and loads instantly on subsequent launches. We will defer the download behind a "one-time setup" screen before shipping.

## Environment variables

| Var | Purpose | Required |
|---|---|---|
| `EXPO_PUBLIC_PRIVY_APP_ID` | Privy app, shared with web | Yes (defaults to Stellar's prod app) |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | Privy client ID | No (recommended for prod) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | For observation logging |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | For observation logging |
| `EXPO_PUBLIC_WEB_CHAT_ENDPOINT` | Stellar web's `/api/chat` | Defaults to prod URL |

## QVAC packages used (so judges can grep)

- `@qvac/sdk` — meta-package; `loadModel`, `completion`, `embed` (Day 1, this commit)
- `@qvac/transcription-whispercpp` — voice observation logging (Day 3, not yet integrated)
- `@qvac/tts-onnx` — hands-free sky guidance (Day 4, not yet integrated)
- `@qvac/translation-nmtcpp` — offline EN↔KA (Day 6, optional)

## Status

| Day | Feature | Status |
|---|---|---|
| 1 | Expo + QVAC + Privy + Supabase wiring, RAG seed corpus, chat UI | ✅ this commit |
| 2 | Real-device verification, RAG quality pass | ⏳ |
| 3 | Whisper voice observation logging | ⏳ |
| 4 | TTS sky guidance | ⏳ |
| 5 | Voice-note → cNFT mint via existing Bubblegum pipeline | ⏳ |
| 6 | Demo video + submission polish | ⏳ |

## Known gotchas

- **Expo Go won't work** — QVAC has native bindings; you need an Expo Dev Client (`expo run:ios` / `run:android`).
- **`--legacy-peer-deps` required** — QVAC's `expo-file-system` peer dep is strict; npm needs the override.
- **Embedder model is best-effort** — if the embedding model fails to load, RAG falls back to keyword matching. The seed corpus is small enough that this works.
- **First-token latency** — Llama 3.2 1B on iPhone 13+ is ~1–2s to first token; older devices may be slower. We may pre-warm on app launch.

## Submission deliverables (per Tether listing)

- [x] Public GitHub repo (this monorepo)
- [x] QVAC packages used in core functionality, not as wrappers
- [x] Reproducible build instructions (this README)
- [ ] Demo video walkthrough (Day 6)
- [ ] Superteam Earn submission text (Day 6)
