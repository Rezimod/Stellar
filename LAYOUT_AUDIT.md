# Layout Audit — 2026-04-25

## Canonical Layout

**File:** `src/app/layout.tsx`

**Provides (mounted globally for every route):**
- `Nav` — `src/components/shared/Nav.tsx` (top fixed bar; hamburger dropdown, search, centered STELLAR logo, profile/login pill)
- `Footer` — `src/components/shared/Footer.tsx` (desktop-only `hidden sm:block` 4-column footer)
- `BottomNav` — `src/components/shared/BottomNav.tsx` (mobile-only `sm:hidden` 5-tab bottom bar)
- Plus: `StarField`, `OfflineBanner`, `PullToRefresh`, `AstraPopup`, `Toaster`, `PageTransition`

**Wraps these pages (every page in the app — there are no route groups, no other layout owns chrome):**
- `/` — `src/app/page.tsx`
- `/sky` — `src/app/sky/page.tsx`
- `/chat` — `src/app/chat/page.tsx`
- `/markets` — `src/app/markets/page.tsx`
- `/markets/[id]` — `src/app/markets/[id]/page.tsx`
- `/markets/test-adapter` — `src/app/markets/test-adapter/page.tsx`
- `/missions` — `src/app/missions/page.tsx`
- `/marketplace` — `src/app/marketplace/page.tsx`
- `/network` — `src/app/network/page.tsx`
- `/leaderboard` — `src/app/leaderboard/page.tsx`
- `/learn` — `src/app/learn/page.tsx`
- `/nfts` — `src/app/nfts/page.tsx`
- `/observations` — `src/app/observations/page.tsx`
- `/profile` — `src/app/profile/page.tsx`
- `/settings` — `src/app/settings/page.tsx`
- `/club` — `src/app/club/page.tsx`
- `/proof` — `src/app/proof/page.tsx`
- `/my-positions` — `src/app/my-positions/page.tsx`
- `/admin/resolve` — `src/app/admin/resolve/page.tsx`
- `/darksky` — `src/app/darksky/page.tsx` (server `redirect('/network')`; never renders)
- `/star/[catalogId]` — `src/app/star/[catalogId]/page.tsx`
- `/observe/[missionId]` — `src/app/observe/[missionId]/page.tsx` *(also wrapped by nested layout, see below)*
- `/observe/[missionId]/capture` — `.../capture/page.tsx`
- `/observe/[missionId]/result` — `.../result/page.tsx`
- `/observe/[missionId]/verify` — `.../verify/page.tsx`

---

## Non-Canonical Layouts

**File:** `src/app/observe/[missionId]/layout.tsx`
- Wraps: `/observe/[missionId]`, `/observe/[missionId]/capture`, `/observe/[missionId]/result`, `/observe/[missionId]/verify`
- Provides: **no chrome.** Only renders `<ObserveFlowProvider>{children}</ObserveFlowProvider>` — a React context for the multi-step observation flow. It does NOT override Nav / Footer / BottomNav (those still come from the root layout).
- **Action:** Keep. It is not a chrome override; deleting it would break the observation flow's shared state.

No other nested `layout.tsx` files exist under `src/app`.

---

## Pages With Inline Layout JSX

**No page renders an inline `<nav>` or `<footer>` element for global chrome.** No page imports `Nav`, `Footer`, `BottomNav`, or any `Navbar`/`Header` component directly — confirmed by a full-tree grep against `src/app/`.

The following pages contain inline `<header>` HTML elements, but these are semantic page-section headings, not layout-level chrome:

- `src/app/markets/page.tsx:367` — `<header className="mkt-section-header">` (markets list section header)
- `src/app/my-positions/page.tsx:255, 294, 830` — three section `<header>` elements inside the page
- `src/app/admin/resolve/page.tsx:96` — section `<header>` inside the admin page

Additionally, `src/app/chat/page.tsx` renders a sticky in-thread "ASTRA" header (avatar + name + online dot, sits below the global Nav). This is intentional chat-thread context, not a nav replacement — flagged for design review but not a structural duplicate.

---

## Old Nav/Footer Components (should be removed from imports)

**None exist.** A previous audit pass already removed `DesktopSidebar.tsx` and its CSS hooks (commit `df582dc`).

Verified: no file in `src/` references `DesktopSidebar`, `sidebar-main-offset`, `sidebar-expanded`, or `stellar:sidebar-toggle`.

One stale-but-harmless artifact:

- `src/components/markets/SkyMapHeader.tsx` — defines and exports `SkyMapHeader`, but **no file imports it.** Not chrome; this is a dead page-component (not a layout/nav header). Can be deleted as a separate cleanup, but it is not in scope for layout consolidation since it never mounts.

---

## Old Branding Locations

All searches returned **zero matches**:

- `grep -rn "Vibecoding" src/` → no matches
- `grep -rn "vibecoding" src/` → no matches
- `grep -rn "Scriptonia" src/` → no matches
- `grep -rn "scriptonia" src/` → no matches
- `grep -rn "Vibe Coding" src/` → no matches
- `grep -rn "From 0 Hackathon" src/` → no matches
- `grep -rn "club.astroman.ge/logo" src/` → no matches

(For reference, a sweep for the current brand `Stellarr` only matched `src/app/api/solana-pay/create/route.ts:50` and `:52` — Solana Pay label/message strings. These are current branding, not stale.)

---

## Migration Plan

**There is no layout-consolidation work required.** Every route already inherits the same root layout. No page bypasses, duplicates, or imports its own nav/footer. The only nested layout (`observe/[missionId]/layout.tsx`) is a context provider, not a chrome override. The previously-flagged orphan (`DesktopSidebar`) and its CSS hooks are already gone.

| Page | Action needed | Risk |
|---|---|---|
| All routes listed under "Canonical Layout" | **None.** Already wrapped by the canonical root layout. | — |
| `src/app/observe/[missionId]/layout.tsx` | **Keep.** Wraps observation flow with `ObserveFlowProvider` context only; no chrome. | — |
| `src/app/chat/page.tsx` (sticky in-thread "ASTRA" header) | **None for layout work.** It is content, not a nav. Optional design call: merge into Nav for `/chat` only, or keep as-is. | low (design call, not structural) |

Out-of-scope cleanups noted but not part of this consolidation:

1. Delete unused `src/components/markets/SkyMapHeader.tsx` (dead component, not imported anywhere). Risk: low.
2. Three pages (`sky`, `markets`, `missions`) each implement an independent light/dark theme toggle with their own `localStorage` key, despite a global `ThemeProvider` already existing. This is a theme-system divergence, not a layout one. Risk: medium — touches user-visible behavior; confirm with user before unifying.
