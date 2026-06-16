# Stellar — Fix Prompts (`/missions` + `/sky`)

Derived from `UX_UI_AUDIT_STELLAR.md`. Every prompt is scoped for a **minimal diff** — preserve existing design, structure, components, and tokens. No new npm packages. No refactors beyond what each prompt names. After each: `npx tsc --noEmit && npm run build` must pass.

How to use: paste one prompt at a time into `/executor` (or run directly). They are ordered; P0 first. Each is independent unless noted.

---

## P0 — Fix immediately (surgical, low-risk)

### P0-1 · Kill the fake "Next best time" ring on `/sky`
**Why:** `pct={0.82}` is hardcoded decorative data — violates the brand's "numbers earn their position" rule.
**File:** `src/app/sky/page.tsx` (~line 589, inside `skx__nbt`).
**Prompt:**
> In `src/app/sky/page.tsx`, the `RingGauge` in the "Next best time" card uses a hardcoded `pct={0.82}`. Replace it with a real value: the fraction of tonight's dark window still ahead of `skyTime`. Add a small `useMemo` near the other window vars (`windowOpen`/`windowClose` already exist as ISO strings): compute `total = close - open`; if `now < open` → `1`; if `now > close` → `0`; else `(close - now) / total`. Clamp 0–1. Pass that into `RingGauge pct={...}`. Do not change `RingGauge`'s implementation or styles. If `windowOpen`/`windowClose` are null, fall back to `pct={0}`.
**Accept:** Ring reflects real remaining dark time; no hardcoded number remains.

---

### P0-2 · Brand typography on `/sky` heading + numerals
**Why:** `.skx__title` is `var(--sans)` weight 800; big numerals are weight 800. Hard rule: headings = Orbitron Medium 500, data = JetBrains Mono.
**File:** `src/app/sky/sky.css` (`.skx__title` ~4408, `.skx__sum-count` ~4470, `.skx__nbt-window` already `var(--font-display)`).
**Prompt:**
> In `src/app/sky/sky.css`: change `.skx__title` `font-family` from `var(--sans)` to `var(--font-display, var(--sans))` and `font-weight: 800` → `500`. Change `.skx__sum-count` `font-weight: 800` → `500` (keep `var(--font-display)`). Leave sizes, colors, and line-heights unchanged. Do not touch any other selector.
**Accept:** "Sky Tonight" renders in Orbitron 500; the visible-count numeral matches the type system; layout unchanged.

---

### P0-3 · Remove emoji/text glyphs from QuizRow → SVG
**Why:** `✓` and `✦` text glyphs violate "SVG icons only" and render inconsistently across platforms.
**File:** `src/app/missions/page.tsx` (`QuizRow`, ~lines 1352–1371).
**Prompt:**
> In `src/app/missions/page.tsx` `QuizRow`: replace the `✓` text node (the `mis-quiz-row-done` span) with a lucide `<Check size={12} strokeWidth={2.5} />` (import `Check` from `lucide-react`). Replace the `+{reward} ✦` with `+{reward}` followed by a lucide `<Star size={11} strokeWidth={2} fill="currentColor" />`. Keep the existing class names and colors. Match the inline-flex/gap pattern already used elsewhere (e.g. `mis-nearby-stars`) so spacing stays tight. Do not change CSS files.
**Accept:** No `✓`/`✦` glyphs in the rendered quiz rows; checkmark and star are SVG; spacing visually unchanged.

---

### P0-4 · Body-text contrast on `/missions`
**Why:** `--mis-t3 #585B66` on the near-black card surface fails 4.5:1 where it's used for readable text (statuses, metas, subs).
**File:** `src/styles/stellar-tokens.css` (`.missions-page` token block ~line 4399).
**Prompt:**
> In `src/styles/stellar-tokens.css`, inside `.missions-page`, change `--mis-t3` from `#585B66` to `#7A7E8A`. This is a one-line token bump to raise contrast on all dimmest text while preserving the three-tier hierarchy (`--mis-t1`/`--mis-t2`/`--mis-t3`). Do not change `--mis-t1` or `--mis-t2`. Do not touch font sizes here.
**Accept:** Dimmest text is legible; hierarchy preserved; single-line diff.

---

### P0-5 · Raise sub-12px microcopy (worst offenders only)
**Why:** Brand bans microcopy below 12px; eyebrows at 8.5–9.5px are the worst.
**File:** `src/styles/stellar-tokens.css` (missions block) and `src/app/sky/sky.css`.
**Prompt:**
> Raise only the smallest text to 11px minimum, leaving layout intact. In `src/styles/stellar-tokens.css` change these `font-size` values to `11px`: `.mis-summary-eyebrow` (9.5), `.mis-quest-meta-val i` (8.5), `.mis-quest-vis i` (8.5), `.mis-card-eyebrow` (9.5), `.mis-rare-tag` (8.5), `.mis-rare-date-month` (8.5), `.mis-quiz-row-meta` (9.5). Keep letter-spacing/uppercase. If any line wraps awkwardly after the bump, prefer reducing letter-spacing slightly over reverting. Do NOT change numeric data sizes (mono numerals) — only labels/eyebrows.
**Accept:** No label text below 11px on `/missions`; no broken wrapping.

---

### P0-6 · Tap targets: info dot + carousel dots
**Why:** `mis-info-dot` (18px), tip dots (7px), `skx__tips-dot` are below 44px.
**Files:** `src/styles/stellar-tokens.css`, `src/app/sky/sky.css`.
**Prompt:**
> Enlarge the *hit area* of tiny controls without enlarging the visible dot. For `.mis-tip-dot`, `.mis-info-dot`, and `.skx__tips-dot`: add `position: relative;` and a `::before` pseudo with `content:''; position:absolute; inset:-14px;` so the touch/click area is ≥44px while the visible dot stays the same size. Keep all visible dimensions and colors unchanged.
**Accept:** Dots look identical but are tappable at 44px; verify with devtools.

---

## P1 — Fix before beta (contained, higher-impact)

### P1-1 · Anonymous-first on `/missions` (gate writes, not views) — BIGGER CHANGE, do alone
**Why:** The full-page auth wall is the #1 conversion cap. This is the largest change in the set; keep it isolated.
**File:** `src/app/missions/page.tsx` (auth gate ~lines 441–463; `startMission` ~421).
**Prompt:**
> In `src/app/missions/page.tsx`, remove the early `if (!authenticated)` full-page return so the page renders for everyone (it already derives everything from location + local state). Keep `AuthModal` mounted. Introduce a single guard: a `requireAuth(action: () => void)` helper that, if `!authenticated`, calls `setAuthOpen(true)` and returns; otherwise runs `action`. Wrap the *write/earn* entry points with it — `startMission` (the Observe routes) and the `SummaryBar` "Continue" CTA. Leave read-only interactions (filters, tips, opening event sheets, quizzes preview) ungated. Do not change any other component's props or the CSS. Keep the existing `mis-auth-card` markup but render it only as the fallback inside the auth modal flow (or delete it if unused after this change — confirm before deleting).
**Accept:** Logged-out users see the full missions page; tapping Observe/Continue opens the auth modal; logged-in flow unchanged; `tsc`+build pass.
**Note:** Do the same for `/sky` only after confirming this one works (sky's data is also auth-independent; the earn path is `handleLock` → guard that instead of the page).

---

### P1-2 · Promote one quiz above the fold on `/missions`
**Why:** Quizzes (your most Duolingo-like, no-gear, any-time feature) are buried in the right rail, which stacks last on mobile.
**File:** `src/app/missions/page.tsx`.
**Prompt:**
> Add a single "Daily quiz" entry point high in the main column of `/missions`, directly under `MainQuestCard`. Reuse the existing `QuizRow` component and `QUIZ_UI` data — render just ONE quiz (pick the first uncompleted from `QUIZZES`, else the first). Wrap it in the existing `mis-block` / `mis-block-head` pattern with title `t('sections.quizzes')` and a "2 min" meta. Keep the full quiz list in the right rail as-is. No new CSS classes — reuse `mis-card`/`mis-quiz-row`. Tapping it opens `setActiveQuiz` like the rail does.
**Accept:** One quiz visible in the first ~1.5 viewports on mobile; rail unchanged; opens the quiz modal.

---

### P1-3 · Mission list: show Stars reward on all phone widths
**Why:** `.mis-row-stars` is `display:none` below 480px — the reward (the whole point) is invisible on common phones.
**File:** `src/styles/stellar-tokens.css` (`.mis-row` grid ~4960; `.mis-row-stars` ~5017; the `@media (min-width:480px)` block ~5048).
**Prompt:**
> Make the Stars reward visible at all widths in `.mis-row`. Move the `.mis-row-stars` display rules (inline-flex, mono, terracotta) out of the `@media (min-width:480px)` block into the base rule, and add `stars` to the base `grid-template-areas`/`grid-template-columns` so it sits between `stats` and `btn` at every width. On the narrowest widths, hide the secondary `Eye %` stat instead if space is tight. Keep the 480px enlargement of the art tile. Verify the 4–5 column grid still aligns.
**Accept:** "+50" Stars chip shows on a 360px viewport; no overflow.

---

### P1-4 · Mission rows: no dead ends for not-yet-visible targets
**Why:** A not-visible row is inert; tapping does nothing and the button is a disabled "Coming later."
**File:** `src/app/missions/page.tsx` (`MissionRow` ~1006–1052).
**Prompt:**
> In `MissionRow`, when `!above`, make the row still useful instead of inert: keep it non-routing, but turn the disabled "Coming later" pill into a button that opens the `DifficultyExplainer`/detail (wire the currently-unused `kind:'mission'` branch — pass an `onExplain(id)` prop from the page that sets `activeExplainer` with `kind:'mission'`). Set `aria-disabled` off (it's now interactive) and ensure the row's own `tabIndex` doesn't create a second focus stop. Visual treatment of the pill can stay muted. Logged-in/visible behavior unchanged.
**Accept:** Tapping a "Coming later" target opens an explainer (when it's up, why it's not now); no inert taps; keyboard reaches one control per row.

---

### P1-5 · `/sky` cold start: don't stack the location modal and the tour
**Why:** `SkyLocationModal` (first-entry) and `FinderTour` can both appear on load.
**File:** `src/app/sky/page.tsx` (`showLocModal` effect ~123; `showTour` effect ~145).
**Prompt:**
> In `src/app/sky/page.tsx`, ensure only one onboarding surface shows at a time on first load. Gate the `FinderTour` so it only appears once the location modal is dismissed: in the tour effect, also require that `LOC_PROMPT_KEY` is already set in sessionStorage (i.e., the location step is done) before `setShowTour(true)`; and when `closeLocModal` runs, if the tour hasn't been seen, trigger it then. Keep both components and their localStorage/sessionStorage keys. Don't change the modal/tour internals.
**Accept:** On a fresh session, location modal first; tour only after it closes; never both at once.

---

### P1-6 · Plain-language default voice on `/sky`
**Why:** Jargon (azimuth/altitude/magnitude) is exposed to a zero-knowledge audience.
**File:** `src/app/sky/page.tsx` (`lookPhrase` ~714 already plain; `VisCard` pos line ~804).
**Prompt:**
> In `VisCard`, the position line shows `{obj.compassDirection} · {Math.round(obj.altitude)}°`. Keep the degree for precision but lead with the plain phrase you already compute elsewhere — reuse the `lookPhrase(o, tDir)` logic (or extract a tiny `wherePlain(o)` returning "High in the south", etc.) as the primary text, with the `dir · NN°` as a secondary, dimmer span. Do not remove the data; just demote it. No CSS changes beyond an optional `opacity` on the existing `skx__vis-pos`.
**Accept:** Each visible-now card reads plainly first, with the precise bearing secondary.

---

### P1-7 · Empty / bad-night state offers a next action
**Why:** "Nothing above the horizon right now" and cloudy/daytime states are dead ends.
**Files:** `src/app/sky/page.tsx` (empty `li`s ~604, 638), `src/app/missions/page.tsx` (status logic ~410).
**Prompt:**
> Give empty/bad-night states a path forward, reusing existing components. On `/sky`, when `bestTargets.length === 0`, replace the bare "Nothing above the horizon" copy with a one-line suggestion + a link to the next dark window time (you already have `windowOpen`) and a link to `/missions` quizzes. On `/missions`, when `liveStatus` is `daytime` or `cloudy`, surface a small note in the existing status/summary area pointing to the promoted quiz (P1-2) as "something to do now." No new layout sections; reuse existing text/link styles.
**Accept:** No dead-end empty states; each offers quiz/plan/next-window.

---

## P2 — Nice to have later (do not block beta)

### P2-1 · Button-in-button on event rows (a11y)
**File:** `src/app/missions/page.tsx` (`EventRow` ~1280, nested `role="button"` "i" inside a `<button>`).
**Prompt:**
> Refactor `EventRow` so the interactive "i" explainer is not nested inside the outer `<button>`. Change the outer element from `<button>` to a `<div role="button" tabIndex={0}>` with the same click/keydown handlers (mirror the `mis-row` pattern already in this file), so the inner "i" can remain a real button sibling. Keep all classes and visuals identical.
**Accept:** No interactive element nested in another; keyboard + SR reach both controls; visuals unchanged.

---

### P2-2 · Reduce competing CTAs in the summary bar
**File:** `src/app/missions/page.tsx` (`SummaryBar` "Continue" vs `MainQuestCard` "Observe").
**Prompt:**
> The summary-bar "Continue" and the main-quest "Observe" usually point to the same target. Demote "Continue" to a secondary/ghost style (reuse a quieter variant — e.g. transparent bg + border like `mis-chip`) so the main-quest CTA is the single obvious primary, OR hide "Continue" when the quest card is in view. Keep the disabled "all done" state. Minimal CSS only.
**Accept:** One dominant primary action per viewport.

---

### P2-3 · Reuse a single ring primitive (cleanup)
**Files:** `mis-ring` (missions), `skx__qring` + `skx__ring` (sky).
**Prompt:**
> Low priority cleanup: the completion ring, quality ring, and gauge are three near-identical SVG ring components. Extract one shared `<ProgressRing pct size stroke color>` component into `src/components/shared/` and have all three call sites use it. Preserve exact visual output (radii/strokes) per call site via props. Pure refactor — no visual change.
**Accept:** One ring component; pixel-identical output; `tsc`+build pass.

---

### P2-4 · Surface earned NFTs as a badge wall (gamification seed)
**Note:** Larger; design with `/planner` first. Pull existing Discovery Attestation cNFTs (DAS API, `/api/nfts`) onto `/missions` as a "Collection" strip with locked silhouettes for unearned targets. Reuse `SkyOrb` art for locked states. This is the highest-impact retention add but is a feature, not a fix — schedule separately.

---

## Suggested batching
- **Batch A (one PR):** P0-1, P0-2, P0-3, P0-4, P0-5, P0-6 — all tiny, all low-risk, ship together.
- **Batch B (own PR):** P1-1 (anonymous-first) — isolate it.
- **Batch C (one PR):** P1-2, P1-3, P1-4, P1-5, P1-6, P1-7 — consumer-readiness pass.
- **Later:** P2-1, P2-2, P2-3, then P2-4 as a planned feature.

Each batch: self-review the diff, `npx tsc --noEmit && npm run build`, present to Rezi before commit.
