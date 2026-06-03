# STELLAR — Product Upgrade Plan (Pure Consumer)

**Lens:** user product only. Not hackathon, not grant narrative. The question is: *does this make a real person open the app more, find the sky faster, earn more, and spend what they earn.*
**Stack we build on:** Next.js 15 / React 19 / TS strict / Tailwind 4 / Privy / Solana / Claude API / astronomy-engine / Open-Meteo / Neon.
**Constraints carried over:** mobile-first (880–1080px centered), CSS keyframes only, no new npm packages unless strictly required, no emoji (SVG icons), no breaking existing API consumers, default Tbilisi 41.71°N / 44.83°E.

**Decisions locked for this cycle:**
1. **Two-token model.** STARS stays a **closed-loop loyalty point** — server-controlled, pegged 100 STARS = 1 GEL, devnet/invisible, unchanged. A **separate tradeable utility token** (`$ASTRO` — name TBD) launches on **mainnet** for the crypto-native / Seeker audience. The split is deliberate: the peg and the sybil surface stay on the closed side; speculation and liquidity stay on the tradeable side. See §9.
2. **Finder ships Compass-first;** AR is a hard 1-day timebox, cut on resistance.
3. **Seeker / Solana dApp Store launch is planned now, shipped after the core loop (M1–M3) and the token are live** — list something worth installing. See §10.
4. **The tradeable token's launch mechanism is an open pre-launch gate** (seed-LP vs fair-launch vs presale) — decided with a crypto/legal advisor, not in code.

---

## 0. Codebase reality check (read before building)

This plan was reconciled against the actual repo. Several things it once called "build" already exist — **wire and upgrade them, do not rebuild**. Every milestone below opens with a read-first pass to confirm current state. Reuse beats refactor (standing rule).

| Capability | Status on disk | What's actually left to do |
|---|---|---|
| Observability score | **Built** — `src/lib/sky-score.ts` (grades, weighted cloud/visibility/humidity/wind/moon/Bortle factors) | Consume it consistently across Home, Sky, Finder, Missions, push. Do **not** re-derive. |
| 2D sky chart | **Built** — `src/lib/sky-chart.ts` (stereographic alt-az projection, star-catalog wired) | Layer interactivity (drag/zoom/tap-to-find) on top. |
| Location pipeline | **Largely built** — `src/lib/observer-location.ts` (fresh-fix GPS, stale refresh, persistence, `LOCATION_UPDATED_EVENT`) + `LocationPicker.tsx` | Audit that *every* surface reads it; remove silent Tbilisi fallbacks where a real fix is available. |
| Leaderboard | **Already DB-backed** — `api/leaderboard/route.ts` queries Neon/Drizzle, already supports `period=week\|month\|all` | Add friends view + UI polish. The "it's mock" premise was wrong. |
| STARS economics | **Coded** — `src/lib/stars-economy.ts` (`STARS_PER_GEL`, `MAX_BURN_RATIO`, burn increments, 4.69 marketplace rate) + `stars-burn-client.ts` | Build the *redemption UX* on top of existing math. Token stays devnet. |
| Star catalog / constellations | **Built** — `star-catalog.ts`, `constellation-streak.ts` | Reuse for generative art + sky chart. |
| `/find` page | **Does not exist** | Genuine greenfield. |
| Service worker / Web Push | **Does not exist** | Genuine greenfield. |

---

## 1. The one thesis

Right now Stellar reads as a *forecast-and-rewards* app. The upgrade turns it into a **"point your phone at the sky and find things, get rewarded for actually looking up"** app. That single shift — from *reading about the sky* to *finding the sky* — is the whole product unlock. Everything below serves the core loop:

> **Open → find a planet in seconds → earn STARS → spend STARS.**

The weakest link today is *find a planet in seconds* (it's a data grid, not a finder) and *earn daily* (observation missions are high-friction and weather-gated, so there's no reason to open the app on a cloudy Tuesday). Fix those two and the rest compounds.

---

## 2. Four honest calls

**A. AR is delight, the Compass Finder is the product.** Pointing the phone and seeing labels is the biggest "find it easily" leap, but web AR is genuinely finicky — iOS Safari gates `DeviceOrientation` behind a permission tap, requires HTTPS, and `webkitCompassHeading` is iOS-only and drifts; Android is more permissive but inconsistent. So we ship **two tiers from one engine**: (1) *Compass Finder* — reliable everywhere: a big arrow that rotates as you turn plus "look up 42°", no camera; (2) *AR overlay* — camera + labels where supported, falling back to Compass. The Compass Finder is the deliverable that satisfies "find a planet easily"; **AR gets a 1-day timebox and is cut on resistance.** Don't oversell it.

**B. Two tokens, one isolating the other's risk.** STARS stays exactly what it is today: a **closed-loop loyalty point** — server-minted, pegged at 100 STARS = 1 GEL, redeemable for Astroman value, never DEX-listed. The existing `stars-economy.ts` math and the spend UX (M7) are untouched. *Separately*, a **tradeable utility token** (`$ASTRO`, name TBD) launches on **mainnet** for the Seeker / crypto-native market. Keeping them split is the whole point: the loyalty peg can't break, and your earn faucets (check-in, find-a-planet, missions) keep minting only the *closed* point — so they never become a money-printer for bots. The tradeable token enters circulation only through controlled, sybil-resistant channels (see §9), never raw faucets. Blockchain stays invisible for the email-signup web user; it's explicit and first-class for the wallet-carrying Seeker user. Same app, two postures.

**C. The retention engine is a daily reason to open + notifications — with one platform caveat.** Observation missions can't be the daily loop; the sky is cloudy half the time. We need a **daily low-friction earn** (check-in, daily fact, "what's up tonight") and **web push** ("clear sky tonight, Jupiter is high"). Caveat that the original plan missed: **iOS Safari only delivers Web Push to installed PWAs** (home-screen add, iOS 16.4+). So push must ship *with* a PWA-install nudge, and we don't bank retention on push alone — the in-app daily loop carries iPhone users who never install.

**D. Location is the spine — and it's mostly built, so the job is wiring not building.** `observer-location.ts` already does fresh-fix GPS, persistence, and a manual picker exists. The real work is auditing that every feature (finder, missions, ASTRA, push) reads the live location and stops falling back to Tbilisi when a real fix is available.

**E. (New) You can't tune a loop you can't see.** There is no analytics today. A lightweight, self-hosted event layer (open → find-aimed → earn → spend, written to Neon) lands in milestone 1. Every DAU/retention claim in this doc is unfalsifiable without it.

---

## 3. Design / UX / UI upgrades (system level)

The token system (ink `#0A0E1A` / bone `#F4EDE0` / Nebula Teal `#38F0FF` for live / Star Gold `#FFD166` for STARS; Cormorant Garamond display, Geist UI, JetBrains Mono data) is good and stays. Upgrades:

- **Red / Field mode toggle (domain-authentic, cheap).** Astronomers use red light at night to protect dark-adapted vision. One-tap "Field mode" recolors the UI red-on-black (`#1A0000` bg, `#FF3B30`→`#8B0000` ramp, kill all teal/gold glow). CSS-variable theme swap on Tailwind 4 `@theme` — zero packages. Pairs perfectly with the Finder at the eyepiece. Nobody else in consumer astronomy has it.
- **One-glance hierarchy.** Every primary screen answers exactly one question above the fold. Home = "what can I see right now?" Sky = "when is tonight good?" Missions = "what can I earn now?" Kill anything that competes.
- **Motion language.** One easing curve everywhere (`cubic-bezier(0.22,1,0.36,1)`), CSS keyframes only. *Teal pulse* reserved exclusively for live/real-time data; *gold* reserved for STARS events (count-up + single gold spark). Consistency is what reads premium.
- **Skeleton + empty states with character.** Sky fetches skeleton, never spinner-block. Empty states use the editorial Cormorant voice ("No observations yet — the sky's waiting").
- **Tap feedback.** `active:scale-[0.98]` on press, count-up on STARS, a "sealed" beat on mission complete. Mobile-first should *feel* like an app.
- **A single `Card` primitive.** One look (radius, border `rgba(255,255,255,0.08)`, surface `rgba(255,255,255,0.04)`) used everywhere; pages currently drift.

---

## 4. Engine / logic upgrades

- **Unified `getTonightSky(lat, lon, at)` service.** One source of truth returning planet positions + visibility + rise/transit/set, moon phase + illumination, best window, tonight's notable events, and the observability score. **Compose the existing modules** (`sky-score.ts`, `planets.ts`, `sky-chart.ts` projections, `observer-location.ts`) — this is a consolidation/facade, not a rewrite. Home, Sky, Finder, Missions, and ASTRA all read it.
- **Observability score — surface, don't rebuild.** `sky-score.ts` already collapses conditions into one honest number. Expose it as "Tonight: 7/10, good for planets, poor for deep-sky" and use it as the push hook.
- **Location wiring audit.** Confirm every surface consumes `observer-location.ts`; reverse-geocode to a city name (Open-Meteo geocoding, no key) where missing; Tbilisi only as last-resort fallback.
- **Web Push notifications (v1).** Service worker + Web Push, no third-party SDK. Triggers: clear-sky-tonight (from the score), event reminders (Perseids, Geminids, eclipses), streak-about-to-break. **Ship with a PWA-install nudge** for iOS reach.
- **Real-time recompute.** Light client loop (30–60s) updates "current altitude / where to look" so Finder and Home feel live.
- **Analytics events (new).** Minimal event writer → Neon: `open`, `location_set`, `find_aimed`, `stars_earned`, `stars_spent`, `mission_complete`. Powers every later decision.
- **ISS / bright satellite passes (flag, optional).** Naked-eye, predictable, the lowest-friction "find it RIGHT NOW and earn" event. One external pass fetch (not a package, so within the rule) — evaluate in milestone 4+.
- **Voice in the field — be honest about cost.** Field/QVAC Whisper lives in the **Expo runtime, not the web app**; the consumer web cannot reuse it. Web voice = Web Speech API or a Whisper *API* call. Cheap but a *different* build — scoped as polish, not free.

---

## 5. Page-by-page upgrades

### `/` Home — command center
- **Hero = the instant answer.** "Tonight from [city]" + observability score + the single best target now ("Jupiter is high in the SE — find it"). One tap → Finder.
- **STARS balance + streak** pinned top-right, always visible, gold.
- **Three live tiles** below the hero (from the unified service): best window, moon phase, next event countdown.
- Replace generic "How it works" with a **"Find it now"** CTA into the Finder.

### `/find` — NEW marquee page (Compass Finder + AR) — *greenfield*
- **Compass Finder (baseline):** pick a target (or "best tonight") → big rotating arrow + "turn right 30°, look up 42°" + proximity meter that goes gold when aimed. Works on every device.
- **AR overlay (1-day timebox):** `getUserMedia` feed + `DeviceOrientation` labels, explicit iOS permission tap, graceful fallback to Compass. Cut on resistance.
- **Earns STARS** for a held, successful aim ("you found Jupiter, +10") — lowest-friction earn that still requires looking up.

### `/sky` — from data grid to interactive sky
- **Tonight timeline scrubber:** drag across the night; observability curve drawn underneath.
- **Interactive sky chart:** make the existing `sky-chart.ts` projection draggable/zoomable, real-time, zenith-centered. Tap a planet → hands to `/find`.
- **Moon phase as a real illuminated disc**, not a label.
- Keep the 7-day grid but lead with *tonight*.

### `/missions` — fix friction + add the daily loop
- **Daily check-in + streak** at top: open, see tonight, +5 STARS, streak multiplier. The everyday reason to return.
- **Cosmic Daily card:** one fact / "today in space history" + a 1-tap micro-quiz → small STARS. Works when cloudy.
- **Earning ladder, surfaced:** naked-eye → telescope → deep-sky → event. Always show the next cheapest earn.
- **Event missions** wired to the 2026 calendar (Perseids Aug 12, eclipse, Saturn opposition Oct 4, Geminids Dec 13). Limited-time, higher STARS, push-notified.
- **Photo-quality bonus** (ties to image-provenance work): better captures earn more → nudges real telescope use → Astroman.

### `/marketplace` — make STARS feel spendable (build UX on existing economics)
- **Flexible STARS slider** on every product using `stars-economy.ts` (part STARS / part GEL at 4.69 STARS/GEL, snapped to the burn increment, server-revalidated). A token you can apply to *anything* beats three fixed coupons.
- **"Earn this" progress bar** on products: "You're 320 STARS from a free moon lamp." Turns the shop into a goal generator.
- **Digital goods aisle (zero-COGS sinks):** name-a-star certificate, custom star map, profile cosmetics, premium ASTRA packs, NFT frames. Pure margin, protects Astroman inventory liability.
- **Wishlist** → feeds push ("you've earned enough for your wishlist item").

### `/profile` — identity worth showing
- **Rank as a visual** (Stargazer→Observer→Pathfinder→Celestial) with progress, not text.
- **Collection showcase** of observation NFTs as generative star-map cards (§6).
- **Streak calendar** (GitHub-contributions style, teal/gold).
- **Shareable profile card** (generated image) — "Rezi · Pathfinder · 14 observations · Tbilisi." Viral + closed-loop social proof.

### `/nfts` — make the reward tangible
- **Generative observation art:** each observation renders a procedural star map of *exactly that patch of sky at that moment* (reuse `star-catalog.ts`), object circled, conditions etched. A thing people want, and your share asset. *Note: delight/virality layer, not core loop — sequenced after the loop closes.*
- **Filter / sort**, share each card, Explorer link kept but secondary.

### `/leaderboard` — it's already DB-backed; finish it
- Add **friends leaderboard** (via referrals) and "you" pinned. The Neon query + weekly/monthly/all-time already exist — this is UI + the friends join, not a rebuild.

### `/feed` — community proof-of-observation
- "Someone observed Saturn from Kazbegi tonight" with the generative card. Like / "I saw it too." Lightweight social layer; makes a lonely hobby feel shared.

### `/darksky` — gamified contribution
- "Be the first to map [region]" bounties, Bortle-from-photo flow, "your readings" badge on profile. A reason to go somewhere dark (and buy a scope).

### Onboarding (upgrade `/club` first-run)
- **Sub-60-second aha:** ask location → "right now, [planet] is above you" → one tap into the Finder → point phone → "you found it, +10 STARS." Wallet created silently by Privy, never mentioned.

---

## 6. Growth rooms (outside the box)

- **Generative observation art** — most under-exploited asset; catalog already exists.
- **Voice-first ASTRA** — Web Speech / Whisper-API (not the QVAC stack); hands-free in the dark.
- **Red/Field mode** — domain-authentic, cheap, nobody else has it.
- **Telescope companion mode** — pick your registered scope; app says what's worth pointing at tonight for *that aperture*. Gear → app → Astroman upsell.
- **Sky journal** — beautiful exportable logbook; serious astronomers live in logbooks.
- **Young Astronomer / family mode** — the age-gated kid experience; underserved segment + gift funnel.
- **Referrals** — invite a friend, both earn STARS; powers friends leaderboard + acquisition.
- **ISS pass alerts** — most reliable "go outside and find it now" earn.

---

## 7. The work plan — milestones, not calendar days

Sequenced by dependency and impact. **These are milestones, not 24-hour days** — for a solo builder each is realistically 1–3 sessions, and AR/art/voice are the soft ones. Each becomes a self-contained Claude Code prompt (read-first, summarize, `npm run build`, no commit without review).

**Hard cut line:** if you ship only M1–M3, the core loop (find→earn→spend, with location + a daily reason to open) is already live and the product is materially better. Everything after M3 is amplification.

| # | Milestone | Shippable outcome | Net-new vs. wire-up |
|---|-----------|-------------------|---------------------|
| M1 | **Foundation + measurement** | Location wiring audit (no silent Tbilisi); `getTonightSky()` facade over existing modules; observability score surfaced; analytics event layer → Neon | Mostly **wire-up** (score/location exist) + small new analytics |
| M2 | **Home rebuild** | Command-center home: instant-answer hero, STARS+streak pinned, three live tiles, skeletons | Build (consumes M1) |
| M3 | **Compass Finder** | `/find`: target picker, rotating arrow, "look up X°", proximity meter, +STARS on aim | **Greenfield** |
| M4 | **AR overlay (1-day timebox)** | Camera + device-orientation labels with Compass fallback + iOS permission UX; **cut on resistance** | Greenfield, optional |
| M5 | **Daily loop** | Check-in + streak + multiplier, Cosmic Daily card + micro-quiz, earning ladder surfaced | Build |
| M6 | **Notifications + PWA** | Service worker + Web Push (clear-sky, events, streak nudge) **+ PWA-install nudge for iOS** | **Greenfield** |
| M7 | **STARS spend UX (devnet)** | Flexible redemption slider on `stars-economy.ts`; digital-goods aisle; "earn this" bars; wishlist. **No mainnet migration.** | **Wire-up** (economics exist) + UX build |
| M8 | **Generative art + gallery** | Procedural star-map cards per observation; `/nfts` leads with art; shareable profile/observation cards | Build (delight layer) |
| M9 | **Social + leaderboard finish** | Friends leaderboard (Neon query already there); `/feed` community cards with like / "saw it too"; referral earn | **Wire-up** + build |
| M10 | **Field mode + voice + polish** | Red/Field theme (CSS var swap); ASTRA voice (Web Speech/Whisper-API); sub-60s onboarding; 60fps + QA pass | Build (polish) |
| M11 | **Tradeable token (`$ASTRO`) — mainnet** | New SPL token live on mainnet; sybil-safe distribution channels; in-app utility (premium/governance/staking); treasury-gated STARS→$ASTRO conversion. **Gated on legal review + launch-mechanism decision.** See §9. | New workstream, post-loop |
| M12 | **Seeker / Solana dApp Store launch** | TWA wrap of the PWA → signed APK; manifest + Lighthouse ≥80 + Digital Asset Links; Publisher/App/Release NFTs; submit. See §10. | Packaging, post-loop |

### Milestone detail

**M1 — Foundation + measurement.** Audit every surface for `observer-location.ts` usage; kill silent Tbilisi fallbacks; reverse-geocode city names where missing. Build `getTonightSky()` as a **facade composing the existing** `sky-score.ts` / `planets.ts` / `sky-chart.ts` / `observer-location.ts` — do not re-derive the score. Add the analytics event writer to Neon. *Why first: every feature is wrong without correct location, one sky source of truth, and a way to measure the loop.*

**M2 — Home.** Rebuild `/` around the instant answer: city + observability score + best target now + "Find it" CTA. Pin STARS + streak (gold). Three live tiles. Skeletons.

**M3 — Compass Finder.** New `/find`. Pick target or "best tonight" → rotating SVG arrow driven by device heading + altitude readout + proximity meter (gold when aimed). +10 STARS on a held aim. All devices. *This alone satisfies "find a planet very easily."*

**M4 — AR overlay (timeboxed).** `getUserMedia` + `DeviceOrientation` labels positioned from the service; explicit iOS permission tap; fallback to Compass. **One day; if orientation/permission fights you, cut it — M3 already delivers the value.**

**M5 — Daily loop.** Streak + check-in (+5, multiplier), Cosmic Daily fact + 1-tap micro-quiz (cloudy-night earn), visible earning ladder. Lower daily-earn friction.

**M6 — Notifications + PWA.** Service worker + Web Push v1 (clear-sky from the score, 2026 events, streak nudge). Ship the PWA-install nudge so iPhone users can actually receive push. *The retention engine — with the iOS asterisk handled.*

**M7 — STARS spend UX (devnet).** Build redemption UX on the **existing** `stars-economy.ts`: flexible slider (part STARS / part GEL at 4.69/GEL, snapped + server-revalidated), digital-goods aisle, "earn this" bars, wishlist. Gold count-up everywhere. **Token remains devnet; mainnet is a later retention-gated decision, not built here.**

**M8 — Generative art + gallery.** Procedural star-map renderer (reuse catalog) → unique card per observation. `/nfts` leads with art. Shareable profile/observation images. *Delight + virality; cut candidate if time slips.*

**M9 — Social + leaderboard finish.** Friends leaderboard on the **existing** Neon query + period support; `/feed` community cards with like / "saw it too"; referral earn.

**M10 — Field mode + voice + polish.** Red/Field theme (CSS var swap). ASTRA voice input (Web Speech / Whisper-API — *not* the QVAC stack). Sub-60s onboarding aha. Perf pass (60fps star field, lazy loads), QA across the loop.

**M11 — Tradeable token (`$ASTRO`), mainnet.** New workstream, sequenced *after* the loop is proven. Implements the §9 architecture: the mainnet SPL token, sybil-safe distribution, real in-app utility, and the treasury-gated STARS→$ASTRO conversion window. **Hard-gated on a legal/securities review and the launch-mechanism decision — neither is a code task.** STARS (M7) is untouched and stays closed-loop.

**M12 — Seeker / Solana dApp Store.** Packaging milestone, sequenced after M1–M3 + M11. Per §10: TWA wrap, manifest/Lighthouse/Digital Asset Links, on-chain Publisher/App/Release NFTs, submit via the publisher portal. Verify Privy login on-device in the TWA early.

---

## 8. What I would NOT do (honest)

- **Make STARS itself tradeable, or merge the two tokens.** The split is load-bearing: it keeps the loyalty peg stable and the faucets sybil-safe. A single floating token breaks both. STARS stays closed; `$ASTRO` is its own asset.
- **Faucet-mint the tradeable token.** Never let check-in / find-a-planet / daily quiz mint `$ASTRO` directly — that's an open sybil money-printer. It enters circulation only via buys, the treasury-gated conversion window, and verified high-value actions (§9).
- **Launch `$ASTRO` before the legal review and a real sink/utility exist.** A token with weak utility is a coin looking for a securities lawsuit. M11 is gated, not rushed.
- **Rebuild what exists.** `sky-score.ts`, `sky-chart.ts`, `observer-location.ts`, the DB-backed leaderboard, and `stars-economy.ts` are already on disk. Wire and upgrade; don't regenerate.
- **Full WebXR / heavy 3D AR.** Diminishing returns vs. Compass+overlay; would blow the schedule. AR is a 1-day timebox, period.
- **A second native consumer codebase.** The Seeker launch is the existing PWA wrapped as a TWA (§10) — not a rewrite. `apps/field` stays its own separate thing; don't fold it in.
- **Bank retention on push alone.** iOS gates push behind PWA install; the in-app daily loop must carry users who never install.
- **More earn mechanics before the spend side is rich.** A token with weak sinks feels worthless however easy it is to earn. M7 (spend) matters more than a sixth way to earn.
- **Over-invest in weather-gated features.** The daily loop and notifications carry cloudy nights; observation missions can't be the only retention path.

---

## 9. Tradeable token architecture (`$ASTRO` — two-asset model)

The product runs **two distinct assets**. Conflating them is the classic mistake; the whole design is built to keep them apart.

| | **STARS** (existing) | **`$ASTRO`** (new, name TBD) |
|---|---|---|
| Type | Closed-loop loyalty point | Tradeable utility token |
| Network | Devnet, invisible infra | **Mainnet**, DEX-listed |
| Value | Pegged: 100 STARS = 1 GEL | Floats with market |
| How earned | All faucets (check-in, find, missions, observations) | **Never from raw faucets** — see channels below |
| Redeems for | Astroman discounts, digital goods | In-app utility; tradeable on DEX |
| Sybil risk | Low (closed, server-capped) | Contained by distribution design |
| Code today | `stars-economy.ts`, `stars-burn-client.ts` | Greenfield (M11) |

**How `$ASTRO` enters circulation (sybil-safe by construction):**
1. **Buy** on a DEX (the open market).
2. **Treasury-gated STARS → `$ASTRO` conversion window** — rate-limited per verified account, daily/lifetime caps, treasury sets the rate. This is the only bridge from the loyalty economy to the tradeable one, and it's a throttle, not a faucet.
3. **Verified high-value actions only** — real telescope observations that pass `/api/observe/verify`, dark-sky Bortle contributions. High-friction, identity-bound, *not* daily check-ins or quizzes.

**What `$ASTRO` is FOR (utility = real demand + better legal posture):** premium ASTRA access, governance (vote on event missions / which Astroman products to stock / dark-sky bounties), staking for boosted STARS earn or rank, access to limited NFT/observation drops, optional marketplace settlement. A token with genuine sinks is demand-driven, not pure speculation — which is also the strongest securities-posture argument.

**Sybil resistance is now mission-critical (it carries the token's integrity):** Privy account + device binding + the existing observation anti-fraud stack (EXIF, hash dedup, reverse-image, visibility check, rate limits) gate every `$ASTRO`-earning path. Per-wallet caps and conversion throttles everywhere. The image-provenance roadmap in `docs/observation-verification.md` stops being "nice to have" and becomes the thing protecting token value.

**Open pre-launch gates (decide with a crypto/legal advisor — none are code):**
- **Launch mechanism** — seed-own-LP vs. fair-launch/bonding-curve vs. presale-to-community. (Brand note: fair-launch/memecoin optics clash with the patient/precise/earned positioning; seed-LP or community presale fit better.)
- **Securities/regulatory review** — Georgia jurisdiction + global users; Howey exposure. Gate before any mainnet listing.
- **Token standard** — plain SPL vs. token-2022 (transfer-fee / future controls). Default plain SPL unless a transfer fee is wanted.
- **Supply + emission schedule**, treasury & liquidity ops, market-making, and the real-SOL gasless budget at scale.

---

## 10. Seeker / Solana dApp Store launch

The consumer web app (Vercel PWA) ships to the dApp Store as a **TWA** — not a native rewrite. Sequenced after M1–M3 + M11 so the listing is worth installing.

**Path:**
1. **Wrap as TWA** (Bubblewrap) → signed release APK pointing at the deployed PWA. Must be a TWA (Chrome-backed), **not a raw WebView wrapper** — Google blocks Privy's OAuth login inside plain WebViews ("disallowed user-agent"); TWA uses Chrome Custom Tabs, so Privy email/Google/SMS work.
2. **PWA requirements:** hosted `manifest.json`, Lighthouse ≥ 80, `assetlinks.json` Digital Asset Links to verify domain ownership, icon + screenshots + metadata.
3. **On-chain publishing:** mint a **Publisher NFT** (once — your dev identity), an **App NFT**, and a **Release NFT** per version. ~0.2 SOL + ArDrive storage. Via [publish.solanamobile.com](https://publish.solanamobile.com) or the `dapp-store` CLI for CI.
4. **Policy attestations** on submit; Solana Mobile reviews the Release NFT.

**Notes:**
- **Privy embedded wallets are the right fit** — Seeker users have wallets, but you don't *need* Mobile Wallet Adapter. MWA becomes an optional "connect external wallet" path for the crypto-native crowd. Low lift.
- **`apps/field` stays separate.** The dApp Store listing is the TWA-wrapped consumer web app, not the Expo/QVAC Field app.
- **Verify on-device early:** Privy login inside the TWA, wallet creation, and a full find→earn→spend pass on a real Seeker (or Android) before submitting.
- **The Seeker audience reframes the token:** 100% wallet-carrying and crypto-native — exactly where a visible, tradeable `$ASTRO` belongs. The two-token split lets the same app stay invisible-crypto for the web mass market and explicit-crypto for Seeker.

*Sources: [Publishing a PWA — Solana Mobile Docs](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa), [dApp Store publishing overview](https://docs.solanamobile.com/dapp-publishing/overview), [Mobile Wallet Adapter](https://docs.solanamobile.com/developers/mobile-wallet-adapter).*

---

*Strategy doc — feeds individual Claude Code build prompts. Reconciled against the live codebase; milestones (not fixed days) ordered by dependency and impact. Token and Seeker tracks (M11–M12) sequenced after the core loop is proven. Adjust boundaries as AR, art, and the token's legal gates resolve.*
