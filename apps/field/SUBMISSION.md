# Stellar Field — QVAC Hackathon I submission

**Track:** Mobile · **Hashtag:** `#AstraField` · **License:** Apache 2.0
**Repo:** github.com/Rezimod/Stellar (this app: `apps/field`) · **Demo:** `{{YOUTUBE_UNLISTED_URL}}`

> Reminder: judging focuses on work completed **June 1–21, 2026**. Prior work is
> disclosed in the README ("Built before June" vs "Built during this hackathon").

---

## Demo video — ≤5 min shot list

**Device:** known-good Snapdragon 7+ / Tensor phone (NOT Helio G). **Models pre-downloaded** (no first-launch progress bar on camera). **Airplane mode ON before opening the app — keep it visible in the status bar the whole time.**

| Time | Visual | Audio / on-screen |
|---|---|---|
| 0:00–0:12 | Night sky / telescope silhouette, then a "No Service" phone | *"Telescope owners drive hours to dark skies — zero signal, exactly where cloud AI dies. So I made an AI astronomer that runs entirely on the phone."* |
| 0:12–0:25 | Open **Stellar Field**. Pull down status bar → **airplane mode ON**. Header: on-device badge. | On-screen: `100% on-device · Tether QVAC · airplane mode` |
| 0:25–1:05 | **Companion** → tap "Is Saturn up right now?" → grant location → answer streams with **LIVE SKY** badge + an **ORCHESTRATED** trace showing the `planet/moon` tool chip. | *"The model calls a local tool — real computed positions, no network — and answers from that. Saturn's down; Jupiter's the target tonight."* |
| 1:05–2:00 | Tap **"Best target tonight, and when?"** → the **ORCHESTRATED** trace fills with **several chips** (`visible now → moon → dark window`) → one grounded answer combining them. | *"This is the headline — multi-tool orchestration. The model chains several on-device tools: what's up, how bright the Moon is, when the sky is truly dark — then answers from real data. All offline."* |
| 2:00–2:35 | Ask "What is M31?" → **QVAC** badge + citation chips (RAG companion). | *"General knowledge comes from on-device RAG over a curated astronomy corpus, with citations."* |
| 2:35–3:15 | **Voice Log** → hold mic → *"M31 Andromeda, 25 millimeter, seeing seven of ten"* → transcript + extracted fields. | *"Whisper transcribes locally at the eyepiece — hands stay on the focuser."* |
| 3:15–4:05 | **Diagnostics** → Run smoke test (capabilities light up) → Export audit log → share sheet → open the JSON. | *"Every inference is logged — model loads, time-to-first-token, tokens per second — exported as the evidence bundle."* |
| 4:05–4:30 | End card on black. | `stellarr.club` · `Tether QVAC` · `#AstraField` · "Built by Revaz Modebadze / Astroman.ge" |

**Minimum viable cut (if time/takes run short):** airplane mode → "Best target tonight, and when?" with the ORCHESTRATED multi-tool trace → one voice log → audit-log export. That alone proves the thesis.

### Recording checklist
- [ ] Battery >50%, brightness ~70%, Do Not Disturb on
- [ ] Models already downloaded
- [ ] **Airplane mode visible** before opening the app (no LTE cheat)
- [ ] One clean voice-log take (no wind on mic)
- [ ] Numbers shown on camera **match the exported audit log** (consistency = the verification bar)
- [ ] Re-read VO in a quiet room — reviewers watch muted; on-screen text must carry the story

### What NOT to show
- Emulator (arm64 physical device only) · Helio G devices · the Solana/crypto web UI · any cloud call

---

## Submission form fields (paste-ready)

**Product name:** Stellar Field

**One-line:** An AI astronomer that runs entirely on your phone via Tether QVAC — voice, RAG, and a multi-tool orchestration agent that computes real sky positions offline, where cloud AI can't reach.

**Description:**
Stellar Field is a mobile companion for telescope owners at dark-sky sites with no signal. Its headline is **offline multi-tool orchestration**: ask "what's the best target tonight, and when?" and a 1B tool-calling model (loaded with native QVAC tool support) chains several local tools — what's currently up, the Moon's interference, tonight's astronomical-dark window — then answers grounded in real computed data (`astronomy-engine`, zero network). A deterministic ephemeris pass guarantees the verdict, so the answer can never hallucinate "it's up" when a body is below the horizon. General questions are answered by on-device RAG over a curated astronomy corpus with citations; observations are logged by voice via local Whisper. And with **Field Mesh**, a phone seeds its model to nearby devices **peer-to-peer** (QVAC's Hyperdrive/Hyperswarm transport) — so at a dark-sky site with no signal, one phone can power the whole group's AI. Everything runs through the QVAC SDK; the app makes no cloud AI calls. Built on Astroman.ge, Georgia's largest astronomy retailer — these are real users with a real reason the cloud fails them.

**Track:** Mobile (retail Android phone; all inference on-device)

**Hardware used:** [your phone — chipset, RAM, storage; attach system-profiler screenshot]

**QVAC usage:** `@qvac/sdk` completion with **native tool-calling** (`LLAMA_TOOL_CALLING_1B` loaded with `modelConfig.tools: true`) orchestrating five local sky tools, `@qvac/llm-llamacpp` (RAG chat, same shared model), `@qvac/embed-llamacpp` (EmbeddingGemma semantic retrieval), `@qvac/transcription-whispercpp` (voice), and **QVAC P2P** (Hyperdrive/Hyperswarm) for **Field Mesh** — peer-to-peer model distribution so devices share the AI offline (`downloadAsset({ seed: true })`, `startQVACProvider`). Multiple QVAC modalities + the Holepunch P2P stack composed in one product.

**Repo:** github.com/Rezimod/Stellar (Apache 2.0) · **Demo video:** `{{YOUTUBE_UNLISTED_URL}}`

**Team hashtag:** `#AstraField`

---

## Verification bundle checklist
- [ ] Public repo, Apache 2.0 ([LICENSE](./LICENSE) present)
- [ ] Unlisted YouTube ≤5 min, airplane mode visible, real numbers
- [ ] Audit log exported (Diagnostics → Export) — device specs + TTFT/tokens-sec
- [ ] Remote-API manifest: AI = none; Supabase/Privy disclosed as non-AI
- [ ] Hardware specs + system-profiler screenshots
- [ ] Out-of-the-box build steps verified on the declared phone (README)
- [ ] Prior-work vs June-work split stated (README)
- [ ] `#AstraField` posted on X tagging @QVAC
