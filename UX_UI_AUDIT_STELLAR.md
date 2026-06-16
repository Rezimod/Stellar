# UX/UI Audit — Stellar `/missions` & `/sky`

**Auditor framing:** Senior product designer / UX researcher / UI engineer.
**Lens:** Stellar wants to be the *Duolingo + Strava of astronomy* for a **mainstream, zero-knowledge** audience.
**Method:** Grounded in the live implementation — `src/app/missions/page.tsx`, `src/app/sky/page.tsx`, `src/styles/stellar-tokens.css` (missions), `src/app/sky/sky.css`. Findings reference real code, not guesses.
**Verdict in one line:** Both pages are *unusually well-engineered for an astronomy tool* (real data, responsive grids, focus states, reduced-motion handling) — and *badly mis-tuned for a mainstream consumer product*. They are built for an Astroman telescope owner who already knows what a Bortle scale is. A Duolingo user would bounce at the sign-in wall, and if they got past it, drown in eleven competing sections.

---

## 1. Executive Summary

### The single biggest problem: the auth wall
Both pages return a sign-in gate before rendering anything (`if (!authenticated)` on missions; `if (ready && !authenticated)` on sky). For an existing Astroman buyer this is fine. For the mainstream "is it clear tonight?" audience you're targeting, it is **fatal**: you are asking a stranger to create an account before showing them a single star. Duolingo, Star Walk, Sky Guide, and Merlin Bird ID all give value *first* and gate *later*. This alone caps top-of-funnel conversion at a fraction of what it should be.

### The second problem: cognitive overload on `/missions`
The missions page renders, in order: status bar → 4-zone progress summary → main quest card → nearby rail → filterable missions list (6 filters) → right rail (streak + global mission + tip carousel + weather + quizzes) → rare events → upcoming events → telescope guide → observer assist. That is **~11 distinct information blocks and at least 5 competing number systems** (completion %, Stars earned / night goal, 5-star night rating, per-target visibility stars, next-reward %). A first-timer cannot answer "what do I do tonight?" in five seconds because the answer is buried under a dashboard built for a power user.

### The third problem: no real retention loop
There are points (Stars), a streak, and a community goal — but **no visible levels, no XP curve, no badges, no leaderboard on the page, no streak-freeze, no notification hook, no "come back tomorrow" reason**. Strava's and Duolingo's entire engine is the *visible* progression ladder + loss aversion + social proof. Stellar has the raw materials (Stars, streak) but doesn't assemble them into a loop a casual user can feel.

### What's genuinely good
- **Sky's summary strip** (Visible / Moon / Sky quality / Sunset) is an excellent "verdict-first" glance — exactly the right instinct.
- Real measured data everywhere (altitude, twilight windows, cloud cover, ISS TLE passes) — credible, on-brand, anti-hype.
- Solid responsive engineering: scroll-snap rails, `prefers-reduced-motion`, `focus-visible`, `min-height: 44px` on key CTAs, safe-area insets on the FAB.
- No emoji-as-icons (mostly), consistent token-driven color, lucide line icons.

### Headline scores
| | `/missions` | `/sky` |
|---|---|---|
| **Overall /100** | **58** | **62** |

Both are "good internal tool, not yet a consumer product." Detail in §11.

---

## 2. Top 25 UX Issues

> Severity: 🔴 critical · 🟠 high · 🟡 medium

1. 🔴 **Auth wall before any value** (both). `missions/page.tsx:442`, `sky/page.tsx:432`. No anonymous preview. Kills mainstream acquisition.
2. 🔴 **`/missions` cognitive overload** — 11 sections, 5 number systems. No clear "do this one thing now."
3. 🔴 **No persistent progression a casual user can feel** — Stars exist but no level/XP/badge ladder is shown on either page.
4. 🟠 **Two overlays can fire at once on `/sky`** — first-entry `SkyLocationModal` (`showLocModal`) and the `FinderTour` both trigger on load. Stacked modals on a cold start.
5. 🟠 **Dead-end mission rows.** A not-yet-visible target's row is non-interactive and shows a disabled "Coming later" (`MissionRow`, `missions/page.tsx:1043`). The user taps and nothing happens — no "remind me," no "why," no detail.
6. 🟠 **CTA proliferation on `/missions`.** "Continue" (summary bar) + "Observe" (main quest) + per-row "Observe" all compete, and "Continue" and the quest CTA often point to the *same* target.
7. 🟠 **Jargon for a zero-knowledge audience** (`/sky`): Bortle, azimuth, astronomical dusk, magnitude, "fists above horizon," culminate. Some plain-language exists but the scaffolding leaks.
8. 🟠 **Compass/AR is mobile-sensor-only.** Desktop users get a "View all" that opens an AR finder that can't calibrate; "Calibrate" is meaningless without device orientation.
9. 🟠 **Quizzes — your most Duolingo-like feature — are buried** in the right rail (`/missions`), which on mobile stacks *below* the entire main column, rare events, and events. The casual-friendliest content is the least discoverable.
10. 🟠 **Reward semantics are unexplained.** "+50 ✦", "Next reward 10%", "Night goal," "82% ring" — a newcomer has no idea what a Star is worth or what the % coupon redeems against.
11. 🟡 **Location prompt timing.** Missions calls `ensureLocation()` on mount; Sky shows a location modal. Two different location UX patterns across two sibling pages = inconsistent mental model.
12. 🟡 **"Visible now" double-counts attention.** `/sky` shows the visible count in the summary strip lead cell, then again as a section header "Visible now (N)," then again as a rail. Three representations of one fact.
13. 🟡 **Tip carousels on both pages** auto-rotate (`TipsCard` 7s; missions tip dots manual). Auto-rotating content the user didn't trigger is a known readability/accessibility friction.
14. 🟡 **No empty-state guidance with a path forward.** Sky's "Nothing above the horizon right now" (`sky/page.tsx:604,638`) is honest but offers no next action (e.g., "best window opens 21:14 — set a reminder").
15. 🟡 **Error state is bare** (`/sky` `sky-v3__error` is text + retry). No illustration, no reassurance, no offline framing despite the app's offline-mode story.
16. 🟡 **Status bar on `/missions` is mono 10.5px** — near-microcopy, and on `<380px` the meta (time/date/city) is hidden entirely, so the context disappears on the smallest phones.
17. 🟡 **The "i" info dot** on event rows is an 18×18px tap target (`mis-info-dot`) — below the 44px minimum and nested inside another button (button-in-button), an a11y/keyboard hazard.
18. 🟡 **Main quest "best viewing window" can read "—"** when transit data is missing, with no explanation. A dash is not an answer for a beginner.
19. 🟡 **No onboarding for what Stellar *is*.** Both pages assume you know this is an observation-reward app. There's no one-line "what am I looking at" for a referral click-through.
20. 🟡 **Global community mission** shows progress but no way to see who, no social identity, no "join 1,240 observers" tap-through. Social proof shown but inert.
21. 🟡 **Sky's "Next best time" ring is a fake gauge** (`pct={0.82}` hardcoded, `sky/page.tsx:589`). Decorative data on a brand that explicitly bans "decorative stats." Erodes trust if noticed.
22. 🟡 **Filter chips reset on each tap** (`setShowAllMissions(false)`) — switching filters silently collapses the list back to 5, which feels like the list "shrank."
23. 🟡 **No "why this mission" / difficulty explainer is discoverable from the deck.** `DifficultyExplainer` exists but is only wired to event rows, not mission rows (the `kind: 'mission'` branch is never triggered from the list).
24. 🟡 **Time-to-value on `/sky` is gated on GPS + finder fetch + (often) a tour + a modal.** That's up to 4 interactions before the map is usable.
25. 🟡 **Inconsistent "View all" destinations.** On `/missions`, "View all" under Nearby routes to `/sky`; the ISS card also routes to `/sky`; but `/sky` itself has no ISS surface visible in the main flow — the promise and the destination don't match.

---

## 3. Top 25 UI Issues

1. 🔴 **Brand font violation, `/sky` `<h1>`.** `.skx__title` uses `font-family: var(--sans)` at `font-weight: 800` (`sky.css:4410-4412`). The hard rule is *all headings = Orbitron Medium 500*. The single most important word on the page ("Sky Tonight") is off-brand and over-weighted.
2. 🟠 **Second font violation:** `.skx__sum-count` and `.skx__nbt-window` use `var(--font-display)` at weight 800 / 500 mixed; the summary's big number is heavier than the type system allows (Orbitron 500 only).
3. 🟠 **Glyph "emoji" leakage.** `QuizRow` renders `✓` and `+{reward} ✦` as text glyphs (`missions/page.tsx:1365,1369`). The design rule is SVG icons only; checkmark/star glyphs render inconsistently across platforms and break the "no emoji" stance.
4. 🟠 **Five competing number treatments on `/missions`** (mono 19px, serif/display 22-24px, mono 13px, % rings) inside ~600px of scroll. No single dominant numeral style → weak hierarchy.
5. 🟠 **Microcopy below 12px is everywhere.** Eyebrows at 8.5–10px (`mis-quest-meta-val i` 8.5px, `mis-summary-eyebrow` 9.5px, `mis-rare-tag` 8.5px). The brand bans microcopy below 12px; this page is full of it.
6. 🟠 **Card-on-card nesting.** The streak card contains a `.mis-checkin` card with its own surface (`mis-card--streak .mis-checkin`). The design system explicitly bans glass-card-in-glass-card.
7. 🟠 **Two accent oranges + an indigo button.** Mission row "Observe" button is `--accent-iris #6366F1` (`mis-row-btn`, `stellar-tokens.css:5030`) while every other CTA is terracotta. Inconsistent primary color across the same list.
8. 🟡 **"View all" link color is `--accent-iris #818CF8`** (`mis-viewall`) — a third accent, neither terracotta nor seafoam, used nowhere else.
9. 🟡 **Right rail visual monotony.** Five stacked `.mis-card`s with identical radius/border/background and near-identical eyebrow rows — the "identical card grids repeated" anti-pattern the brand bans.
10. 🟡 **Inconsistent border radii.** `mis-summary` 18px, `mis-card` 14px, `mis-row` 13px, `mis-nearby-card` 14px, `mis-quiz-row` 12px, `mis-rare-art` 9px. Six radii with no rhythm.
11. 🟡 **Sky summary cell dividers** use `border-left` between cells then re-flow to a 2×2 grid with `nth-child` border juggling on mobile (`sky.css:4882-4884`) — fragile and visually busy.
12. 🟡 **`SkyOrb` uses `mix-blend`/screen-style framing** on dark cards; on light theme (shipped) photos framed on black will look wrong against light surfaces. No light-theme variant evident.
13. 🟡 **The completion ring (`mis-ring`) and quality ring (`skx__qring`) and gauge (`skx__ring`)** are three separate ring components with different radii/strokes — no shared ring primitive.
14. 🟡 **Mission row at <480px hides the Stars chip** (`mis-row-stars { display: none }` until 480px). On the most common phone widths the reward — the entire point — is invisible in the list.
15. 🟡 **Hardcoded hex in JS** (`HUB_GRADIENTS`, `IssIcon` `#6B7280/#8465CB`, `objectAccent` `#F4D98C` etc.) bypasses the token system; theming/light-mode drift risk.
16. 🟡 **"Gradients" on quiz icons** are flat single-color "gradients" (`#8B5CF6 0% → #8B5CF6 100%`) — dead code dressed as gradient; either commit to a real gradient or use a solid fill.
17. 🟡 **Inconsistent CTA shapes.** Quest CTA is a pill (radius 999px), summary CTA is 12px radius, row button 10px radius. Three button silhouettes for the same action ("observe").
18. 🟡 **Sunset/Sunrise cell** packs head + value + sub in one cell while the lead cell uses a different vertical rhythm — the four summary cells aren't on a shared baseline grid.
19. 🟡 **Drop-shadow glow on `skx__qring`** (`drop-shadow(0 0 4px rgba(94,234,212,.3))`) is a soft teal glow — the brand bans violet/indigo *and* "glow" shadows; this is borderline.
20. 🟡 **No skeleton parity.** `/sky` has a 2-card skeleton (`SkyLoadingSkeleton`) that doesn't resemble the actual 4-cell summary + map + rail it replaces → layout shift on load.
21. 🟡 **Telescope guide photo** is a single static refractor (`/images/telescopes/refractor.jpg`) regardless of what the user owns — generic stock feel on a page about *your* instrument.
22. 🟡 **Text truncation everywhere** (`mis-row-name`, `mis-rare-name` use ellipsis + nowrap). Localized Georgian strings (longer) will clip more aggressively; no tested KA overflow.
23. 🟡 **Status-bar live dot pulses** (`mis-pulse` 2.2s) — a small "always animating" element competing with the auto-rotating tip carousel for the eye.
24. 🟡 **The FAB exists in CSS (`mis-fab`)** with safe-area handling but isn't rendered in `missions/page.tsx` — dead style, or a removed feature leaving orphaned CSS.
25. 🟡 **`✦` star glyph as the Stars currency mark** is typographically inconsistent with the lucide `Star` SVG used elsewhere for the same concept — two visual languages for one currency.

---

## 4. Mobile-Specific Improvements (assume 90% mobile)

**Reality check from the code:** mobile is the *default* layout (single column, scroll-snap rails, chips scroll horizontally with negative margins to bleed edge-to-edge). The engineering is there. The problems are *prioritization*, not plumbing.

1. **Right rail death on mobile.** On `/missions`, the entire right rail (streak, global, tip, weather, **quizzes**) stacks *after* the main column. A casual user scrolls past the mission deck and rarely reaches the quizzes/streak. → Move streak + quizzes *above* the long-tail content on mobile via `order`, or fold the rail into a tabbed strip.
2. **Thumb reach.** The primary "Observe" action on the main quest sits top-of-card; the most-tapped CTAs should live in the bottom 1/3. Reintroduce the (already-styled but unrendered) `mis-fab` as a sticky "Observe tonight's target" thumb button.
3. **Scroll depth.** `/missions` is ~11 sections deep. Target: the answer ("what do I do tonight + go") fully visible in the first viewport, everything else collapsible.
4. **Tap targets below 44px:** `mis-info-dot` (18px), tip dots (7px), filter chips (~28px tall). Bump chips to 44px tall and replace the 18px "i" with a full-row expandable.
5. **Sky summary 2×2 on mobile** is good, but the `border-left`/`border-top` nth-child scheme is fragile — use a gap + card-per-cell instead so it survives RTL/KA and dynamic type.
6. **Horizontal rails need affordance.** `mis-nearby-rail` and `skx__vis-rail` hide scrollbars — add a peeking next-card edge (already partially there) + a faint right-edge fade so users know to swipe.
7. **One-handed:** location switcher is top-right on both (`skx__loc`, status meta) — out of thumb arc. Fine for a low-frequency action, but the *finder calibrate* (frequent on sky) should be reachable bottom-center.
8. **Sticky context.** As the user scrolls the long missions page, the "tonight status" (live/cloudy/daytime + city + best window) should stick as a slim top bar instead of scrolling away.
9. **Safe areas:** only the (unrendered) FAB respects `env(safe-area-inset-bottom)`. Ensure the bottom nav + any sticky CTA clear the home indicator.
10. **AR/compass mobile permission flow** needs a soft pre-prompt ("Stellar needs your compass to point you to Saturn") before the OS prompt, or denial rates will be high.

---

## 5. Gamification Improvements

**What exists:** Stars (currency), completion % ring, night-goal star rating, daily check-in/streak, community mission, per-find +10 ✦ toast, quizzes with scores.
**What's missing — the actual loop:**

1. **A visible level/XP ladder.** Stars are a wallet balance, not a progression. Add an Observer Level (Novice → Stargazer → Astronomer …) with a progress bar that fills toward the next level. This is the Duolingo crown / Strava-fitness equivalent and it's the #1 gap.
2. **Badges / achievements.** "First Light," "Planet Hunter (5 planets)," "Moon Phases (all 8)," "Deep Sky (M-object)," "7-night streak." You already track completed missions and quizzes — surface them as a collectible grid. The Discovery Attestation NFTs are *literally already badges*; pull them onto `/missions`.
3. **Streak loss-aversion.** The check-in card exists but doesn't *threaten* loss. Show "🔥-equivalent: 4-night streak — observe by 04:12 to keep it" and offer a **Streak Freeze** (Duolingo's single most retentive mechanic).
4. **Daily / weekly / seasonal quests.** "Daily: spot 1 planet (+20)," "Weekly: complete 3 missions (+150)," "Seasonal: Perseids week (Aug)." You already compute rare/upcoming events — turn them into time-boxed quests with countdowns.
5. **Surfaced leaderboard + friends.** A leaderboard route exists app-wide but isn't on these pages. Add a compact "You're #34 this week, ↑6" with a tap to the full board. Add friends/guilds ("observing clubs") for social pull.
6. **Make the reward legible.** Replace the abstract "Next reward 10%" with a tangible ladder: "120 ✦ → 10% off any eyepiece at Astroman." Tie Stars to the marketplace you already have. That's your Strava-Summit / real-world payoff.
7. **Variable-reward surprise.** Occasional "bonus target tonight: +2× Stars on Saturn" or a mystery "comet alert." You have the events engine; add a randomized daily highlight.
8. **Completion celebration.** Finishing a mission should fire a real moment (confetti-free, on-brand: a "discovery sealed" stamp + NFT mint animation). Right now success is a toast.
9. **What Duolingo would do:** one screen, one next action, a streak you fear losing, and a path bar. What Strava would do: a feed of *what your friends observed last night* + your weekly total + segments (here: "fastest to find Andromeda"). Borrow both.

---

## 6. Conversion Improvements

1. **Anonymous-first.** Render `/sky` and `/missions` fully for logged-out users. Gate only the *reward write* (earning Stars / minting). Let the value sell the signup. **Highest-leverage change in this entire audit.**
2. **Contextual signup prompts** at the moment of value: after a user taps "Observe" or finishes a quiz — "Create a free account to keep your +50 ✦." Not a cold wall.
3. **Single primary CTA per viewport.** Collapse the 3 competing observe CTAs into one obvious action.
4. **Tie Stars to a real reward visibly** (Astroman discount) on these pages — the reason to complete missions becomes concrete, lifting completion + redemption.
5. **Reduce time-to-first-map on `/sky`** — default to Tbilisi/last location instantly, fetch finder optimistically, and make the location modal a dismissible chip, not a blocking overlay.
6. **Quiz as a hook.** Quizzes need zero equipment and zero dark sky — they're the perfect first action for a mainstream user at noon. Promote one quiz to the top of `/missions` ("Test yourself — 2 min, +100 ✦").
7. **Photo-upload friction:** the observe flow is the conversion event that mints NFTs. Add a "what a good photo looks like" example and a one-tap path from the mission row to capture.
8. **Web-push opt-in** at a good moment ("We'll ping you when Saturn clears the horizon at 21:40") drives DAU — the infra (`/api/push`) exists; wire the prompt.

---

## 7. Retention Improvements

**Would a user come back tomorrow?** As shipped: only if they're already an Astroman customer with intent. There is no *manufactured* reason to return. Add:

1. **Streak + freeze** (see §5.3) — the backbone.
2. **Daily quest reset** with a visible countdown ("New missions in 6h 12m"). You already reset at midnight (`resetsMidnight`) — make it a *pull*, not a footnote.
3. **Push notifications** tied to real events: "Clear skies tonight + Jupiter at 45°," "Your streak ends in 3h," "Perseids peak tomorrow."
4. **Personalized "tonight for you"** based on owned equipment + past finds + local Bortle. You have all the inputs.
5. **Seasonal/limited-time events** (meteor showers, eclipses already in `astro-events`) as time-boxed missions with exclusive NFT badges — FOMO done tastefully (no countdown-timer theater; a date + "rare" tag fits the brand).
6. **Weekly recap** ("This week: 3 nights observed, 240 ✦, you climbed to Stargazer") via email/push — Strava's weekly digest is pure retention.
7. **Friends feed / observing club** — social obligation is the strongest retention force; the network/feed routes exist app-wide but aren't surfaced here.
8. **Comeback path on empty/bad nights:** when it's cloudy or daytime, the page should pivot to "can't observe — do a quiz / plan a target / browse 2026 events" so a bad night still earns and engages.

---

## 8. Accessibility Improvements (toward WCAG 2.1 AA)

**Good already:** `role="status"`, `role="tablist"/"tab"` with `aria-selected`, `aria-pressed`, `aria-label`s, `focus-visible` rings (`sky.css:4799-4802`), `prefers-reduced-motion` handling, keyboard handlers on the custom `mis-row` button.

**Fix:**
1. **Contrast.** `--mis-t3 #585B66` on the `--mis-card rgba(255,255,255,0.022)` (near-black) surface is well under 4.5:1 for the body-size text it's used on (statuses, metas, subs). Audit every `--mis-t3` text use; bump to at least `--mis-t2`.
2. **Microcopy size.** 8.5–10px eyebrows fail readability and the brand's own ≥12px rule. Raise to 11–12px.
3. **Tap/focus targets <44px:** `mis-info-dot` (18px), tip dots (7px), `skx__tips-dot`. Enlarge or add invisible hit area.
4. **Button-in-button:** the event row is a `<button>` containing a `role="button"` "i" (`missions/page.tsx:1292,1318`). Nested interactive controls break SR/keyboard semantics — refactor to a sibling control.
5. **Custom row as button:** `mis-row` is a `div role="button"` that only fires when `above` — when disabled it's still focusable (`tabIndex={0}`) but does nothing. Set `aria-disabled` and remove from tab order when inert.
6. **Color-only meaning:** difficulty (easy/med/hard/expert), live/cloudy/daytime dot, sky-quality tone rely on color. Add text/iconographic redundancy (the labels exist for difficulty — ensure the *status dot* has a text equivalent always visible, not hidden <380px).
7. **Auto-rotating carousels** (`TipsCard` 7s, status pulse) — pause on focus/hover and respect reduced-motion (tips rotation currently ignores it).
8. **Decorative `aria-hidden`** is used well; ensure the hardcoded `pct={0.82}` ring isn't announced as meaningful data (it's `aria-hidden`, but the *visible* dishonesty is the bigger issue — fix the data).
9. **Heading order:** `/missions` jumps from page-level to multiple `<h2>`s with no `<h1>`; `/sky` has `<h1>` "Sky Tonight" (good). Add an `<h1>` to missions.
10. **Modal focus management** for `AuthModal`, `SkyLocationModal`, `EventInfoSheet`, AR finder — verify focus trap + Escape + restore (not visible in these files; audit the components).

---

## 9. Complete Redesign Recommendations (per section)

> Format: Current problem → Why it hurts → Proposed redesign → Expected improvement → Difficulty / Impact

### `/missions`

**A. Auth gate**
- *Problem:* Full-page sign-in wall.
- *Hurts:* Zero anonymous funnel.
- *Redesign:* Render everything logged-out with sample/local progress; gate only Star writes with inline prompts.
- *Improvement:* Large lift in activation + signup-at-value.
- **Hard / High.**

**B. The 4-zone summary bar**
- *Problem:* Completion %, Stars/goal, 5-star rating, next-reward % — four metrics, no hierarchy.
- *Hurts:* Newcomers can't parse "how am I doing."
- *Redesign:* One **Observer Level bar** (XP to next level) as the hero, with Stars + streak as secondary chips. Move coupon reward into the level-up payoff.
- *Improvement:* A single legible progression a casual user feels.
- **Medium / High.**

**C. Main quest + nearby + list = one "Tonight" module**
- *Problem:* Three separate target surfaces (quest, nearby rail, filterable list) stacked.
- *Hurts:* Redundant, long, decision paralysis.
- *Redesign:* One "Tonight" card: the single best target large, a 3-up "also up now" strip, and a "See all targets" expander. Kill the 6-filter chip row for casual mode (keep behind "all targets").
- *Improvement:* 5-second clarity; far shorter page.
- **Medium / High.**

**D. Right rail → mobile-first ribbon**
- *Problem:* Rail (incl. quizzes) dies below the fold on mobile.
- *Redesign:* Promote **Streak** + **one Daily Quiz** to directly under the level bar; demote weather/global mission into the "Tonight" card as small chips.
- *Improvement:* The casual-friendly content gets seen.
- **Easy / Medium.**

**E. Events + telescope guide + observer assist**
- *Problem:* Three reference sections most users won't reach.
- *Redesign:* Collapse into a single "Plan & Learn" accordion below the fold. Keep rare events as a 1-line "Next big event: Total Lunar Eclipse · Mar 3" teaser.
- *Improvement:* Page length down ~50%; reference still available.
- **Easy / Medium.**

### `/sky`

**F. Sign-in gate** — same as A. **Hard / High.**

**G. Cold-start overlays**
- *Problem:* Location modal + tour can both fire.
- *Redesign:* Default to a sensible location instantly; replace the blocking modal with a dismissible location chip; show the 3-step tour as a one-time inline coachmark on the map, never alongside another modal.
- *Improvement:* Map usable in <1 interaction.
- **Medium / High.**

**H. The fake "Next best time" ring**
- *Problem:* `pct={0.82}` hardcoded.
- *Hurts:* Brand-trust violation ("numbers earn their position").
- *Redesign:* Either compute the ring from "how much of tonight's dark window remains" or replace with the honest text window + a non-data icon.
- *Improvement:* Restores credibility.
- **Easy / Medium.**

**I. Jargon layer**
- *Problem:* Bortle/azimuth/magnitude exposed.
- *Redesign:* Plain-language primary ("Look high in the south, after dark"), jargon behind a tappable "details/why." You already have `lookPhrase()` — make it the default voice everywhere.
- *Improvement:* Mainstream comprehension.
- **Medium / Medium.**

**J. Add a reason to return to `/sky`**
- *Problem:* No gamification; +10 ✦ on aim is invisible.
- *Redesign:* Surface "Targets found tonight: 2/6 (+20 ✦)" as a slim progress strip; tie to the level bar from B.
- *Improvement:* Sky becomes a daily loop, not a lookup.
- **Medium / High.**

**K. Typography fix**
- *Problem:* `<h1>` is `--sans` weight 800; big numbers weight 800.
- *Redesign:* Orbitron Medium 500 for "Sky Tonight" and all headings; JetBrains Mono for the numerals; align with the token system.
- *Improvement:* Brand consistency, premium feel.
- **Easy / Medium.**

---

## 10. Prioritized Implementation Roadmap

### Fix immediately (P0 — before anything else)
1. **Remove the hard auth wall**; render anonymous, gate writes inline. (both)
2. **Fix the fake `pct={0.82}` ring** — compute or remove. (`/sky`)
3. **Brand typography violations** — Orbitron 500 headings, kill weight-800 `--sans` title. (`/sky`)
4. **Contrast + microcopy size** — retire `--mis-t3` body text and sub-12px eyebrows. (both, WCAG)
5. **Button-in-button + sub-44px targets** — info dot, tip dots, chips. (both, WCAG)
6. **Remove emoji glyphs** (`✓`, `✦`) → SVG. (`/missions`)

### Fix before beta (P1 — the consumer-readiness pass)
7. **Cut `/missions` to a 5-second page:** one "Tonight" module + level bar + promoted streak/quiz; collapse events/guide/observer into an accordion.
8. **Introduce the Observer Level / XP ladder** and tie Stars → marketplace reward visibly.
9. **Streak + Streak Freeze + daily/weekly quests** with countdowns.
10. **Cold-start fix on `/sky`** — no stacked overlays, instant map, dismissible location chip.
11. **Plain-language default voice**, jargon behind "details."
12. **Web-push opt-in** at a value moment; event-based notifications.
13. **Promote quizzes** to a discoverable top slot (works day or night, no gear).
14. **Empty/bad-night pivot** — cloudy/daytime states offer quiz/plan/learn instead of dead ends.

### Nice to have later (P2)
15. Badges/achievements grid (pull in Discovery Attestation NFTs).
16. Friends feed / observing clubs / leaderboard on-page.
17. Seasonal limited-time events with exclusive badges.
18. Weekly recap digest.
19. Shared ring/card UI primitives; radius + accent-color rationalization.
20. Light-theme audit for `SkyOrb` and hardcoded hex.
21. KA-locale overflow testing on truncated names.
22. Soft pre-prompt for compass/camera permissions.

---

## 11. Scorecard

### `/missions`
| Dimension | Score | Note |
|---|---|---|
| Visual Design | 6/10 | Coherent dark cosmic look, real iconography — but microcopy soup, 6 radii, 3 accent colors, card-on-card. |
| Usability | 5/10 | Powerful but overwhelming; dead-end rows; competing CTAs. |
| Accessibility | 5/10 | Good ARIA/roles, but contrast, <12px text, sub-44px & nested buttons. |
| Engagement | 6/10 | Lots to do; little that pulls a *casual* user in. |
| Gamification | 5/10 | Stars + streak + community exist; no levels/badges/loss-aversion loop. |
| Retention | 4/10 | No manufactured reason to return tomorrow. |
| Information Architecture | 4/10 | 11 sections, 5 number systems, casual content buried. |
| Conversion | 4/10 | Auth wall + unclear reward value cap the funnel. |
| Mobile UX | 6/10 | Real mobile-first engineering; rail/ordering hurts the casual path. |
| Mainnet-readiness as consumer product | 5/10 | Ships as a power-user tool, not a mainstream app. |
| **Overall** | **58/100** | |

### `/sky`
| Dimension | Score | Note |
|---|---|---|
| Visual Design | 7/10 | Strong verdict-first summary strip; weakened by font-weight violation + decorative ring + glow. |
| Usability | 6/10 | Great glance value; cold-start overlays + jargon + desktop sensor gap. |
| Accessibility | 6/10 | `<h1>` present, focus-visible, reduced-motion; color-only meaning + contrast gaps remain. |
| Engagement | 6/10 | Genuinely useful nightly; little reason to *return* beyond utility. |
| Gamification | 3/10 | Effectively none surfaced (+10 ✦ on aim is invisible). |
| Retention | 5/10 | High intrinsic utility, zero engineered loop. |
| Information Architecture | 7/10 | Summary → map → what-to-look-for → visible-now is a sound spine; some triple-counting. |
| Conversion | 5/10 | Auth wall + slow time-to-map; quiz/value hooks absent here. |
| Mobile UX | 7/10 | Best-tuned surface; 2×2 summary + scroll-snap rail work well. |
| Mainnet-readiness as consumer product | 6/10 | Closest to consumer-grade of the two. |
| **Overall** | **62/100** | |

---

## 12. If I Were Redesigning These Pages From Scratch

**Premise:** keep the soul — *patient, precise, earned; every number measured by a real instrument; NASA, not a casino* — but make it feel like a billion-dollar consumer app for someone who's never owned a telescope.

### `/sky` — "Tonight" (the daily home)
A single, calm, vertically-rhythmic screen:

1. **A living verdict header.** "Tonight in Tbilisi — **Very good.**" One Orbitron-500 line, with a quiet animated sky gradient that matches the real sun altitude (deep blue at dusk, near-black at astronomical dark). Below it, a single sentence: *"Saturn rises in the southeast at 21:40. Clear until 02:00."* That's the whole job of the first viewport.
2. **One glance row** — Visible · Moon · Sky quality · Window — but each is *tappable to expand*, not four static cells. Honest rings only.
3. **The map, full-bleed and the star of the page.** Tap a target → a clean bottom sheet: a real photo, plain "where to look," and one button: **"Point me"** (AR) or **"I found it" (+10 ✦)**. Progress strip: *Found 2 of tonight's 6 · +20 ✦.*
4. **A thin daily loop strip** at the bottom of the fold: streak flame + "Daily quiz · 2 min · +100" + "Plan a target." Always something to do, clear or cloudy.
5. Everything reference (7-day, 2026 events, gallery) lives below, lazy, secondary.

**Feel:** Sky Guide's clarity + Apple Weather's living-background calm + Strava's "your numbers, measured."

### `/missions` — "Quests" (the progression home)
1. **Observer Level bar as the hero.** A single path-bar (Duolingo's crown row) — "Stargazer · 240 XP to Astronomer" — with your streak flame and Star balance as two chips. *This* is the dopamine spine.
2. **One "Tonight's quest" card.** The single best target, big photo, reward, best window, and one button. A 3-up "also up now" strip beneath. A quiet "all targets →" for power users.
3. **Today's quests** (3 tiny rows with checkboxes): "Find 1 planet · Take 1 photo · Do 1 quiz," each with a Star reward and a satisfying check animation. Weekly + seasonal quests as tabs.
4. **Collection wall** — your earned Discovery Attestation NFTs as badges, with locked silhouettes for the ones you haven't earned (the single most powerful "gotta catch 'em all" pull). This is where the on-chain layer becomes *visible delight*, not invisible plumbing.
5. **Friends ribbon** — "Nino observed the Moon last night · Giorgi is #2 this week." Social obligation, tasteful, no theater.
6. Reference (telescope guide, observer prep) collapses into a "Learn" accordion.

**Feel:** Duolingo's "one screen, one next action, a streak you fear losing" + Strava's social weekly loop + the earned, measured restraint of NASA.

### Cross-cutting principles for the rebuild
- **Anonymous-first, gate-at-value.** Show the sky and the quests to everyone; ask for an account when there's a Star to save.
- **One dominant metric per screen** (Sky: tonight's verdict; Quests: your level). Everything else is secondary.
- **Plain voice first, jargon on tap.** "High in the south" before "altitude 58°, azimuth 176°."
- **Every number is real or it's not a number.** Kill decorative gauges; the brand's credibility is the product.
- **Motion with restraint** — a living sky gradient and a check-animation, CSS-only, reduced-motion-safe. No glow, no glass-on-glass, no gradient text.
- **Make the chain visible exactly once, as a reward** — the NFT badge wall — and invisible everywhere else.

Get those two screens to *5-second legible + one obvious next action + a streak worth protecting*, and Stellar stops being an excellent telescope-owner's dashboard and starts being the astronomy app a curious stranger opens every clear night.
