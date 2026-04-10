# STELLAR — Globalization Prompts
## "We bring astronomy lovers on-chain — globally."

**Prerequisite:** Prompts 1–6 from LATEST_PROMPTS.md must be complete and working on devnet.
**These prompts run in order, one new conversation per prompt.**

---

## THE PITCH SHIFT

**Before:** "Georgia's first astronomy app on Solana, powered by Astroman."
**After:** "The global gateway that brings telescope owners and sky lovers on-chain. Observe anywhere, earn Stars, spend at your local dealer."

Judges see: a consumer app with a real distribution strategy (local dealer partnerships), a working token economy, and a credible path to every country where people own telescopes. Astroman is the founding partner — proof the model works — not the ceiling.

---

## ARCHITECTURE OVERVIEW

```
User opens app
  → GPS auto-detect (or manual override)
  → Region resolved: "caucasus" | "north_america" | "global_fallback"
  → Sky data: already location-aware (no changes needed)
  → Marketplace: filtered by region → shows local dealer products
  → Missions: work everywhere (GPS + sky oracle already global)
  → Stars: universal SPL token, redeemable at any partner dealer
```

New files:
```
src/lib/location.tsx          — LocationProvider context + useLocation hook
src/lib/dealers.ts            — Dealer + product data, region mapping
src/components/LocationPicker.tsx — Dropdown/modal for region override
```

Modified files:
```
src/app/marketplace/page.tsx  — reads location context, filters by dealer
src/lib/products.ts           — replaced by dealers.ts (or restructured)
src/app/page.tsx              — copy updates for global framing
src/app/missions/page.tsx     — add Free Observation mission
src/components/sky/MissionActive.tsx — handle Free Observation flow
src/app/layout.tsx            — wrap with LocationProvider
```

---

## PROMPT G1 — Location System (Context + Auto-Detect + Override) ✅ DONE

```
I'm building Stellar, a Next.js 15 + React 19 astronomy app. I need a global location system that auto-detects the user's region and lets them override it. This location determines which dealer's products appear in the marketplace.

Read these files before writing anything:
  src/app/layout.tsx (understand the provider tree — Privy, AppState, etc.)
  src/lib/types.ts (do not modify — add new types in new files)

---

Step 1 — Create src/lib/location.tsx:

'use client'

Define types:

export type Region = 'caucasus' | 'north_america' | 'global'

export interface UserLocation {
  region: Region
  country: string          // ISO 3166-1 alpha-2 (e.g. 'GE', 'US')
  city: string             // display name
  lat: number
  lon: number
  source: 'gps' | 'manual' | 'default'
}

Define region mapping (const, not exported as mutable):

const COUNTRY_TO_REGION: Record<string, Region> = {
  // Caucasus
  GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus',
  TR: 'caucasus',   // Turkey — close enough for Astroman shipping
  // North America
  US: 'north_america', CA: 'north_america', MX: 'north_america',
}

function getRegionForCountry(countryCode: string): Region {
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] ?? 'global'
}

Create LocationContext + LocationProvider:

Context value: { location: UserLocation; setLocation: (loc: UserLocation) => void; loading: boolean }

Provider behavior:
1. On mount, check localStorage for 'stellar_location'. If found, parse and use it. Set loading = false.
2. If not in localStorage, attempt GPS detection:
   a. navigator.geolocation.getCurrentPosition (timeout 8000ms)
   b. On success: reverse geocode using a free API:
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`)
      Extract: country code from address.country_code (uppercase), city from address.city || address.town || address.state
   c. Build UserLocation with source: 'gps', resolve region via getRegionForCountry
   d. Save to localStorage
   e. Set loading = false
3. On GPS failure (denied, timeout, error): use default:
   { region: 'global', country: '', city: '', lat: 0, lon: 0, source: 'default' }
   Set loading = false. Do NOT save default to localStorage.
4. setLocation: updates state + saves to localStorage as 'stellar_location'

Export useLocation() hook that reads the context. Throw if used outside provider.

---

Step 2 — Create src/components/LocationPicker.tsx:

'use client'

Props: { compact?: boolean } (compact = true renders just a small pill, false renders full modal)

When compact = true:
  Render a clickable pill/button showing:
    📍 {location.city || location.region} ▾
  Style: inline-flex items-center gap-1, text-xs, rgba(255,255,255,0.4), hover:rgba(255,255,255,0.6), cursor-pointer
  On click: open a dropdown/popover (use useState for open/close, position absolute)

Dropdown content (same for compact and full):
  Title: "Your Location" (white, text-sm, font-semibold)
  Subtitle: "This determines your marketplace and sky data" (rgba(255,255,255,0.4), text-xs)

  Current location display:
    📍 {city}, {country} — {region label}
    Where region labels: caucasus → "Caucasus & Turkey", north_america → "North America", global → "Global"

  Preset buttons (grid-cols-2, gap-2):
    "📍 Tbilisi, Georgia" → { region: 'caucasus', country: 'GE', city: 'Tbilisi', lat: 41.7151, lon: 44.8271, source: 'manual' }
    "📍 New York, US" → { region: 'north_america', country: 'US', city: 'New York', lat: 40.7128, lon: -74.0060, source: 'manual' }
    "📍 Los Angeles, US" → { region: 'north_america', country: 'US', city: 'Los Angeles', lat: 34.0522, lon: -118.2437, source: 'manual' }
    "📍 Berlin, DE" → { region: 'global', country: 'DE', city: 'Berlin', lat: 52.5200, lon: 13.4050, source: 'manual' }

  Each button: bg rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-xl, py-2 px-3, text-xs, white
  On click: call setLocation with the preset, close dropdown

  "Use GPS" button at bottom: bg rgba(52,211,153,0.1), border rgba(52,211,153,0.2), color #34d399, text-xs, rounded-xl, py-2, full width
  On click: re-trigger navigator.geolocation → reverse geocode → setLocation → close dropdown

  Dropdown styling: bg #0F1729, border 1px solid rgba(255,255,255,0.1), rounded-2xl, p-4, shadow-xl, min-w-[260px], z-50

Close on click outside (useEffect with document click listener).

---

Step 3 — Wrap layout with LocationProvider:

In src/app/layout.tsx:
  Import LocationProvider from '@/lib/location'
  Wrap it around the existing children (inside the Privy provider, outside the main content).
  LocationProvider needs no props.

Do not change any other providers or layout structure.
```

---

## PROMPT G2 — Dealer-Based Marketplace Data ✅ DONE

```
I'm building Stellar. The current marketplace uses a flat product array in src/lib/products.ts. I need to restructure it into a dealer-based system where products are grouped by regional telescope dealers.

Read these files before writing:
  src/lib/products.ts (understand current product shape — keep compatible fields)
  src/app/marketplace/page.tsx (understand how products are consumed)
  src/lib/location.tsx (understand Region type and useLocation hook — created in previous prompt)

---

Step 1 — Create src/lib/dealers.ts:

Import Region from '@/lib/location'

Export interface:

export interface Dealer {
  id: string                    // e.g. 'astroman', 'celestron-us'
  name: string                  // Display name
  region: Region
  country: string               // ISO code
  website: string               // External URL
  logo?: string                 // Path to /public/dealers/ image (optional for now)
  description: string           // One-liner
  shipsTo: string[]             // Country codes
  currency: string              // 'GEL', 'USD', 'EUR'
  currencySymbol: string        // '₾', '$', '€'
}

export interface Product {
  id: string
  dealerId: string
  name: string
  price: number                 // In dealer's currency
  currency: string              // Matches dealer
  currencySymbol: string
  starsPrice: number            // Universal Stars equivalent
  category: 'telescope' | 'accessory' | 'gadget' | 'digital'
  description: string
  image: string                 // Path to /public/products/ or external URL
  externalUrl: string           // Buy link on dealer's site
  badge?: string                // 'Best Seller', 'New', 'Popular'
  specs?: Record<string, string> // e.g. { aperture: '70mm', focal: '700mm' }
}

Seed data — DEALERS:

const DEALERS: Dealer[] = [
  {
    id: 'astroman',
    name: 'Astroman',
    region: 'caucasus',
    country: 'GE',
    website: 'https://astroman.ge',
    description: "Georgia's first astronomy store — telescopes, gadgets & star maps",
    shipsTo: ['GE', 'AM', 'AZ', 'TR'],
    currency: 'GEL',
    currencySymbol: '₾',
  },
  {
    id: 'highpoint-us',
    name: 'High Point Scientific',
    region: 'north_america',
    country: 'US',
    website: 'https://www.highpointscientific.com',
    description: 'Trusted US telescope retailer — expert advice + fast shipping',
    shipsTo: ['US', 'CA'],
    currency: 'USD',
    currencySymbol: '$',
  },
]

Seed data — PRODUCTS (keep all existing Astroman products, add US products):

Astroman products (migrate from current products.ts — keep same names, prices, descriptions, images):
  Map each existing product into the new Product shape:
    dealerId: 'astroman'
    currency: 'GEL'
    currencySymbol: '₾'
    externalUrl: 'https://astroman.ge' (or specific product URL if available)
    starsPrice: price * 10 (rough conversion — 1 GEL ≈ 10 Stars)
  Keep all existing image paths.

High Point Scientific products (hardcoded for demo):
  {
    id: 'hp-celestron-nexstar-8se',
    dealerId: 'highpoint-us',
    name: 'Celestron NexStar 8SE',
    price: 1399,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 14000,
    category: 'telescope',
    description: '8-inch Schmidt-Cassegrain with fully automated GoTo mount. The most popular telescope in America.',
    image: '/products/celestron-8se.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-nexstar-8se-computerized-telescope-11069',
    badge: 'Best Seller',
    specs: { aperture: '203mm', focal: '2032mm', mount: 'GoTo Alt-Az' },
  },
  {
    id: 'hp-celestron-starsense-dx102',
    dealerId: 'highpoint-us',
    name: 'Celestron StarSense Explorer DX 102AZ',
    price: 399,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 4000,
    category: 'telescope',
    description: 'Phone-guided refractor — app tells you exactly where to point. Perfect first telescope.',
    image: '/products/celestron-starsense.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-starsense-explorer-dx-102az',
    badge: 'Popular',
    specs: { aperture: '102mm', focal: '660mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'hp-skywatcher-classic-200p',
    dealerId: 'highpoint-us',
    name: 'Sky-Watcher Classic 200P',
    price: 499,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 5000,
    category: 'telescope',
    description: '8-inch Dobsonian — best bang for buck in deep sky. See galaxies and nebulae from your backyard.',
    image: '/products/skywatcher-200p.jpg',
    externalUrl: 'https://www.highpointscientific.com/sky-watcher-classic-200p-8-dobsonian',
    specs: { aperture: '200mm', focal: '1200mm', mount: 'Dobsonian' },
  },
  {
    id: 'hp-zwo-asi533mc',
    dealerId: 'highpoint-us',
    name: 'ZWO ASI533MC Pro Camera',
    price: 599,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 6000,
    category: 'accessory',
    description: 'Cooled astrophotography camera — zero amp glow, square sensor. Plug into any telescope.',
    image: '/products/zwo-asi533.jpg',
    externalUrl: 'https://www.highpointscientific.com/zwo-asi533mc-pro',
    specs: { sensor: 'IMX533', resolution: '3008x3008', cooling: '-35°C' },
  },
  {
    id: 'hp-moon-filter-set',
    dealerId: 'highpoint-us',
    name: 'Celestron Eyepiece & Filter Kit',
    price: 99,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 1000,
    category: 'accessory',
    description: '14-piece set — moon filter, color filters, eyepieces. Essential upgrade for any telescope.',
    image: '/products/celestron-filter-kit.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-eyepiece-filter-kit',
    badge: 'New',
  },

Global fallback products: combine the 3 cheapest from each dealer (sorted by price ascending, take first 3 per dealer). This is the "Global Picks" shown when region = 'global'.

Export helper functions:

export function getDealersByRegion(region: Region): Dealer[]
  Returns dealers matching region. If region === 'global', return all dealers.

export function getProductsByRegion(region: Region): Product[]
  If region matches specific dealers: return those dealers' products.
  If region === 'global': return global fallback products.

export function getDealerById(id: string): Dealer | undefined

export function getProductsByDealer(dealerId: string): Product[]

export function getAllDealers(): Dealer[]

---

Step 2 — Update src/lib/products.ts:

Read the file. If it exports a PRODUCTS array or similar:
  Replace the entire file contents with:

  export { type Product, type Dealer } from './dealers'
  export { getProductsByRegion, getDealersByRegion, getDealerById, getProductsByDealer, getAllDealers } from './dealers'

  This re-exports everything so existing imports from '@/lib/products' don't break.
  If there are product-specific types defined in products.ts that are used elsewhere, keep them as re-exports too.

If products.ts has additional logic (price formatting, etc.) keep that — just redirect the data source to dealers.ts.

---

Step 3 — Create placeholder product images:

Log a console reminder:
  "NOTE: Add product images to /public/products/ — for now the marketplace will work with broken images or fallback styling."

Do NOT create actual image files. Just make sure the image paths are referenced so they work when images are added later.
```

---

## PROMPT G3 — Location-Aware Marketplace Page ✅ DONE

```
I'm building Stellar. The marketplace page needs to show products from the user's regional telescope dealer instead of a static catalog.

Read these files fully before writing:
  src/app/marketplace/page.tsx (understand current layout, styling, product card structure)
  src/lib/dealers.ts (understand Dealer, Product, getProductsByRegion, getDealersByRegion)
  src/lib/location.tsx (understand useLocation hook, Region type)
  src/components/LocationPicker.tsx (understand the compact pill component)

---

Rewrite src/app/marketplace/page.tsx:

'use client'

Imports:
  useLocation from '@/lib/location'
  LocationPicker from '@/components/LocationPicker'
  getProductsByRegion, getDealersByRegion from '@/lib/dealers'
  ExternalLink from 'lucide-react'

On render:
  const { location } = useLocation()
  const dealers = getDealersByRegion(location.region)
  const products = getProductsByRegion(location.region)

Page structure:

1. HEADER BAR:
   Left: "Marketplace" (white, serif, text-2xl)
   Right: <LocationPicker compact /> — shows current region as clickable pill

   Below header: dealer branding strip.
   If dealers.length === 1:
     "Powered by {dealer.name}" + external link icon → dealer.website
     Style: text-xs, rgba(255,255,255,0.4), inline-flex items-center gap-1
   If dealers.length > 1 (global fallback):
     "Showing picks from {dealers.length} partner stores"
     Style: same

2. CATEGORY FILTER (horizontal scroll pills):
   "All" | "Telescopes" | "Accessories" | "Gadgets" | "Digital"
   Active pill: bg rgba(52,211,153,0.15), border rgba(52,211,153,0.3), color #34d399
   Inactive: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08), color rgba(255,255,255,0.5)
   Filter products by category. "All" shows everything.

3. PRODUCT GRID (grid-cols-2 gap-3):
   Each product card (keep the visual style of the existing cards — dark glass, rounded-2xl):
   - Product image area: aspect-[4/3], bg rgba(255,255,255,0.03), rounded-t-2xl, overflow-hidden
     If image loads: show it, object-cover
     If image fails: show a centered telescope emoji + product name in muted text (graceful fallback)
   - Badge (if present): absolute top-right, text-[10px], px-2 py-0.5, rounded-full
     'Best Seller' → bg rgba(255,209,102,0.15), color #FFD166
     'New' → bg rgba(52,211,153,0.15), color #34d399
     'Popular' → bg rgba(56,240,255,0.15), color #38F0FF
   - Product name: white, text-sm, font-semibold, mt-3, px-3
   - Description: rgba(255,255,255,0.4), text-xs, line-clamp-2, mt-1, px-3
   - Specs (if present): show 1-2 key specs as tiny pills, text-[10px], bg rgba(255,255,255,0.04), mt-1, px-3
   - Price row: px-3, pb-3, mt-2, flex justify-between items-end
     Left: "{currencySymbol}{price}" in white, font-bold, text-lg
     Below price: "or {starsPrice} ✦" in teal, text-xs
     Right: "Buy →" button (small, text-xs, bg rgba(255,255,255,0.06), border rgba(255,255,255,0.1), rounded-lg, px-3 py-1.5)
       onClick: window.open(product.externalUrl, '_blank')
   - Dealer attribution (bottom of card): "via {dealerName}" in rgba(255,255,255,0.25), text-[10px], px-3, pb-2
     Only show this when dealers.length > 1 (global view). Hide when single dealer.

4. EMPTY STATE (if no products for region — shouldn't happen with fallback, but safety):
   Centered: telescope emoji, "No partner stores in your area yet", "Switch to a different region or check back soon"
   <LocationPicker compact={false} /> below

5. PARTNER BANNER (bottom of page):
   "Become a Partner Store"
   "Sell your telescopes to astronomers worldwide through Stellar."
   "Contact us →" link (mailto:rezi@astroman.ge or a placeholder)
   Style: bg rgba(255,255,255,0.02), border-top 1px solid rgba(255,255,255,0.06), py-8, text-center

Stars redemption section (keep if it exists in current marketplace):
  Keep the existing Stars redemption widget. It should work regardless of region — Stars are universal.
  If the redemption logic references specific Astroman products, generalize:
    "Redeem Stars for discounts at any partner store"

MOBILE:
  Product grid: grid-cols-1 on very small screens (< 380px), grid-cols-2 on everything else
  Category pills: horizontal scroll with -mx-4 px-4 for full-bleed scroll
  Dealer branding: stack vertically

Do not install any new packages.
```

---

## PROMPT G4 — Free Observation Mission ✅ DONE

```
I'm building Stellar. I need to add an always-available "Free Observation" mission that lets any user photograph any part of the night sky and earn Stars + an NFT, without requiring a specific celestial target.

Read these files fully before writing:
  src/app/missions/page.tsx (understand the mission list, how missions are defined and rendered)
  src/components/sky/MissionActive.tsx (understand the full observation flow — capture → verify → mint)
  src/lib/types.ts (understand Mission type, MissionState, CompletedMission)
  src/app/api/observe/verify/route.ts (understand photo verification — if it exists)

---

Step 1 — Add Free Observation mission to the mission list:

In whatever file defines the mission data (likely src/lib/constants.ts, or inline in missions/page.tsx):

Add a new mission entry at the TOP of the list (it should appear first):

{
  id: 'free-observation',
  name: 'Tonight\'s Sky',
  emoji: '🌌',
  description: 'Photograph any part of the night sky. No telescope needed — just look up.',
  type: 'naked-eye',
  difficulty: 'Beginner',
  stars: 25,
  hint: 'Find a spot away from bright lights. Point your camera straight up or at the brightest thing you see.',
  target: null,            // No specific target — any sky photo works
  repeatable: true,        // Can be completed multiple times (once per night)
}

Read the mission data structure carefully — match the exact shape used by other missions. If there are fields I haven't listed (like 'unlocked', 'requirements', etc.), set them to the most permissive values (unlocked by default, no requirements).

The mission card styling in the list should have a subtle "Always Available" badge:
  Style: text-[10px], bg rgba(52,211,153,0.1), color #34d399, px-2 py-0.5, rounded-full
  Position: next to the difficulty badge

If missions have a "completed" state that hides them: for free-observation, NEVER hide it. It should always be visible and startable, even after completion. Show "✓ Completed today" in muted text if done in the last 24h, but keep the "Start" button enabled.

Repeatable logic: check if there's a completed mission with id 'free-observation' where timestamp is within the last 24 hours. If yes, show "completed today" badge but allow re-doing (for Stars — but minting a second NFT within 24h should be blocked server-side by the existing rate limit on /api/mint).

---

Step 2 — Handle free observation in MissionActive.tsx:

The key difference: when mission.target is null (free observation), the verification step should be more lenient.

In handleCapture() or wherever the sky verification happens:
  - Still call /api/sky/verify for weather data + oracle hash (needed for NFT metadata)
  - Skip the "verified: false" block that rejects cloudy skies for free observations:
    If mission.id === 'free-observation': proceed to next step even if sky.verified === false
    (Regular missions still enforce the cloud cover limit)

In the 'verifying' step UI:
  If mission.id === 'free-observation':
    Show "Checking sky conditions..." (same as normal)
    But if sky.verified === false, show a softer message:
      "Cloudy tonight — your observation still counts! ☁️"
    Instead of blocking, proceed to the next step (zenith/image/mint)

In the NFT metadata (the mint call):
  target: mission.target ?? 'Night Sky'
  This ensures the NFT says "Stellar: Night Sky" instead of "Stellar: null"

In the 'done' success screen:
  If mission.id === 'free-observation':
    Replace "Discovery Sealed" with "Observation Sealed"
    Replace "{mission.name}" with "Tonight's Sky"
    Everything else stays the same (Stars count, Explorer link, Share button)

---

Step 3 — Photo verification leniency (if /api/observe/verify exists):

If there's a Claude vision verification step that checks "is this a photo of Jupiter?" or similar:
  When target is null or 'Night Sky':
    Change the Claude prompt to:
      "This should be a photograph of the night sky — any celestial view. Accept if it shows stars, the moon, planets, clouds at night, a sunset/sunrise, or any outdoor nighttime scene. Reject only if it's clearly an indoor photo, a screenshot, or a daytime photo with blue sky."
    Confidence thresholds: lower them. Accept anything that's plausibly outdoors at night.
    Return confidence 'medium' as the floor (instead of 'low' or 'rejected').

If there's no separate verification step (just the sky oracle), skip this sub-step.

---

Step 4 — Stars award for free observation:

The free observation awards 25 Stars (less than the cheapest targeted mission at 50).
This is already set in the mission data (stars: 25).
No changes needed to /api/award-stars — it just receives the amount from the client.

---

CONSTRAINTS:
- Do not break existing targeted missions — they must still work exactly as before
- The free observation mission must be visually distinguished but not dominate the mission list
- Repeatable = always visible, never hidden by completion state
- Cloudy sky does NOT block free observations (but does block targeted missions)
- No new npm packages
- Keep all existing mission flow steps (zenith, image upload if they exist) — free observation goes through the same pipeline
```

---

## PROMPT G5 — Global Pitch Polish (Copy + Metadata + Home Page)

```
I'm building Stellar for the Colosseum Frontier hackathon. The app needs to be repositioned from a Georgia-focused astronomy app to a global consumer astronomy platform. This prompt updates copy, metadata, and the home page.

Read these files before writing:
  src/app/page.tsx (full home page)
  src/app/layout.tsx (metadata, providers)
  src/lib/constants.ts (any app-wide copy/config)
  src/components/LocationPicker.tsx (already built — we'll add it to the home page)

---

Step 1 — Update src/app/layout.tsx metadata:

Find the metadata export (or <head> tags). Update:

  title: "Stellar — Observe the Sky, Earn on Solana"
  description: "The global astronomy app that brings telescope owners on-chain. Verify observations, earn Stars tokens, collect NFT proofs, and shop at local dealers."

  og:title → "Stellar — Observe the Sky, Earn on Solana"
  og:description → "Photograph the night sky from anywhere in the world. Earn Stars. Collect discovery NFTs. Shop telescopes at your local dealer."
  Keep og:image as is (the /api/og/sky route).

  Remove or generalize any mention of "Georgia" or "Astroman" in metadata.

---

Step 2 — Update src/app/page.tsx:

Read the full file. Make these SURGICAL copy changes — do not redesign sections. The recent redesign work must be preserved.

HERO SECTION:
  Find the main headline. Change to:
    "Observe the sky. Earn on Solana."
  Find the subtitle. Change to:
    "Photograph celestial objects from anywhere in the world. Earn Stars tokens, collect discovery NFTs, and shop telescopes at your local dealer."
  Add <LocationPicker compact /> somewhere in the hero — either next to the subtitle or in the top-right area. It should feel natural, not forced.
  Import LocationPicker from '@/components/LocationPicker' and useLocation from '@/lib/location'

HOW IT WORKS SECTION:
  If the 4 steps mention Astroman specifically, generalize:
    "Redeem at Astroman" → "Redeem at partner stores"
    "Shop on astroman.ge" → "Shop at your local dealer"
  If steps are already generic, leave them alone.

REWARDS/MARKETPLACE PREVIEW SECTION (if it exists from the redesign):
  Change "Redeem for Astroman gear" → "Redeem at partner stores worldwide"
  If product cards show GEL prices: make them location-aware.
    const { location } = useLocation()
    Show products from getProductsByRegion(location.region) — take first 3.
    Show prices in the dealer's currency.
  If the section is too tightly coupled to Astroman products to easily change, just update the copy.

LEADERBOARD SECTION (if mock data exists):
  The existing mock leaderboard already has global cities (Tbilisi, Lisbon, Tokyo, Arizona, Berlin). Perfect. Leave it.

PARTNER STORES SECTION (add new, after rewards or before footer):
  Title: "Partner Telescope Stores" (white, serif, text-xl, centered)
  Subtitle: "Earn Stars anywhere. Spend them at your local dealer." (rgba(255,255,255,0.4), text-sm, centered)

  Two dealer cards side by side (grid-cols-2 on desktop, grid-cols-1 mobile, gap-4, max-w-lg, mx-auto, mt-6):

  Card 1 — Astroman:
    bg rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.07), rounded-2xl, p-5
    "🔭 Astroman" (white, font-semibold)
    "Georgia's first astronomy store" (rgba(255,255,255,0.4), text-xs, mt-1)
    "Ships to: 🇬🇪 🇦🇲 🇦🇿 🇹🇷" (text-xs, mt-2)
    "Visit store →" link to astroman.ge (teal, text-xs, mt-2)

  Card 2 — High Point Scientific:
    Same styling
    "🔭 High Point Scientific" (white, font-semibold)
    "America's trusted telescope retailer" (rgba(255,255,255,0.4), text-xs, mt-1)
    "Ships to: 🇺🇸 🇨🇦" (text-xs, mt-2)
    "Visit store →" link to highpointscientific.com (teal, text-xs, mt-2)

  Below cards: "Want to sell on Stellar? Contact us →" (rgba(255,255,255,0.25), text-xs, text-center, mt-4)

FOOTER:
  If footer says "Powered by Astroman" → change to "Founded by Astroman 🇬🇪"
  If footer links to astroman.ge exclusively → keep it but add "Partner Stores" link to /marketplace

---

Step 3 — Update src/lib/constants.ts:

Find any app description strings. Update to global framing:
  "Georgia's astronomy app" → "The global astronomy app"
  "Astroman's observation platform" → "Stellar observation platform"
  Keep "Founded in Georgia" or "Built in Georgia" — that's authentic origin story, not limiting.

If AGENT_META or similar config has description fields, update them too.
System prompt for ASTRA AI (if defined here): add line "You serve astronomers worldwide, not just in Georgia."

---

CONSTRAINTS:
- Do NOT redesign any section — only change copy and add the partner stores section
- Preserve all recent visual redesign work (the dashboard, leaderboard, rewards sections)
- LocationPicker addition to hero must be subtle — don't make it the main focus
- Astroman stays prominent as founding partner — it's not hidden, it's positioned as "first of many"
- No new npm packages
```

---

## PROMPT G6 — Updated Demo Script + README

```
I'm building Stellar for the Colosseum Frontier hackathon (Consumer Track, deadline May 11 2026). I need an updated README.md and demo script that reflects the global positioning.

Read these files:
  README.md (current)
  src/app/layout.tsx (current metadata)

---

Step 1 — Rewrite README.md:

# Stellar — Observe the Sky, Earn on Solana

> The global astronomy app that brings telescope owners and sky lovers on-chain.

## What It Does

Stellar turns every telescope session into a verified on-chain discovery. Astronomers anywhere in the world can:

1. **Observe** — Check tonight's sky forecast, planet positions, and find clear windows
2. **Capture** — Photograph celestial objects with a phone or telescope camera
3. **Verify** — AI + sky oracle confirms real sky conditions at your location and time
4. **Earn** — Receive Stars (SPL token) and a compressed NFT proof sealed on Solana
5. **Spend** — Redeem Stars at partner telescope stores in your region

No wallets. No seed phrases. No crypto jargon. Users sign up with email and start observing.

## Why Solana

- **Compressed NFTs** via Metaplex Bubblegum — each observation proof costs ~$0.000005 to mint
- **SPL tokens** — Stars are real, tradeable tokens on Solana, not a database counter
- **Gasless UX** — server-side fee payer covers everything. Users never need SOL
- **Privy embedded wallets** — every user gets a Solana wallet invisibly on signup
- **Speed** — mint completes in <2 seconds. No waiting for block confirmations

## The Distribution Advantage

Stellar is built by [Astroman](https://astroman.ge), Georgia's first astronomy e-commerce store with 60,000+ social media followers and a physical retail location. This gives Stellar:

- **Immediate warm audience** of active telescope buyers
- **Real product rewards** — not speculative token utility, but actual telescopes and gear
- **Regional dealer network** — Astroman (Caucasus), High Point Scientific (US), with more partners onboarding

No other project on any chain targets amateur astronomy. Zero direct competition.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Auth | Privy (email, Google, SMS → embedded Solana wallet) |
| AI | Claude API — ASTRA companion with tool calling (live planet data + forecast) |
| AI Vision | Claude multimodal — photo verification + Bortle dark-sky classification |
| NFTs | Metaplex Bubblegum compressed NFTs via Umi |
| Token | Custom STARS SPL token (devnet) |
| Weather | Open-Meteo API (free, no key) |
| Astronomy | astronomy-engine (local JS calculations) |
| Database | Neon serverless Postgres via Drizzle ORM |
| Deploy | Vercel |

## Live Demo

**[stellarrclub.vercel.app](https://stellarrclub.vercel.app)**

## How to Run Locally

```bash
git clone https://github.com/Morningbriefrezi/Stellar.git
cd Stellar
npm install
cp .env.example .env.local
# Fill in env vars (see below)
npm run dev
```

### Setup Scripts

```bash
# 1. Fund a devnet wallet (need ~5 SOL for setup + minting)
solana airdrop 5 --url devnet

# 2. Create Bubblegum Merkle tree + collection
npm run setup:bubblegum

# 3. Create Stars SPL token
npm run setup:token
```

### Required Environment Variables

```
NEXT_PUBLIC_PRIVY_APP_ID=
ANTHROPIC_API_KEY=
DATABASE_URL=
SOLANA_RPC_URL=https://api.devnet.solana.com
FEE_PAYER_PRIVATE_KEY=
MERKLE_TREE_ADDRESS=
COLLECTION_MINT_ADDRESS=
STARS_TOKEN_MINT=
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=
NEXT_PUBLIC_HELIUS_RPC_URL=
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
```

## Demo Script (3 minutes)

1. **Sign up with email** — embedded wallet created invisibly (20s)
2. **Location detected** — "You're in Tbilisi" → marketplace shows Astroman products (10s)
3. **Switch to New York** — marketplace updates to High Point Scientific / Celestron products (10s)
4. **Tonight's Sky** — planet visibility + 7-day forecast for current location (20s)
5. **Start "Tonight's Sky" mission** — free observation, any sky photo (15s)
6. **Take photo** → sky oracle verifies → NFT minted on Solana (40s)
7. **View NFT in gallery** with Solana Explorer link (15s)
8. **Ask ASTRA** "What can I see tonight with a 70mm refractor?" → live tool-calling response (20s)
9. **Show Stars balance** — real SPL token in profile (10s)
10. **Show partner stores** — "Astroman ships to Caucasus, High Point to US" (10s)

## Project Structure

```
src/
  app/
    page.tsx              — Home dashboard
    sky/                  — Sky forecast + planet tracker
    missions/             — Mission list + observation flow
    chat/                 — ASTRA AI companion
    marketplace/          — Location-aware dealer marketplace
    nfts/                 — NFT gallery (Helius DAS)
    profile/              — User profile + Stars balance
    darksky/              — Light pollution map
    api/
      chat/               — Claude streaming + tool calling
      sky/verify/         — Sky oracle (Open-Meteo + hash)
      mint/               — Compressed NFT minting
      award-stars/        — SPL token minting
      metadata/           — NFT metadata JSON
      observe/            — Photo verification
      darksky/            — Bortle analysis + GeoJSON data
  lib/
    location.tsx          — GPS + region detection
    dealers.ts            — Dealer network + products
    solana.ts             — Solana helpers
    mint-nft.ts           — Bubblegum minting (server)
    sky-data.ts           — Weather + forecast
    planets.ts            — Planet positions
  components/
    LocationPicker.tsx    — Region selector
    sky/                  — Observation flow components
```

## Hackathon

- **Colosseum Frontier 2026** — Consumer Track
- **Builder:** Rezi (Revaz Modebadze) — [@astroman_geo](https://instagram.com/astroman_geo)
- **Previous:** 2nd place, Superteam Georgia Hackathon 2025

## License

MIT

---

Step 2 — Create .env.example (if it doesn't exist):

Copy the env vars list from above with empty values and brief comments.

Do not touch any source code files.
```

---

## EXECUTION ORDER SUMMARY

Run these prompts in new Claude Code conversations, in this order:

### Phase 1 — On-Chain Core (from LATEST_PROMPTS.md)
1. Prompt 1 — Bubblegum setup ✅ (already done)
2. Prompt 2 — Remove Farmhawk/Pollinet, add Sky Oracle
3. Prompt 3 — Server-side compressed NFT minting
4. Prompt 4 — Wire mission completion to real mint
5. Prompt 5 — Stars SPL token deploy + award + profile
6. Prompt 6 — NFT Gallery

### Phase 2 — Go Global (this document)
7. **Prompt G1** — Location system (context + GPS + override)
8. **Prompt G2** — Dealer-based marketplace data
9. **Prompt G3** — Location-aware marketplace page
10. **Prompt G4** — Free Observation mission
11. **Prompt G5** — Global pitch polish (copy + metadata + home)
12. **Prompt G6** — Updated README + demo script

### Phase 3 — Nice-to-Have (from LATEST_PROMPTS.md)
13. Prompt 7 — Claude tool calling for ASTRA
14. Prompt 8 — Farcaster share + OG image
15. Prompt 9 — Dark Sky DePIN (Bortle map)
16. Prompt 10 — Telescope image provenance

---

## WHAT ABOUT EUROPE?

You chose US as the second region. If you want to add Europe later (say, week of April 21), it's trivial:

1. Add a new dealer to DEALERS array in dealers.ts:
   { id: 'astroshop-eu', name: 'Astroshop.eu', region: 'europe', ... }
2. Add products for that dealer
3. Add country codes to COUNTRY_TO_REGION: DE, FR, IT, ES, NL, etc. → 'europe'
4. Done — marketplace auto-filters

The architecture supports unlimited regions with zero code changes.
