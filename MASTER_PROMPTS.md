# STELLAR — Unified Master Prompts
**Created:** 2026-04-13  
**Sources:** MASTER_PROMPTS.md + STELLAR_AUDIT_ACTION_PLAN.md + visual audit (screenshots)  
**Usage:** Run prompts in order per phase. After each phase, run the Testing section for that phase.

---

## HOW TO USE THIS FILE

1. Each prompt is a self-contained instruction for `/executor`
2. Phases are ordered by priority — complete earlier phases first
3. After completing all prompts in a phase, run the Testing prompts
4. Update the Evaluation Matrix at the bottom after each fix
5. Before hackathon submission, run Final Pre-Submission Checklist

---

# PHASE 1 — Critical Blockers (Fix before any demo)
> All 7 items are demo-breaking or security-critical. None change visual layout.

---

## FIX-01: Turbopack Dev Mode — Noto Georgian Font Crash

**Problem:** `next dev --turbopack` throws a fatal module error for `Noto_Sans_Georgian`, breaking the dev environment.

**File:** `src/app/layout.tsx`

Find:
```ts
const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-georgian',
  weight: ['400', '500', '600'],
  display: 'swap',
});
```

Add `preload: false`:
```ts
const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-georgian',
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
});
```

**Verify:** `next dev --turbopack` starts clean. Georgian text still renders.

---

## FIX-02: sim_ txId — Silent Fake Mint Shown as "Sealed on Solana"

**Problem:** When NFT minting fails, `txId` stays as `sim_XXXX` but UI shows "Sealed on Solana". Explorer link is a guaranteed 404.

**File:** `src/components/sky/MissionActive.tsx`

**Change 1:** Find `addMission(...)` call after `setMintTxId(txId)`. Change status:
```ts
addMission({
  ...
  status: txId.startsWith('sim') ? 'pending' : 'completed',
  method: txId.startsWith('sim') ? 'simulated' : 'onchain',
});
```

**Change 2:** In the done screen, find "Sealed on Solana" text. Wrap:
```tsx
{mintTxId.startsWith('sim') ? (
  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Saved locally — will sync when back online</p>
) : (
  <p style={{ color: 'var(--success)', fontSize: 12 }}>✦ Sealed on Solana</p>
)}
```

**Change 3:** Find Solana Explorer link in done screen. Guard it:
```tsx
{mintTxId && !mintTxId.startsWith('sim') && (
  <a href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
    View on Explorer →
  </a>
)}
```

**Verify:** With `FEE_PAYER_PRIVATE_KEY` removed, complete a mission → "Saved locally", no explorer link.

---

## FIX-03: Reward Codes Exposed in Source Code

**Problem:** `MOONLAMP25`, `STELLAR10`, `STELLAR20` hardcoded in source. Anyone reading GitHub can use them.

**File:** `src/app/api/redeem-code/route.ts`

Replace hardcoded map with env var references:
```ts
const TIER_CODES: Record<string, { minStars: number; code: string | undefined }> = {
  'Free Moon Lamp': { minStars: 250, code: process.env.REWARD_CODE_MOONLAMP },
  '10% Telescope Discount': { minStars: 500, code: process.env.REWARD_CODE_10PCT },
  '20% Telescope Discount': { minStars: 1000, code: process.env.REWARD_CODE_20PCT },
};
```

Handle undefined:
```ts
if (!tierConfig || !tierConfig.code) {
  return NextResponse.json({ error: 'Reward not configured' }, { status: 503 });
}
```

Add to `.env.local`:
```
REWARD_CODE_MOONLAMP=MOONLAMP25
REWARD_CODE_10PCT=STELLAR10
REWARD_CODE_20PCT=STELLAR20
```

Also add all three to Vercel environment variables.

**Verify:** `grep -r "MOONLAMP25\|STELLAR10\|STELLAR20" src/` returns nothing.

---

## FIX-04: /api/users/upsert Has No Authentication

**Problem:** Any caller can overwrite any user's wallet address — redirecting all Stars minting.

**File:** `src/app/api/users/upsert/route.ts`

After `await req.json()`, insert:
```ts
const secret = process.env.INTERNAL_API_SECRET;
const authHeader = req.headers.get('authorization');
if (secret && authHeader !== `Bearer ${secret}`) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
```

If any client component calls this route directly, update that call to include `Authorization: Bearer <secret>` using `process.env.NEXT_PUBLIC_INTERNAL_API_SECRET`.

**Verify:** `curl -X POST http://localhost:3000/api/users/upsert -d '{"privyId":"test"}'` → 401.

---

## FIX-05: Remove @metaplex-foundation/js Legacy Dependency

**Problem:** `@metaplex-foundation/js@^0.20.1` (legacy SDK, ~300KB) unused — project uses `mpl-bubblegum`.

First confirm no imports: `grep -r "@metaplex-foundation/js" src/` — if anything found, report, do NOT remove.

If clean:
```bash
npm uninstall @metaplex-foundation/js
npm run build
```

**Verify:** `package.json` no longer lists `@metaplex-foundation/js`. Build passes.

---

## FIX-06: Fix Next.js Version (16.1.6 → 15.x stable)

**Problem:** `"next": "16.1.6"` is not a published stable version. Causes deployment edge cases.

Before changing, search for Next.js 16-specific APIs:
- `'use cache'` directive
- imports from `next/cache` that don't exist in 15
- `dynamicIO` config in `next.config.ts`

If any found, report and stop. If clean:
```bash
npm install next@^15.3.0
npm run build
```

**Verify:** Build passes. `package.json` shows `"next": "^15.3.0"`.

---

## FIX-07: FALLBACK_ANALYSIS Should Reject, Not Accept

**Problem:** `FALLBACK_ANALYSIS` (used when Claude API fails) sets `hasNightSkyCharacteristics: true`. API failure = free stars.

**File:** `src/app/api/observe/verify/route.ts`

```ts
const FALLBACK_ANALYSIS: ClaudeAnalysis = {
  target: 'unknown',
  identifiedObject: 'Unidentified sky object',
  isScreenshot: true,
  isAiGenerated: false,
  hasNightSkyCharacteristics: false,
  sharpness: 'low',
  reason: 'Verification service unavailable — observation rejected for safety',
};
```

Also ensure the code path using `FALLBACK_ANALYSIS` returns `starsEstimate: 0` and `verificationFailed: true` in the response JSON.

**Verify:** Set `ANTHROPIC_API_KEY=invalid`, submit a photo → `confidence: 'rejected'`.

---

# PHASE 2 — Location Picker Enhancement

> Scrollable dropdown with all major world cities. Dealer assignment based on region.

---

## FIX-08: Expand Location Picker — Scrollable, Full Country Coverage

**Problem:** LocationPicker only has 4 cities. Users in Tokyo, Mumbai, Chicago, etc. have to use GPS. The dropdown is not scrollable.

**Dealer mapping:**
- West Americas (US, CA, MX, BR, AR, CL, CO, PE) → **Celestron** (USD)
- Caucasus + Asia (GE, AM, AZ, TR, JP, KR, CN, IN, TH, SG, MY, ID, PH, VN, PK, BD, LK, MM, KZ, UZ, TW, HK) → **Astroman** (GEL)
- Europe (DE, AT, CH, FR, IT, NL, BE, PL, ES, PT, SE, NO, DK, FI, CZ, HU, RO, GR, BG, HR, SK, SI, IE, UK, GB, UA, RS, LT, LV, EE) → **Levenhuk** (EUR)

**Step 1 — Update `src/lib/location.tsx`:**

Add `'asia'` and `'south_america'` to the Region type:
```ts
export type Region = 'caucasus' | 'north_america' | 'europe' | 'asia' | 'south_america' | 'global'
```

Expand `COUNTRY_TO_REGION`:
```ts
const COUNTRY_TO_REGION: Record<string, Region> = {
  // Caucasus + Middle East
  GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus', TR: 'caucasus',
  IL: 'caucasus', JO: 'caucasus', LB: 'caucasus', IQ: 'caucasus',
  // North America
  US: 'north_america', CA: 'north_america', MX: 'north_america',
  // South America
  BR: 'south_america', AR: 'south_america', CL: 'south_america',
  CO: 'south_america', PE: 'south_america', VE: 'south_america',
  // Europe
  DE: 'europe', AT: 'europe', CH: 'europe', FR: 'europe',
  IT: 'europe', NL: 'europe', BE: 'europe', PL: 'europe',
  ES: 'europe', PT: 'europe', SE: 'europe', NO: 'europe',
  DK: 'europe', FI: 'europe', CZ: 'europe', HU: 'europe',
  RO: 'europe', GR: 'europe', BG: 'europe', HR: 'europe',
  SK: 'europe', SI: 'europe', IE: 'europe', GB: 'europe',
  UK: 'europe', UA: 'europe', RS: 'europe', LT: 'europe',
  LV: 'europe', EE: 'europe',
  // Asia
  JP: 'asia', KR: 'asia', CN: 'asia', IN: 'asia',
  TH: 'asia', SG: 'asia', MY: 'asia', ID: 'asia',
  PH: 'asia', VN: 'asia', PK: 'asia', BD: 'asia',
  LK: 'asia', MM: 'asia', KZ: 'asia', UZ: 'asia',
  TW: 'asia', HK: 'asia', MN: 'asia',
  // Australia/Oceania → global (no dedicated dealer yet)
  AU: 'global', NZ: 'global',
}
```

**Step 2 — Update GPS handler in LocationPicker to include europe detection:**
In the `regionMap` inside `handleGPS`, replace with `getRegionForCountry(countryCode)` — it already works since we're using the exported helper.

**Step 3 — Rewrite `src/components/LocationPicker.tsx`:**

Replace the `PRESETS` array with a grouped list organized by region:

```ts
type PresetCity = UserLocation & { flag: string; nameEn: string }

const CITY_PRESETS: { region: Region; label: string; cities: PresetCity[] }[] = [
  {
    region: 'caucasus',
    label: 'Caucasus',
    cities: [
      { region: 'caucasus', country: 'GE', city: 'Tbilisi',  lat: 41.7151, lon: 44.8271,  source: 'manual', flag: '🇬🇪', nameEn: 'Tbilisi' },
      { region: 'caucasus', country: 'AM', city: 'Yerevan',  lat: 40.1872, lon: 44.5152,  source: 'manual', flag: '🇦🇲', nameEn: 'Yerevan' },
      { region: 'caucasus', country: 'AZ', city: 'Baku',     lat: 40.4093, lon: 49.8671,  source: 'manual', flag: '🇦🇿', nameEn: 'Baku' },
      { region: 'caucasus', country: 'TR', city: 'Istanbul', lat: 41.0082, lon: 28.9784,  source: 'manual', flag: '🇹🇷', nameEn: 'Istanbul' },
    ],
  },
  {
    region: 'north_america',
    label: 'Americas',
    cities: [
      { region: 'north_america', country: 'US', city: 'New York',    lat: 40.7128,  lon: -74.006,   source: 'manual', flag: '🇺🇸', nameEn: 'New York' },
      { region: 'north_america', country: 'US', city: 'Los Angeles', lat: 34.0522,  lon: -118.2437, source: 'manual', flag: '🇺🇸', nameEn: 'Los Angeles' },
      { region: 'north_america', country: 'US', city: 'Chicago',     lat: 41.8781,  lon: -87.6298,  source: 'manual', flag: '🇺🇸', nameEn: 'Chicago' },
      { region: 'north_america', country: 'US', city: 'Houston',     lat: 29.7604,  lon: -95.3698,  source: 'manual', flag: '🇺🇸', nameEn: 'Houston' },
      { region: 'north_america', country: 'CA', city: 'Toronto',     lat: 43.6532,  lon: -79.3832,  source: 'manual', flag: '🇨🇦', nameEn: 'Toronto' },
      { region: 'north_america', country: 'CA', city: 'Vancouver',   lat: 49.2827,  lon: -123.1207, source: 'manual', flag: '🇨🇦', nameEn: 'Vancouver' },
      { region: 'south_america', country: 'BR', city: 'São Paulo',   lat: -23.5505, lon: -46.6333,  source: 'manual', flag: '🇧🇷', nameEn: 'São Paulo' },
      { region: 'south_america', country: 'AR', city: 'Buenos Aires',lat: -34.6037, lon: -58.3816,  source: 'manual', flag: '🇦🇷', nameEn: 'Buenos Aires' },
    ],
  },
  {
    region: 'europe',
    label: 'Europe',
    cities: [
      { region: 'europe', country: 'DE', city: 'Berlin',    lat: 52.52,    lon: 13.405,   source: 'manual', flag: '🇩🇪', nameEn: 'Berlin' },
      { region: 'europe', country: 'FR', city: 'Paris',     lat: 48.8566,  lon: 2.3522,   source: 'manual', flag: '🇫🇷', nameEn: 'Paris' },
      { region: 'europe', country: 'GB', city: 'London',    lat: 51.5074,  lon: -0.1278,  source: 'manual', flag: '🇬🇧', nameEn: 'London' },
      { region: 'europe', country: 'IT', city: 'Rome',      lat: 41.9028,  lon: 12.4964,  source: 'manual', flag: '🇮🇹', nameEn: 'Rome' },
      { region: 'europe', country: 'ES', city: 'Madrid',    lat: 40.4168,  lon: -3.7038,  source: 'manual', flag: '🇪🇸', nameEn: 'Madrid' },
      { region: 'europe', country: 'NL', city: 'Amsterdam', lat: 52.3676,  lon: 4.9041,   source: 'manual', flag: '🇳🇱', nameEn: 'Amsterdam' },
      { region: 'europe', country: 'PL', city: 'Warsaw',    lat: 52.2297,  lon: 21.0122,  source: 'manual', flag: '🇵🇱', nameEn: 'Warsaw' },
      { region: 'europe', country: 'SE', city: 'Stockholm', lat: 59.3293,  lon: 18.0686,  source: 'manual', flag: '🇸🇪', nameEn: 'Stockholm' },
      { region: 'europe', country: 'UA', city: 'Kyiv',      lat: 50.4501,  lon: 30.5234,  source: 'manual', flag: '🇺🇦', nameEn: 'Kyiv' },
    ],
  },
  {
    region: 'asia',
    label: 'Asia',
    cities: [
      { region: 'asia', country: 'JP', city: 'Tokyo',     lat: 35.6762,  lon: 139.6503, source: 'manual', flag: '🇯🇵', nameEn: 'Tokyo' },
      { region: 'asia', country: 'KR', city: 'Seoul',     lat: 37.5665,  lon: 126.9780, source: 'manual', flag: '🇰🇷', nameEn: 'Seoul' },
      { region: 'asia', country: 'CN', city: 'Beijing',   lat: 39.9042,  lon: 116.4074, source: 'manual', flag: '🇨🇳', nameEn: 'Beijing' },
      { region: 'asia', country: 'IN', city: 'Mumbai',    lat: 19.0760,  lon: 72.8777,  source: 'manual', flag: '🇮🇳', nameEn: 'Mumbai' },
      { region: 'asia', country: 'IN', city: 'Delhi',     lat: 28.6139,  lon: 77.2090,  source: 'manual', flag: '🇮🇳', nameEn: 'Delhi' },
      { region: 'asia', country: 'SG', city: 'Singapore', lat: 1.3521,   lon: 103.8198, source: 'manual', flag: '🇸🇬', nameEn: 'Singapore' },
      { region: 'asia', country: 'TH', city: 'Bangkok',   lat: 13.7563,  lon: 100.5018, source: 'manual', flag: '🇹🇭', nameEn: 'Bangkok' },
      { region: 'asia', country: 'ID', city: 'Jakarta',   lat: -6.2088,  lon: 106.8456, source: 'manual', flag: '🇮🇩', nameEn: 'Jakarta' },
      { region: 'asia', country: 'PH', city: 'Manila',    lat: 14.5995,  lon: 120.9842, source: 'manual', flag: '🇵🇭', nameEn: 'Manila' },
    ],
  },
]
```

**Dropdown layout changes:**
- Add a search input at the top of the dropdown (filter cities by name as user types)
- Render grouped sections with a small region label (e.g., "AMERICAS", "EUROPE")
- Make the list area scrollable: set `maxHeight: 260, overflowY: 'auto'` on the cities container
- Give the search input cosmic style: dark background, teal border on focus
- Keep existing GPS button and header intact
- Dropdown min-width should expand to 280px to accommodate longer city names

**Search input:**
```tsx
const [search, setSearch] = useState('')

// Filter: show only cities/regions that match
const filtered = search.trim()
  ? CITY_PRESETS.map(group => ({
      ...group,
      cities: group.cities.filter(c =>
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase())
      )
    })).filter(g => g.cities.length > 0)
  : CITY_PRESETS
```

Do NOT break existing GPS detection. Do NOT change the pill button appearance.

---

## FIX-09: Update dealers.ts — Add Levenhuk + Asia region

**Problem:** `dealers.ts` has Bresser for Europe, but the new European dealer is Levenhuk (per product direction). Asia region has no dealer — should fall back to Astroman.

**File:** `src/lib/dealers.ts`

**Step 1 — Update Region import** (location.tsx now exports `'asia'` and `'south_america'`):
```ts
import type { Region } from '@/lib/location'
// Region is now: 'caucasus' | 'north_america' | 'europe' | 'asia' | 'south_america' | 'global'
```

**Step 2 — Replace Bresser dealer entry** with Levenhuk:
```ts
{
  id: 'levenhuk-eu',
  name: 'Levenhuk',
  tagline: "Telescopes for curious minds",
  flag: '🇪🇺',
  region: 'europe',
  country: 'EU',
  website: 'https://levenhukb2b.com/catalogue/telescopes/',
  description: "European optics brand — telescopes, microscopes and accessories",
  shipsTo: ['DE','AT','CH','FR','IT','NL','BE','PL','ES','PT','SE','NO','DK','FI','CZ','HU','RO','GR','BG','HR','GB','IE','UA','LT','LV','EE'],
  currency: 'EUR',
  currencySymbol: '€',
},
```

Keep Astroman and Celestron entries unchanged.

**Step 3 — Replace all Bresser products** (`dealerId: 'bresser-eu'`) with Levenhuk products:

```ts
// Levenhuk (Europe) — beginner tier
{
  id: 'lev-blitz50',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Blitz 50 BASE',
  price: 59,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 590,
  category: 'telescope',
  description: '50mm refractor on alt-az mount. Perfect first telescope — simple, lightweight, easy to set up.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Blitz-50-BASE-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  badge: 'Beginner',
  specs: { aperture: '50mm', focal: '600mm', mount: 'Manual Alt-Az' },
  beginner: true,
  skillLevel: 'beginner' as const,
},
{
  id: 'lev-labzz-t2',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk LabZZ T2 Telescope',
  price: 49,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 490,
  category: 'telescope',
  description: '50mm kids telescope with compass, backpack, and book. Best astronomy gift for young astronomers.',
  image: 'https://levenhuk.com/img/large/Levenhuk-LabZZ-T2-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  badge: 'Beginner',
  specs: { aperture: '50mm', focal: '360mm', mount: 'Manual Alt-Az' },
  beginner: true,
  skillLevel: 'beginner' as const,
},
{
  id: 'lev-skyline-base70',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Skyline BASE 70T',
  price: 89,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 890,
  category: 'telescope',
  description: '70mm tabletop refractor. Compact and sturdy — great for balconies and travel.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-BASE-70T-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  specs: { aperture: '70mm', focal: '700mm', mount: 'Tabletop Alt-Az' },
  beginner: true,
  skillLevel: 'beginner' as const,
},
{
  id: 'lev-travel70',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Skyline Travel 70',
  price: 99,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 990,
  category: 'telescope',
  description: '70mm portable refractor with tripod. Folds into a compact bag — ideal for dark-sky trips.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-Travel-70-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  specs: { aperture: '70mm', focal: '700mm', mount: 'Travel Alt-Az' },
  beginner: true,
  skillLevel: 'beginner' as const,
},
// Intermediate
{
  id: 'lev-travel80',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Skyline Travel 80',
  price: 119,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 1190,
  category: 'telescope',
  description: '80mm portable refractor. Wider aperture than the Travel 70 — better for star clusters.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-Travel-80-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  specs: { aperture: '80mm', focal: '400mm', mount: 'Travel Alt-Az' },
  skillLevel: 'intermediate' as const,
},
{
  id: 'lev-base110',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Skyline BASE 110S',
  price: 149,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 1490,
  category: 'telescope',
  description: '110mm reflector on simple mount. Step up from beginner scope — great light gathering.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-BASE-110S-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  specs: { aperture: '110mm', focal: '500mm', mount: 'Manual Alt-Az' },
  skillLevel: 'intermediate' as const,
},
{
  id: 'lev-blitz114',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Blitz 114 PLUS',
  price: 179,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 1790,
  category: 'telescope',
  description: '114mm Newtonian reflector. Excellent for planets, Moon, and bright nebulae. Good upgrade scope.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Blitz-114-PLUS-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  badge: 'Popular',
  specs: { aperture: '114mm', focal: '900mm', mount: 'Manual Alt-Az' },
  skillLevel: 'intermediate' as const,
},
// Advanced
{
  id: 'lev-spark114',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Discovery Spark 114 EQ',
  price: 199,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 1990,
  category: 'telescope',
  description: '114mm reflector on equatorial mount with Discovery book. EQ mount enables serious tracking.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Discovery-Spark-114-EQ-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  badge: 'Best Seller',
  specs: { aperture: '114mm', focal: '900mm', mount: 'EQ' },
  skillLevel: 'advanced' as const,
},
{
  id: 'lev-plus120',
  dealerId: 'levenhuk-eu',
  name: 'Levenhuk Skyline PLUS 120S',
  price: 249,
  currency: 'EUR',
  currencySymbol: '€',
  starsPrice: 2490,
  category: 'telescope',
  description: '120mm short-tube reflector. Excellent aperture for deep-sky objects — galaxies and nebulae.',
  image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-PLUS-120S-Telescope_01.jpg',
  externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
  specs: { aperture: '120mm', focal: '600mm', mount: 'Manual Alt-Az' },
  skillLevel: 'advanced' as const,
},
```

**Step 4 — Update `getDealersByRegion` to handle new regions:**
```ts
export function getDealersByRegion(region: Region): Dealer[] {
  if (region === 'global') return DEALERS
  if (region === 'asia') return DEALERS.filter(d => d.id === 'astroman') // Astroman ships worldwide
  if (region === 'south_america') return DEALERS.filter(d => d.id === 'celestron-us') // Celestron ships to SA
  return DEALERS.filter(d => d.region === region)
}
```

**Step 5 — Update `getProductsByRegion`:**
```ts
export function getProductsByRegion(region: Region): Product[] {
  if (region === 'global') return GLOBAL_FALLBACK
  if (region === 'asia') return PRODUCTS.filter(p => p.dealerId === 'astroman')
  if (region === 'south_america') return PRODUCTS.filter(p => p.dealerId === 'celestron-us')
  const dealerIds = getDealersByRegion(region).map(d => d.id)
  return PRODUCTS.filter(p => dealerIds.includes(p.dealerId))
}
```

**Step 6 — Update `buildGlobalFallback`:**
Replace Bresser reference with Levenhuk:
```ts
function buildGlobalFallback(): Product[] {
  const ids = ['astroman', 'celestron-us', 'levenhuk-eu']
  return ids.flatMap(id =>
    PRODUCTS.filter(p => p.dealerId === id && p.category === 'telescope')
      .sort((a, b) => a.price - b.price)
      .slice(0, 2)
  )
}
```

**Step 7 — Add `skillLevel` field to the `Product` interface:**
```ts
export interface Product {
  ...
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
}
```

Also add `skillLevel` to all existing Astroman and Celestron telescope products:
- Under ₾1000 / $300 / €100 → `beginner`
- ₾1000-₾2500 / $300-$800 / €100-€200 → `intermediate`
- Above that → `advanced`

---

# PHASE 3 — Marketplace Redesign

> Telescope-first layout with Beginner / Intermediate / Pro skill tiers. Square images. Product cards show full telescope.

---

## FIX-10: Marketplace Page — Skill-Tier Layout + Square Cards

**Problem (from screenshots):** Product images are landscape/rectangular and often cut off the telescope. Cards are a flat 2-column grid with no visual hierarchy. No skill-level guidance for buyers.

**File:** `src/app/marketplace/page.tsx`

Read the current file fully before editing.

---

**Step 1 — Update `ProductCard` — Square image with object-contain:**

Replace the image block (currently `height: 140, objectFit: 'cover'`):

```tsx
{/* Square image container — always shows full telescope */}
<div className="relative flex-shrink-0" style={{
  aspectRatio: '1 / 1',
  background: showImg ? 'rgba(0,0,0,0.3)' : fallback.bg,
  overflow: 'hidden',
}}>
  {showImg ? (
    <Image
      src={product.image}
      alt={product.name}
      fill
      sizes="(max-width: 768px) 50vw, 300px"
      style={{ objectFit: 'contain', padding: '12px' }}
      unoptimized
      onError={() => setImgError(true)}
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <span className="text-5xl leading-none">{fallback.icon}</span>
      <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
        {fallback.label}
      </p>
    </div>
  )}
  {/* Skill badge — top left */}
  {product.skillLevel && (
    <span
      className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={SKILL_BADGE_STYLES[product.skillLevel]}
    >
      {product.skillLevel === 'intermediate' ? 'Mid' : product.skillLevel}
    </span>
  )}
  {/* Product badge — top right */}
  {badgeStyle && !product.skillLevel && (
    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
      {product.badge}
    </span>
  )}
</div>
```

Add skill badge styles constant:
```ts
const SKILL_BADGE_STYLES: Record<string, { background: string; color: string; border: string }> = {
  beginner: {
    background: 'rgba(52,211,153,0.15)',
    color: '#34d399',
    border: '1px solid rgba(52,211,153,0.3)',
  },
  intermediate: {
    background: 'rgba(245,158,11,0.15)',
    color: '#F59E0B',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  advanced: {
    background: 'rgba(139,92,246,0.15)',
    color: '#8B5CF6',
    border: '1px solid rgba(139,92,246,0.3)',
  },
}
```

---

**Step 2 — Add skill tier sections for telescopes:**

When `filter === 'telescope'` (or `filter === 'all'` and there are telescope products), render telescopes in three skill-tier sections instead of a flat grid.

Add this helper above the return:
```ts
const telescopesByTier = {
  beginner: products.filter(p => p.category === 'telescope' && p.skillLevel === 'beginner'),
  intermediate: products.filter(p => p.category === 'telescope' && (p.skillLevel === 'intermediate' || (!p.skillLevel && p.price >= 100 && p.price <= 500))),
  advanced: products.filter(p => p.category === 'telescope' && (p.skillLevel === 'advanced' || (!p.skillLevel && p.price > 500))),
}
const nonTelescopes = products.filter(p => p.category !== 'telescope')
const isTelescopeView = filter === 'all' || filter === 'telescope'
```

Replace the product grid section with:
```tsx
{isTelescopeView ? (
  <div className="flex flex-col gap-8">
    {/* Beginner tier */}
    {telescopesByTier.beginner.length > 0 && (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width: 3, height: 18, borderRadius: 2, background: '#34d399' }} />
          <p className="text-sm font-semibold" style={{ color: '#34d399' }}>Beginner</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>First telescope · Easy setup</p>
        </div>
        <div className="grid gap-3 grid-cols-2">
          {telescopesByTier.beginner.map(p => (
            <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} solRate={solRate} />
          ))}
        </div>
      </div>
    )}
    {/* Intermediate tier */}
    {telescopesByTier.intermediate.length > 0 && (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width: 3, height: 18, borderRadius: 2, background: '#F59E0B' }} />
          <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>Intermediate</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>More aperture · Better optics</p>
        </div>
        <div className="grid gap-3 grid-cols-2">
          {telescopesByTier.intermediate.map(p => (
            <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} solRate={solRate} />
          ))}
        </div>
      </div>
    )}
    {/* Advanced tier */}
    {telescopesByTier.advanced.length > 0 && (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width: 3, height: 18, borderRadius: 2, background: '#8B5CF6' }} />
          <p className="text-sm font-semibold" style={{ color: '#8B5CF6' }}>Advanced</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>GoTo mounts · Deep sky capable</p>
        </div>
        <div className="grid gap-3 grid-cols-2">
          {telescopesByTier.advanced.map(p => (
            <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} solRate={solRate} />
          ))}
        </div>
      </div>
    )}
    {/* Non-telescope items if filter === 'all' */}
    {filter === 'all' && nonTelescopes.length > 0 && (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width: 3, height: 18, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Accessories & More</p>
        </div>
        <div className="grid gap-3 grid-cols-2">
          {nonTelescopes.map(p => (
            <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} solRate={solRate} />
          ))}
        </div>
      </div>
    )}
  </div>
) : (
  /* Non-telescope filter: plain grid */
  <div className="grid gap-3 grid-cols-2">
    {products.map(p => (
      <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} solRate={solRate} />
    ))}
  </div>
)}
```

---

**Step 3 — Category filter: rename "Telescopes" tab with tier shortcut links:**

After the category filter row, add a compact tier filter that appears only when `filter === 'telescope'` or `filter === 'all'`:
```tsx
{(filter === 'all' || filter === 'telescope') && (
  <div className="flex gap-2 mb-5">
    <a href="#tier-beginner" className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
      Beginner
    </a>
    <a href="#tier-intermediate" className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
      Intermediate
    </a>
    <a href="#tier-advanced" className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
      Advanced
    </a>
  </div>
)}
```

Add `id="tier-beginner"` etc. to the tier section divs for anchor scroll.

---

**Step 4 — Remove SOL price from ProductCard (audit D1):**

In the price row, remove the SOL price display entirely:
```tsx
{/* Remove this block completely */}
<p className="text-[10px] mt-0.5" style={{ color: 'rgba(153,69,255,0.8)' }}>
  {solPrice()}
</p>
```

Replace with dealer tag if `showDealer`:
```tsx
{showDealer && (
  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
    via {dealerName}
  </p>
)}
```

Also remove `solRate` prop and `solPrice()` function from `ProductCard` — they're no longer needed. The `solRate` state can remain on the page for potential future use.

---

**Step 5 — Product card info section improvements:**

Update the info section to show specs more visibly and description less aggressively:
```tsx
<div className="flex flex-col p-3 gap-1.5">
  <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{product.name}</p>
  
  {/* Specs row — aperture + mount type */}
  {product.specs && (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
          {v}
        </span>
      ))}
    </div>
  )}
  
  <p className="text-[10px] line-clamp-2 leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
    {product.description}
  </p>

  {/* Price row */}
  <div className="flex items-center justify-between mt-1.5">
    <p className="text-white font-bold text-sm leading-none">
      {product.currencySymbol}{product.price % 1 !== 0 ? product.price.toFixed(2) : product.price.toLocaleString()}
    </p>
    <a
      href={product.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] px-3 py-1.5 rounded-lg flex-shrink-0"
      style={{
        background: 'rgba(52,211,153,0.1)',
        border: '1px solid rgba(52,211,153,0.25)',
        color: '#34d399',
        textDecoration: 'none',
        fontWeight: 600,
      }}
    >
      Buy →
    </a>
  </div>
</div>
```

Do NOT change the page header, dealer branding, StarsRedemption, or partner banner sections.

---

# PHASE 4 — Data Integrity (Backend-only, no UI changes)

---

## FIX-11: Wire Real Leaderboard to Database

**Problem:** Leaderboard shows fake seed data mixed with real entries. Judges see fake Georgian handles.

Read these files before writing:
- `src/app/leaderboard/page.tsx`
- `src/app/api/observe/log/route.ts`
- `src/lib/db.ts` or `src/db/` (Drizzle schema)
- `src/app/profile/page.tsx` (how wallet → display name works)

**Step 1 — Create/update `src/app/api/leaderboard/route.ts`:**

GET handler with `?period=week|month|all` (default: all).

```ts
const query = db
  .select({
    wallet: observationLog.wallet,
    observationCount: count(),
    totalStars: sum(observationLog.stars),
  })
  .from(observationLog)
  .where(/* date filter based on period */)
  .groupBy(observationLog.wallet)
  .orderBy(desc(sum(observationLog.stars)))
  .limit(50)
```

Return format:
```json
[{ "rank": 1, "wallet": "ABC...XYZ", "displayName": "Rezi", "observationCount": 12, "totalStars": 850, "isCurrentUser": false }]
```

Set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

**Step 2 — Update `src/app/leaderboard/page.tsx`:**

Remove ALL hardcoded mock/seed data arrays. Fetch from the API.

Empty state: "No observations yet. Be the first — complete a sky mission!" with button to `/missions`.

If current user is in list: highlight row with teal left border.

NEVER fall back to fake data. Empty state is correct behavior.

---

## FIX-12: Fix Stars Award Atomicity

**Problem:** Client calls `/api/observe/verify` (returns `starsAwarded`), shows stars to user, then calls `/api/observe/log` (actually mints). If client crashes between calls, user sees stars they never received.

Read: `verify/route.ts`, `observe/log/route.ts`, `award-stars/route.ts`, `MissionActive.tsx`

**Fix:**
1. In `verify/route.ts`: rename `starsAwarded` → `starsEstimate` in response JSON
2. In `observe/log/route.ts`: award SPL stars in the same request, return `{ starsAwarded: N, starsMinted: true|false }`
3. In `MissionActive.tsx`: show stars as `~N Stars` (pending) after verify, update to confirmed amount after log response
4. Add idempotency: before inserting to observation_log, check if `wallet + target + created_at within 60s` already exists

---

## FIX-13: Expand observation_log Schema

**Problem:** Missing `lat`, `lon`, `identified_object`, `stars_awarded`, `oracle_hash` columns.

Run in Neon SQL editor:
```sql
ALTER TABLE observation_log
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS identified_object TEXT,
  ADD COLUMN IF NOT EXISTS stars_awarded INTEGER,
  ADD COLUMN IF NOT EXISTS oracle_hash TEXT;
```

Then: `npm run db:push`

Update `observe/log/route.ts` to populate:
```ts
lat: body.lat ?? null,
lon: body.lon ?? null,
identified_object: body.identifiedObject ?? body.target ?? null,
stars_awarded: body.stars ?? null,
oracle_hash: body.oracleHash ?? null,
```

---

# PHASE 5 — Security & Infrastructure (Low priority, post-demo)

---

## FIX-14: Collection NFTs Minted with verified: false

**File:** `src/lib/mint-nft.ts`

After `mintV1(...).sendAndConfirm(umi)` succeeds, call `verifyCollection`:
```ts
import { verifyCollection } from '@metaplex-foundation/mpl-bubblegum';

await verifyCollection(umi, {
  leafOwner: recipient,
  merkleTree: toPublicKey(MERKLE_TREE_ADDRESS),
  leafIndex: mintResult.leafIndex, // from mint result
  collectionMint: toPublicKey(COLLECTION_MINT_ADDRESS),
  collectionAuthority: keypair.publicKey,
}).sendAndConfirm(umi);
```

If the Bubblegum SDK version doesn't export `verifyCollection`, check `scripts/setup-bubblegum.ts` to confirm fee payer is the collection authority, then set `verified: true` directly in `mintV1`. If neither works, leave `verified: false` with a code comment and document as known gap.

---

## FIX-15: Stars Double-Award Risk

**Problem:** `/api/observe/log` and `MissionActive.tsx` may both call award paths for the same observation.

- Make `/api/observe/log` the single source of Stars awards (already addressed in FIX-12)
- `/api/award-stars` should only be used from server-to-server flows
- Add `UNIQUE(wallet, target, DATE(created_at))` to `observation_log` to prevent duplicate DB rows

---

## FIX-16: WalletSync Missing useEffect Dependency

**File:** `src/components/providers/WalletSync.tsx`

Change:
```ts
}, [solWallet?.address]);
```
To:
```ts
}, [solWallet?.address, setWallet]);
```

---

## FIX-17: Photo Lightbox — Add Escape Key Handler

**File:** `src/app/profile/page.tsx`

Add after `selectedPhoto` state declaration:
```ts
useEffect(() => {
  if (!selectedPhoto) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedPhoto(null);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [selectedPhoto]);
```

---

## FIX-18: Hardcoded Tbilisi Coords for Global Users

**Files:** `src/app/chat/page.tsx:39`, `src/app/missions/page.tsx:48`

In both files, replace hardcoded `lat=41.6938&lon=44.8015` with `useLocation()`:
```ts
import { useLocation } from '@/lib/location';
const { location } = useLocation();

useEffect(() => {
  const lat = location.lat !== 0 ? location.lat : 41.6938;
  const lon = location.lon !== 0 ? location.lon : 44.8015;
  fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`)...
}, [location.lat, location.lon]);
```

Also update `src/app/api/chat/route.ts` to accept `lat`/`lon` from the POST body:
```ts
const lat = typeof body.lat === 'number' ? body.lat : DEFAULT_LAT;
const lon = typeof body.lon === 'number' ? body.lon : DEFAULT_LON;
```

---

## FIX-19: Georgia Copy in Observe Page (Through i18n)

**Files:** `src/app/observe/page.tsx`, `src/messages/en.json`, `src/messages/ka.json`

In `en.json`, under `observe` namespace:
```json
"observe": {
  "hero": "Observe & Earn",
  "heroDesc": "Photograph the night sky through your telescope. Every verified observation earns real rewards from your local astronomy partner.",
  "signIn": "Sign In to Start Observing →",
  "signInSub": "Free forever · No seed phrase required"
}
```

Add Georgian translations to `ka.json`. In `observe/page.tsx`, replace hardcoded strings with `t('observe.heroDesc')` etc.

---

# PHASE 6 — Submission Materials

---

## SUBMIT-01: Rewrite README for Colosseum Frontier

```
I'm building Stellar for the Colosseum Frontier 2026 hackathon. The README needs rewriting.

Read: README.md (current), src/app/ directory listing, package.json.

Rewrite README.md with this structure:

1. TITLE + ONE-LINER
   # Stellar — Observe the Sky, Earn on Solana
   > The astronomy app that turns every telescope session into a verified on-chain discovery.

2. WHAT IT DOES (4-5 sentences)
   - Observe → Capture → Verify → Earn → Spend loop
   - Privy embedded wallets, no crypto visible to users
   - Stars SPL token + compressed NFT proof per observation
   - AI verification via Claude Vision + sky oracle cross-check
   - Real rewards redeemable at partner stores (Astroman / Celestron / Levenhuk by region)

3. WHY SOLANA (3 bullets)
   - Compressed NFTs at ~$0.000005/mint via Metaplex Bubblegum
   - SPL tokens for verifiable on-chain rewards
   - Privy embedded wallets = email signup, zero friction

4. FOUNDER-MARKET FIT (short paragraph)
   Built by Rezi Modebadze, founder of Astroman.ge — 60K+ followers, physical store in Tbilisi.

5. TECH STACK (table, accurate to current package.json)
   - Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
   - Privy SDK (NOT Phantom)
   - Metaplex Bubblegum + Umi
   - Claude API for ASTRA + photo verification
   - Open-Meteo + astronomy-engine
   - Neon serverless Postgres + Drizzle ORM
   - Levenhuk (EU) / Celestron (Americas) / Astroman (Caucasus/Asia)
   - Vercel

6. LIVE DEMO: stellarrclub.vercel.app

7. HOW TO RUN LOCALLY (keep setup:bubblegum and setup:token scripts)

8. DEMO SCRIPT (10-step, 3-minute)

9. PROJECT STRUCTURE (simplified src/ tree)

10. ENVIRONMENT VARIABLES (.env.example list)

11. HACKATHON: Colosseum Frontier 2026, Consumer Track, built by Rezi Modebadze

Remove ALL references to: FarmHawk, Pollinet, Phantom Wallet, CyreneAI, "Vibecoding From 0",
"Superteam Georgia" as hackathon, proof-of-observation.vercel.app, Next.js 16, Bresser.
```

---

## SUBMIT-02: Add .env.example File

```
Scan every process.env reference in src/app/api/ and src/lib/. Create .env.example at repo root.

Group by category with comments:

# === Auth ===
NEXT_PUBLIC_PRIVY_APP_ID=           # Privy dashboard → App ID

# === AI ===
ANTHROPIC_API_KEY=                  # Anthropic console → API Keys

# === Database ===
DATABASE_URL=                       # Neon dashboard → Connection string

# === Solana ===
SOLANA_RPC_URL=https://api.devnet.solana.com
FEE_PAYER_PRIVATE_KEY=              # Base58 encoded — run setup scripts
MERKLE_TREE_ADDRESS=                # Set by: npm run setup:bubblegum
COLLECTION_MINT_ADDRESS=            # Set by: npm run setup:bubblegum
STARS_TOKEN_MINT=                   # Set by: npm run setup:token

# === Public ===
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=
NEXT_PUBLIC_HELIUS_RPC_URL=
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app

# === Rewards ===
REWARD_CODE_MOONLAMP=
REWARD_CODE_10PCT=
REWARD_CODE_20PCT=
INTERNAL_API_SECRET=

Include ALL process.env references found.
```

---

## SUBMIT-03: Pitch Script (3 Minutes)

Do not create a file — generate this as conversation output.

```
Write a 3-minute pitch script for Stellar. Context:
- Zero competitors: 5,400+ Colosseum submissions, zero astronomy projects on any chain
- Stars = arcade token (a16z framing): earned through real activity, spent on real gear
- Founder-market fit: Rezi, Astroman.ge, 60K followers, physical store Tbilisi
- Compressed NFTs at $0.000005/mint is the Solana justification
- Multi-layer verification: Claude Vision + sky oracle + astronomy cross-check + double capture
- 3 regional partners: Astroman (Caucasus/Asia), Celestron (Americas), Levenhuk (Europe)

Structure with timing:
HOOK (15s) → SOLUTION (30s) → WHY SOLANA (20s) → DEMO (60s) → DISTRIBUTION (30s) → MARKET (15s) → CLOSE (10s)

Key answers baked in:
- "Who are users?" → 10M active telescope owners globally
- "Why Solana?" → $0.000005/NFT, email login via Privy, gasless
- "How do you monetize?" → Astroman already makes money. Stellar drives traffic.
- "Competition?" → Zero on any chain.
- "Why now?" → Compressed NFTs made the economics work. Privy made UX work.
```

---

# PHASE 7 — Optional Enhancements (Only if Phases 1-6 complete)

---

## OPT-01: Dark Sky Map — Wire to Real Observation Data

**Only run after FIX-13 (DB schema expanded with lat/lon).**

Create `src/app/api/darksky/data/route.ts`:
```ts
// Query observation_log for lat/lon not null
SELECT lat, lon, target, confidence, created_at
FROM observation_log
WHERE lat IS NOT NULL AND lon IS NOT NULL
ORDER BY created_at DESC LIMIT 500
```

Return as GeoJSON FeatureCollection. Include 6 hardcoded Georgian seed locations as fallback.
Add `source: 'observation' | 'seed'` property to each feature.

Update `src/app/darksky/page.tsx` to fetch from this route on mount. Show count badge: "X observations from Y locations". Keep existing map visualization — just swap data source.

---

## OPT-02: Enhance ASTRA System Prompt

**File:** `src/app/api/chat/route.ts`

Find the system prompt string. Append (do not replace):
```
You can share these facts about Stellar when relevant:
- Stellar is the only astronomy app on any blockchain. Zero competitors.
- Each observation proof costs ~$0.000005 to mint as a compressed NFT on Solana.
- Stars tokens work like arcade tokens — earned for real activity, spent on real gear from partner stores.
- Verification uses: AI image analysis (Claude Vision), sky oracle weather cross-check, astronomy position cross-check, and double-capture.
- Partner stores: Astroman (Caucasus/Asia), Celestron (Americas), Levenhuk (Europe).
- Built by the founder of Astroman.ge, Georgia's first astronomy store with 60,000+ followers.

When asked "what is Stellar?" or "how does this work?", answer in 2-3 sentences about the observe-verify-earn loop, then offer sky help.
```

Only modify the system prompt. Touch nothing else.

---

# TESTING PROMPTS

---

## TEST-01: Phase 1 Regression Suite

```bash
# Build test
npm run build
# Expected: Compiled successfully, exit 0

# Dev server (Turbopack)
npm run dev
# Expected: No font module errors. Navigate / → Georgian text renders.

# Security — upsert auth
curl -X POST http://localhost:3000/api/users/upsert \
  -H "Content-Type: application/json" \
  -d '{"privyId":"test123"}'
# Expected: {"success":false,"error":"Unauthorized"} 401

# Security — reward codes not in source
grep -r "MOONLAMP25\|STELLAR10\|STELLAR20" src/
# Expected: no output

# Legacy dep removed
grep "@metaplex-foundation/js" package.json
# Expected: no output

# sim_ path test
# Remove FEE_PAYER_PRIVATE_KEY from .env.local, complete a mission
# Expected: "Saved locally", no explorer link
```

---

## TEST-02: Marketplace Visual Checks

After completing FIX-08 through FIX-10:

1. Open `/marketplace` — set location to **Berlin** via LocationPicker
   - Expected: Levenhuk products shown in EUR, 3 tier sections (Beginner / Intermediate / Advanced)
   - Expected: Product images are square, full telescope visible (not cropped)
   - Expected: Beginner badge = teal, Intermediate = amber, Advanced = purple

2. Set location to **New York**
   - Expected: Celestron products in USD, same tier layout

3. Set location to **Tbilisi**
   - Expected: Astroman products in GEL

4. Set location to **Tokyo**
   - Expected: Astroman products (Asia falls back to Astroman)

5. Open LocationPicker → should be scrollable, search input works, groups visible

6. No SOL price (◎) should appear anywhere on product cards

---

## TEST-03: API Route Smoke Tests

```bash
curl "http://localhost:3000/api/sky/verify?lat=41.69&lon=44.80"
# Expected: {"verified":bool,"cloudCover":N,...}

curl "http://localhost:3000/api/sky/forecast?lat=41.69&lon=44.80"
# Expected: 7-day array

curl "http://localhost:3000/api/sky/planets?lat=41.69&lon=44.80"
# Expected: planet array

curl "http://localhost:3000/api/leaderboard"
# Expected: [] or real entries — NO fake seed data

# Mint rejection — cloud cover too high
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -d '{"userAddress":"","target":"Moon","cloudCover":85,"oracleHash":"0xtest","stars":50}'
# Expected: 400 {"error":"Sky conditions too poor..."}

# FALLBACK test — invalid API key
ANTHROPIC_API_KEY=invalid npm run dev
# Submit photo → Expected: confidence 'rejected', starsEstimate 0
```

---

## TEST-04: Golden Path Demo (Run before any submission)

Time each step. Total should be under 4 minutes from fresh load.

1. `http://localhost:3000` — hero loads, sky preview visible (< 3s)
2. `/missions` — mission list loads
3. Sign in via email — Privy modal, embedded wallet created
4. `/missions` after auth — StatsBar visible
5. Click mission → brief → Capture → take/upload real photo
6. Sky verify runs (< 5s), confidence + Stars shown
7. Tap "Seal" → minting → done screen
   - Devnet with real config: explorer link appears, clickable, real TX
   - sim mode: "Saved locally", no link
8. `/profile` — observation appears in Discoveries
9. `/leaderboard` — your entry visible, no fake handles
10. `/chat` → "What's visible tonight?" → ASTRA responds with local data
11. `/marketplace` → correct dealer for your set location, tier sections, square images
12. `/sky` → 7-day forecast + planet grid load

Pass: all 12 steps, no console errors, no 404s, no blank screens.

---

# EVALUATION MATRIX

Update status after each fix session.

## Phase 1 — Critical

| ID | Issue | Status |
|----|-------|--------|
| FIX-01 | Turbopack Noto Georgian crash | ✅ Done |
| FIX-02 | sim_ txId shown as "Sealed on Solana" | ✅ Done |
| FIX-03 | Reward codes in source | ✅ Done |
| FIX-04 | /api/users/upsert no auth | ✅ Done |
| FIX-05 | Remove @metaplex-foundation/js | ✅ Done |
| FIX-06 | Fix Next.js 16.1.6 → 15.x | ✅ Done |
| FIX-07 | FALLBACK_ANALYSIS accepts on failure | ✅ Done |

## Phase 2 — Location

| ID | Issue | Status |
|----|-------|--------|
| FIX-08 | Location picker scrollable + all cities | ✅ Done |
| FIX-09 | dealers.ts — Levenhuk + Asia region | ✅ Done |

## Phase 3 — Marketplace

| ID | Issue | Status |
|----|-------|--------|
| FIX-10 | Square images + skill tier sections + SOL price removed | ✅ Done |

## Phase 4 — Data Integrity

| ID | Issue | Status |
|----|-------|--------|
| FIX-11 | Real leaderboard wired to DB | ✅ Done |
| FIX-12 | Stars award atomicity | ✅ Done |
| FIX-13 | DB schema — lat/lon/stars_awarded columns | ⚠️ Code done · run `npm run db:push` |

## Phase 5 — Security

| ID | Issue | Status |
|----|-------|--------|
| FIX-14 | Collection NFTs verified: false | ⬜ Open |
| FIX-15 | Stars double-award risk | ⬜ Open |
| FIX-16 | WalletSync useEffect dep | ⬜ Open |
| FIX-17 | Lightbox Escape key | ⬜ Open |
| FIX-18 | Hardcoded Tbilisi coords | ⬜ Open |
| FIX-19 | Observe page i18n | ⬜ Open |

## Phase 6 — Submission

| ID | Issue | Status |
|----|-------|--------|
| SUBMIT-01 | README rewrite | ⬜ Open |
| SUBMIT-02 | .env.example | ⬜ Open |
| SUBMIT-03 | Pitch script | ⬜ Open |

## Already Confirmed Fixed (codebase inspection 2026-04-13)

| ID | Fix | Confirmed In |
|----|-----|-------------|
| F1 | Cross-route import → `src/lib/stars.ts` | `stars.ts` exists |
| F2 | HEIC mediaType → `image/jpeg` for Claude | `verify/route.ts` lines 98-103 |
| F3 | Cloud cover oracle null → 503 | `verify/route.ts` lines 202-215 |
| F4 | /api/mint cloudCover > 70 rejection | `mint/route.ts` lines 28-33 |
| F5 | /api/mint stars > 1000 cap | `mint/route.ts` lines 43-47 |
| F6 | /api/darksky/geojson route | File exists |
| F7 | darksky-locations.ts extracted | File exists |
| F8 | Profile uses /api/stars-balance | `profile/page.tsx` confirmed |
| F9 | Duplicate AstroChat removed from layout | Not in `layout.tsx` |
| F10 | Idempotency key on /api/award-stars | `award-stars/route.ts` lines 54-76 |
| F11 | Daily stars cap in /api/observe/log | `observe/log/route.ts` lines 50-70 |
| F12 | Magic byte image validation | `verify/route.ts` lines 86-92 |

---

## WHAT WAS DELIBERATELY SKIPPED

| Suggestion | Why |
|---|---|
| In-memory rate limiting → Redis | Overkill for hackathon. Vercel cold-start resets acceptable at demo scale. |
| @solana/web3.js v1 dedup | Risky refactor, zero user-visible benefit. Don't touch before deadline. |
| Streak DB column | Ad-hoc calculation works for demo. |
| Push notifications | Requires FCM/APNs infrastructure. Out of scope. |
| Farcaster Frame endpoint | OG meta tags sufficient. Post-hackathon. |
| GPS spoofing mitigation | Unsolvable in a hackathon. Document in README Known Limitations. |

---

# FINAL PRE-SUBMISSION CHECKLIST

```
□ npm run build — exit 0
□ npm run dev (Turbopack) — no font errors
□ Golden path demo (TEST-04) complete on real device
□ All Phase 1 items ✅
□ All Phase 2 + 3 items ✅ (location + marketplace)
□ grep -r "MOONLAMP25\|STELLAR10\|STELLAR20" src/ — empty
□ Explorer link on done screen opens real TX (not sim_)
□ Leaderboard: real data only (no fake handles)
□ /chat: location-appropriate sky data (Tokyo → Tokyo data)
□ Marketplace: correct dealer per region, tier sections, square images
□ Georgian language toggle works on all pages
□ Mobile layout tested on real iOS/Android
□ Vercel deployment matches local
□ INTERNAL_API_SECRET set in Vercel
□ All REWARD_CODE_* set in Vercel
□ NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app set in Vercel
□ Project registered on arena.colosseum.org
□ 3-minute pitch video recorded
□ Screenshots in README
```

---

*Sources: MASTER_PROMPTS.md · STELLAR_AUDIT_ACTION_PLAN.md · visual audit 2026-04-13*  
*Dealer map: Astroman (Caucasus/Asia) · Celestron (Americas) · Levenhuk (Europe)*  
*Deadline: May 11, 2026 (28 days remaining)*
