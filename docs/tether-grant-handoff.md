# Stellar Field × Tether — Handoff for Claude

**Owner:** Revaz Modebadze (Rezi)  
**Date:** May 2026  
**Purpose:** Single briefing for continuing grant prep, QVAC work, and Tether partnership — paste this into a new Claude chat.

---

## 1. Who I am

- **Revaz Modebadze** — solo builder, Tbilisi, Georgia  
- Founder of **Astroman** ([astroman.ge](https://astroman.ge)) — Georgia’s first astronomy e-commerce store (~$150K inventory, 60K Facebook followers, physical showroom)  
- **Stellar** — AI-powered astronomy app on Solana (consumer utility; crypto is invisible: Privy email wallets, gasless devnet, card-first)  
- **Superteam Georgia** — 2nd place + sponsor prize, March 2026  
- **Tether Frontier Hackathon Track winner** — Superteam Earn, May 2026 ([listing](https://superteam.fun/earn/listing/tether-frontier-hackathon-track), prizes: $5K / $3K / $2K USDT for 1st/2nd/3rd)

---

## 2. What Stellar Field is

**Stellar Field** = offline Android companion (`apps/field/`) to the web app ([stellarrclub.vercel.app](https://stellarrclub.vercel.app)).

**Problem:** Astronomers use telescopes where there is **no cell signal** (Bortle 1–3 dark-sky sites). Cloud AI (Claude on web Astra) dies exactly when they need help.

**Solution:** On-device AI via **Tether QVAC** — same Astra persona, different runtime.

| Surface | Runtime | Role |
|---------|---------|------|
| Web app | Claude API + OpenAI tools | Planning at home (forecast, chat, marketplace) |
| Stellar Field (APK) | QVAC on phone | Observing offline (chat, voice log) |

**Architecture:** Same Privy wallet, same Supabase observations. User doesn’t see “cloud vs edge.”

**QVAC packages in production (Phase 1):**
- `@qvac/sdk@0.9.2` + Expo bare-runtime worker  
- `@qvac/llm-llamacpp` — Llama 3.2 1B Q4 (~700MB download)  
- `@qvac/embed-llamacpp` — hybrid RAG (72 chunks: Messier, constellations, telescope FAQ)  
- `@qvac/transcription-whispercpp` — voice observation logging at eyepiece  

**Verified on:** Poco X3 NFC (Snapdragon 732G, 6GB RAM). Airplane-mode chat works.  
**Do not use:** Helio G80 / phones without DOTPROD for llama.cpp (documented in `docs/qvac-debug/`).

**Key code paths:**
- `apps/field/lib/qvac.ts` — SDK init, model loading  
- `apps/field/lib/companion.ts` — LLM + RAG chat  
- `apps/field/lib/voice-log.ts` — Whisper pipeline  
- `apps/field/components/FieldChatScreen.tsx` — Companion UI  
- `docs/qvac-integration.md` — technical overview for judges  
- `docs/qvac-submission.md` — Superteam paste-ready copy  
- `docs/qvac-demo-script.md` — 75s product demo (grant YouTube)
- `docs/tether-grant-loom-script.md` — 2:30 founder Loom
- `docs/tether-grant-submit.md` — single submit checklist  

**Artifacts shipped:**
- APK: https://github.com/Rezimod/Stellar/releases/download/v0.1.0-field/app-release.apk  
- Release: https://github.com/Rezimod/Stellar/releases/tag/v0.1.0-field  
- Landing: https://stellarrclub.vercel.app/field  
- Repo: https://github.com/Rezimod/Stellar  

**Co-branding added (May 2026):**
- `apps/field/lib/tetherBrand.ts` + `TetherCobranding.tsx` — “Tether Frontier Track Winner” in Field chat header  
- Web `/field` — winner banner in `src/messages/en.json` / `ka.json`  

---

## 3. Money: three different things (don’t confuse them)

### A. Frontier track prize (hackathon — already won)
- Paid via Superteam Earn / Tether sponsor process — **not** the tether.dev grant form  
- Contact from listing: Telegram [@mariamgoya](https://t.me/mariamgoya)  
- Amount depends on placement ($5K / $3K / $2K USDT)

### B. tether.dev open grant (what we’re applying for now)
- Form: https://tether.dev/grants/apply-for-a-grant/  
- **Not automatic cash.** Apply → review (~2 weeks) → scope call → **signed agreement** → deliver milestones → paid in **USD₮** after each acceptance (~30 days per bounty terms)  
- **Proposed total: $12,000 USDT** in 3 milestones (see §5)  
- **Do NOT need v0.2 (TTS/NMT) before applying** — that’s what the grant funds

### C. QVAC bounties on tether.dev (NOT our primary path)
- https://tether.dev/grants/bounties/?category=qvac  
- ANE/CoreML ($5K), LTX video ($10K), Swift client ($3K) = **Tether SDK infrastructure**, not Stellar Field product  
- **Recommendation:** skip bounties; use **open grant** (Application creation + QVAC ecosystem)

---

## 4. Strategic goal

1. **Short term:** Submit Phase 2 grant; get Frontier USDT payout confirmed  
2. **Medium term:** Deliver playbook + Field v0.2 (TTS + Georgian NMT) if funded  
3. **Long term:** Tether **ecosystem partner** — case study on [qvac.tether.io](https://qvac.tether.io), co-marketing with Astroman distribution  

**Positioning one-liner:**  
*Frontier track winner; only flagship consumer app proving QVAC where cloud AI fails — at the telescope, with zero signal — distributed through a real astronomy retailer.*

---

## 5. Grant application — form fields (Monday.com embed)

**URL:** https://tether.dev/grants/apply-for-a-grant/

| Field | Value |
|-------|--------|
| Name | Revaz Modebadze |
| Project title | Stellar Field — QVAC Reference App & Expo Playbook (Phase 2) |
| Project Maturity | **Production** |
| Requested amount | **12000** (USDT) |
| Email | hello@astroman.ge *(confirm)* |
| Website | https://stellarrclub.vercel.app/field |
| Ecosystem | **QVAC** |
| Type of grant | **Application creation** |
| Expected completion | **1 to 3 months** |
| Requires tech support | **Yes** |
| Terms | Check agree |

**Description & Milestones:** Full text was drafted in Cursor chat (May 2026). Key points:
- Won Frontier track; Phase 1 shipped (3 QVAC plugins, APK, airplane-mode demo)  
- Phase 2: public Expo+QVAC playbook (**$3K**), v0.2 with TTS + EN↔KA NMT + APK + video (**$6K**), upstream + case study (**$3K**) — see `docs/tether-grant-proposal.md` + `docs/tether-grant-submit.md`  
- Replace `{{YOUTUBE_URL}}` with Unlisted YouTube before submit  

**Optional File upload:** PDF of proposal, or `docs/qvac-integration.md`, or screenshot `~/Desktop/stellar-field-chat.png`

---

## 6. Pre-submission checklist (must-do before grant submit)

- [ ] Smoke test APK on Poco: chat, voice log, **airplane mode**  
- [ ] Record 75–90s demo per `docs/qvac-demo-script.md` → YouTube **Unlisted**  
- [ ] Verify links: `/field`, GitHub, APK release  
- [ ] README mentions Frontier winner + QVAC + demo link  
- [ ] Paste grant form with YouTube URL filled in  
- [ ] Optional: Telegram note to @mariamgoya that grant submitted  
- [ ] Deploy latest co-branding to Vercel if not live  

**Do NOT block submit on:** TTS, NMT, v0.2, Swift bounty, WDK.

---

## 7. Phase 2 product roadmap (grant deliverables)

| Milestone | Work | QVAC add-ons |
|-----------|------|----------------|
| M1 | `docs/qvac-expo-playbook.md` — Expo 54 + bare-pack + device matrix + API pitfalls | — |
| M2 | Field **v0.2.0-field** APK + 90s demo | `@qvac/tts-onnx`, `@qvac/translation-nmtcpp` |
| M3 | Case study + 1–2 upstream QVAC issues/PRs; optional WDK spike doc | — |

**qvac.config.json today:** llama, embed, whisper only. TTS/NMT need plugin add + `expo prebuild --clean` + new release build.

---

## 8. What NOT to do

- Don’t apply to QVAC bounties (Swift/CoreML/LTX) instead of the open grant  
- Don’t expect $12K wire on form submit  
- Don’t pitch Solana/prediction markets to Tether — lead with **local-first AI + retail distribution**  
- Don’t grind on Helio G80 devices for demos  

---

## 9. Repo map (monorepo)

```
Stellar-rezimod/
├── apps/field/          ← Expo + QVAC Android app
├── src/                 ← Next.js 15 web app
├── docs/
│   ├── qvac-integration.md
│   ├── qvac-submission.md
│   ├── qvac-demo-script.md
│   └── tether-grant-handoff.md   ← this file
├── stellar-toolkit/field-chat-preview.html  ← UI mockup for screenshots
└── messages/en.json, ka.json    ← i18n including field.winnerBadge
```

**Build Field (Android):**
```bash
cd apps/field && npm install
npx expo prebuild --clean --platform android
npx expo run:android --device
# Release: ./gradlew assembleRelease in android/
```

**Web dev:**
```bash
npm run dev   # localhost:3000, /field for landing
```

---

## 10. Open placeholders

| Item | Status |
|------|--------|
| `{{YOUTUBE_URL}}` in submission copy | **TODO** — record demo |
| Grant form submitted | **TODO** |
| Frontier USDT payout | Confirm with sponsor |
| tether.dev grant approval | Pending after submit |

---

## 11. Other opportunities (context only — not Tether)

- **Colosseum fall hackathon:** Sep 28 – Nov 2, 2026  
- **Alliance accelerator:** early apply May 27, 2026 — [alliance.xyz/apply](https://alliance.xyz/apply)  
- **SafePal Solana grant:** deadline Dec 31, 2026  
- **Superteam microgrants / Agentic Engineering:** rolling on earn.superteam.fun  

---

## 12. Ask for Claude

When continuing work, typical tasks:
1. Fill grant Description/Milestones into form; generate 1-page PDF for File field  
2. Update root README with winner + links  
3. Implement M1 playbook or M2 TTS/NMT in `apps/field`  
4. Record script polish / Georgian narration for demo  
5. Draft partnership email to Tether post-grant submit  

**Philosophy:** Utility first, crypto second. Design: dark cosmic, Orbitron/Geist, no glass/glow/gradiet hype. Auto-push to `main` is a standing repo rule for completed tasks unless user says otherwise.

---

*End of handoff.*
