# Stellar UI/UX Playbook — how to modify every page's visuals safely

> Practical guide for restyling Stellar without breaking the design system.
> Stack: Next.js 15 · React 19 · Tailwind v4 (CSS-first) · lucide icons · token-driven CSS.
> Companion docs: `UX_UI_AUDIT_STELLAR.md` (issue list + scores), `PROMPTS_STELLAR_FIXES.md`.

---

## 0. The one idea that makes this easy

**You do not restyle pages. You restyle tokens, and the pages follow.**

Every color on all 33 pages routes back to **4 primitive tokens** in `src/app/globals.css`:

```css
--canvas:     #0A1735;   /* page background (deep blue) */
--terracotta: #FFB347;   /* PRIMARY accent — orange, used sparingly */
--seafoam:    #5EEAD4;   /* SECONDARY — "visible / available / success" */
--negative:   #FB7185;   /* error / negative */
```

Everything else (`--accent`, `--stars`, `--accent-gold`, `--accent-teal`, `--color-star-gold`, the glass/shadow tokens…) is an **alias** of these. Change `--terracotta` on line 20 and the entire site's primary color changes everywhere at once. That is how you "modify all pages' visuals" in one edit — not page by page.

**Rule #1: never write a raw hex in a component or page CSS. Always reference a token.** The audit's #1 UI failure mode is hardcoded hex (`#6366F1`, `#F4D98C`, `HUB_GRADIENTS`) bypassing this system and causing drift.

---

## 1. The brand law (non-negotiable — from the audit)

| Rule | Why |
|------|-----|
| **Dark canvas only** (`--canvas`). No light theme. | Astronomy product; system light mode is force-overridden. |
| **All headings = Orbitron, weight 500.** No 800, no `--sans` on an h1. | Two audit violations came from this alone. |
| **Body text ≥ 12px.** No 8.5–10px eyebrows. | Readability + accessibility. |
| **SVG icons only (lucide). No emoji, no `✓`/`✦` glyphs as UI.** | Glyphs render inconsistently cross-platform. |
| **One primary CTA per viewport.** Primary = terracotta pill. | Kills the "3 competing Observe buttons" problem. |
| **No glass-card-inside-glass-card.** | Flattens hierarchy; explicitly banned. |
| **No violet/indigo accents, no glow shadows.** | Off-brand; several borderline glows exist today. |
| **Consistent radius + spacing rhythm.** Pick a scale, don't freehand. | Today there are 6 radii with no rhythm. |
| **Tap targets ≥ 44px.** | Mobile is 90% of traffic. |

Keep this table open while editing. If a change violates a row, it's wrong regardless of how good it looks.

---

## 2. The UX laws (what actually moves the numbers)

The audit is blunt: **prettier CSS is not your bottleneck — these are.** Fix them as you touch each page.

1. **Value before signup.** Render pages for logged-out users; gate only the *reward write* (earning Stars / minting). The full-page auth wall is the single highest-leverage fix in the whole audit.
2. **One screen, one action.** A first-timer must answer "what do I do right now?" in 5 seconds. Collapse the rest.
3. **Verdict-first.** `/sky`'s summary strip (Visible / Moon / Quality / Sunset) is the model — lead every page with the answer, then the detail.
4. **Kill jargon** for the mainstream audience (Bortle, azimuth, magnitude → plain language + optional "?").
5. **Visible progression.** Levels/XP/badges/streak — the retention loop. Raw materials exist (Stars, streak); assemble them.
6. **Mobile-first.** Primary actions in the bottom third (thumb arc); don't bury the money content (quizzes, streak) below an 11-section scroll.

---

## 3. The repeatable per-page process

Do this **one page at a time**, on its own branch. Never batch all 33.

1. **Read the page + its CSS.** Pages: `src/app/<route>/page.tsx`. Shared tokens: `src/styles/`. Some pages have their own CSS (e.g. `sky.css`).
2. **Score it against §1 + §2.** Reuse the audit's format. List violations with file:line.
3. **Fix structure first (UX), then skin (UI).** Value-gate, single CTA, collapse sections → *then* tokens, spacing, type.
4. **Replace every raw hex with a token.** If no token fits, add an alias in `design-tokens.css`, don't inline a hex.
5. **Check the 44px / ≥12px / Orbitron-500 / SVG-only rules.**
6. **Test** (§5) — dev preview + Playwright + responsive at 360/390/768/1280.
7. **Commit small, one concern per commit** (see the existing home commits for the style), open for review.

---

## 4. Adding premium components without wrecking the system

You have **no shadcn/framer-motion installed** — and your CSS is already 110KB (`stellar-tokens.css`). Be disciplined:

- **Best default:** build with your existing tokens + lucide. It keeps the bundle clean and on-brand.
- **For real motion:** add `framer-motion` (one dep) and animate with it, not more keyframes in CSS.
- **Aceternity / Magic UI:** use them as *reference patterns* (starfield, glow beam, 3D card), then **re-implement with your tokens** — don't paste their indigo/violet palettes (they violate the brand law). Copy the structure, not the colors.
- **v0.dev:** great for a *fresh* page skeleton. Paste your 4 primitives + the brand-law table into the prompt so it generates on-palette. Then port classes to your token system.
- **Real imagery, never AI images:** NASA (images.nasa.gov), ESA/Hubble (esahubble.org/images). Put files in `public/images/`.

---

## 5. The testing loop (start here today)

```bash
cd ~/stellar
npm run dev            # local preview at http://localhost:3000
npm run test           # vitest unit tests
npm run test:smoke     # playwright e2e (see e2e/ + playwright.config.ts)
npm run build          # catches type + build errors before deploy
```

Manual visual pass every page at these widths: **360, 390, 768, 1280px** (Chrome devtools device toolbar). 90% of users are on the two phone widths — judge there first.

Extra: `stellar-toolkit/visual-audit/audit.py` exists for automated visual capture — wire it into the loop for before/after screenshots.

**Deploy:** Vercel (`vercel.json` present). Push a branch → preview URL → review on your phone → merge to `main`.

---

## 6. Priority order (from the audit + repo state)

1. **Finish + merge the stranded home redesign.** Three branches (`agent/home-redesign`, `agent/home-polish`, `agent/home-tweaks`) are unmerged. Pick the best, ship it. Don't start a 4th.
2. **`/missions`** (audit score 58) — value-gate + collapse 11 sections to one clear action.
3. **`/sky`** (score 62) — fix the two font violations + the fake 0.82 gauge, keep the great summary strip.
4. **`/marketplace`** — the commerce/acquisition page; make Stars→discount tangible.
5. Everything else, one page per branch, same process.

---

*Change tokens, not pages. Fix UX before UI. One page, one branch, test on a phone.*
