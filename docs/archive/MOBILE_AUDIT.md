# Mobile Audit — Stellar (375px)

Verdict per page. ✓ done in this pass · → deferred · • observation only.

## globals.css / layout
- ✓ Body already locks `overflow-x: clip; max-width: 100vw; touch-action: pan-y`. Good baseline.
- ✓ Existing `@media (max-width:640px)` raises `min-height:44px` on form controls. Bumping to 767 below.
- ✓ Layout has `pt-14 pb-[88px]` already to clear top nav and bottom nav.
- ✓ `body::after` glow + global StarField — slow + dim at mobile.
- ✓ `prefers-reduced-motion` added to mobile block.
- ✓ Long unbreakable strings (hashes/wallet addresses) — added overflow-wrap globally on mobile.
- ✓ Safe-area paddings present on body and BottomNav already; topbar `top: env(safe-area-inset-top)` added.

## Homepage `/`
- ✓ Hero h1 `text-[56px] md:text-[72px]` reads 56px on phone. Lower base.
- ✓ Section titles `text-[40px] md:text-[60px]` — drop base.
- ✓ "How it works" / pillar cards `p-12` (48px) — drop on mobile.
- ✓ CTA pill section title `text-[40px] md:text-[60px]`.
- ✓ Comparison table — already wraps horizontally with `overflow-x-auto`, leave it.
- ✓ Mission grid already `grid-cols-2 md:grid-cols-4` ✓.

## Sky `/sky`
- ✓ Already has `@media (max-width: 700px)` — good. 
- ✓ Forecast row already scroll-x at <980. Confirmed.
- ✓ Planet grid `auto-fit minmax(190 → 160 at 700)` — fine.
- ✓ Make sure `sky-container` mobile padding works.

## Missions `/missions`
- ✓ Page is mostly Tailwind via PageContainer; uses native CSS grid via inline styles in some spots — quick scan shows reasonable defaults; bottom-nav clearance covered globally.

## Markets `/markets`
- ✓ Same: PageContainer-based, will inherit global mobile padding fixes.

## Marketplace `/marketplace`
- ✓ Reward tiers `grid grid-cols-3 overflow-x-auto min-w-[180px]` — at 360px wraps awkwardly. Convert to flex scroll on mobile.
- ✓ Product grid already `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` ✓.
- ✓ Filters row already `overflow-x-auto`.

## Profile `/profile`
- → Page is large; rely on global fixes. Inline-style cards are flex-based and stack naturally.

## Feed `/feed`
- ✓ Right sidebar hidden <820 already.
- ✓ Composer tool buttons (`Photo / Observation / Location / NFT`) collapse to icon-only on mobile.
- ✓ Filter tabs touch-target.
- ✓ Card padding 14px on mobile.
- ✓ Avatars 36/28 mobile sizing.
- ✓ Reaction picker hidden on mobile (single tap = stars).
- ✓ `backdrop-filter: blur(20)` reduced to 8.
- ✓ Achievement icon 56→44.

## NFTs `/nfts`
- ✓ Already `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` ✓.

## Leaderboard `/leaderboard`
- → Podium structure not touched in this pass — global fixes cover container.

## Dark Sky `/darksky`
- • 5-line file; routes elsewhere. No work.

## Chat `/chat`
- → Inherits global mobile fixes (font 14, touch targets, safe area).
