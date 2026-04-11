# STELLAR — Audit Prompts
## Post-Audit Execution Plan · April 12, 2026
### Colosseum Frontier Hackathon · Deadline: May 10, 2026

---

## HOW TO USE THIS FILE

One new Claude Code conversation per prompt. Run in order within each phase.
After each prompt completes → commit + push to git immediately.
Each prompt = one commit.

**Current score: 70% hackathon-ready** — code foundation is strong, deployment and remaining features need to land in the next 4 weeks.

---

## PHASE 0 — Emergency Bug Fixes
### This Weekend (April 12–13)
*These are blocking bugs. Fix before doing anything else.*

---

### ✅ BUG-FIX-1 — Force Vercel Redeploy

No code change needed. Push an empty commit to force a clean rebuild:

```bash
git commit --allow-empty -m "chore: force redeploy to clear stale Vercel cache"
git push
```

Then in Vercel dashboard: Settings → Functions → Purge Cache.

After deploy: manually verify `/sky`, `/marketplace`, `/profile`, `/chat`, `/nfts` all show the updated nav and footer.

---

### ✅ BUG-FIX-2 — Profile Sign-Out Wipes Progress

```
I'm building Stellar. There's a critical bug in the profile page: sign-out calls reset() which wipes all user progress (missions, Stars, history).

Read this file fully:
  src/app/profile/page.tsx

Find the handleSignOut function (around line 57). It calls reset().

Fix: remove the reset() call. Replace with setWallet('') only:

  const handleSignOut = async () => {
    await logout();
    setWallet('');
    router.push('/');
  };

The reset function should NOT be called — it clears localStorage state including mission progress.
Make sure setWallet is imported from the useAppState hook (it's already in the context).

Do not change anything else on the profile page.
```

---

### ✅ BUG-FIX-3 — Footer GitHub URL

```
I'm building Stellar. The footer has a wrong GitHub link.

Read src/components/shared/Footer.tsx.

Find the GitHub link (around line 29). It currently points to:
  https://github.com/Morningbriefrezi/Stellar

Change it to:
  https://github.com/Rezimod/Stellar

No other changes.
```

---

### ✅ BUG-FIX-4 — Homepage Mission Cards Don't Match Real Missions

```
I'm building Stellar. The homepage shows hardcoded mission cards that don't match the real missions in constants.ts. Judges will notice the inconsistency.

Read these files:
  src/app/page.tsx
  src/lib/constants.ts

Find the "Active Missions" section in page.tsx (around line 436-438). It currently shows:
  - "Lunar Observation" +50✦
  - "Jupiter's Moons" +120✦ (Advanced)
  - "Deep Sky Survey" +200✦

These missions don't exist in constants.ts. Replace this section with REAL missions from constants.ts.

Import MISSIONS from '@/lib/constants' at the top of page.tsx.

In the Active Missions section, render the first 4 missions from MISSIONS using .slice(0, 4).map().

Each mission card should show: mission.emoji, mission.name, mission.difficulty, mission.stars + "✦".

Keep the same card styling. Only replace the hardcoded data with the imported MISSIONS array.

Do not change any other section of page.tsx.
```

---

### ✅ BUG-FIX-5 — "View My Discoveries" Links to Wrong Page

```
I'm building Stellar. On the mission success screen, "View My Discoveries" goes to /profile but should go to /nfts.

Read src/components/sky/MissionActive.tsx.

Find the done step render (step === 'done'). Find the "View My Discoveries" button or link.
Change its href/destination from '/profile' to '/nfts'.

No other changes.
```

---

### ✅ BUG-FIX-6 — Verify INTERNAL_API_SECRET Not Blocking Mint

```
I'm building Stellar. There may be a critical bug where the INTERNAL_API_SECRET env var blocks ALL mint calls from the client.

Read these files:
  src/app/api/mint/route.ts
  src/app/api/award-stars/route.ts
  src/components/sky/MissionActive.tsx

Check the auth guard logic in /api/mint/route.ts. If the check is:
  const secret = process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) { return 401 }

This will block all client requests when secret is set. Fix the guard to only block when BOTH conditions are true:
  if (secret && authHeader !== `Bearer ${secret}`) { return 401 }

Apply the same fix to /api/award-stars/route.ts if it has the same pattern.

MissionActive.tsx does NOT need to send an auth header — the fix is purely on the server.
```

---

## PHASE 1 — Core Content & Text Fixes
### April 14–15

---

### CONTENT-1 — Fix "How It Works" Jargon + USD Prices + Builder Line

```
I'm building Stellar. Several text strings on the homepage use crypto jargon or are unclear to non-crypto judges. Fix them all in one pass.

Read src/app/page.tsx fully.

TASK 1 — "How It Works" section:
Find the 4-step "How It Works" section. Update these specific steps:
  Step 3: Change "Sky oracle verifies clear conditions" → "AI verifies your sky conditions"
  Step 4: Change "Discovery sealed on Solana as compressed NFT" → "Your discovery is permanently recorded on Solana"
  Steps 1 and 2: leave as-is.

TASK 2 — USD pricing in products/rewards section:
Find where GEL prices are shown (e.g. "29 GEL", "45 GEL", "299 GEL").
Add approximate USD equivalents in parentheses:
  29 GEL → "29 GEL (~$10)"
  45 GEL → "45 GEL (~$16)"
  299 GEL → "299 GEL (~$105)"
  Apply same logic to any other GEL prices shown.

TASK 3 — Builder credit line:
Find the builder credit line (around the footer area of homepage content). It likely says:
  "Built solo by an astronomy store owner using AI development tools"
Change to:
  "Built solo by a telescope shop owner from Georgia — for astronomers everywhere."

TASK 4 — "Live on Solana" trust badge:
Find the trust line near the hero CTA buttons ("Free to join · No wallet needed · Powered by Solana").
Add a pulsing green dot badge before the line:
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', animation: 'pulse 2s infinite' }} />
    Live on Solana Devnet
  </span>
Add this as a new small line below the existing trust line.

Do not change any animations, star field, card layout, or other sections.
```

---

### CONTENT-2 — Fix README + Manifest

```
I'm building Stellar. Two files have outdated content.

Read these files:
  README.md
  public/manifest.json

TASK 1 — README.md:
Find the git clone URL. It says github.com/Morningbriefrezi/Stellar. Change to github.com/Rezimod/Stellar.
Find any mention of "High Point Scientific". Change to "Celestron" (or remove if MARKET-1 hasn't run yet — just remove the High Point reference).

TASK 2 — manifest.json:
Find the description field. It says "AI-Powered Window to the Cosmos". 
Change to: "Observe the night sky. Earn Stars tokens. Collect discovery NFTs on Solana."

Find the name field. Verify it says "Stellar" (not "Stellarr" or old name). Fix if wrong.

Do not add icons — that's handled in PWA-1. Only update the text fields.
```

---

### CONTENT-3 — Fix Leaderboard Empty State on Homepage

```
I'm building Stellar. The homepage shows a leaderboard section that's completely empty, which hurts credibility with judges.

Read src/app/page.tsx.

Find the leaderboard section. It shows "The leaderboard is empty."

Two options — choose whichever is already closest to what's there:

Option A: Hide the leaderboard section entirely on the homepage if it's empty (add a conditional: if no data, return null for the section).

Option B: Add 3 static seed entries so it's not empty:
  1. 🥇 StargazerRezi — 7 observations · 875 ✦
  2. 🥈 AstroNika — 4 observations · 460 ✦  
  3. 🥉 NightObserver — 2 observations · 225 ✦
  Style: each row as a flex row with rank medal emoji, name (text-sm text-white), stats (text-xs text-slate-400).
  Add a small note: "Real rankings update daily" in text-xs text-slate-600 below the list.

Pick Option B if the leaderboard section has a visible card. Pick Option A if it's just text in an otherwise nice-looking section.
```

---

## PHASE 2 — Marketplace Expansion (MARKET-1)
### April 15–17

---

### MARKET-1 — Add Celestron US + Bresser EU Dealers

```
I'm building Stellar. The marketplace currently only has Astroman (Georgia) and High Point Scientific (US). I need to replace High Point with Celestron and add Bresser for European users.

Read these files fully before writing anything:
  src/lib/dealers.ts
  src/lib/location.tsx (for Region type)
  src/app/marketplace/page.tsx

---

TASK 1 — Update src/lib/dealers.ts:

Remove the 'highpoint-us' dealer entirely.
Add these two dealers:

Celestron (US):
  id: 'celestron-us'
  name: 'Celestron'
  tagline: "World's #1 telescope brand"
  region: 'north_america'
  url: 'https://celestron.com'
  flag: '🇺🇸'
  shipsTo: ['US', 'CA']
  products: (6 products)
    1. { id: 'cel-nexstar6se', name: 'Celestron NexStar 6SE', price: 849, currency: 'USD', category: 'telescope', image: 'https://www.celestron.com/cdn/shop/files/11068-1.jpg' }
    2. { id: 'cel-astromaster70', name: 'Celestron AstroMaster 70AZ', price: 109, currency: 'USD', category: 'telescope', image: 'https://www.celestron.com/cdn/shop/files/21061_1.jpg' }
    3. { id: 'cel-starsense', name: 'Celestron StarSense Explorer 100AZ', price: 229, currency: 'USD', category: 'telescope', image: 'https://www.celestron.com/cdn/shop/files/22460_1.jpg' }
    4. { id: 'cel-powerseeker', name: 'Celestron PowerSeeker 60AZ', price: 59, currency: 'USD', category: 'telescope', image: 'https://www.celestron.com/cdn/shop/files/21041-2.jpg' }
    5. { id: 'cel-omni102', name: 'Celestron Omni XLT 102AZ', price: 349, currency: 'USD', category: 'telescope', image: 'https://www.celestron.com/cdn/shop/files/21086_1.jpg' }
    6. { id: 'cel-eyepiece', name: 'Celestron Eyepiece & Filter Kit', price: 49, currency: 'USD', category: 'accessory', image: 'https://www.celestron.com/cdn/shop/files/94303_1.jpg' }

Bresser (Europe):
  id: 'bresser-eu'
  name: 'Bresser'
  tagline: "Germany's leading optics manufacturer"
  region: 'europe'
  url: 'https://bresser.de'
  flag: '🇩🇪'
  shipsTo: ['DE', 'AT', 'CH', 'FR', 'IT', 'NL', 'BE', 'PL']
  products: (6 products)
    1. { id: 'bre-junior70', name: 'Bresser Junior Telescope 70/700', price: 79, currency: 'EUR', category: 'telescope', image: 'https://images.bresser.de/images/product/main/1700940_1.jpg' }
    2. { id: 'bre-messier80', name: 'Bresser Messier AR-80/400', price: 199, currency: 'EUR', category: 'telescope', image: 'https://images.bresser.de/images/product/main/4827604_1.jpg' }
    3. { id: 'bre-pollux90', name: 'Bresser Pollux 90/1260 EQ3', price: 349, currency: 'EUR', category: 'telescope', image: 'https://images.bresser.de/images/product/main/4662900_1.jpg' }
    4. { id: 'bre-exos2', name: 'Bresser Exos-2 Mount', price: 599, currency: 'EUR', category: 'mount', image: 'https://images.bresser.de/images/product/main/4851040_1.jpg' }
    5. { id: 'bre-binoculars', name: 'Bresser Corvette 8×42 Binoculars', price: 149, currency: 'EUR', category: 'accessory', image: 'https://images.bresser.de/images/product/main/1830842_1.jpg' }
    6. { id: 'bre-eyepiece', name: 'Bresser Eyepiece Zoom 8-24mm', price: 59, currency: 'EUR', category: 'accessory', image: 'https://images.bresser.de/images/product/main/4920112_1.jpg' }

---

TASK 2 — Update Region type in src/lib/location.tsx:

Find: export type Region = 'caucasus' | 'north_america' | 'global'
Change to: export type Region = 'caucasus' | 'north_america' | 'europe' | 'global'

Add Europe to COUNTRY_TO_REGION:
  DE: 'europe', AT: 'europe', CH: 'europe', FR: 'europe',
  IT: 'europe', NL: 'europe', BE: 'europe', PL: 'europe',
  ES: 'europe', PT: 'europe', SE: 'europe', NO: 'europe',
  DK: 'europe', FI: 'europe', CZ: 'europe', HU: 'europe',

Add Germany preset to LocationPicker.tsx dropdown:
  Current presets: Tbilisi, New York, Los Angeles, Berlin
  "📍 Berlin, DE" currently maps to 'global' — change its region to 'europe'

---

TASK 3 — Update marketplace to handle 'europe' region:

In src/app/marketplace/page.tsx:
  The product filtering calls getProductsByRegion(location.region).
  Make sure 'europe' returns Bresser products.
  If location is 'global', return GLOBAL_FALLBACK = 3 products from Astroman + 3 from Celestron (no Bresser for global).
  If location is 'europe', return all Bresser products.
  If location is 'north_america', return all Celestron products.
  If location is 'caucasus', return all Astroman products.

---

TASK 4 — Update homepage partner stores section:

In src/app/page.tsx, find the partner stores section.
Replace the hardcoded content (showing "Astroman + High Point") with:

3 stores:
1. Astroman — "Georgia's first astronomy store" — ships to 🇬🇪 🇦🇲 🇦🇿 🇹🇷
2. Celestron — "World's #1 telescope brand" — ships to 🇺🇸 🇨🇦
3. Bresser — "Germany's leading optics manufacturer" — ships to 🇩🇪 🇦🇹 🇨🇭 + EU

Keep the same card styling. Just update the data.
```

---

## PHASE 3 — Success Overlay + Social Sharing (SHARE-1)
### April 19–21

---

### SHARE-1 — Full-Screen Shareable Success Overlay

```
I'm building Stellar. When a user completes an observation mission and the NFT is minted, they see a done screen inside MissionActive.tsx. This screen is currently basic. I need to replace it with a full-screen shareable overlay that looks impressive for demos.

Read these files fully:
  src/components/sky/MissionActive.tsx
  src/lib/constants.ts (for mission data, emoji, stars values)
  src/app/globals.css (for CSS variables)

---

TASK — Replace the done step UI in MissionActive.tsx:

Find where step === 'done' renders the completion screen. Replace the entire done step render with this design:

Full-screen overlay: fixed inset-0, z-50, bg rgba(5,8,16,0.97), backdrop-blur-sm
  - This overlay REPLACES the existing modal — animate in with fade + scale from 0.95 to 1

Layout: flex flex-col items-center justify-center, gap-6, px-6, text-center

TOP SECTION — Success animation:
  Large emoji (mission.emoji): text-7xl, with a slow pulse animation (keyframe: scale 1→1.08→1, 3s infinite)
  Below: "✦ VERIFIED ON SOLANA" — text-xs tracking-[0.3em] uppercase, color var(--accent-teal), font-mono

PROOF BOX:
  Container: bg rgba(52,211,153,0.05), border 1px solid rgba(52,211,153,0.2), rounded-2xl, px-6 py-5, w-full max-w-sm
  
  Heading: "Discovery Attestation" — text-sm font-semibold text-white, mb-3
  
  Data rows (each row: flex justify-between, text-xs):
    "Target"     →  mission.name (text-white)
    "Observer"   →  first 6 chars + "..." + last 4 chars of wallet address (text-white font-mono)
    "Stars"      →  "+{mission.stars} ✦" (color var(--accent-gold))
    "Network"    →  "Solana Devnet" (text-white)
    "Status"     →  🟢 Confirmed (color #34d399)
  
  If mintTxId exists (the tx hash from mint API):
    Add a final row: "Signature" → first 8 chars of txId + "..." (font-mono, color var(--accent-teal))
    Below the box: a small link "View on Solana Explorer →" (text-xs, color var(--accent-teal), opens explorer.solana.com/tx/{txId}?cluster=devnet in new tab)

HEADLINE:
  "Observation Confirmed" — text-2xl font-display font-bold text-white
  Subtext: "Your discovery has been permanently sealed on Solana." — text-sm text-slate-400, max-w-xs

SHARE BUTTONS ROW (flex gap-3, justify-center):
  
  Share on X button:
    bg rgba(255,255,255,0.06), border 1px solid rgba(255,255,255,0.1), rounded-xl, px-5 py-2.5
    Icon: X/Twitter logo (use a simple "𝕏" text or SVG)
    Label: "Share on X"
    onClick: window.open the tweet URL:
      const tweet = `Just confirmed my ${mission.name} observation with @StellarApp ✦ Verified on Solana.\n\nDiscover the night sky → stellarrclub.vercel.app`
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank')

  Share on Farcaster button:
    Same styling as X button
    Label: "Cast on Farcaster"
    onClick: window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(tweet)}`, '_blank')

BOTTOM BUTTONS (flex flex-col gap-3, w-full max-w-sm, mt-2):
  
  Primary: "View My Discoveries →"
    bg gradient (linear-gradient(135deg, #34D399, #14B8A6)), text-black, font-semibold, rounded-xl, py-3, w-full
    onClick: router.push('/nfts')
  
  Secondary: "Back to Missions"
    bg transparent, border 1px solid rgba(255,255,255,0.1), text-slate-400, rounded-xl, py-3, w-full
    onClick: reset mission state, close overlay

Add mintTxId to the component's state if it doesn't exist yet — it should be set when the mint API returns a txId.
Pass it down or lift from wherever the mint response is handled.
```

---

## PHASE 4 — Dark Sky Map Upgrade (DARKSKY-1)
### April 21–24

---

### DARKSKY-1 — Replace Static SVG with Interactive Leaflet Map

```
I'm building Stellar. The dark sky page (/darksky) currently shows a static SVG map with 6 hardcoded Georgian locations. I need to replace it with an interactive Leaflet map with a NASA light pollution tile layer.

Read these files fully:
  src/app/darksky/page.tsx
  package.json (check if react-leaflet is installed)

---

TASK 1 — Install dependencies:

If 'react-leaflet' and 'leaflet' are NOT in package.json, add this instruction at the top:
  npm install react-leaflet leaflet @types/leaflet

---

TASK 2 — Create src/components/darksky/DarkSkyMap.tsx:

'use client'

Import: import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
Import: import 'leaflet/dist/leaflet.css'
Import: import dynamic from 'next/dynamic' — this component must be dynamically imported (Leaflet needs window)

Type: DarkSkyLocation {
  name: string
  nameKa: string
  lat: number
  lon: number
  bortle: number      // 1–9
  sqm: number         // sky quality meter reading (higher = darker)
  altitude: number    // meters
  notes: string
}

LOCATIONS data (keep the 6 Georgian sites, add 3 global dark sky sites):
  // Georgia
  { name: 'Kazbegi National Park', nameKa: 'ყაზბეგი', lat: 42.6632, lon: 44.6562, bortle: 2, sqm: 21.8, altitude: 1750, notes: 'Best dark sky in Georgia. Bortle 2 — exceptional.' },
  { name: 'Mestia / Svaneti', nameKa: 'მესტია', lat: 43.0500, lon: 42.7300, bortle: 2, sqm: 21.5, altitude: 1500, notes: 'High altitude mountain range. Outstanding transparency.' },
  { name: 'Borjomi Gorge', nameKa: 'ბორჯომი', lat: 41.8369, lon: 43.3964, bortle: 3, sqm: 21.2, altitude: 800, notes: 'Bortle 3 — rural sky. Good for wide-field observing.' },
  { name: 'Kutaisi Outskirts', nameKa: 'ქუთაისი', lat: 42.1500, lon: 42.6000, bortle: 4, sqm: 20.5, altitude: 300, notes: 'Bortle 4 — suburban. Suitable for planets and Moon.' },
  { name: 'Batumi Foothills', nameKa: 'ბათუმი', lat: 41.7000, lon: 41.8500, bortle: 5, sqm: 19.8, altitude: 400, notes: 'Bortle 5 — rural/suburban transition.' },
  { name: 'Tbilisi', nameKa: 'თბილისი', lat: 41.6938, lon: 44.8015, bortle: 8, sqm: 17.5, altitude: 490, notes: 'Bortle 8 — city sky. Moon and planets only.' },
  // Global reference sites
  { name: 'Cherry Springs, Pennsylvania', nameKa: 'Cherry Springs', lat: 41.6640, lon: -77.8249, bortle: 2, sqm: 22.0, altitude: 670, notes: 'Gold-tier dark sky park, USA.' },
  { name: 'La Palma, Canary Islands', nameKa: 'La Palma', lat: 28.6585, lon: -17.8646, bortle: 1, sqm: 22.3, altitude: 2400, notes: 'UNESCO Starlight Reserve. Among the darkest in Europe.' },
  { name: 'Atacama Desert, Chile', nameKa: 'Atacama', lat: -24.6282, lon: -70.4040, bortle: 1, sqm: 22.5, altitude: 2400, notes: 'Driest place on Earth. World-class observatories here.' },

Bortle color mapping:
  1-2: '#34D399' (dark green — pristine)
  3-4: '#86EFAC' (light green — rural)
  5-6: '#FCD34D' (amber — suburban)
  7-8: '#F97316' (orange — urban)
  9:   '#EF4444' (red — city center)

Map config:
  Center: [42.0, 43.5] (Georgia center), zoom: 6
  Min zoom: 2, Max zoom: 12
  Height: 400px (mobile), 500px (desktop)
  Dark map tile: use OpenStreetMap with dark styling:
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    Actually use CartoDB dark tiles: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'

For each location, render a CircleMarker:
  center={[loc.lat, loc.lon]}
  radius={bortle <= 2 ? 12 : bortle <= 4 ? 10 : bortle <= 6 ? 8 : 7}
  fillColor={bortleColor(loc.bortle)}
  fillOpacity={0.85}
  color={bortleColor(loc.bortle)}
  opacity={0.4}
  weight={2}

Popup on click:
  Location name (bold, text-sm)
  Bortle: {bortle} / SQM: {sqm}
  Altitude: {altitude}m
  Notes: {notes}
  
  Style popup: dark background (#0D1321), white text, rounded-lg

---

TASK 3 — Update src/app/darksky/page.tsx:

Replace the static SVG map section with a dynamic import of DarkSkyMap:

  const DarkSkyMap = dynamic(
    () => import('@/components/darksky/DarkSkyMap'),
    { ssr: false, loading: () => <div style={{ height: 400, background: '#0D1321', borderRadius: 16 }} /> }
  )

Keep all other sections (Bortle scale legend, stats bar, CTA) — only replace the static SVG map element.

Update the stats bar numbers:
  "9 Dark Sites" → "9 Sites Mapped"
  "3 Countries" → "3 Countries"
  Keep the rest.
```

---

## PHASE 5 — PWA + First-Time Onboarding
### April 24–26

---

### PWA-1 — Installable App + Proper Manifest Icons

```
I'm building Stellar. The app is not installable as a PWA because the manifest.json has no real PNG icons and outdated metadata.

Read these files:
  public/manifest.json
  src/app/layout.tsx
  src/app/globals.css

---

TASK 1 — Generate app icon SVG and save as public/icon.svg:

Create public/icon.svg with this design:
  viewBox: 0 0 512 512
  Background circle: fill #0B0E17, r=256, cx=256, cy=256
  Outer ring: stroke #8B5CF6, strokeWidth=8, r=240, fill=none, opacity=0.4
  Star symbol (✦): centered at 256,256
    Draw as 4-pointed star using path:
    M256 96 L270 242 L416 256 L270 270 L256 416 L242 270 L96 256 L242 242 Z
    fill: url(#iconGrad)
  Define gradient:
    <linearGradient id="iconGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#34D399"/>
      <stop offset="100%" stopColor="#8B5CF6"/>
    </linearGradient>

---

TASK 2 — Update public/manifest.json:

  {
    "name": "Stellar",
    "short_name": "Stellar",
    "description": "Observe the night sky. Earn Stars tokens. Collect discovery NFTs on Solana.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#070B14",
    "theme_color": "#070B14",
    "orientation": "portrait",
    "icons": [
      { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" },
      { "src": "/favicon.ico", "sizes": "48x48", "type": "image/x-icon" }
    ]
  }

---

TASK 3 — Add iOS and PWA meta tags to src/app/layout.tsx:

In the <head> section (inside metadata or as direct head tags), ensure these exist:
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Stellar" />
  <meta name="theme-color" content="#070B14" />

If these are already present: skip.
If layout uses Next.js metadata object (export const metadata): add them under themeColor and appleWebApp fields.

---

TASK 4 — Add safe-area padding to bottom nav:

In src/components/shared/BottomNav.tsx:
  Find the bottom nav container. It likely has a fixed bottom-0 position.
  Add: paddingBottom: 'env(safe-area-inset-bottom, 0px)' as inline style
  OR add: pb-safe-bottom as class if tailwind-safe-area is configured.

This prevents content from going under the iPhone home indicator.
```

---

### ONBOARD-1 — First-Time User Onboarding Overlay

```
I'm building Stellar. New users land on the homepage with no context. I need a first-time onboarding overlay that shows once on first visit.

Read these files:
  src/app/page.tsx
  src/hooks/useAppState.ts
  src/app/globals.css

---

TASK 1 — Create src/components/shared/OnboardingOverlay.tsx:

'use client'

This component shows only on the user's very first visit (check localStorage key 'stellar_onboarded').
If 'stellar_onboarded' exists → return null immediately (no render).

Overlay: fixed inset-0, z-[100], bg rgba(5,8,16,0.96), backdrop-blur-md
  - Animate in: opacity 0→1, translateY 20px→0, duration 400ms ease-out

Layout: flex flex-col items-center justify-center, px-6, text-center, gap-6

STEP 1 OF 3 — Welcome:
  ✦ STELLAR (text-xs tracking-[0.3em] color #34D399, font-mono, uppercase)
  
  "Welcome to Stellar" (text-3xl font-display font-bold text-white, mt-4)
  "The astronomy app that rewards real sky observers." (text-base text-slate-400, max-w-xs, mt-2)
  
  3 benefit pills (flex flex-col gap-2, mt-6, w-full max-w-xs):
    "🌤 7-day sky forecast & planet tracker"
    "✦ Earn Stars tokens for real observations"  
    "🔭 Shop telescopes from your local dealer"
    Each: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08), rounded-xl, py-2.5 px-4, text-sm text-white, text-left
  
  Primary button: "Get Started →"
    bg linear-gradient(135deg, #34D399, #14B8A6), text-black font-semibold
    rounded-xl, py-3, w-full max-w-xs, mt-6
    onClick: set localStorage 'stellar_onboarded' = '1', close overlay

  Skip link: "I know how this works" (text-xs text-slate-600, mt-3, cursor-pointer)
    onClick: same as Get Started (dismiss overlay)

---

TASK 2 — Wire OnboardingOverlay into src/app/page.tsx:

Import OnboardingOverlay from '@/components/shared/OnboardingOverlay'

Add <OnboardingOverlay /> as the FIRST child inside the page's root div, before the hero section.

The overlay manages its own visibility via localStorage — no props needed from the parent page.
```

---

## PHASE 6 — Design System Upgrade (D1–D3)
### April 26–30
*These are design-only prompts — no blockchain logic, no API routes.*

---

### DESIGN-1 — Typography + Color CSS Variables

See full prompt in STELLAR_DESIGN_PROMPTS.md → PROMPT D1.

Summary of changes:
- Add Plus Jakarta Sans + DM Sans + JetBrains Mono fonts to layout.tsx
- Add CSS custom property system to globals.css (bg, border, text, accent, gradient, shadow, radius variables)
- Add utility classes: .card-base, .glow-teal, .glow-gold, .page-enter, .stagger-1 through .stagger-5
- Update Tailwind config with font families and color extensions
- Do NOT modify any page files

---

### DESIGN-2 — ScoreRing + StatCard + LoadingRing Components

See full prompt in STELLAR_DESIGN_PROMPTS.md → PROMPT D2.

Summary of changes:
- Create src/components/ui/ScoreRing.tsx — animated SVG arc ring for scores
- Create src/components/ui/StatCard.tsx — data card with left accent bar and trend indicator
- Create src/components/ui/LoadingRing.tsx — skeleton/loading state ring

---

### DESIGN-3 — Sky Page Visual Upgrade

```
I'm building Stellar. The sky page (/sky) is functional but looks plain. I want to apply the new design system to make it feel premium.

Read these files fully:
  src/app/sky/page.tsx
  src/components/sky/TonightHighlights.tsx (if exists)
  src/components/sky/ForecastGrid.tsx (if exists)
  src/components/sky/PlanetGrid.tsx (if exists)
  src/app/globals.css

---

TASK 1 — TonightHighlights or equivalent:
If there's a component showing tonight's overall conditions (score, cloud cover, seeing):
  - Wrap the score number in a ScoreRing component (import from src/components/ui/ScoreRing.tsx)
  - Size: 120px on mobile, 140px on desktop
  - Color: 'gradient' (teal→cyan)
  - Label: "Sky Score"

TASK 2 — ForecastGrid day cards:
Each day card should:
  - Use .card-base CSS class instead of inline bg styles
  - Add transition hover:scale(1.02) on desktop
  - The "Go" badge → bg rgba(52,211,153,0.15), border rgba(52,211,153,0.3), text #34D399
  - The "Maybe" badge → bg rgba(245,158,11,0.15), border rgba(245,158,11,0.3), text #F59E0B
  - The "Skip" badge → bg rgba(239,68,68,0.12), border rgba(239,68,68,0.2), text #EF4444

TASK 3 — PlanetGrid cards:
Each planet card:
  - Add 1px left border accent matching planet color (or default teal)
  - Planet name: font-display font-bold
  - Time strings (rise/transit/set): font-mono text-xs

Do not change API calls, data fetching, or component logic — only visual styles.
```

---

## PHASE 7 — Performance + Gamification
### May 1–4

---

### PERF-1 — Next.js Image Optimization + API Caching

```
I'm building Stellar. Product images use <img> tags instead of Next.js <Image>, and API responses have no cache headers. Fix both.

Read these files:
  src/app/marketplace/page.tsx
  src/lib/dealers.ts
  next.config.ts
  src/app/api/sky/forecast/route.ts (or equivalent sky API route)

---

TASK 1 — Add image domains to next.config.ts:

Add to the images config:
  remotePatterns: [
    { protocol: 'https', hostname: 'www.celestron.com' },
    { protocol: 'https', hostname: 'images.bresser.de' },
    { protocol: 'https', hostname: 'astroman.ge' },
  ]

If remotePatterns already exists, append to the array.

---

TASK 2 — Replace <img> with <Image> in marketplace:

In src/app/marketplace/page.tsx:
  import Image from 'next/image'
  
  Find every <img> tag rendering a product image.
  Replace with:
    <Image
      src={product.image}
      alt={product.name}
      width={300}
      height={200}
      style={{ objectFit: 'cover' }}
      unoptimized={!product.image.startsWith('https://')}
    />

---

TASK 3 — Add cache headers to sky API routes:

In each sky API route (forecast, planets, sun-moon):
  Add at the top of the GET handler:
    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    })
  
  1800 seconds = 30 minutes cache. Sky data doesn't change faster than that.

---

TASK 4 — Lazy-load star field canvas:

In src/app/page.tsx:
  Find the star field canvas animation.
  Wrap it in a useEffect that checks if IntersectionObserver is available.
  If the canvas is not in viewport (user hasn't scrolled to it), pause the animation loop.
  Resume when it enters the viewport.
  
  This prevents the animation from consuming CPU when not visible.
```

---

### GAMIFY-1 — Streak Badge + Rank Progression

```
I'm building Stellar. The gamification elements (streak, rank progression) exist in the backend but are not visible enough in the UI.

Read these files:
  src/app/missions/page.tsx
  src/app/profile/page.tsx
  src/components/sky/StatsBar.tsx (if exists)

---

TASK 1 — Streak badge on missions page:

In src/app/missions/page.tsx, find the top stats bar.
If there's already a streak display → style it as a badge:
  Container: flex items-center gap-1.5, bg rgba(245,158,11,0.12), border rgba(245,158,11,0.25) rounded-full px-3 py-1
  🔥 emoji + streak number + "day streak" text
  text-xs, color #F59E0B
  
If streak is 0: don't show the badge (hide entirely).

---

TASK 2 — Rank progress bar in profile:

In src/app/profile/page.tsx, find the rank display section.
Add a progress bar showing progress to the next rank:

  Current ranks: Cadet (0) → Observer (5 missions) → Astronomer (20) → Navigator (50)
  
  Calculate: progressToNext = (missionsCompleted - currentRankThreshold) / (nextRankThreshold - currentRankThreshold)
  
  Render:
    Current rank badge (existing, keep)
    Progress bar: w-full h-1.5, bg rgba(255,255,255,0.08), rounded-full
      Inner bar: width = progressToNext * 100 + '%', bg linear-gradient(90deg, #34D399, #14B8A6), rounded-full
      Transition: width 600ms ease-out
    Below bar: text-xs text-slate-500 "X missions to {nextRank}"

---

TASK 3 — Mission completion count in stats:

In the stats bar (missions page and/or profile), ensure the mission count is sourced from real data, not just localStorage state. It should read from the observation_log count via the API.

If there's already an API call for this → just verify it's wired to the display.
If not → add: fetch('/api/observe/history', { method: 'GET' }) and count the returned observations.
```

---

### POLISH-1 — Loading, Empty, and Error States

```
I'm building Stellar. Several pages show a blank screen while loading or an unhelpful state when there's no data.

Read these files:
  src/app/nfts/page.tsx
  src/app/profile/page.tsx
  src/app/marketplace/page.tsx

---

TASK 1 — NFT gallery loading state:

In src/app/nfts/page.tsx:
  If the current loading state shows nothing or "Loading...":
  Replace with a skeleton grid:
    3 skeleton cards, each: bg rgba(255,255,255,0.04), rounded-2xl, h-48
    Pulsing animation: @keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
    Apply: animation: pulse 1.5s ease-in-out infinite

  Empty state (user has no NFTs):
    Show a centered card with telescope emoji, "No discoveries yet" heading, and a button "Start Your First Mission →" linking to /missions

  Error state:
    Show: "Couldn't load NFTs" + "Retry" button that re-triggers the fetch

---

TASK 2 — Marketplace "no products" state:

In src/app/marketplace/page.tsx:
  If no products found for current region (empty array after filtering):
  Instead of the current "No partner stores in your area yet" text, show:
    A centered card: "No stores in your region yet"
    Subtext: "Products from Astroman ship worldwide."
    Below: show the Astroman products anyway as fallback (import GLOBAL_FALLBACK from dealers.ts)

---

TASK 3 — Profile loading state:

In src/app/profile/page.tsx:
  While Stars balance and streak are loading (before API response):
  Show a shimmer placeholder for each stat value:
    bg rgba(255,255,255,0.06), w-16, h-5, rounded-md, pulse animation
  Replace with real values when loaded.
```

---

## PHASE 8 — AI Photo Analyzer + Advanced Dark Sky (DARKSKY-2)
### May 5–7

---

### DARKSKY-2 — Community Sky Reports + AI Photo Analyzer

```
I'm building Stellar. I want to add two things to the dark sky page:
1. A way for users to submit sky condition reports
2. Claude Vision analyzing uploaded sky photos for light pollution assessment

Read these files:
  src/app/darksky/page.tsx
  src/app/api/ (list directory)
  src/lib/constants.ts

---

TASK 1 — Create /api/analyze-sky/route.ts:

POST handler accepting multipart form data:
  Fields: image (file), lat (number), lon (number)

Processing:
  1. Convert image to base64
  2. Send to Claude API (claude-sonnet-4-6) with vision:
     System: "You are an expert astronomer analyzing sky photos for light pollution and observing quality."
     User message with image + text:
       "Analyze this night sky photo taken at coordinates ({lat}, {lon}).
        Assess:
        1. Estimated Bortle scale (1-9) based on visible stars and sky glow
        2. Light pollution level (none/low/moderate/high/severe)
        3. Milky Way visibility (clearly visible/faint/not visible)
        4. Estimated SQM value (17-22)
        5. Overall observation quality (excellent/good/fair/poor)
        6. Main light pollution sources visible (if any)
        
        Respond in JSON only:
        { bortle: number, lightPollution: string, milkyWay: string, sqm: number, quality: string, sources: string[] }"
  3. Parse JSON from Claude response
  4. Return the parsed result

Rate limit: 3 requests per IP per hour (use in-memory or DB check).

---

TASK 2 — Create src/components/darksky/SkyPhotoAnalyzer.tsx:

'use client'

A compact card component that can be dropped into the darksky page.

UI:
  Heading: "Analyze Your Sky" (text-sm font-semibold)
  Subtext: "Upload a photo to get your Bortle rating" (text-xs text-slate-400)
  
  Upload area: dashed border, rounded-xl, py-6, text-center
    "📷 Tap to upload sky photo" (text-sm text-slate-400)
    input type="file" accept="image/*" (hidden, triggered by the area click)
  
  After photo selected: show thumbnail (80x80, rounded-lg, object-cover)
  
  "Analyze" button:
    bg rgba(52,211,153,0.15), border rgba(52,211,153,0.3), text #34D399, rounded-xl, py-2, full width
    Disabled + shows spinner while loading
  
  Result display (when analysis complete):
    Bortle rating pill: colored circle matching the Bortle color scale
    SQM value, quality label, Milky Way status
    Light pollution sources (if any): small tags
    
  Error state: "Analysis failed. Try a clearer photo."

On submit: POST to /api/analyze-sky with FormData

---

TASK 3 — Add SkyPhotoAnalyzer to darksky page:

In src/app/darksky/page.tsx:
  Import SkyPhotoAnalyzer dynamically (client component in server page).
  Add it as a new section below the map and above the Bortle scale legend.
  Section heading: "Sky Analysis Tool"
```

---

## PHASE 9 — Hackathon Differentiators
### May 5–8

---

### FARCASTER-1 — Farcaster Frame Meta Tags

```
I'm building Stellar. Superfan (Colosseum runner-up) used Farcaster Frames. Adding basic Frame meta tags to our OG image route costs almost nothing and signals current-gen Solana ecosystem awareness to judges.

Read these files:
  src/app/layout.tsx
  src/app/api/og/sky/route.tsx (if exists)

---

TASK 1 — Add Farcaster Frame meta tags to layout.tsx:

In the metadata section (or directly in <head>), add:

  If using Next.js metadata object:
    other: {
      'fc:frame': 'vNext',
      'fc:frame:image': `${process.env.NEXT_PUBLIC_APP_URL}/api/og/sky`,
      'fc:frame:image:aspect_ratio': '1.91:1',
      'fc:frame:button:1': "Tonight's Sky →",
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': process.env.NEXT_PUBLIC_APP_URL || 'https://stellarrclub.vercel.app',
    }

  If layout uses direct JSX head:
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/og/sky`} />
    <meta property="fc:frame:button:1" content="Tonight's Sky →" />

---

TASK 2 — Verify /api/og/sky route exists and is working:

Read src/app/api/og/sky/route.tsx.
If it exists and returns an ImageResponse → no changes needed.
If it doesn't exist → create a minimal one:

  import { ImageResponse } from 'next/og'
  
  export async function GET() {
    return new ImageResponse(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#070B14', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 48, color: '#34D399' }}>✦</div>
        <div style={{ fontSize: 32, color: 'white', fontWeight: 700, marginTop: 12 }}>STELLAR</div>
        <div style={{ fontSize: 16, color: '#94A3B8', marginTop: 8 }}>Observe the night sky. Earn on Solana.</div>
      </div>,
      { width: 1200, height: 630 }
    )
  }
```

---

### LEADERBOARD-1 — Wire Real Leaderboard from Database

```
I'm building Stellar. The leaderboard page shows static mock data. For the hackathon demo, it needs to show real data from the observation_log database.

Read these files:
  src/app/leaderboard/page.tsx
  src/lib/db.ts or src/lib/supabase.ts (find where DB queries are)
  src/app/api/observe/history/route.ts (if exists)

---

TASK 1 — Create /api/leaderboard/route.ts:

GET handler:
  Query the observation_log table:
    SELECT wallet, COUNT(*) as observations, SUM(stars) as total_stars
    FROM observation_log
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY wallet
    ORDER BY total_stars DESC
    LIMIT 20
  
  Return: { leaderboard: Array<{ wallet: string, observations: number, total_stars: number }> }
  
  Cache: add 'Cache-Control': 'public, s-maxage=300' (5 min cache)
  
  If DB query fails: return empty array with 200 (don't break the page)

---

TASK 2 — Update leaderboard page to use real data:

In src/app/leaderboard/page.tsx:
  Add a useEffect that fetches from /api/leaderboard on mount.
  Replace the static mock data with the fetched data.
  
  If the API returns empty array: show the seed data as fallback (BUG-FIX in CONTENT-3 above) with a "(demo data)" label.
  
  Format wallet addresses: show first 4 + "..." + last 4 chars.
  
  Show a loading state (shimmer rows) while fetching.
  
  Add "Updated every 5 minutes" text in muted style below the leaderboard.
```

---

## PHASE 10 — Final Submission Prep
### May 8–10

---

### SUBMIT-1 — Pre-Submission Checklist Execution

```
I'm building Stellar. Hackathon deadline is May 10. I need to do a final pass to make sure everything is ready for judge review.

Read these files:
  README.md
  public/manifest.json
  src/app/layout.tsx (check metadata)
  src/lib/constants.ts
  CLAUDE.md

---

TASK 1 — README final update:

Verify README has:
  - Correct repo URL (github.com/Rezimod/Stellar)
  - Live URL (stellarrclub.vercel.app)
  - Screenshots section (add placeholder if none)
  - Tech stack section (verify it's complete)
  - "Built for Colosseum Frontier Hackathon" mention
  - How to run locally section with all env vars listed

Check for any remaining mentions of:
  - "High Point Scientific" → replace with "Celestron" (after MARKET-1)
  - "Morningbriefrezi" → replace with "Rezimod"
  - Any test/debug text that shouldn't be visible

---

TASK 2 — Metadata audit:

In src/app/layout.tsx, verify the <title> and <description> metadata:
  title: "Stellar — Observe the Night Sky"
  description: "Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana. Shop telescopes from your local dealer."

Verify OG meta tags are set (og:title, og:description, og:image).
Verify Twitter card meta tags are set.

---

TASK 3 — Remove debug/test artifacts:

Search the codebase for:
  console.log statements in production code → remove them (or replace with proper error handling)
  TODO comments that expose unfinished work → remove or address
  Any hardcoded test wallet addresses → replace with env var references
  Any "test" or "debug" routes that shouldn't be publicly accessible

---

TASK 4 — Verify all env vars are documented:

In README.md or a new .env.example file, list ALL required environment variables with descriptions:
  NEXT_PUBLIC_PRIVY_APP_ID=        # Privy dashboard App ID
  ANTHROPIC_API_KEY=               # Claude API key (required for chat + photo verification)
  DATABASE_URL=                    # Neon/Postgres connection string
  SOLANA_RPC_URL=                  # Helius devnet RPC URL
  FEE_PAYER_PRIVATE_KEY=           # Server wallet for gasless transactions (base58, devnet)
  STARS_TOKEN_MINT=                # SPL Stars token mint address (devnet)
  MERKLE_TREE_ADDRESS=             # Bubblegum Merkle tree address (devnet)
  COLLECTION_MINT_ADDRESS=         # cNFT collection mint address (devnet)
  NEXT_PUBLIC_COLLECTION_MINT_ADDRESS= # Same, exposed to client for NFT gallery filtering
  NEXT_PUBLIC_HELIUS_RPC_URL=      # Helius RPC (client-side DAS API calls)
  NEXT_PUBLIC_APP_URL=             # Production URL (https://stellarrclub.vercel.app)
  INTERNAL_API_SECRET=             # Optional: if set, used for internal API authorization
```

---

## APPENDIX — On-Chain Setup Checklist
*Run these once before going to judges. Not prompts — CLI commands.*

```bash
# 1. Fund devnet fee payer wallet
solana airdrop 2 <FEE_PAYER_ADDRESS> --url devnet

# 2. Create Bubblegum Merkle tree (if MERKLE_TREE_ADDRESS not set)
npm run setup:bubblegum

# 3. Create Stars SPL token (if STARS_TOKEN_MINT not set)
npm run setup:token

# 4. After running setup scripts, copy the output addresses into Vercel env vars:
#    - MERKLE_TREE_ADDRESS
#    - COLLECTION_MINT_ADDRESS  
#    - STARS_TOKEN_MINT

# 5. Force redeploy after updating env vars
git commit --allow-empty -m "chore: env vars updated, force redeploy"
git push
```

---

## PRIORITY RANKING FOR JUDGES

| Impact on Score | Prompt | Why |
|---|---|---|
| 🔴 Critical | BUG-FIX 1–6 | Broken mint = no on-chain demo |
| 🔴 Critical | On-Chain Setup | MERKLE_TREE + STARS_TOKEN must be set |
| 🟠 High | MARKET-1 | Global reach narrative, 3 real dealers |
| 🟠 High | SHARE-1 | Demo moment — judges see the "Verified on Solana" proof |
| 🟡 Medium | DARKSKY-1 | Visual impact, shows technical depth |
| 🟡 Medium | GAMIFY-1 | Streak + rank = engagement loop |
| 🟡 Medium | LEADERBOARD-1 | Real data beats empty page |
| 🟢 Polish | DESIGN 1–3 | Makes the app feel premium |
| 🟢 Polish | PWA-1 + ONBOARD-1 | Consumer app feel |
| 🟢 Polish | FARCASTER-1 | 2-hour add, signals ecosystem awareness |

---

*Generated from STELLAR_AUDIT_REPORT.md + STELLAR_MASTER_PLAN.md + HACKATHON_STRATEGY.md*
*April 12, 2026 · 28 days to deadline*
