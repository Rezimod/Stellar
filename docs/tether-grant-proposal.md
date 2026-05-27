# tether.dev Open Grant — $12,000 USDT (Phase 2)

**Submit:** https://tether.dev/grants/apply-for-a-grant/  
**Ops guide:** [`tether-grant-submit.md`](./tether-grant-submit.md)

---

## Form field map (paste directly)

| Form field | Value |
|---|---|
| Name | Revaz Modebadze |
| Project title | **Stellar Field — QVAC Reference App & Expo Playbook (Phase 2)** |
| Project maturity | Production |
| Requested amount | 12000 |
| Email | hello@astroman.ge |
| Website | https://stellarrclub.vercel.app/field |
| Ecosystem | QVAC |
| Type of grant | Application creation |
| Expected completion | 1 to 3 months |
| Requires tech support | Yes |
| Demo video (product) | `{{YOUTUBE_URL}}` *(existing chat-demo, Unlisted)* |
| Founder intro video | `{{LOOM_URL}}` *(2:30 face-cam, see `tether-grant-loom-script.md`)* |
| GitHub repo | https://github.com/Rezimod/Stellar |
| Release / APK | https://github.com/Rezimod/Stellar/releases/tag/v0.1.0-field |
| Frontier track listing | https://superteam.fun/earn/listing/tether-frontier-hackathon-track |

---

## Project description (paste into "Description / Project details")

Stellar Field is the only **Tether Frontier Hackathon Track winner** that ships QVAC into a real consumer product with a real retail distribution channel. We are not asking Tether to fund an experiment. We are asking Tether to fund Phase 2 of a product that already shipped, already won, and already has paying customers waiting on the other side of it.

**What Stellar Field is.** An offline-mode Android companion app for astronomers, built with Expo SDK 54 and Tether QVAC. It runs Llama 3.2 1B Q4, Whisper transcription, and a 72-chunk astronomy RAG index entirely on the phone. The same AI assistant ("Astra") that runs on Claude in our web app at stellarrclub.vercel.app continues working at Bortle 1–3 dark-sky sites where cell signal is exactly zero — the place every telescope owner actually uses their telescope.

**Why this matters to Tether.** Astronomy is one of the cleanest consumer use-cases for QVAC: the target user is **literally outside cell range during the activity**. Cloud AI fails the user at the moment of peak need. QVAC fixes it. This is not a synthetic demo of edge AI — it is the only runtime that works.

**Phase 1 (delivered, won the Frontier track):**
- Public GitHub monorepo with `apps/field/` Expo project
- Three QVAC plugins integrated in production: `@qvac/llm-llamacpp` (Llama 3.2 1B Q4), `@qvac/embed-llamacpp` (hybrid RAG), `@qvac/transcription-whispercpp` (voice observation logging)
- Hybrid RAG: QVAC embeddings cosine-sim + keyword overlap + season-relevance bonus over Messier catalog + 88 constellations + telescope FAQ
- Release APK (`v0.1.0-field`) on GitHub, downloadable from https://stellarrclub.vercel.app/field
- End-to-end verified on Poco X3 NFC: airplane mode ON, chat + voice still stream
- Public co-branding: "Tether Frontier Track Winner" badge in app + web

**The unfair distribution advantage.** I also founded **Astroman** (astroman.ge), Georgia's first astronomy e-commerce store: physical showroom in Tbilisi, ~$150K telescope inventory, 60K Facebook followers, direct relationships with Georgian schools and astronomy clubs. Every telescope sold through Astroman is a future Stellar Field user. No other QVAC grantee has a physical retail channel feeding their app. This is the case study Tether needs.

---

## Milestones (paste into "Milestones" — adjust headings to match form)

### Milestone 1 — Expo + QVAC Playbook and Starter Repo · **3,000 USDT** · 3–4 weeks

**Deliverables:**
- Public `docs/qvac-expo-playbook.md` (~6,000 words) covering: Expo 54 bare-pack setup, `expo prebuild --clean` pitfalls, NDK pinning, `arm64-v8a` build flags, peer-deps gotchas (the `~25 missing peer deps` list we hit), QVAC plugin enablement matrix, device compatibility (Snapdragon 7+ / Tensor / Cortex-A76+ required, Helio G80 fails silently — documented with reproduction case)
- Public `expo-qvac-starter` repo on GitHub: minimal Expo 54 + QVAC SDK 0.9.2 + Llama + embeddings + Whisper, ready for `npx create-expo-app --template`
- Two-screen demo in the starter so other devs see chat + voice work out of the box
- README with a "from zero to airplane-mode chat in 30 minutes" quickstart

**Acceptance:** Public repo, public doc, working `npm install && npx expo run:android` on a fresh machine. Tether team reviews and links from QVAC docs if approved.

---

### Milestone 2 — Stellar Field v0.2.0 (TTS + Georgian NMT) · **6,000 USDT** · 4–6 weeks

**Deliverables:**
- `@qvac/tts-onnx` integrated: Astra speaks responses aloud — hands-free guidance at the eyepiece (user never takes their eye off the telescope)
- `@qvac/translation-nmtcpp` integrated: bidirectional English ↔ Georgian neural machine translation, fully offline. Astroman's primary customer base reads Georgian first.
- Voice loop: speak observation in Georgian → Whisper transcribes → NMT translates → Llama answers in EN → NMT translates back → TTS speaks in Georgian. All on-device.
- Device compatibility matrix v2: tested on minimum 4 devices including one non-Snapdragon (Tensor G2 or equivalent) to validate the TTS/NMT pipeline doesn't hit the same DOTPROD-class issues as llama.cpp
- Release APK `v0.2.0-field` on GitHub + 90-second showcase video
- Updated landing at stellarrclub.vercel.app/field showing the Georgian voice loop

**Acceptance:** Public APK release, public demo video, working Georgian voice loop on a Snapdragon 7+ device, documented behavior on the 3 secondary devices.

**Note on cost vs M1:** This milestone is the largest because it carries the real engineering risk: native plugin integration, model bundling, multilingual quality validation, and the device matrix. M1 is documentation; M2 is product.

---

### Milestone 3 — Tether Co-Authored Case Study + Upstream Contributions · **3,000 USDT** · 2–3 weeks

**Deliverables:**
- Long-form case study (~4,000 words) co-authored with the Tether QVAC team for publication on qvac.tether.io or the Tether blog: technical architecture, retail-distribution model, lessons learned, performance numbers across the device matrix
- Astroman retail-bundling pilot writeup: "Every telescope sold ships with a Stellar Field APK QR code" — actual sales data from the first month
- Minimum 2 upstream contributions to `@qvac/*` packages (issue + PR or doc patch) — chipset compat, peer-deps fix, or playbook-derived improvements
- One-page testimonial slide and headshot photo suitable for Tether marketing
- 2-minute founder testimonial video for Tether (separate from the grant Loom — production-quality)

**Acceptance:** Case study live on a Tether channel (or co-published on Stellar's site with Tether logo), upstream PRs merged or formally reviewed, testimonial assets delivered.

---

## Why fund this (paste into "Why us" / "Impact" if the form has one)

1. **Already won.** Track record of shipping, not just promising. Frontier track winner with public APK, public demo, public co-branding.
2. **Only consumer product on QVAC with a physical retail distribution channel.** Astroman is a real store with real customers. Every telescope sale is a Stellar Field install. This is the case study every other QVAC grantee cannot give Tether.
3. **Solo builder, fast cadence.** Phase 1 went from concept to winning APK in under two weeks of focused work. Phase 2 will be 1–3 months — fast enough to be public material before the next Tether ecosystem event.
4. **English + Georgian out of the box.** Tether's geographic reach is global. Almost every QVAC app demo is English-only. Stellar Field v0.2 is the first to ship a non-English voice loop, validated against a real local-language user base.
5. **Cleanest "cloud AI fails here" story in consumer.** Astronomers are not a niche we invented for the pitch — they are a real $5B+ global hobbyist market, and they literally cannot use cloud AI in the moment they need it.

---

## What we are NOT asking for (transparency for the reviewer)

- We are NOT applying to the Swift / CoreML / LTX **bounties**. Those are Tether SDK infrastructure work, not Stellar Field product.
- We are NOT requesting funding for Solana / Privy / web app work. That continues on its own track and is not part of this scope.
- We are NOT asking for marketing budget. The marketing comes free via Astroman's 60K social audience.
- iOS is out of scope for Phase 2 (Xcode blocked on macOS Ventura 13.1). If Tether wants iOS, that is a Phase 3 conversation.

---

## Pre-submission checklist

- [ ] Frontier track payout confirmed with `@mariamgoya` on Telegram
- [ ] Founder Loom recorded (`docs/tether-grant-loom-script.md`)
- [ ] This document exported to PDF and ready as optional file upload
- [ ] Existing product demo URL on YouTube Unlisted (`{{YOUTUBE_URL}}`)
- [ ] `docs/tether-grant-handoff.md` updated with both video URLs
- [ ] Grant form filled, milestones pasted, submitted
- [ ] Follow-up DM to `@mariamgoya` after submission

---

*End of proposal.*
