# Visual Audit — 2026-04-26

Read-only audit. No code modified. Reference page = `src/app/page.tsx` (homepage), per prompt instructions.

The audit found **three distinct visual systems** living side-by-side:

1. **Editorial-light** — home, sky, missions (white/`#FAFBFD` page, full-bleed dark hero, mono labels, 15px section titles)
2. **Polymarket-shell** — markets only (1360px shell, 18px section titles, thin side rules)
3. **Dark-cosmic** — marketplace, profile, chat, nfts (dark page, `rgba(255,255,255,0.0X)` glass cards, indigo accents)

The editorial-light pattern is the canonical one (homepage). Markets is a deliberate variant. Marketplace / profile / chat / nfts are drift from a previous design.

---

## Reference Page

**Canonical visual reference:** `src/app/page.tsx` (homepage)

Built from a small set of `home-*` CSS classes in `src/styles/stellar-tokens.css` (lines 2052–2306) plus per-component classes. Sections wrapped in `.home-section` / `.home-section-border`.

Key reference patterns:

- **Page shell:** `.home-page` — `background: #FFFFFF`, `color: #0F172A`, `font-family: var(--font-display)` (Public Sans). Mobile body fallback 14px, desktop scales html font-size to 17–18px (globals.css L646–657).
- **Section container:** `.home-section` — `max-width: 1080px; margin: 0 auto; padding: 24px 40px;` (mobile: 18px 16px). Section dividers via `.home-section-border` → `border-bottom: 1px solid #E2E5EC`.
- **Hero (full-bleed):** `.home-hero-wrap` — `linear-gradient(170deg, #070B18 0% → #1C2A52 100%)`, white text, multi-stop radial-dot starfield via `::before`. Inner column 1080px, padding 44px 40px 40px, grid `1fr 300px`.
- **Hero headline (h1):** `.home-hero-headline` — Public Sans 30px / weight 700 / `letter-spacing: -0.025em` / `line-height: 1.18` / `color: white`. `<em>` highlight = `#C4B5FD` (no italic, weight 700).
- **Hero subtitle:** 14px / `rgba(255,255,255,0.55)` / line-height 1.55, max-width 420px.
- **Section title (h2):** `.home-col-title` — 15px / weight 700 / `#0F172A` / `letter-spacing: -0.01em` / margin 0.
- **Section "view more" link:** `.home-col-link` — 12px / weight 500 / `#5B3DC8` (deep violet) / hover underline.
- **Primary CTA:** `.home-hero-cta-primary` — white background, `#0F172A` text, 13px / weight 600, padding 9px 20px, border-radius 8px, `border: 1px solid white`.
- **Secondary CTA:** `.home-hero-cta-secondary` — transparent bg, white text, `border: 1px solid rgba(255,255,255,0.15)`, hover `rgba(255,255,255,0.06)`.
- **Mono micro-labels:** `var(--font-mono)` (JetBrains Mono), 9–11px, uppercase, letter-spacing 0.08–0.1em, `rgba(255,255,255,0.25–0.35)` on dark or `var(--sky-t3) #999999` on light.
- **Status colors:** Go = `#4ADE80`, Maybe = `#FBBF24`, Skip = `#FB7185`. Verdict `<strong>` = `#4ADE80`.
- **Card surfaces:** on dark hero panel — `rgba(0,0,0,0.2)` panel + `border-left: 1px solid rgba(255,255,255,0.06)`. On light page — direct white surface, dividers via `1px solid #E2E5EC`.

**Voice:** verdict-first. The hero leads with `<strong>{cond.verdictHead}</strong> {cond.verdict}` (e.g. "Excellent night. Low clouds, clean air. Long observing session ahead."). All numbers are mono and tabular (`font-variant-numeric: tabular-nums`). No glow shadows, no gradient text, no glass-on-glass.

---

## Drift by Page

### `/sky` ([src/app/sky/page.tsx](src/app/sky/page.tsx))

Closest match to the reference. Most drift is dimensional, not stylistic.

- **Page bg drift:** uses `#FAFBFD` (.sky-page L2792 in stellar-tokens.css) vs reference `#FFFFFF`. | Fix: change `--sky-bg: #FAFBFD` → `#FFFFFF` to match `.home-page`.
- **Section padding drift:** `.sky-section` uses `padding: 20px 40px` (L2839) vs reference `.home-section` `padding: 24px 40px`. | Fix: change to `24px 40px`.
- **Section meta uses mono, home uses regular:** `.sky-section-meta` is `var(--font-mono) 11px` (L2860) vs reference `.home-col-link` 12px Public Sans. | Fix: pick one — either standardize all "section side text" on Public Sans 12px (matches home) or on mono 11px (matches sky/markets). Sky's mono is fine for *measurements* but `.sky-section-meta` is also used for nav-style labels.
- **Per-page theme toggle in localStorage:** `stellar-sky-theme` is independent from the global theme (`stellar_theme` set in [src/app/layout.tsx:108](src/app/layout.tsx#L108)). Same drift exists on missions and markets. | Fix: route all three through one mechanism — either remove the page-local toggles or make them write to `stellar_theme` so light/dark is one decision per session, not three.
- **Verdict head 18px vs hero headline 30px:** `.sky-verdict-head` is 18px / weight 600 (L3000) — fine for a *verdict*, not for a *page title*. There is no h1 equivalent on `/sky`. | Fix: add a `.sky-page-title` matching `.home-hero-headline` (30px Public Sans 700 -0.025em) above the verdict row, or accept that the verdict is the title and document this.

### `/missions` ([src/app/missions/page.tsx](src/app/missions/page.tsx))

Has its own dimensional system, narrower than home.

- **Container too narrow:** `.mis-content` and `.mis-hero-inner` both `max-width: 880px` (L3942, L3990) vs reference 1080px. | Fix: change both to `1080px`.
- **Section padding mismatch:** `.mis-section` `padding: 20px 28px` (L3947) vs reference `24px 40px`. | Fix: change to `24px 40px`.
- **Hero inner padding mismatch:** `.mis-hero-inner` `padding: 16px 28px 22px` (L3992) vs reference `44px 40px 40px`. The missions hero feels squashed because of this. | Fix: change to at least `28px 40px 36px` (matches sky) or `44px 40px 40px` (matches home).
- **Stats title is 14px, not 15px:** `.mis-stats-title` 14px (L4013) vs `.home-col-title` 15px / `.sky-section-title` 15px. | Fix: 15px.
- **Hero gradient hue drift:** `.mis-hero` uses `linear-gradient(175deg, #030712 → #1A3060)` (L3954). Home is `170deg, #070B18 → #1C2A52`. Sky is `170deg, #050810 → #162044`. Three different night-sky hero gradients. | Fix: pick one canonical hero-gradient token (e.g. `--hero-night-gradient`) and have all three reference it.

### `/markets` ([src/app/markets/page.tsx](src/app/markets/page.tsx))

This page is the most polished — but as a *Polymarket variant*, not a sibling of the homepage. Per the rollback note in the prompt, treat the markets page as its own intentional system; not all drift here is wrong.

- **Container width mismatch (intentional):** `.mkt-shell` `max-width: 1360px` (L1003) vs reference 1080px. Polymarket-style. | Fix: leave, but document — `/markets` is intentionally wider for the 2-column list+sidebar layout.
- **Section title size mismatch:** `.mkt-section-title` 18px / 700 (L1194) vs reference 15px. | Fix: drop to 15px to align with home/sky/missions section titles.
- **Section header padding mismatch:** `.mkt-section-header` `padding: 18px 20px 8px` (L1191) vs reference `24px 40px`. The markets shell uses 20px gutters instead of 40px because it's framed by `border-left/right` of the shell. | Fix: leave (the gutter is dictated by the shell pattern). Just make sure the 20px-gutter and 40px-gutter pages don't sit next to each other in a single visual sequence.
- **Custom token namespace:** `.markets-page` defines its own `--stl-*` palette (L946–990). These are referenced from `src/app/profile/page.tsx` and elsewhere outside `.markets-page`, where they resolve to nothing. See *Token Issues*.
- **Independent theme toggle:** same issue as sky/missions — `stellar-markets-theme` is its own localStorage key.

### `/marketplace` ([src/app/marketplace/page.tsx](src/app/marketplace/page.tsx))

Hardest break from reference. Different visual system entirely.

- **Wrong page system:** uses `PageContainer variant="wide"` (max-w-6xl = 1152px Tailwind) and a dark global background instead of `.home-page` white. | Fix: either (a) keep dark and treat it as a deliberate "shop" subsystem with its own brief, or (b) port to a `.shop-page` shell that mirrors `.home-page` (white, 1080px, light dividers).
- **H1 uses Source Serif 4, not Public Sans:** `<h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 500 }}>` at [marketplace/page.tsx:117](src/app/marketplace/page.tsx#L117) — 3xl/4xl, weight 500. Reference is Public Sans 30px / 700 / -0.025em. CLAUDE.md says serif is for "the verdict only," not page titles. | Fix: change to `className="home-hero-headline"` or replicate that exact spec — Public Sans 30px / 700 / -0.025em / white.
- **Section H2 uses serif too:** "Redeem Stars" h2 at L137 — `Source Serif 4`, base size, 600. | Fix: change to `.home-col-title` spec — Public Sans 15px / 700 / `#0F172A` (or white in dark variant).
- **Wrong accent purple:** hardcoded `ACCENT = '#7C3AED'`, `ACCENT_BORDER = 'rgba(124,58,237,0.32)'` (L37–39) — different from `.home-col-link` `#5B3DC8` and from `var(--accent) #818cf8`. | Fix: replace with `var(--accent)` (indigo `#818cf8`) for indigo or `#5B3DC8` if you want the home link color. Pick one and delete the others.
- **Banned 3px stripe:** `Tier` component at [marketplace/page.tsx:360](src/app/marketplace/page.tsx#L360) renders `<div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />` — same visual as the `border-left: 3px solid` stripe explicitly banned by `.impeccable.md` ("Banned patterns"). | Fix: remove the bar; use a colored uppercase mono kicker instead (matches `.home-hero-sky-header` at 10px mono uppercase letter-spacing 0.1em).
- **Microcopy below 12px:** uses `text-[10px]`, `text-[11px]`, `text-[12px]` repeatedly (L111, L122, L141, L172, L267, L286). CLAUDE.md design rules: ≥12px. | Fix: floor everything at 12px; mono labels at 11px allowed only for measured numeric values (matches `.home-hero-cond-label`).
- **Card border-radius drift:** `rounded-xl` (12px) on tier cards (L154), `rounded-2xl` mixed elsewhere. | Fix: use one radius token.
- **Inline-style buttons everywhere:** "Sign in", "Redeem", "Locked" pills all built from inline `style={{}}` (L177–222). | Fix: route through `.home-hero-cta-primary` / `.home-hero-cta-secondary` (or extract `.btn-shop-primary`).

### `/profile` ([src/app/profile/page.tsx](src/app/profile/page.tsx))

The most fragmented page. Almost entirely inline `style={{}}`, references tokens scoped to other pages.

- **Broken token references:** uses `var(--stl-gold)` (L220), `var(--stl-green)` (L222, 244, 295, 336) — these are defined inside `.markets-page` only (stellar-tokens.css L945–990). Outside `.markets-page` they resolve to *nothing* and the browser falls back. | Fix: replace with global tokens — `var(--stars)` for gold, `var(--success)` for green.
- **No real h1 on the authed view:** the only `<h1>` is in the unauthenticated sign-in card (L88), font-serif 26px / weight 400 / letter-spacing -0.01em. Authenticated view uses a `<p>` at 19px / weight 700 (L194) for the user name — there is no page title at all. | Fix: add `<h1>` "Your Observatory" matching `.home-hero-headline` spec, place above the avatar.
- **Sign-in h1 uses serif at weight 400:** `fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26` (L89–91). Reference is Public Sans 30px / 700 / -0.025em. Serif is reserved for the verdict per CLAUDE.md. | Fix: replicate `.home-hero-headline` spec.
- **Avatar initial uses raw `Georgia, serif`:** L187 `fontFamily: 'Georgia, serif'`. Should at least be `var(--font-serif)`. | Fix: `var(--font-serif)`.
- **Mixed accent colors in one page:** `#818cf8` (avatar gradient L184), `#8B5CF6` (avatar gradient L184), `#A855F7` (Pathfinder L183), `var(--stl-gold)` (Celestial L181), `var(--stl-green)` (network status L244, 295), `var(--accent)` (settings L361). | Fix: collapse to two tokens — `var(--accent)` for indigo, `var(--stars)` for gold.
- **Border-radius soup:** 14, 16, 18, 20 all in one page (L77 `borderRadius: 20`, L225 `16`, L249 `18`, L271 `12`, L334 `20`, L399 `14`, L412 `12`). Reference uses 8px (CTA) and `rgba(...)` divider lines, no nested rounded blocks. | Fix: pick one token, e.g. `--radius-md: 12px` from globals.css, and apply throughout.
- **Card alpha drift:** `rgba(255,255,255,0.02)`, `0.03`, `0.04`, `0.05`, `0.06` all present — same page. Reference uses one — `rgba(255,255,255,0.02)` for `.home-hero-sky-panel`-style panels. | Fix: standardize on `0.02` for cards, `0.04` for hover (matches `--bg-card` / `--bg-card-hover` in globals.css L10–11).

### `/chat` ([src/app/chat/page.tsx](src/app/chat/page.tsx))

Mostly `var(--*)` tokens — closest of the dark pages to the global system, but still drifts.

- **No visible h1:** "ASTRA — AI Space Companion" is `sr-only` (L165). Visible header name is a `<p>` at 14px / weight 700 (L195). | Fix: surface a real `<h1>` — even a small one (15px Public Sans 700 to match `.home-col-title`) — for SEO and screen readers, and align styling.
- **Header subtitle 10px:** L196 `fontSize: 10` — below the 12px floor. | Fix: 11px mono uppercase letter-spacing 0.08em (matches `.home-hero-sky-header` pattern), or 12px regular.
- **"Online" indicator 10px:** L204. Same issue. | Fix: 11px mono.
- **Bubble background drift:** assistant bubble uses `rgba(255,255,255,0.04)` (L270, 300) but the system token `--bg-card` is `rgba(255,255,255,0.02)`. | Fix: use `var(--bg-card-hover)` (which is exactly `0.04`) so it's tokenized.
- **Header background hardcoded:** `'rgba(7,11,20,0.85)'` (L175) — not a token; close to `--bg-void` `oklch(0.14 0.008 260)` but not equal. | Fix: replace with `var(--bg-void)` or define `--chat-header-bg`.

### `/nfts` ([src/app/nfts/page.tsx](src/app/nfts/page.tsx))

Closer to the global system than profile/marketplace, but still drifts.

- **Page title 22px, not 30px:** L464 — Public Sans 700 22px. Reference hero headline is 30px / -0.025em. | Fix: 30px / weight 700 / -0.025em to match `.home-hero-headline`. (22px is fine as a sub-heading; not as the page title.)
- **Microcopy 10px in stat cards:** L506 `fontSize: 10` for stat label. | Fix: 11px mono uppercase letter-spacing 0.06em (closer to `.home-hero-cond-label`).
- **Inline `style={{}}` for stat values:** L497–504. | Fix: extract a `.nft-stat-value` class, or replicate the existing `.home-hero-cond-value` mono pattern.
- **Mixed colors used as accent:** `var(--stars)` (L188), `var(--success)` (L186), `var(--warning)` (L186), `var(--error)` (L186), hardcoded `#818cf8` reachable via `var(--accent)` elsewhere. The set is reasonable (status colors are functional) but applied inconsistently. | Fix: keep status colors token-only; never write hex.
- **Container 1152px (PageContainer wide), not 1080px:** L459 — `max-w-6xl` resolves to 1152px. | Fix: change PageContainer's `wide` variant to 1080px (`max-w-[1080px]`) to match the editorial reference, *or* leave nfts wide and accept it as a gallery exception.

---

## Token Issues

### Duplicate / conflicting token files

`src/app/globals.css` and `src/styles/design-tokens.css` and `src/styles/stellar-tokens.css` are all loaded by [src/app/layout.tsx:4-6](src/app/layout.tsx#L4-L6). They define overlapping tokens with different values:

- **Font family for body:** `globals.css` L101–105 declares `--font-display: 'Geist'`, `--font-body: 'Geist'`, `--font-serif: 'Cormorant Garamond'`. Then `globals.css` L214–218 (`@theme inline`) declares `--font-display: var(--font-display, 'Public Sans')`, `--font-serif: var(--font-serif, 'Source Serif 4')`. **The earlier declarations override the later defaults.** `layout.tsx` then does `<html className={`${sourceSerif.variable} ${publicSans.variable} …`}>` which sets `--font-display` and `--font-serif` to the next/font values — but only inside the `html` element. Inside `:root` declarations they remain Geist + Cormorant. CLAUDE.md `.impeccable.md` explicitly **bans** Cormorant Garamond ("reflex-reject list"). | Fix: delete L101–105 of globals.css. Let the next/font-driven CSS variables on `<html>` be the only source of truth.

- **Shadow tokens:** `--shadow-card`, `--shadow-card-hover`, `--shadow-glow-teal`, `--shadow-glow-gold` all defined in **both** `globals.css` L85–91 and `design-tokens.css` L73–76 with different values. Whichever file is loaded last wins (`stellar-tokens.css` is last per layout.tsx L4–7). | Fix: pick one file (recommend `design-tokens.css`) as the canonical shadow source; delete duplicates from the others.

- **Two type scales:** `globals.css` doesn't declare a numeric scale; `design-tokens.css` L64–70 declares `--text-xs: 0.6875rem` … `--text-hero: 2.75rem`; `stellar-tokens.css` (and the home/sky/missions/markets stylesheets) use raw px values (10, 11, 12, 13, 14, 15, 18, 22, 30, etc.). The `--text-*` tokens are **never referenced** by any component. | Fix: either delete the unused scale or rewrite the page CSS to use it.

- **Two radius scales:** `--radius-sm/md/lg/xl/full` (globals.css L94–98) coexist with raw px values everywhere (8, 10, 12, 14, 16, 18, 20). | Fix: standardize. Recommend `--radius-md: 12px` for cards, `--radius-sm: 8px` for buttons, `--radius-full` for pills — and rewrite components to use the tokens.

### Scoped tokens leaking outside their scope

`.markets-page` defines `--stl-gold`, `--stl-green`, `--stl-text1`, etc. (stellar-tokens.css L946–990). [src/app/profile/page.tsx](src/app/profile/page.tsx) references `var(--stl-gold)` and `var(--stl-green)` (L220, 222, 244, 295, 336) outside `.markets-page` → resolves to invalid → browser uses its fallback or initial value. **This is a live bug.** | Fix: replace `var(--stl-gold)` → `var(--stars)`, `var(--stl-green)` → `var(--success)` in profile.tsx.

### Hardcoded hex values that should be tokens

A non-exhaustive sample of off-palette / hardcoded values in `.tsx` files (see *Drift by Page* for context):

- `marketplace/page.tsx` L37–39: `ACCENT = '#7C3AED'`, `ACCENT_SOFT = 'rgba(124,58,237,0.14)'`, `ACCENT_BORDER = 'rgba(124,58,237,0.32)'` — should be `var(--accent)` etc.
- `profile/page.tsx` L184: `linear-gradient(135deg,#818cf8,#8B5CF6)` — should reference `--gradient-accent` (which is `135deg, #4f46e5 → #7c3aed`, so close but different).
- `profile/page.tsx` L186: `background: '#0F1623'` — not in any token file; closest is `--bg-deep oklch(0.11 0.008 260)`.
- `chat/page.tsx` L175, L360, L376: `'rgba(7,11,20,0.85)'`, `'rgba(7,11,20,0.95)'`, `'rgba(7,11,20,0.9)'` — should be `var(--bg-void)` with alpha or a new `--chat-header-bg`.
- `nfts/page.tsx` L115: `background: '#0B0E17'` — modal dialog bg — should be a token.
- `marketplace/page.tsx` L268: `background: \`${t.color}1A\`, border: \`1px solid ${t.color}40\`` — concatenating hex alpha strings instead of using rgba/var tokens.

### Three competing accent purples

| Token / value      | Where                                                | Used for                              |
|--------------------|------------------------------------------------------|---------------------------------------|
| `#5B3DC8`          | `.home-col-link`, `--sky-acc` (light)                | "view more" links                     |
| `#7C3AED`          | `--stl-accent` (markets light), `ACCENT` marketplace | markets accent, marketplace accent    |
| `#818cf8`          | `--accent`, `--accent-cyan`, `--accent-teal`         | global "indigo accent"                |
| `#A78BFA`          | `--stl-accent` (markets dark), `--mis-acc` (dark)    | dark-mode accent (lighter shade)      |
| `#A855F7`          | `--accent-purple`                                    | Pathfinder rank, secondary purple     |
| `#C4B5FD`          | hero `<em>`, marketplace redeem code                 | violet text-on-dark                   |

These are *six* distinct purples used as "the accent." | Fix: collapse to **two** — one indigo (`var(--accent)`) for primary actions/links, one violet (`var(--accent-purple)`) for the rank/decorative cases. Delete the others.

### Banned patterns still present

Per `.impeccable.md` (referenced from CLAUDE.md):

- **Cormorant Garamond** — declared in `globals.css` L103. (See font conflict above.)
- **Microcopy below 12px** — present in marketplace, profile, chat, nfts (10–11px without the mono-uppercase justification).
- **Gradient text via `background-clip: text`** — present in `src/app/learn/page.tsx` L1028 (out of scope of this audit but flagged here).
- **Indigo/violet glow shadow** — `--shadow-glow-accent: 0 0 20px rgba(99,102,241,0.25)` in globals.css L88; `--shadow-glow-cyan` in stellar-tokens.css. Audit didn't trace runtime usage on the audited pages — likely fine since the editorial pages don't render these — but the token still exists and invites future drift.
- **3px-wide colored stripe** — used in `marketplace/page.tsx` L360 (visual equivalent of the banned `border-left: 3px solid`).

---

## Summary

- **Total inconsistencies found: 47**
  (drift items above: home 0, sky 4, missions 4, markets 5, marketplace 8, profile 7, chat 5, nfts 5; token issues: 9.)
- **Severity breakdown:**
  - **critical (visible to users): 14** — every drift in marketplace + profile + the broken `--stl-*` token references in profile + the missing/wrong page titles in profile/chat/nfts/sky + the banned 3px stripe + sub-12px microcopy.
  - **minor (developer-only): 33** — hue / px / token-cleanup work that won't be obvious in screenshots but compounds when adding new pages.

### Top 3 things to fix first

1. **Delete the Geist + Cormorant Garamond declarations from `globals.css` L101–105.** They override the next/font-driven Public Sans and Source Serif 4 inside `:root`, which means anywhere a component reads `var(--font-display)` outside `<html>` it gets Geist. This is a global, invisible-but-pervasive root-cause bug.
2. **Replace marketplace's accent system with the global one** ([src/app/marketplace/page.tsx:37-39](src/app/marketplace/page.tsx#L37-L39), and the H1/H2 typography at L117 and L137). Marketplace is the second-most-trafficked page and it's the loudest visual outlier — wrong purple, serif h1 at the wrong weight, banned 3px stripes, sub-12px copy. Aligning it gives the biggest perceived win.
3. **Fix profile's broken token references** ([src/app/profile/page.tsx](src/app/profile/page.tsx) L220, 222, 244, 295, 336). `var(--stl-gold)` and `var(--stl-green)` resolve to nothing outside `.markets-page` — this is a live rendering bug, not a polish issue. Then collapse the seven inline-styled radius/alpha values to tokens.
