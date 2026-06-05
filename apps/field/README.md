# Stellar Field — offline AI astronomer (Tether QVAC)

> A mobile companion that runs a complete AI astronomer **entirely on-device** via [Tether QVAC](https://qvac.tether.io) — so it works at dark-sky sites with **no signal**, where cloud AI fails.
>
> Part of [Stellar](https://stellarr.club). Prior recognition: 1st place, Tether Frontier Hackathon — QVAC track (May 2026).
>
> **QVAC Hackathon I — Mobile track. License: Apache 2.0.**

## Why this exists

Astronomers travel to dark-sky sites — mountains, deserts, rural fields — where cell signal is exactly zero. Stellar's web AI runs on a cloud API and goes dark the moment a user reaches the place they bought their telescope for. **Cloud AI fails where astronomers actually go.** Stellar Field fixes that: every model runs on the phone via QVAC. Put it in airplane mode and ask the sky — it answers.

## What it does

Three tabs, all 100% on-device:

- **Companion** — ask anything about the night sky. Questions about *where/whether* a body is up, or *what's visible tonight*, are routed to an **offline tool-calling agent** that computes real positions and answers grounded in them (tagged **LIVE EPHEMERIS**). General astronomy questions go to a **RAG companion** over a curated corpus (tagged **QVAC**, with citations).
- **Voice Log** — at the eyepiece, hands on the focuser, press and speak your observation. Whisper transcribes locally; a second pass extracts target, magnification, seeing.
- **Diagnostics** — one-tap capability smoke test and **audit-log export** (the evidence bundle: device specs + per-inference TTFT/tokens-sec).

### The headline loop (offline multi-tool orchestration)

The model orchestrates several **native QVAC tools** to answer a compound
question, then a deterministic pass guarantees the verdict can never be wrong:

```
"What's the best target tonight, and when?"   (airplane mode)
        │
        ▼
LLAMA_TOOL_CALLING_1B  ──orchestrates──▶  get_visible_now()
 (native QVAC tools)   ──orchestrates──▶  get_moon_conditions()
        │              ──orchestrates──▶  get_dark_window()
        │                          (local astronomy-engine, zero network)
        ▼
 deterministic pass ── computes the primary verdict from real ephemeris
        │             (the answer can never flip "below horizon" → "up")
        ▼
"The Moon is 78% lit and washes out faint targets until it sets ~02:10.
 Jupiter is well placed (31° up, W); astronomical dark runs 22:40–04:05."
        │
        └─ ORCHESTRATED trace shown · grounded in real computed positions
```

**Why this design:** native QVAC tool-calling is wired and verified — the model
loads with `tools: true` and `completion({ tools })` accepts the five sky tools
(see the Diagnostics **native-tool-calling** smoke probe). But a 1B is unreliable
at *emitting* structured calls at runtime — it tends to describe the call in
prose and burns a full generation doing it. So the **orchestration is driven
deterministically**: a planner selects and chains the right tools for the query
(reliable, correct, one model pass), and the answer is grounded in their real
results. The ORCHESTRATED trace and the LIVE SKY verdict are both shown in the UI.

## On-device AI — all via the QVAC SDK, zero cloud inference

| Capability | QVAC package | Model |
|---|---|---|
| RAG chat **and** tool-calling agent (one shared model) | `@qvac/llm-llamacpp` | `LLAMA_TOOL_CALLING_1B_INST_Q4_K` |
| Embeddings (semantic RAG) | `@qvac/embed-llamacpp` | EmbeddingGemma 300M |
| Voice transcription | `@qvac/transcription-whispercpp` | Whisper |

There is **no cloud LLM proxy** from the Field app. All inference is QVAC, on the device.

## ⭐ Built during this hackathon (June 1–21, 2026)

The judged delta over the disclosed prior work below:

- **`lib/ephemeris.ts`** — pure on-device planet/Moon positions via `astronomy-engine` (altitude, azimuth, visibility, rise/set, constellation), plus **moon-interference** and **astronomical dark-window** computation. No network.
- **`lib/skyTools.ts`** — five native QVAC tool descriptors (`get_body_position`, `get_object_position`, `get_visible_now`, `get_moon_conditions`, `get_dark_window`) with local handlers + compact result summaries for grounding.
- **`lib/agent.ts`** — **deterministic multi-tool orchestration**: a planner selects and chains the right sky tools per query, grounded in real ephemeris so the verdict can never flip; native QVAC tool-calling is wired + verified (smoke probe) but the 1B is unreliable at emitting structured calls, so orchestration is deterministic for reliability + speed. Every tool call logged to the audit.
- **Orchestration trace + LIVE SKY badge** in `components/FieldChatScreen.tsx` — the UI shows which tools the model orchestrated and the guaranteed verdict; sky-position questions use the agent, everything else stays on RAG.
- **Real GPS observer** (`lib/location.ts`, `expo-location`) — computes the sky for where you actually are; Tbilisi fallback on denial.
- **`lib/audit.ts`** — inference audit log (model loads, TTFT, tokens/sec, raw QVAC stats) with JSON file + OS share-sheet export — the verification evidence bundle.
- **`lib/smoke.ts` + Diagnostics tab** — one-tap on-device capability probe.

## Prior work (disclosed, built before June)

Baseline from the May Tether Frontier submission, **not** counted in this hackathon's judging: the Expo + QVAC + Privy wiring (`lib/qvac.ts`, `lib/privy.tsx`), the RAG chat companion (`lib/companion.ts`, `lib/rag.ts`) and its astronomy corpus (`rag/corpus/`), and the Whisper voice-log pipeline (`components/VoiceLogScreen.tsx`, `components/MicButton.tsx`, `lib/extract.ts`, transcription in `lib/qvac.ts`).

## Hardware requirements

- **Physical Android device only** — QVAC's native modules do not run on emulators or Expo Go.
- **Chipset: Snapdragon 7+ / Google Tensor / Cortex-A76+ or better.** Avoid MediaTek **Helio G-series** — it silently breaks llama.cpp activation.
- **~2 GB free storage** for the model downloads.

## Build & run (reproducible)

Run from the app directory — the repo root in this standalone repo, or `apps/field` in the Stellar monorepo:

```bash
npm install --legacy-peer-deps
npx expo prebuild --clean        # runs @qvac/sdk expo-plugin (bare-pack)
npx expo run:android --device    # builds + installs on a connected phone
```

Enable USB debugging on the phone and accept the "Allow USB debugging" prompt. First launch downloads the models with a progress banner; offline use works immediately after.

## First-launch model downloads (one-time, cached)

- `LLAMA_TOOL_CALLING_1B` Q4 — ~700 MB (one shared model for chat + agent)
- Whisper — ~150 MB (loads on first voice log)
- EmbeddingGemma 300M — loaded for semantic RAG

## Verification artifacts (for the 3-stage review)

- **Audit log** — Diagnostics → *Export audit log* → `qvac-audit-<session>.json` (device specs + every inference's prompt, tokens, TTFT, tokens/sec). Shareable via the OS share sheet.
- **Remote-API manifest** — [`remote-apis.json`](./remote-apis.json): **AI inference: none** (100% on-device via QVAC). Non-AI services, optional and disclosed: Supabase (observation sync), Privy (auth), plus one-time QVAC model downloads. The Field app makes no cloud AI calls.
- **Demo video** — `{{YOUTUBE_UNLISTED_URL}}` (≤5 min, recorded in airplane mode).

## QVAC packages used (judges can grep)

`@qvac/sdk` · `@qvac/llm-llamacpp` · `@qvac/embed-llamacpp` · `@qvac/transcription-whispercpp`

## License

Apache 2.0 — see [LICENSE](./LICENSE).
