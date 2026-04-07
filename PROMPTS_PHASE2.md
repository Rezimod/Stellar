# STELLAR — Phase 2 Completion Prompts
Run one prompt block at a time. Each = one commit. Build must pass before moving to next.

---

## CURRENT STATE (Apr 7 audit)

**Done:**
- Privy auth, embedded wallets, Nav/BottomNav with 5 tabs
- Sky page: 7-day Open-Meteo forecast, planet tracker (astronomy-engine), TonightHighlights, EventBanner
- Profile page: wallet address, SOL balance, mission history, sign out
- Translations: EN + KA wired via next-intl
- Missions page: existing (old club flow — needs auth fix)

**Not done yet:**
- Chat page: skeleton only — no actual chat
- Marketplace page: skeleton only — no products
- Chat API: no streaming, uses Haiku not Sonnet, no sky context injection
- Profile: several hardcoded English strings not through i18n
- Missions: gated behind old `clubDone` (walletConnected + membershipMinted + telescope) — needs Privy auth instead
- Login/logout: confirm() dialog on logout is bad UX

---

## PROMPT 1 — Fix missions page auth gate

```
The missions page at src/app/missions/page.tsx currently blocks rendering behind:
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope

This check uses the OLD club flow (manual wallet setup). We now use Privy for auth.
The new gate should simply be: is the user authenticated via Privy?

Fix:
1. In src/app/missions/page.tsx:
   - Replace `clubDone` check with `authenticated` from usePrivy()
   - If !authenticated: show the existing locked-state UI (keep it — just change the condition)
   - The CTA button in the locked state should call login() instead of linking to /club
   - Remove the Link href="/club" — replace with a button that calls login()
   - Keep all other code (StatsBar, MissionList, MissionActive, etc.) exactly as-is
   - Remove `const clubDone` variable

2. Do not touch any visual design or other logic.

Commit: "fix: missions auth gate uses Privy authenticated instead of old clubDone"
```

---

## PROMPT 2 — Clean login/logout UX

```
The current logout flow uses confirm() which is a browser popup (ugly, blocks UI).
The Nav has no loading state while Privy is initializing.

Fix both:

1. In src/components/shared/Nav.tsx:
   - When !ready (Privy not ready yet): render the right-side auth area as a small
     loading shimmer instead of the Sign In button or wallet pill
     (a div with w-20 h-7 rounded-lg bg-white/10 animate-pulse)
   - Remove the confirm() from handleLogout — replace with an inline confirmation
     in the dropdown itself:
     First click "Sign Out" → show "Are you sure?" text + "Yes, sign out" red button
     Track this with a useState confirmStep boolean
   - Keep all other logic the same

2. In src/app/profile/page.tsx:
   - The sign out button at the bottom: same two-step confirm pattern
     (first click: button turns red with "Confirm sign out?", second click: actually signs out)
   - Use useState for this — no extra components

3. Do not change any styling, spacing, or layout.

Commit: "improve login/logout UX: remove confirm(), add two-step sign out"
```

---

## PROMPT 3 — Fix profile page i18n

```
The profile page at src/app/profile/page.tsx has several hardcoded English strings
that should go through next-intl. Fix them all.

Hardcoded strings to replace with t() calls:
- "My Account" → t('profile.title') — key already exists in both JSONs
- "Account" (the label above email) → add key profile.accountLabel
- "Mission History" → add key profile.missionHistory
- "Purchase History" → add key profile.purchaseHistory
- "Add via Card" → add key profile.addViaCard
- "Send Crypto" → add key profile.sendCrypto
- "No missions completed yet" → add key profile.noMissionsYet
- "Start your first mission →" → add key profile.startFirstMission
- "No purchases yet" → add key profile.noPurchasesYet
- "Browse telescopes & accessories →" → add key profile.browseCta
- "Missions" (stat label) → add key profile.statMissions
- "Stars" (stat label) → add key profile.statStars
- "Rank" (stat label) → t('profile.rank') — already exists
- "Solana devnet" → add key profile.devnet
- "Go to Missions" → add key profile.goToMissions
- "Marketplace" (link label in purchase history) → t('nav.marketplace') already exists

For each new key add to BOTH src/messages/en.json and src/messages/ka.json.
Georgian values:
- profile.accountLabel: "ანგარიში"
- profile.missionHistory: "მისიების ისტორია"
- profile.purchaseHistory: "შეძენის ისტორია"
- profile.addViaCard: "ბარათით შევსება"
- profile.sendCrypto: "კრიპტოს გაგზავნა"
- profile.noMissionsYet: "მისიები ჯერ არ დასრულებულა"
- profile.startFirstMission: "პირველი მისიის დაწყება →"
- profile.noPurchasesYet: "შეძენები ჯერ არ არის"
- profile.browseCta: "ტელესკოპებისა და აქსესუარების დათვალიერება →"
- profile.statMissions: "მისიები"
- profile.statStars: "ვარსკვლავები"
- profile.devnet: "Solana devnet"
- profile.goToMissions: "მისიებზე გადასვლა"

Do not change any visual design.
Commit: "i18n: translate all hardcoded strings on profile page"
```

---

## PROMPT 4 — Profile page polish + animations

```
Polish the profile page with subtle animations and UX improvements.
Do not redesign — enhance what exists.

1. Add entry animations to each section:
   - Use CSS animation-delay staggering on each card (0ms, 100ms, 200ms, 300ms)
   - Existing class animate-page-enter is already defined — add individual delays
     via style={{ animationDelay: '100ms' }} on each Card/div
   - The balance card: 0ms, account card: 100ms, stats: 200ms, history: 300ms

2. SOL balance display:
   - While loading (balance === null): animated counting-up placeholder
     Replace the spinner with: "···" text in the same font size, pulsing opacity
   - After loaded: animate the number sliding up (add class for this)
     Simple: use a fade-in transition on the p tag when balance changes

3. Wallet address copy button:
   - After copying, show a brief green checkmark that fades out after 1.5s
   - This already exists (copied state) — make the transition smoother:
     Add transition-all duration-300 to the button

4. Stats cards (Missions / Stars / Rank):
   - Add a thin colored top border to each matching its icon color:
     Missions: border-t-2 border-[#38F0FF]/30
     Stars: border-t-2 border-[#FFD166]/30
     Rank: border-t-2 border-[#7A5FFF]/30

5. Sign-out button:
   - Move it to inside a "Danger Zone" section with a divider line above
   - Label the section with a dim "⋯" separator, no extra heading

6. On the unauthenticated state:
   - Add a subtle shimmer/glow animation to the Telescope icon
   - Add the translation key profile.signInSubtitle with value
     "Your cosmic identity awaits" / "შენი კოსმოსური იდენტობა გელოდება"

No new dependencies. Use only Tailwind and inline styles.
Commit: "profile: polish animations, balance display, stats styling"
```

---

## PROMPT 5 — Full chat UI with streaming

```
Replace the skeleton chat/page.tsx with a real working chat interface.

1. Rewrite src/app/chat/page.tsx as a 'use client' component:

Interface:
- Full viewport height minus nav (use h-[calc(100dvh-64px)] on the container)
- Three zones: header bar, scrollable message list, pinned input row

Header bar (top):
- Title: t('chat.title') on left
- "Clear" button on right: clears messages, resets to welcome message
- No border — just padding

Message list (middle, flex-1, overflow-y-auto):
- Auto-scrolls to bottom on new message (useRef + scrollIntoView)
- Welcome message on load: ASTRA avatar (purple circle with ✦) + t('chat.welcome')
- User messages: right-aligned, bg-[#8B5CF6]/20 border border-[#8B5CF6]/30,
  rounded-2xl rounded-tr-sm, max-w-[80%], text-white text-sm
- Assistant messages: left-aligned, bg-[#1A1F2E] border border-white/5,
  rounded-2xl rounded-tl-sm, max-w-[80%], text-slate-200 text-sm
- Each assistant message has a small ✦ avatar (20x20, purple, flex-shrink-0)
- Thinking indicator: three animated dots (●●●) in an assistant bubble

Input row (bottom, sticky):
- Pinned to bottom with border-t border-white/10 and pb-safe (env var)
- Textarea: 1-3 rows, auto-resize, placeholder t('chat.placeholder')
- Send button: purple, disabled while loading
- Submit on Enter (not Shift+Enter)
- Mobile: add paddingBottom: 'env(safe-area-inset-bottom)' to input row

2. Message state: { role: 'user' | 'assistant', content: string }[]
   Use useState. On send:
   - Append user message immediately
   - Append empty assistant message with loading=true
   - POST to /api/chat with { message, history: messages.slice(-8) }
   - On response: replace loading bubble with actual reply
   - On error: replace loading bubble with "Sorry, I couldn't reach ASTRA. Try again."

3. Keep the /api/chat route as-is for now (streaming upgrade is next prompt)

4. The existing AstroChat floating popup stays untouched on other pages

5. Translation keys already exist in both JSONs:
   chat.title, chat.welcome, chat.placeholder, chat.send, chat.thinking, chat.clearChat

Commit: "build full chat UI with message bubbles and streaming-ready state"
```

---

## PROMPT 6 — Upgrade chat API with sky context + streaming

```
Upgrade src/app/api/chat/route.ts with real-time sky context and streaming output.

1. Import and call sky data in parallel before responding:
   import { fetchSkyForecast } from '@/lib/sky-data';
   import { getVisiblePlanets } from '@/lib/planets';
   import { getUpcomingEvents } from '@/lib/astro-events';

   const [forecast, planets, events] = await Promise.all([
     fetchSkyForecast(41.6941, 44.8337).catch(() => null),
     Promise.resolve(getVisiblePlanets(41.6941, 44.8337, new Date())),
     Promise.resolve(getUpcomingEvents(new Date())),
   ]);

   Note: getVisiblePlanets is synchronous — wrap in Promise.resolve so it works
   in the Promise.all pattern without issues.

2. Build a richer system prompt replacing the current SYSTEM_PROMPT:

const systemPrompt = `You are ASTRA — a personal AI astronomer inside STELLAR, an astronomy app.
You have access to real-time sky data for Tbilisi, Georgia (default location).

TONIGHT'S SKY CONDITIONS:
${forecast ? JSON.stringify(forecast[0]?.hours?.slice(18, 24)) : 'Sky data unavailable'}

PLANETS VISIBLE RIGHT NOW (altitude > 10°):
${JSON.stringify(planets.filter(p => p.visible).map(p => ({
  name: p.key, altitude: p.altitude, azimuth: p.azimuthDir, rise: p.rise, set: p.set
})))}

ALL PLANETS (sorted by altitude):
${JSON.stringify(planets.map(p => ({ name: p.key, altitude: p.altitude, visible: p.visible })))}

UPCOMING ASTRONOMY EVENTS (next 30 days):
${JSON.stringify(events)}

USER LANGUAGE: ${locale}
If the user writes in Georgian (ქართული), respond fully in Georgian.
If the user writes in English, respond in English.

RULES:
- Use real sky data when answering questions about tonight or current conditions
- Be specific: mention actual altitudes, compass directions, times
- Recommend objects based on what is ACTUALLY visible right now
- Mention ONE relevant Astroman telescope product if genuinely appropriate
- Keep responses concise: 2-4 sentences simple, up to 6 for complex questions
- Never invent sky data — only use what is provided above
- If sky data is unavailable, answer generally and say conditions are unknown`;

3. Switch to streaming response using Anthropic SDK stream:
   Use claude-sonnet-4-6 model (not Haiku).
   Return a ReadableStream piping SSE chunks to the client:

   const stream = await client.messages.stream({
     model: 'claude-sonnet-4-6',
     max_tokens: 600,
     system: systemPrompt,
     messages,
   });

   Return new Response with:
   - Content-Type: text/event-stream
   - Pipe text delta chunks as: data: ${chunk}\n\n
   - End with: data: [DONE]\n\n

4. Accept { message, history, locale } in request body:
   const { message, history, locale = 'en' } = await req.json()

5. Update src/app/chat/page.tsx to handle streaming:
   Replace the fetch().then() pattern with:
   - fetch('/api/chat', { method: 'POST', body: ... })
   - Read response.body as a ReadableStream
   - Use a reader to consume SSE chunks
   - Append each text delta to the assistant bubble in real time
   - When [DONE] received: mark loading=false
   - Pass navigator.language.startsWith('ka') ? 'ka' : 'en' as locale

Commit: "upgrade AI companion: streaming, Sonnet model, real sky context"
```

---

## PROMPT 7 — Sky page: add detailed planet info modal

```
Add a detail view to PlanetCard that shows full ephemeris data when tapped.

1. Create src/components/sky/PlanetDetail.tsx:
   A slide-up bottom sheet (mobile) / centered modal (desktop).
   Triggered by clicking any PlanetCard.
   
   Shows:
   - Planet name (translated) + colored dot
   - Current status: "Visible Now" or "Below Horizon"
   - Altitude: "45.2° above horizon"
   - Azimuth: "142° SE — look Southeast"
   - Magnitude: "Magnitude -2.4 (very bright)"
   - Rise time: "Rises at 19:42"
   - Transit (highest point): "Highest at 23:15"
   - Set time: "Sets at 02:48"
   - Constellation hint: hardcoded per planet key:
     { moon: 'varies', mercury: 'Aries', venus: 'Taurus', mars: 'Gemini',
       jupiter: 'Taurus', saturn: 'Aquarius' }
   - Viewing tip: hardcoded per planet:
     { moon: 'Look for craters along the terminator line',
       mercury: 'Best seen near the horizon just after sunset or before sunrise',
       venus: 'Brightest natural object after the Sun and Moon',
       mars: 'Look for the reddish hue — disc visible in telescopes',
       jupiter: 'Four Galilean moons visible in binoculars',
       saturn: 'Rings clearly visible in any telescope' }
   - Close button (X top right)

   Styling:
   - Backdrop: fixed inset-0 bg-black/60 backdrop-blur-sm z-50
   - Sheet: fixed bottom-0 left-0 right-0 (mobile) / max-w-sm mx-auto rounded-2xl (desktop)
   - bg-[#0F1827] border-t (mobile) / border (desktop) border-[#38F0FF]/10
   - Slide-up animation: translate-y-0 from translate-y-full, transition-transform duration-300

2. Update src/components/sky/PlanetGrid.tsx:
   - Add useState for selectedPlanet: PlanetInfo | null
   - Wrap each PlanetCard in a button onClick that sets selectedPlanet
   - Render <PlanetDetail> when selectedPlanet is set
   - Pass onClose={() => setSelectedPlanet(null)}

3. No new translation keys needed — use existing planets.* keys plus hardcoded English
   for the tips (they are UX copy, not UI labels).

Commit: "add planet detail sheet with full ephemeris data"
```

---

## PROMPT 8 — Sky page: moon phase + sun times

```
Add Moon phase display and Sun rise/set times to the sky page.

1. Create src/components/sky/SunMoonBar.tsx:
   A compact bar displayed between TonightHighlights and ForecastGrid.
   
   Uses astronomy-engine (already installed):
   import { Illumination, Body, SearchRiseSet, Observer } from 'astronomy-engine';
   
   Calculate on client mount (with Tbilisi default, same pattern as PlanetGrid):
   - Moon illumination %: Illumination(Body.Moon, now).phase_angle → convert to 0-100%
     illumination = (1 + Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100
   - Moon phase name: derive from illumination + whether waxing or waning
     Use phase_angle: 0=new, 90=first quarter, 180=full, 270=last quarter
   - Sun rise and set times for today (SearchRiseSet with Body.Sun)
   
   Display:
   - Left: sun icon + "Rises HH:MM · Sets HH:MM"
   - Right: moon phase emoji + "X% illuminated" + phase name
   - Moon emojis: 🌑🌒🌓🌔🌕🌖🌗🌘 mapped to phase angle ranges
   - Same glass-card style, compact single row (p-3)
   - Loading: animate-pulse skeleton

2. Add SunMoonBar to src/app/sky/page.tsx between TonightHighlights and ForecastGrid.

3. Add translation keys:
   sky.sunRises: "Rises" / "ამოდის"
   sky.sunSets: "Sets" / "ჩადის"
   sky.moonPhase: "Moon Phase" / "მთვარის ფაზა"
   Add to both en.json and ka.json.

Commit: "add sun/moon bar with phase and rise/set times"
```

---

## PROMPT 9 — Product catalog data layer

```
Create the Astroman product catalog.

1. Create src/lib/products.ts with this exact type:

export type ProductCategory = 'telescope' | 'moonlamp' | 'projector' | 'accessory' | 'digital';

export interface Product {
  id: string;
  name: { en: string; ka: string };
  description: { en: string; ka: string };
  category: ProductCategory;
  priceGEL: number;
  image: string;
  inStock: boolean;
  featured: boolean;
  aiRecommendFor?: string[];
}

Create 12 products — Rezi will replace copy later, use realistic placeholders:

Telescopes (3):
- id: 'scope-70az', name: 'StarQuest 70 AZ', ~400 GEL, beginner refractor
- id: 'scope-114eq', name: 'SkyWatcher 114 EQ', ~900 GEL, intermediate reflector
- id: 'scope-8dob', name: 'Orion 8" Dobsonian', ~2200 GEL, advanced
  aiRecommendFor: ['moon','jupiter','saturn'] for beginner; ['nebula','galaxies'] for advanced

Moon Lamps (2):
- id: 'lamp-16cm', name: 'Moon Lamp 16cm', ~80 GEL
- id: 'lamp-24cm', name: 'Moon Lamp 24cm', ~150 GEL

Star Projectors (2):
- id: 'proj-basic', name: 'Home Planetarium Basic', ~120 GEL
- id: 'proj-premium', name: 'Home Planetarium Pro', ~250 GEL

Accessories (2):
- id: 'acc-phone', name: 'Smartphone Telescope Adapter', ~60 GEL
- id: 'acc-eyepiece', name: 'Premium 8mm Eyepiece', ~180 GEL

Digital (3):
- id: 'dig-starmap', name: 'Custom Star Map', ~30 GEL, featured: true
- id: 'dig-guide', name: 'Georgian Night Sky Guide PDF', ~25 GEL
- id: 'dig-ai', name: 'ASTRA Premium (1 month)', ~50 GEL

Export: const PRODUCTS: Product[] and a function getProducts(category?: ProductCategory): Product[]

2. Create src/app/api/products/route.ts:
   GET handler, accept ?category= query param, return NextResponse.json(getProducts(category))

3. Create src/app/api/price/sol/route.ts:
   GET: fetch SOL/USD from CoinGecko public API (no key needed):
   https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd
   GEL/USD rate: 0.365 (fixed — close enough for hackathon)
   Return: { solPerGEL: number, solPrice: number }
   If fetch fails: return fallback { solPerGEL: 0.00135, solPrice: 137 }
   Add: export const revalidate = 60 to cache for 60s

Commit: "add product catalog and SOL pricing API"
```

---

## PROMPT 10 — Marketplace UI

```
Build the marketplace page with real products.

1. Create src/components/marketplace/ProductCard.tsx:
   Props: { product: Product; solPerGEL: number; onSelect: (p: Product) => void }

   Layout (dark cosmic card, same glass-card class):
   - Top: product image area — a 16:9 div with bg-[#0F1827]
     If image file exists: <img>; else show a colored gradient placeholder
     with a relevant icon (Telescope for scopes, etc.)
   - Body: product name (locale-aware: use useLocale() from next-intl),
     category badge (use existing Badge component)
   - Price row: "400 ₾" in white + "≈ X.XX SOL" in slate-500 smaller
   - "AI Pick" badge if aiRecommendFor?.length — use Badge color="cyan"
   - Buy button (full width, brass style) that calls onSelect(product)
   - Out of stock: dim the card, show "Out of Stock" badge, disable button

2. Create src/components/marketplace/ProductDetail.tsx:
   Bottom sheet on mobile, right-side panel on desktop (fixed, w-96).
   Props: { product: Product; solPerGEL: number; onClose: () => void }

   Content:
   - Image/placeholder (same as card)
   - Name + category badge
   - Description (locale-aware)
   - Price: large "X ₾" + "≈ X.XX SOL" below
   - If aiRecommendFor: "ASTRA recommends for: Moon, Jupiter" in cyan text
   - Two payment buttons:
     PRIMARY (full width, brass gradient): t('marketplace.payCard')
       → onClick: show inline message: "Contact Astroman to complete your order:
         📞 [phone] · 💬 Telegram · Reference: STELLAR-[id]-[timestamp]"
         Store in localStorage key 'stellar_orders' as array of { product, timestamp, ref }
     SECONDARY (outlined, smaller): t('marketplace.paySol')
       → onClick: alert("SOL payment coming soon — use card for now")
   - Close button (X, top right)

3. Create src/components/marketplace/ProductGrid.tsx ('use client'):
   - Fetches /api/products and /api/price/sol in parallel on mount
   - Filter tabs: All / Telescopes / Moon Lamps / Digital
     (use existing Badge-style pill buttons, active = gold text + bg)
   - Grid: 1 col mobile, 2 col sm, 3 col md
   - Loading: 6 skeleton cards (same as skeleton page, remove animate-pulse)
   - Error: "Could not load products" with retry
   - Clicking a card: open ProductDetail as overlay
   - Clicking outside or X: close ProductDetail

4. Update src/app/marketplace/page.tsx:
   Replace skeleton content with:
   - h1: t('marketplace.title')
   - <ProductGrid />

5. Translation keys that already exist in both JSONs:
   marketplace.title, marketplace.buyNow, marketplace.payCard, marketplace.paySol,
   marketplace.aiPick, marketplace.outOfStock, marketplace.loading,
   marketplace.filterAll, marketplace.filterTelescopes, marketplace.filterMoonLamps,
   marketplace.filterDigital

   Add new keys:
   marketplace.contactPrompt: "Contact Astroman to complete your order" / "დაუკავშირდი Astroman-ს შეკვეთის დასასრულებლად"
   marketplace.solComingSoon: "SOL payment coming soon" / "SOL გადახდა მალე"
   marketplace.errorLoad: "Could not load products" / "პროდუქტების ჩატვირთვა ვერ მოხერხდა"

Commit: "build marketplace with product grid, filters, and detail view"
```

---

## PROMPT 11 — Final build check + deploy

```
Final verification before submitting Phase 2 to Colosseum.

1. Run npm run build — must pass with 0 errors and 0 TypeScript errors.
   Fix any errors found before moving on.

2. Security check — run these greps and confirm output:
   grep -r "ANTHROPIC_API_KEY" src/ --include="*.tsx" --include="*.ts"
   → Must ONLY appear in src/app/api/chat/route.ts (server-side). Not in any component.

   grep -r "FEE_PAYER" src/ --include="*.tsx" --include="*.ts"
   → Should return nothing (not implemented yet, that's fine).

3. Check astronomy-engine bundle impact:
   Look at build output — if /sky page bundle is > 500kb, move planet calculations
   to a new API route: GET /api/sky/planets?lat=&lng=
   (Same pattern as /api/sky/forecast — server-side calculation, return JSON)
   Update PlanetGrid and TonightHighlights to fetch from the API instead of
   importing astronomy-engine directly.

4. Verify all 5 nav tabs work on mobile:
   Sky ✓ / AI Chat ✓ / Marketplace ✓ / Missions ✓ / Profile ✓

5. Verify Georgian (ka) locale on all pages — navigate each tab with locale='ka'.

6. git push origin main

Report: build status, bundle sizes, any issues found.
Commit: "verify: phase 2 build clean, security check passed"
```

---

## QUICK FIXES (run any time, order doesn't matter)

### Add missing Georgian translation
```
Add translation key: [key]
English: "[value]"
Georgian: "[value]"

Add to both src/messages/en.json and src/messages/ka.json only.
No other file changes.
Commit: "i18n: add [key]"
```

### Fix a layout issue on mobile
```
Fix layout issue: [describe exactly — which component, what breaks at 375px]
Read the component file first.
Fix only the specific CSS causing the issue. Don't touch unrelated code.
Commit: "fix: [component] mobile layout [description]"
```

---

## RULES (carry forward from PROMPTS.md)
1. Every prompt = one commit. Don't combine.
2. Build must pass before pushing.
3. No hardcoded English strings — always use t('key').
4. Mobile-first: 375px is the test viewport.
5. Every data-fetching component needs: loading skeleton, error state, empty state.
6. Preserve the existing dark cosmic design — no redesigns.
