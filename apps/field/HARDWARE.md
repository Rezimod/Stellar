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
| **Storage** | 45 GB (10 GB free at test time) |
| **OS** | Android 12 (API 31) |
| **Connectivity during inference** | Airplane mode (no signal) |

## Models (all on-device via QVAC SDK)
- `LLAMA_TOOL_CALLING_1B_INST_Q4_K` — one shared 1B model for the RAG chat and the sky agent (~700 MB)
- `@qvac/transcription-whispercpp` — Whisper voice notes (~150 MB)
- `EmbeddingGemma 300M` — embeddings (capability verified via the Diagnostics smoke test)

## Measured performance (on the device above)
On-device eval over a 16-question mixed set (sky agent + RAG), captured by the
in-app audit log on **2026-06-03**. Raw exports are committed under
[`artifacts/`](./artifacts/) — every inference event carries `"backendDevice": "cpu"`,
i.e. real on-device compute, no cloud.

- **Accuracy:** routing 16/16, tool selection 8/8, overall **16/16**
- **Sky agent (tool-grounded):** TTFT ~2.6–2.9 s, full answer ~4–6 s, ~8–10.5 tok/s
- **RAG companion (freeform):** TTFT ~7.6–10 s, full answer ~15–22 s (300–600-char answers)
- **Set averages:** avg TTFT **5672 ms**, avg total **11705 ms**

Committed evidence bundle:
- [`artifacts/qvac-eval-2026-06-03.json`](./artifacts/qvac-eval-2026-06-03.json) — per-query route/tool/latency
- [`artifacts/qvac-audit-2026-06-03.json`](./artifacts/qvac-audit-2026-06-03.json) — per-inference prompt, tokens, TTFT, tokens/sec, raw QVAC `sdkStats`

> Reproduce: build per the README on a connected Android device, open the
> **Diagnostics** tab, tap **Run eval**, and export the audit log. The numbers in
> the demo video match these exported JSON files.

## How to verify the hardware claim
`adb shell getprop ro.product.model` → `M2007J20CG`
`adb shell getprop ro.board.platform` → `sm6150` (Snapdragon 732G / SM7150)
`adb shell getprop ro.product.cpu.abi` → `arm64-v8a`

A system-profiler screenshot (Settings → About phone) is included with the submission.
