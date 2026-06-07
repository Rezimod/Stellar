# DoraHacks submission — paste-ready packet

Everything the QVAC Hackathon I form asks for, in one place. Fill the two
`{{...}}` placeholders (video + system-profiler screenshot) on submission day.

> **Deadline:** June 21, 2026 23:59 UTC · **Early-bird bonus:** complete submission **before June 14** · **Track:** Mobile

---

**Product name:** Stellar Field

**One-line:** An AI astronomer that runs entirely on your phone via Tether QVAC — voice in, voice out, vision, RAG, and a multi-tool orchestration agent that computes real sky positions offline, where cloud AI can't reach.

**Team:** Revaz "Rezi" Modebadze — solo. Founder of Astroman (astroman.ge), Georgia's first astronomy e-commerce store (physical store in Tbilisi, ~60k followers). 2nd place + sponsor prize, Superteam Georgia hackathon (Mar 2026); 1st place, Tether Frontier — QVAC track (May 2026).

**Location:** Tbilisi, Georgia

**Track:** Mobile (retail Android phone; all inference on-device)

**Team hashtag:** `#AstraField`

**Public repos:**
- Standalone app: `github.com/Rezimod/stellar-field` (Apache 2.0)
- Monorepo (this app lives in `apps/field`): `github.com/Rezimod/Stellar`

**Demo video (unlisted YouTube, ≤5 min):** `{{YOUTUBE_UNLISTED_URL}}`

**Description:**
Stellar Field is a mobile companion for telescope owners at dark-sky sites with no signal. Its headline is **offline multi-tool orchestration**: ask "what's the best target tonight, and when?" and a 1B tool-calling model chains several local tools — what's up now, the Moon's interference, tonight's astronomical-dark window — then answers grounded in real computed data (`astronomy-engine`, zero network). A deterministic ephemeris pass guarantees the verdict, so it can never hallucinate "it's up" when a body is below the horizon. Attach a photo and an **on-device vision model** (Qwen3-VL 2B, SmolVLM2 fallback by RAM) identifies the telescope, eyepiece, or sky object — the image never leaves the phone. Tap 🔊 and an **on-device voice** reads the answer aloud; log observations by **voice** via local Whisper. Untrusted text (typed, transcribed, or read inside a photo) is treated as data not commands — **prompt-injection-resistant** by design. And with **Field Mesh**, a phone seeds its model to nearby devices **peer-to-peer** (Hyperdrive/Hyperswarm), so one phone can power the group's AI offline. Everything runs through the QVAC SDK; the app makes no cloud AI calls. Built on Astroman.ge — real users with a real reason the cloud fails them.

**QVAC usage:** `@qvac/sdk` native tool-calling (`LLAMA_TOOL_CALLING_1B`, `tools:true`) orchestrating five local sky tools · `@qvac/llm-llamacpp` for RAG chat and **multimodal vision** (`QWEN3VL_2B_MULTIMODAL` + mmproj) · `@qvac/embed-llamacpp` (EmbeddingGemma) · `@qvac/transcription-whispercpp` (speech→text) · `@qvac/tts-onnx` (Supertonic, text→speech) · **QVAC P2P** (Hyperdrive/Hyperswarm) for Field Mesh. Five modalities + the Holepunch P2P stack in one product.

**Prior-work disclosure:** Development began before June for the May Tether Frontier submission. Judging focuses on **June 1–21** work only. The split is stated in the README ("Built during this hackathon" vs "Prior work"): the June delta is the ephemeris/orchestration agent, vision, TTS voice-out, prompt-injection resistance, the audit/eval harness, and the P2P delegation investigation. Prior work: the Expo+QVAC+Privy wiring, RAG chat + corpus, and the Whisper voice-log pipeline.

**Hardware (reproducibility):** POCO X3 NFC (`M2007J20CG`), Snapdragon 732G (sm6150), 8 cores arm64-v8a, **5.5 GB RAM**, 64 GB storage, Android 12 (API 31). All inference on-device, airplane mode. Full specs + `adb getprop` verification + system-profiler screenshot in [`HARDWARE.md`](./HARDWARE.md). `{{SYSTEM_PROFILER_SCREENSHOT}}`

**Remote-API manifest:** [`remote-apis.json`](./remote-apis.json) — AI inference: **none** (100% on-device). Disclosed optional non-AI services: Privy (auth), Supabase (observation sync), one-time QVAC model downloads.

---

## Pre-submission checklist
- [ ] Demo video uploaded unlisted, ≤5 min, **airplane mode visible**, numbers match the audit log
- [ ] `{{YOUTUBE_UNLISTED_URL}}` filled in README + SUBMISSION + this file
- [ ] System-profiler screenshot attached (`Settings → About phone`)
- [ ] Audit log exported on the demo phone (Diagnostics → Export) and committed
- [ ] Repo public, Apache 2.0, README builds out-of-the-box (JDK 17 noted)
- [ ] `#AstraField` posted on X tagging @QVAC (join + weekly updates)
- [ ] Joined QVAC **Discord** (non-negotiable) + present on Keet (social vote)
- [ ] Submitted on DoraHacks **before June 14** (early-bird)
