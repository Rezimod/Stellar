# Hardware proof — Stellar Field

All inference runs **on-device** on the consumer phone below. No cloud, no
desktop, no GPU cluster. This is a mid-range phone released in 2020 (~$200),
chosen deliberately: if the offline AI holds up here, it holds up anywhere.

| | |
|---|---|
| **Device** | POCO X3 NFC (`M2007J20CG`), Xiaomi |
| **SoC** | Qualcomm Snapdragon 732G (SM7150) |
| **CPU** | 8 cores, arm64-v8a (2× Kryo 470 Gold @2.3GHz + 6× Silver) |
| **RAM** | 5.5 GB |
| **Storage** | 64 GB (50.7 GB free at test time) |
| **OS** | Android 12 (API 31), MIUI Global 14.0.2, security patch 2023-06-01 |
| **Connectivity during inference** | Airplane mode (no signal) |

## Models (all on-device via QVAC SDK)
- `LLAMA_TOOL_CALLING_1B_INST_Q4_K` — one shared 1B model for the RAG chat and the sky agent (~700 MB)
- `@qvac/transcription-whispercpp` — Whisper voice notes (~150 MB)
- `EmbeddingGemma 300M` — embeddings (capability verified via the Diagnostics smoke test)
- **Vision (multimodal):** `SMOLVLM2_500M_MULTIMODAL_Q8_0` + its mmproj projection on this 5.5 GB device (~700 MB). The loader is **RAM-aware**: phones with ≥6.5 GB RAM get the stronger `QWEN3VL_2B_MULTIMODAL_Q4_K` (~2 GB) automatically; the smaller SmolVLM2 is chosen here so it never OOMs alongside the resident 1B. Loaded lazily — only on first photo attach. Verified by the `vision-vlm` Diagnostics smoke probe (bundled test image, image→text round-trip).

## Measured performance (on the device above)
On-device eval over an 18-question mixed set (sky agent + multi-tool
orchestration + RAG), captured by the in-app harness on **2026-06-05**. Raw
exports are committed under [`artifacts/`](./artifacts/) — every audit inference
event carries `"backendDevice": "cpu"`, i.e. real on-device compute, no cloud.

- **Accuracy:** routing 18/18, tool selection 10/10, overall **18/18**
- **Sky agent (tool-grounded):** TTFT ~2.6–2.9 s, full answer ~4–6 s, ~8–10.5 tok/s
- **Multi-tool orchestration** (e.g. "best target tonight"): chains 3 tools
  (`get_tonight_targets → get_moon_conditions → get_dark_window`), full answer ~7–10 s
- **RAG companion (freeform):** TTFT ~7.6–10 s, full answer ~15–22 s (300–600-char answers)
- **Set averages:** avg TTFT **6483 ms**, avg total **12123 ms**
- **Vision (multimodal, SmolVLM2 500M):** captured live on **2026-06-07** — TTFT **10.9–19.5 s** (image projection is processed before the first token), **~7.7–9.2 tok/s**, every event `backendDevice: "cpu"`. See [`artifacts/qvac-vision-audit-2026-06-07.json`](./artifacts/qvac-vision-audit-2026-06-07.json). The RAM-aware loader picked SmolVLM2 on this 5.5 GB phone; Qwen3-VL 2B auto-loads on ≥6.5 GB devices.

Committed evidence bundle:
- [`artifacts/qvac-audit-2026-06-09.json`](./artifacts/qvac-audit-2026-06-09.json) — comprehensive single-session run: sky orchestration + **vision** + on-device **TTS** read-aloud (2.86 s audio synthesized in 2.56 s, faster than real time)
- [`artifacts/smoke-test-2026-06-09.png`](./artifacts/smoke-test-2026-06-09.png) — on-device Diagnostics smoke test: every capability green — `sky-agent`, `native-tool-calling`, **`embed-gemma dim=768` (semantic RAG live)**, **`prompt-injection` resisted 2/2**, `vision-vlm` (describes the bundled test image), `tts-voice`
- [`artifacts/qvac-vision-audit-2026-06-07.json`](./artifacts/qvac-vision-audit-2026-06-07.json) — live on-device VISION inferences (model load + TTFT + tokens/sec, `backendDevice: cpu`)
- [`artifacts/qvac-eval-2026-06-05.json`](./artifacts/qvac-eval-2026-06-05.json) — per-query route/tools/latency, incl. the orchestration cases
- [`artifacts/qvac-eval-2026-06-03.json`](./artifacts/qvac-eval-2026-06-03.json) — earlier run
- [`artifacts/qvac-audit-2026-06-03.json`](./artifacts/qvac-audit-2026-06-03.json) — per-inference prompt, tokens, TTFT, tokens/sec, raw QVAC `sdkStats`

> Reproduce: build per the README on a connected Android device, open the
> **Diagnostics** tab, tap **Run eval**, and export the audit log. The numbers in
> the demo video match these exported JSON files.

## How to verify the hardware claim
`adb shell getprop ro.product.model` → `M2007J20CG`
`adb shell getprop ro.board.platform` → `sm6150` (Snapdragon 732G / SM7150)
`adb shell getprop ro.product.cpu.abi` → `arm64-v8a`

A system-profiler screenshot (Settings → About phone) is included with the submission.
