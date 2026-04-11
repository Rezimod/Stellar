# STELLAR — Master Execution Plan
## Revised April 11, 2026 · Colosseum Frontier · Deadline May 10, 2026

---

## EXECUTION RULES

- After each prompt completes → commit + push to git immediately
- Mark the prompt header as **✅ DONE** in this file after pushing
- One prompt = one commit

**Builder:** Rezi — solo founder, Astroman (astroman.ge)
**Hackathon:** Colosseum Frontier — NO tracks, $30K Grand Champion + $10K × 20 teams
**Live:** stellarrclub.vercel.app

---

# CONFIRMED STATUS — April 11, 2026

| Feature | Status | Notes |
|---|---|---|
| G1 — Location system | ✅ DONE | `src/lib/location.tsx`, `LocationPicker.tsx` |
| G2 — Dealer data | ✅ DONE | `src/lib/dealers.ts` — Astroman + High Point |
| G3 — Location-aware marketplace | ✅ DONE | Region-based product filtering working |
| G4 — Free observation mission | ✅ DONE | `free-observation` in constants, repeatable |
| G5 — Global copy | ✅ DONE | Shipped |
| Nav cleanup (desktop) | ✅ DONE | Desktop tabs correct |
| Profile page | ✅ DONE | Stars, streak, rank all wired |
| ASTRA API route | ✅ DONE | `/api/chat/route.ts` — Claude streaming, 2 tools |
| Streak API | ✅ DONE | `/api/streak` — consumed by profile |
| Footer branding | ✅ DONE | "© 2026 Astroman · Built on Solana" correct |
| Layout metadata | ✅ DONE | Correct title + description in layout.tsx |
| CLEAN-1 (footer/metadata/constants) | ✅ DONE | Old hackathon branding removed |

**Still broken / not done:**

| Issue | Priority |
|---|---|
| ~~Search button in nav does nothing~~ | ✅ DONE (Phase 0) |
| ~~Profile/avatar button looks poor~~ | ✅ DONE (Phase 0) |
| ~~Mobile bottom nav wrong~~ | ✅ DONE (Phase 0) |
| ~~Mobile spacing — side gutters, section gaps~~ | ✅ DONE (Phase 0) |
| ~~Location icon is weak~~ | ✅ DONE (Phase 0) |
| ~~`constants.ts` still has `club` and `scriptonia` keys~~ | ✅ DONE (Phase 0) |
| Auth: email OTP clears data on re-login, no password, Google/SMS broken | P0 |
| Marketplace missing Celestron (US) and Bresser (Europe) dealers | P1 |
| Marketplace product images are broken (local paths that don't exist) | P1 |
| Dark Sky page is static, hardcoded Georgia data, fake map, no real tools | P1 |
| PWA manifest icons broken (not installable) | P2 |
| On-chain core not wired (Prompts 2–6 from LATEST_PROMPTS.md) | P0 |
| ASTRA standalone chat page doesn't exist (`/chat` is encyclopedia) | P1 |

---

# EXECUTION PLAN

## PHASE 0 — Critical UX Fixes ✅ DONE
*These make the app feel real. Judges see these immediately.*

---

### Prompt HEADER-1 — Working Search + Profile Button Redesign ✅ DONE

```
I'm building Stellar, a Next.js 15 astronomy app. The nav header has a Search icon that does nothing.
I need to make it work. Also the mobile bottom nav has wrong items — fix it. Also clean up constants.ts.

Read these files fully before writing anything:
  src/components/shared/Nav.tsx
  src/components/shared/BottomNav.tsx
  src/lib/constants.ts
  src/lib/dealers.ts (skim — understand product + mission names available to search)
  src/lib/constants.ts (skim MISSIONS array for search targets)

---

TASK 1 — Working search modal:

Create src/components/shared/SearchModal.tsx:

'use client'

Props: { open: boolean; onClose: () => void }

Overlay: fixed inset-0 z-50, bg rgba(0,0,0,0.7), backdrop-blur-sm
  Click backdrop → onClose()

Modal card: max-w-lg mx-auto mt-[10vh] rounded-2xl, bg #0D1321, border 1px solid rgba(255,255,255,0.1), p-4

Input row:
  Search icon (Lucide Search, 16px, rgba(255,255,255,0.3)) on left inside input
  Input: w-full bg-transparent text-white text-sm placeholder "Search missions, telescopes, planets..." no border, outline-none, px-3 py-2
  "ESC" badge on right when input has focus: text-[10px] text-slate-500 border border-slate-700 rounded px-1

Search targets — define inline (no API call needed):
  const SEARCH_ITEMS = [
    // Missions (from MISSIONS constant in lib/constants.ts — import it)
    // Read the MISSIONS array and include all of them as:
    // { type: 'mission', label: mission.name, sub: mission.desc, href: '/missions', icon: mission.emoji }
    
    // Sky pages
    { type: 'page', label: 'Sky Forecast', sub: '7-day cloud cover and seeing', href: '/sky', icon: '🌤' },
    { type: 'page', label: 'Planet Tracker', sub: 'Mercury to Saturn + Moon', href: '/sky', icon: '🪐' },
    { type: 'page', label: 'Dark Sky Map', sub: 'Find dark observation sites', href: '/darksky', icon: '🌑' },
    { type: 'page', label: 'ASTRA AI', sub: 'Chat with your AI astronomer', href: '/chat', icon: '✦' },
    { type: 'page', label: 'NFT Gallery', sub: 'Your discovery attestations', href: '/nfts', icon: '🖼' },
    
    // Celestial objects
    { type: 'object', label: 'Moon', sub: 'Earth\'s natural satellite, brightest object at night', href: '/sky', icon: '🌕' },
    { type: 'object', label: 'Jupiter', sub: 'Largest planet, visible to naked eye', href: '/sky', icon: '🪐' },
    { type: 'object', label: 'Saturn', sub: 'Ringed gas giant', href: '/sky', icon: '🪐' },
    { type: 'object', label: 'Mars', sub: 'The Red Planet', href: '/sky', icon: '🔴' },
    { type: 'object', label: 'Orion Nebula', sub: 'M42 — stunning emission nebula in Orion\'s sword', href: '/missions', icon: '✨' },
    { type: 'object', label: 'Pleiades', sub: 'M45 — Seven Sisters open cluster', href: '/missions', icon: '💫' },
    { type: 'object', label: 'Andromeda Galaxy', sub: 'M31 — nearest large galaxy, 2.5M light years', href: '/missions', icon: '🌌' },
  ]

Filter logic:
  const filtered = query.length < 2 ? [] : SEARCH_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.sub.toLowerCase().includes(query.toLowerCase())
  )

Results list (max 8 results shown):
  Group by type with a small label: "MISSIONS" / "PAGES" / "CELESTIAL OBJECTS"
  Each result row: flex items-center gap-3, py-2.5, px-2, rounded-xl, hover:bg-white/5, cursor-pointer
    Left: 32px circle bg rgba(255,255,255,0.06), icon/emoji centered, text-base
    Middle: label (text-sm text-white), sub (text-xs text-slate-500)
    Right: Lucide ArrowUpRight size=12 in slate-600
    On click: router.push(item.href), onClose()

Empty state (query >= 2 chars, no results):
  "No results for "{query}"" — text-sm text-slate-500, text-center, py-6

Zero query state (modal just opened):
  Show 4 quick-access pills in a row:
  "🌤 Sky" → /sky | "🛸 Missions" → /missions | "✦ ASTRA" → /chat | "🛒 Shop" → /marketplace
  Pills: bg rgba(255,255,255,0.04) border rgba(255,255,255,0.08) rounded-full px-4 py-2 text-xs text-white

Keyboard:
  useEffect: on keydown, if key === 'Escape' → onClose()
  Auto-focus the input when modal opens (useRef + focus() in useEffect when open===true)

---

TASK 2 — Wire search button in Nav.tsx:

Add useState: const [searchOpen, setSearchOpen] = useState(false)
Add useEffect: close on route change (usePathname dependency)

Change the search button onClick to: () => setSearchOpen(true)
Add at bottom of Nav return: <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
Import SearchModal from '@/components/shared/SearchModal'

---

TASK 3 — Redesign profile avatar button in Nav.tsx:

The current button is a plain 8x8 circle with a letter gradient. Redesign to feel like a real app.

Replace the avatar button with:
  Size: 34px × 34px, rounded-full
  Background: conic gradient from #8B5CF6 via #14B8A6 to #8B5CF6
  Padding: 1.5px (creates a gradient ring effect — the inner circle is #0D1321 bg with letter centered)
  Inner circle: 31px, rounded-full, bg #0D1321, flex items-center justify-center
  Letter: text-[11px] font-bold text-white
  Outer ring shows on hover: ring-2 ring-[#14B8A6]/40 transition-all

---

TASK 4 — Fix mobile bottom nav (BottomNav.tsx):

Read src/components/shared/BottomNav.tsx.

The tabs must be EXACTLY:
  1. Sky       → /sky        → CloudSun icon
  2. Missions  → /missions   → Satellite icon (import from lucide-react)
  3. Home      → /           → Home icon (center, lifted circle)
  4. Shop      → /marketplace → ShoppingBag icon (import from lucide-react)
  5. Profile   → /profile    → User icon

Remove Dark Sky and ASTRA/Learn from bottom nav.
Keep the lifted center circle style for Home exactly as is.
Labels: "Sky" | "Missions" | "Home" | "Shop" | "Profile"

---

TASK 5 — Clean up constants.ts:
In src/lib/constants.ts:
  Remove the 'club' key from ECOSYSTEM entirely (the club.astroman.ge entry)
  Remove the 'scriptonia' key from SPONSORS entirely
  Keep: ECOSYSTEM.store, ECOSYSTEM.sky, ECOSYSTEM.app
  Keep: SPONSORS.superteam, SPONSORS.solana

Do NOT touch API routes, page components, or any other file.
```

---

### Prompt MOBILE-1 — Mobile Spacing + App Feel ✅ DONE

```
I'm building Stellar, a Next.js 15 astronomy app. On mobile the app has inconsistent spacing —
side gutters vary by page, sections have gaps, it doesn't feel like a native app.
I want a tight, full-bleed, app-like layout with zero horizontal overflow.

Read ALL of these files before making any changes:
  src/app/page.tsx
  src/app/sky/page.tsx
  src/app/missions/page.tsx
  src/app/marketplace/page.tsx
  src/app/profile/page.tsx
  src/app/darksky/page.tsx
  src/app/globals.css

---

TASK 1 — Global layout rules (apply these once in globals.css):

Add these global styles:
  html, body { overflow-x: hidden; max-width: 100vw; }
  * { box-sizing: border-box; }

Find the existing scroll animation classes. Leave them. Only add the above.

---

TASK 2 — Audit every page for these specific issues and fix them:

Issue A — Inconsistent horizontal padding:
  All page wrappers should use: px-4 (16px) on mobile, sm:px-6 on larger screens.
  If a page uses px-3, px-5, px-8 at mobile breakpoint → change to px-4.
  Do this on the outermost div of each page that wraps content.

Issue B — Max-width containers leaking on mobile:
  Any div with max-w-* should also have: mx-auto w-full
  Check pages for max-w-2xl, max-w-3xl, max-w-5xl — make sure they all have w-full

Issue C — Section gaps between cards:
  Sections using gap-6, gap-8 or larger on mobile → change to gap-4 for vertical stacks
  Horizontal card rows that overflow: add overflow-x-auto scrollbar-hide with flex-nowrap

Issue D — Remove extra vertical padding between sections:
  Sections using py-10, py-12, py-16 on the page.tsx homepage → change to py-8 max
  Section margins mt-12, mt-16 → change to mt-8 max on mobile

Issue E — Cards stretching off-screen:
  Any card inside a page that doesn't have a max-width cap: add max-w-full
  Flex children with min-width constraints: add min-w-0 to allow shrinking

---

TASK 3 — Specific page fixes:

src/app/page.tsx (homepage):
  The hero section: ensure px-4 on mobile, text sizes don't cause overflow
  The stats row: if it's a flex row, add overflow-x-auto scrollbar-hide on the container
  Partner stores section: cards should stack to single column on mobile (flex-col sm:flex-row)

src/app/marketplace/page.tsx:
  Product grid: on mobile should be a single column (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
  Check if product images have a fixed width wider than the viewport

src/app/profile/page.tsx:
  Stats row (Stars, Streak, Rank): on mobile, wrap to 2-column grid (grid-cols-2) if it's currently 3-col

---

TASK 4 — Smooth scroll behavior:
In globals.css, add:
  html { scroll-behavior: smooth; }
  
In every page's outermost div, make sure there is NO: overflow-x: scroll, overflow-x: auto 
  (only the specific rows that need horizontal scroll should have it)

---

Report what you changed on each file. Do NOT change visual design, colors, or component logic.
Only fix spacing, padding, overflow, and grid columns.
```

---

### Prompt ICONS-1 — Icon System + Location Icon Polish ✅ DONE

```
I'm building Stellar. The app uses Lucide icons but inconsistently — some are outline, some are 
larger/smaller, and the location/GPS icon used in LocationPicker looks weak. The missions page 
uses Satellite and Lock icons beautifully. I want all icons across the app to match that quality.

Read these files:
  src/components/LocationPicker.tsx
  src/components/shared/Nav.tsx
  src/components/shared/BottomNav.tsx
  src/app/page.tsx (find any icons used in the hero or sections)

---

TASK 1 — Location icon in LocationPicker.tsx:

Find the current location/GPS icon in LocationPicker.tsx.
Replace it with: import { MapPin } from 'lucide-react'
  
Style the MapPin icon:
  Size: 16px
  Color: #34d399 (teal) when location is set, rgba(255,255,255,0.4) when no location
  Wrap in a small circle badge: 28px × 28px, rounded-full, bg rgba(52,211,153,0.12), border 1px solid rgba(52,211,153,0.25)
  Icon centered inside the circle
  
The location pill/button that shows current location name:
  Style: flex items-center gap-2, rounded-full, px-3 py-1.5
  Background: rgba(255,255,255,0.04)
  Border: 1px solid rgba(255,255,255,0.1)
  On hover: border-color rgba(52,211,153,0.3), bg rgba(52,211,153,0.06)
  Text: text-xs text-white/70 showing the location name
  Add a small ChevronDown icon (12px, rgba(255,255,255,0.3)) on the right

---

TASK 2 — Nav icon sizes (Nav.tsx):

All icons in the desktop tabs: size={16} (currently 17 — change to 16 for consistency)
Search icon in the right side: size={16} (currently 15)

---

TASK 3 — Homepage section icons (page.tsx):

Find the "How It Works" section (or equivalent 4-step section) on the homepage.
If it uses Telescope, Camera, Satellite, Layers from lucide-react already — check their size.
All step icons should be:
  Container: 48px × 48px rounded-2xl, bg rgba(52,211,153,0.08), border 1px solid rgba(52,211,153,0.15)
  Icon inside: size={22}, color #34d399

If the homepage has a different set of icons (not Lucide) — replace them with these:
  Step 1 (Observe): Telescope
  Step 2 (Verify): Camera
  Step 3 (Earn): Star (from lucide-react)
  Step 4 (Shop): ShoppingBag

---

TASK 4 — Dark Sky page icons (src/app/darksky/page.tsx):

Read src/app/darksky/page.tsx.
The page uses string labels for location types. Ensure any icon used there is:
  import { MapPin, Eye, Zap, Star } from 'lucide-react'
  
If there are colored dot indicators next to location names, keep them — don't replace with icons.
Only add icons to the page header area if there are none:
  Add <Eye size={20} color="#34d399" /> before the "Dark Sky Network" heading

Do NOT change visual design or logic on any page. Only update icon imports and sizes.
```

---

### Prompt HOME-HERO — Homepage Hero Text Fix ✅ DONE

```
I'm building Stellar. The homepage hero has the word "Stellar" as part of the main heading,
and I want to remove it from the heading — the logo in the nav already identifies the app.

Read src/app/page.tsx fully.

---

TASK 1 — Find the main hero heading:
Look for the h1 or main heading in the hero section. It likely says something like:
  "Stellar — Observe the Night Sky" or "Observe. Verify. Earn." or similar.

If it includes the word "Stellar" as a prefix in the headline text → remove just "Stellar" and any
dash/separator following it, keeping the rest of the headline intact.

If the headline is something like "Observe the Night Sky" without "Stellar" → skip this task.

---

TASK 2 — Homepage hero subtitle:
Find the subtitle below the main heading. Update it to:
  "Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana."

---

TASK 3 — Trust line below CTA:
Find any small muted line near the CTA buttons (usually shows stats or trust signals).
If it says anything about Vibecoding or old hackathon → change to:
  "Free to join · No wallet needed · Powered by Solana"

---

TASK 4 — "Start Observing" CTA:
Find the primary CTA button. Verify it links to /missions.
If it links to /club or anywhere else → fix to /missions.

Do NOT change any animations, star field, colors, or layout. Text changes only.
```

---

## PHASE AUTH — Account & Authentication
*Run after Phase 0. Makes login sticky, data persistent, and all auth methods work.*

---

### Prompt AUTH-1 — Email+Password Login, Data Persistence, Fix Google + SMS

```
I'm building Stellar, a Next.js 15 app using Privy (@privy-io/react-auth ^3.19.0) for auth.

Current problems:
1. Login is email OTP only — users want to register with email + password and log in any time
2. Sign-out calls reset() which wipes all localStorage state (missions, progress lost)
3. Google OAuth shows in the modal but fails to complete auth
4. SMS auth shows but fails
5. User data (email, wallet address) is never saved to the backend — so there's no persistent user record

Read these files fully before writing anything:
  src/components/providers/PrivyProvider.tsx
  src/components/shared/Nav.tsx
  src/hooks/useAppState.ts
  src/lib/supabase.ts (or wherever Supabase client is exported)

---

TASK 1 — Enable email+password auth in PrivyProvider.tsx:

Privy v3 supports password-based email auth through the `loginMethods` config combined with
appearance settings. Update the config:

  config={{
    loginMethods: ['email', 'google', 'sms'],
    appearance: {
      theme: 'dark',
      accentColor: '#34d399',
      logo: '/logo.png',
      loginMessage: 'Sign in to Stellar',
      showWalletLoginFirst: false,
    },
    embeddedWallets: {
      solana: { createOnLogin: 'users-without-wallets' },
    },
  }}

NOTE: Password-based email login is a Privy Dashboard setting, not a code config.
After deploying this, the developer must:
  → Privy Dashboard → App Settings → Login Methods → Email → enable "Require password on sign-up"
  → This changes the email flow from OTP to: email → set password on first visit → email+password on return
  → Google OAuth: Privy Dashboard → Login Methods → Google → toggle ON (no client ID needed — Privy hosts it)
  → SMS: Privy Dashboard → Login Methods → SMS → toggle ON

For the appearance, change accentColor to '#34d399' (teal) to match the app design.

---

TASK 2 — Fix sign-out: do NOT wipe user state on logout:

In src/components/shared/Nav.tsx, find the handleLogout function:

Current:
  const handleLogout = async () => {
    await logout();
    reset();           ← THIS CLEARS ALL MISSIONS + PROGRESS
    router.push('/');
    ...
  }

Fix: Remove the reset() call. User's locally stored progress should survive sign-out.
Only wipe walletAddress from state:

  const handleLogout = async () => {
    await logout();
    setWallet('');     ← import setWallet from useAppState
    router.push('/');
    setShowMenu(false);
    setConfirmStep(false);
  };

Import setWallet from the useAppState hook (it's already in the context).

---

TASK 3 — Save user to Supabase on login:

Create src/app/api/users/upsert/route.ts:

  POST /api/users/upsert
  Body: { privyId: string; email: string | null; walletAddress: string | null }
  
  Uses Supabase service role key (SUPABASE_SERVICE_ROLE_KEY from env) to upsert into a `users` table:
    - id: uuid (auto)
    - privy_id: text UNIQUE
    - email: text nullable
    - wallet_address: text nullable
    - username: text nullable
    - created_at: timestamptz default now()
    - updated_at: timestamptz default now()
  
  Upsert logic: ON CONFLICT (privy_id) DO UPDATE SET email=excluded.email, wallet_address=excluded.wallet_address, updated_at=now()
  
  Return: { success: true, user: { privy_id, email, wallet_address, created_at } }
  
  Use the Supabase client with service role key — NOT the anon key — so it bypasses RLS.
  Import the Supabase URL from process.env.NEXT_PUBLIC_SUPABASE_URL
  Import the service role key from process.env.SUPABASE_SERVICE_ROLE_KEY

  If SUPABASE_SERVICE_ROLE_KEY is not set, fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY.

---

TASK 4 — Wire upsert on every login:

Create src/hooks/useUserSync.ts:

  'use client'
  
  A hook that runs once when authenticated becomes true and user is loaded.
  
  import { useEffect } from 'react'
  import { usePrivy, useWallets } from '@privy-io/react-auth'
  
  export function useUserSync() {
    const { authenticated, user } = usePrivy()
    const { wallets } = useWallets()
    
    useEffect(() => {
      if (!authenticated || !user) return
      
      const email = user.email?.address ?? null
      const solanaWallet = wallets.find(w => (w as {chainType?:string}).chainType === 'solana')
      const walletAddress = solanaWallet?.address ?? null
      
      fetch('/api/users/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, email, walletAddress }),
      }).catch(() => {})  // fire-and-forget, don't crash if it fails
      
    }, [authenticated, user, wallets])
  }

Then add useUserSync() call inside the root layout or PrivyProvider client component.
The cleanest place: add it to src/components/providers/PrivyProvider.tsx inside a thin wrapper component:

  function UserSyncWrapper({ children }: { children: ReactNode }) {
    useUserSync()
    return <>{children}</>
  }

  // Wrap children in UserSyncWrapper inside SolanaWalletProvider

---

TASK 5 — Supabase migration note:

Add a comment block at the top of src/app/api/users/upsert/route.ts with the SQL to run in Supabase:

  -- Run in Supabase SQL editor:
  -- CREATE TABLE IF NOT EXISTS public.users (
  --   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  --   privy_id text UNIQUE NOT NULL,
  --   email text,
  --   wallet_address text,
  --   username text,
  --   created_at timestamptz DEFAULT now(),
  --   updated_at timestamptz DEFAULT now()
  -- );
  -- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  -- CREATE POLICY "Service role full access" ON public.users
  --   USING (true) WITH CHECK (true);

---

Do not change any page UI. Do not change the Supabase client used by other API routes.
No new npm packages — use the existing @supabase/supabase-js already in the project.
```

---

## PHASE 1 — On-Chain Core
*These prompts are in LATEST_PROMPTS.md. Run in order.*

**Prompt 2 — Sky Oracle** (from LATEST_PROMPTS.md)
Real Open-Meteo sky verification replacing any mock data. Hash weather conditions on-chain.

**Prompt 3 — Compressed NFT Minting** (from LATEST_PROMPTS.md)
Server-side Bubblegum compressed NFT mint. `src/lib/mint-nft.ts` + `/api/mint` route.

Before running: fund devnet fee payer, add MERKLE_TREE_ADDRESS + COLLECTION_MINT_ADDRESS to .env.local

**Prompt 4 — Wire Mint + Success Screen** (from LATEST_PROMPTS.md)
Connect mission completion → real cNFT mint → success screen with Solana Explorer link.

Test: complete Moon mission, verify NFT on explorer.solana.com

**Prompt 5 — Stars SPL Token** (from LATEST_PROMPTS.md)
Deploy Stars token on devnet. `/api/award-stars` route. Real balance in profile.

Before running: `npm install @solana/spl-token` if not installed.
After running: `npm run setup:token` to deploy on devnet.

**Prompt 6 — NFT Gallery** (from LATEST_PROMPTS.md)
Rewrite `/nfts` page to fetch real NFTs from Helius DAS API.

Before running: add NEXT_PUBLIC_HELIUS_RPC_URL + NEXT_PUBLIC_COLLECTION_MINT_ADDRESS to .env.local

---

## PHASE 2 — Feature Upgrades

---

### Prompt ASTRA-1 — Standalone ASTRA Chat Page

```
I'm building Stellar. The /chat route is currently an "Astronomy Guide" encyclopedia with tabs
(planets, deepsky, quizzes, events, telescopes, chat). The Claude API streaming route at
/api/chat/route.ts already exists and is fully implemented. I need a standalone ASTRA page.

Read these files fully:
  src/app/chat/page.tsx (current encyclopedia)
  src/app/api/chat/route.ts (DO NOT MODIFY — just read to understand the request/response format)

---

Step 1 — Move encyclopedia:
Rename src/app/chat/page.tsx → src/app/learn/page.tsx
Keep all content exactly as-is.

Step 2 — Create src/app/chat/page.tsx:

'use client'

Full-height layout, no scroll on outer container (height: 100dvh, overflow: hidden):

Header (fixed top, 52px):
  Left: BackButton (import from @/components/shared/BackButton)
  Center: "✦ ASTRA" (Georgia serif, text-xl, white, letter-spacing 0.05em)
  Right: "AI Astronomer" (text-[10px], rgba(255,255,255,0.3))
  Border-bottom: 1px solid rgba(255,255,255,0.06)
  Background: rgba(7,11,20,0.95), backdrop-blur-sm

Chat area (flex-1, overflow-y-auto, pt-[52px] pb-[80px], px-4):
  User bubbles: right-aligned, bg rgba(52,211,153,0.08), border 1px solid rgba(52,211,153,0.15), 
    rounded-2xl rounded-br-sm, px-4 py-3, max-w-[80%], text-sm text-white
  Assistant bubbles: left-aligned, bg rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08),
    rounded-2xl rounded-bl-sm, px-4 py-3, max-w-[85%], text-sm text-slate-200
  Loading: assistant bubble with "ASTRA is thinking..." + three animated dots

Empty state (centered, shown when messages is empty):
  Icon: 48px circle, bg rgba(52,211,153,0.1), border rgba(52,211,153,0.2), "✦" centered teal
  Title: "ASTRA" (Georgia serif, text-2xl, white)
  Subtitle: "Your AI Astronomer" (text-sm, rgba(255,255,255,0.4))
  Three suggestion pills (flex-wrap, gap-2):
    "What can I see tonight?" | "When's the next clear night?" | "Best starter telescope?"
  Pills: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.1), rounded-full, px-4 py-2, text-sm

Input bar (fixed bottom, full width):
  bg rgba(7,11,20,0.95), backdrop-blur-sm, border-top 1px solid rgba(255,255,255,0.08)
  px-4 py-3, safe-area-bottom (paddingBottom: 'env(safe-area-inset-bottom)')
  Row: textarea (1 row, max 3 rows, auto-expand) + send button
  Textarea: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.1), rounded-2xl, px-4 py-2, text-sm
  Send button: 36px circle, bg #34d399 when active, rgba(255,255,255,0.1) when disabled

State:
  const [messages, setMessages] = useState<Array<{role:'user'|'assistant', content:string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

Auto-scroll to bottom on new messages.

handleSend():
  1. Guard: empty input or loading → return
  2. Add user message, clear input, setLoading(true)
  3. POST /api/chat with { messages: [...messages, userMsg] }
  4. Stream SSE: read chunks, parse 'data: ' lines, extract type:'text' → append to assistant message in-place
  5. On type:'done' → setLoading(false)

Keyboard: Enter = submit, Shift+Enter = newline (desktop only)

Auth gate (if !authenticated):
  Centered card with ✦ icon, "Sign in to chat with ASTRA", teal login() button

No new packages.
```

---

### Prompt MARKET-1 — Real Products: Celestron USA + Bresser Europe

```
I'm building Stellar. The marketplace currently shows Astroman (Georgia) and High Point Scientific (USA).
I need to replace High Point Scientific with Celestron (US) and add Bresser (Europe) as a third dealer.
All products should have real names, real prices in USD, and working image URLs.

Read src/lib/dealers.ts fully before writing.

---

TASK 1 — Update DEALERS array in src/lib/dealers.ts:

Replace the 'highpoint-us' dealer with:
  {
    id: 'celestron-us',
    name: 'Celestron',
    region: 'north_america',
    country: 'US',
    website: 'https://www.celestron.com',
    description: 'The world\'s #1 telescope brand — cutting-edge optics since 1960',
    shipsTo: ['US', 'CA', 'MX'],
    currency: 'USD',
    currencySymbol: '$',
  }

Add a new dealer:
  {
    id: 'bresser-eu',
    name: 'Bresser',
    region: 'europe',
    country: 'DE',
    website: 'https://www.bresser.de',
    description: 'Germany\'s leading telescope manufacturer — precision optics for every level',
    shipsTo: ['DE', 'AT', 'CH', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE'],
    currency: 'USD',
    currencySymbol: '$',
  }

---

TASK 2 — Replace old highpoint-us products and add celestron-us products:

Remove all products with dealerId: 'highpoint-us'

Add these Celestron products (dealerId: 'celestron-us'):

  {
    id: 'cel-nexstar-8se',
    dealerId: 'celestron-us',
    name: 'Celestron NexStar 8SE',
    price: 1299,
    currency: 'USD', currencySymbol: '$', starsPrice: 13000,
    category: 'telescope',
    description: '8" Schmidt-Cassegrain with fully automated GoTo. 40,000+ object database, SkyAlign in minutes.',
    image: 'https://www.celestron.com/cdn/shop/products/11069-celestron-nexstar-8se-telescope_1.jpg',
    externalUrl: 'https://www.celestron.com/products/nexstar-8se-computerized-telescope',
    badge: 'Best Seller',
    specs: { aperture: '203mm', focalLength: '2032mm', mount: 'Single Arm GoTo' },
  },
  {
    id: 'cel-nexstar-6se',
    dealerId: 'celestron-us',
    name: 'Celestron NexStar 6SE',
    price: 999,
    currency: 'USD', currencySymbol: '$', starsPrice: 10000,
    category: 'telescope',
    description: '6" Schmidt-Cassegrain GoTo telescope. Perfect balance of power and portability.',
    image: 'https://www.celestron.com/cdn/shop/products/11068-celestron-nexstar-6se-telescope_1.jpg',
    externalUrl: 'https://www.celestron.com/products/nexstar-6se-computerized-telescope',
    specs: { aperture: '150mm', focalLength: '1500mm', mount: 'Single Arm GoTo' },
  },
  {
    id: 'cel-starsense-dx-130',
    dealerId: 'celestron-us',
    name: 'Celestron StarSense Explorer DX 130AZ',
    price: 299,
    currency: 'USD', currencySymbol: '$', starsPrice: 3000,
    category: 'telescope',
    description: 'Smartphone-powered star-finding. Point phone at sky — app guides you to any object.',
    image: 'https://www.celestron.com/cdn/shop/products/22461-celestron-starsense-explorer-dx-130az_1.jpg',
    externalUrl: 'https://www.celestron.com/products/starsense-explorer-dx-130az-smartphone-app-enabled-telescope',
    badge: 'Top Pick',
    specs: { aperture: '130mm', focalLength: '650mm', mount: 'Alt-Az' },
  },
  {
    id: 'cel-astromaster-102eq',
    dealerId: 'celestron-us',
    name: 'Celestron AstroMaster 102EQ',
    price: 229,
    currency: 'USD', currencySymbol: '$', starsPrice: 2300,
    category: 'telescope',
    description: '102mm refractor on equatorial mount. Great Moon and planetary telescope for beginners.',
    image: 'https://www.celestron.com/cdn/shop/products/22046-celestron-astromaster-102eq-telescope_1.jpg',
    externalUrl: 'https://www.celestron.com/products/astromaster-102eq-telescope',
    specs: { aperture: '102mm', focalLength: '660mm', mount: 'Equatorial' },
  },
  {
    id: 'cel-powerseeker-127eq',
    dealerId: 'celestron-us',
    name: 'Celestron PowerSeeker 127EQ',
    price: 149,
    currency: 'USD', currencySymbol: '$', starsPrice: 1500,
    category: 'telescope',
    description: '127mm reflector on equatorial mount. Entry-level with serious light-gathering power.',
    image: 'https://www.celestron.com/cdn/shop/products/21049-celestron-powerseeker-127eq-telescope_1.jpg',
    externalUrl: 'https://www.celestron.com/products/powerseeker-127eq-telescope',
  },
  {
    id: 'cel-eyepiece-kit',
    dealerId: 'celestron-us',
    name: 'Celestron Eyepiece & Filter Kit (14pc)',
    price: 89,
    currency: 'USD', currencySymbol: '$', starsPrice: 900,
    category: 'accessory',
    description: '14-piece kit: eyepieces, moon filter, color filters, 3x Barlow. Works on any telescope.',
    image: 'https://www.celestron.com/cdn/shop/products/94119-celestron-eyepiece-filter-kit_1.jpg',
    externalUrl: 'https://www.celestron.com/products/eyepiece-filter-kit',
  },

---

TASK 3 — Add Bresser Europe products (dealerId: 'bresser-eu'):

  {
    id: 'bres-messier-ar102',
    dealerId: 'bresser-eu',
    name: 'Bresser Messier AR-102/1000 EXOS-1',
    price: 349,
    currency: 'USD', currencySymbol: '$', starsPrice: 3500,
    category: 'telescope',
    description: '102mm apochromatic refractor on EQ mount. Sharp views of planets and wide star fields.',
    image: 'https://www.bresser.de/out/pictures/master/product/1/4702900_Messier_AR-102_1000_EXOS-1.jpg',
    externalUrl: 'https://www.bresser.de/Astronomie/Teleskope/BRESSER-Messier-AR-102-1000-EXOS-1-Teleskop.html',
    badge: 'Staff Pick',
    specs: { aperture: '102mm', focalLength: '1000mm', mount: 'EQ-3' },
  },
  {
    id: 'bres-messier-n203',
    dealerId: 'bresser-eu',
    name: 'Bresser Messier NT-203/1200 EXOS-2',
    price: 699,
    currency: 'USD', currencySymbol: '$', starsPrice: 7000,
    category: 'telescope',
    description: '8" Newtonian on motorized EQ mount. Ideal for deep-sky astrophotography.',
    image: 'https://www.bresser.de/out/pictures/master/product/1/4650901_Messier_NT-203_1200_EXOS-2.jpg',
    externalUrl: 'https://www.bresser.de/Astronomie/Teleskope/BRESSER-Messier-NT-203-1200-EXOS-2-Teleskop.html',
    specs: { aperture: '203mm', focalLength: '1200mm', mount: 'EQ-5 Motor' },
  },
  {
    id: 'bres-polaris-70-700',
    dealerId: 'bresser-eu',
    name: 'Bresser Polaris 70/700 EQ-3',
    price: 119,
    currency: 'USD', currencySymbol: '$', starsPrice: 1200,
    category: 'telescope',
    description: '70mm refractor on equatorial mount. Best entry-level scope in Europe. 2 eyepieces included.',
    image: 'https://www.bresser.de/out/pictures/master/product/1/4651900_Polaris_70_700.jpg',
    externalUrl: 'https://www.bresser.de/Astronomie/Teleskope/BRESSER-Polaris-70-700-EQ3-Teleskop.html',
  },
  {
    id: 'bres-firstlight-114',
    dealerId: 'bresser-eu',
    name: 'Bresser Firstlight 114/500 EQ3',
    price: 169,
    currency: 'USD', currencySymbol: '$', starsPrice: 1700,
    category: 'telescope',
    description: '114mm Newtonian with EQ-3 mount. Excellent light-gathering for lunar and planetary views.',
    image: 'https://www.bresser.de/out/pictures/master/product/1/4675115_Firstlight_114_500.jpg',
    externalUrl: 'https://www.bresser.de/Astronomie/Teleskope/BRESSER-Firstlight-114-500-EQ3-Teleskop.html',
  },
  {
    id: 'bres-science-hexaflex',
    dealerId: 'bresser-eu',
    name: 'Bresser Science Hexaflex',
    price: 199,
    currency: 'USD', currencySymbol: '$', starsPrice: 2000,
    category: 'accessory',
    description: 'Professional 6-planet filter set for contrast enhancement on Moon, planets, and nebulae.',
    image: 'https://www.bresser.de/out/pictures/master/product/1/4920500.jpg',
    externalUrl: 'https://www.bresser.de/Astronomie/Zubehoer/Okulare-und-Filter/',
  },

---

TASK 4 — Update location.tsx or dealers.ts to support 'europe' region:

Read src/lib/location.tsx. Check what Region type looks like.
If Region type does not include 'europe' → add it.
If the getRegion() function doesn't return 'europe' for European coordinates → add logic:
  Rough bounding box for Europe: lat 35-71, lon -10 to 40
  If user's lat/lon is within that range → return 'europe'

Make sure getProductsByRegion('europe') returns bresser-eu products.

---

TASK 5 — Update marketplace page if needed:
Read src/app/marketplace/page.tsx.
If it references 'highpoint-us' anywhere as a hardcoded string → update to 'celestron-us'.
If it shows a dealer name header or logo referencing High Point → update to match new dealers.

Astroman product images in dealers.ts already use astroman.ge CDN URLs — leave those as-is.
```

---

### Prompt DARKSKY-1 — Dark Sky Page: Real Interactive Map + System Rename

```
I'm building Stellar. The Dark Sky page at src/app/darksky/page.tsx is currently a static page
with hardcoded Georgian locations and a fake SVG map. I need to rebuild it with a real Leaflet map,
real light pollution tile data from NASA, and a renamed sky darkness system.

Read src/app/darksky/page.tsx fully before writing.

Install these packages first:
  npm install leaflet react-leaflet
  npm install --save-dev @types/leaflet

---

TASK 1 — Rename Bortle to "Night Score" system:

Create src/lib/nightscore.ts:

  export interface NightScoreResult {
    score: number      // 0–100 (100 = perfect dark sky)
    label: string      // descriptive label
    color: string      // hex color for UI
    description: string
  }
  
  export function bortleToNightScore(bortle: number): NightScoreResult {
    const score = Math.round(((9 - bortle) / 8) * 100)
    if (bortle <= 1) return { score, label: 'Pristine Void', color: '#34d399', description: 'Zodiacal light visible. Milky Way casts shadows. Exceptional observing.' }
    if (bortle <= 2) return { score, label: 'Deep Wilderness', color: '#34d399', description: 'Airglow visible. Milky Way shows intricate structure. M33 visible naked eye.' }
    if (bortle <= 3) return { score, label: 'Dark Canopy', color: '#38F0FF', description: 'Milky Way complex. Some light pollution on horizon. Excellent for deep-sky.' }
    if (bortle <= 4) return { score, label: 'Rural Sky', color: '#38F0FF', description: 'Milky Way still impressive. Subtle glow near horizon. Good for most objects.' }
    if (bortle <= 5) return { score, label: 'Suburban Fringe', color: '#FFD166', description: 'Milky Way visible but washed out. Light domes in multiple directions.' }
    if (bortle <= 6) return { score, label: 'Bright Suburban', color: '#f97316', description: 'Milky Way only in best conditions. Most DSO detail lost.' }
    if (bortle <= 7) return { score, label: 'City Edge', color: '#f97316', description: 'Milky Way invisible. Only bright clusters and planets accessible.' }
    if (bortle <= 8) return { score, label: 'Urban Glow', color: '#ef4444', description: 'Sky is orange-grey. Only Moon, planets, and brightest stars visible.' }
    return { score, label: 'Urban Core', color: '#ef4444', description: 'Sky fully light-polluted. Only Moon and a handful of bright stars visible.' }
  }

---

TASK 2 — Rebuild src/app/darksky/page.tsx:

'use client'

Imports: dynamic import for the map component (no SSR), NightScoreResult/bortleToNightScore from nightscore

Page layout: full screen, bg #070B14, no horizontal overflow

Header:
  BackButton + page title "Dark Sky Network" (Georgia serif, text-2xl, white)
  Subtitle: "Find dark skies. Photograph the universe." (text-sm, rgba(255,255,255,0.4))

Stats bar (3 columns, same style as missions stats):
  "Mapped Sites" / "6" | "Darkest Site" / "Night Score 88" | "Countries" / "1"
  Style: rounded-2xl, bg rgba(255,255,255,0.03), border rgba(255,255,255,0.08), p-4

OBSERVATION SITES list (replaces the fake SVG map — the real Leaflet map goes below):
  Use the existing LOCATIONS data from the current darksky page, but replace bortle display with NightScore.
  Each site card:
    Left: Location name (text-sm text-white font-medium) + country (text-xs text-slate-500)
    Right: Night Score badge — score number bold + label text-xs
    Badge color from bortleToNightScore(site.bortle).color
    Small colored dot before the score
    Tap: nothing (static for now)
  Title above list: "Known Dark Sites" (text-xs uppercase text-slate-500 tracking-widest, mb-2)

REAL MAP SECTION:
  Title: "Light Pollution Map" (text-sm text-white font-medium, mb-2)
  Subtitle: "NASA VIIRS satellite nighttime light data" (text-xs text-slate-500, mb-3)
  
  Create src/components/darksky/DarkSkyMap.tsx (separate 'use client' component):
  
  'use client'
  import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
  import 'leaflet/dist/leaflet.css'
  import L from 'leaflet'
  
  Fix Leaflet default marker icon (known Next.js issue):
    In useEffect:
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
  
  Map settings:
    Default center: [41.69, 44.80] (Tbilisi, Georgia)
    Zoom: 6
    Style: height 350px (h-[350px]), width 100%, rounded-2xl, overflow-hidden
    zoomControl: true
  
  Base tile layer (dark map for night sky context):
    URL: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    Attribution: '© OpenStreetMap © CARTO'
    maxZoom: 19
  
  Light pollution overlay (NASA Black Marble / VIIRS):
    URL: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'
    Attribution: 'NASA Worldview / VIIRS'
    opacity: 0.7
    tileSize: 256
    maxZoom: 8
  
  Site markers: for each location in LOCATIONS array, add a Marker with:
    Custom icon: colored circle based on Night Score
      Create custom Leaflet divIcon:
        const color = bortleToNightScore(loc.bortle).color
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px ${color}"></div>`,
          iconSize: [14, 14],
          className: ''
        })
    Popup content: "{loc.name} — Night Score {score} ({label})"
  
  Import DarkSkyMap dynamically in darksky/page.tsx:
    const DarkSkyMap = dynamic(() => import('@/components/darksky/DarkSkyMap'), { ssr: false, loading: () => <div className="h-[350px] rounded-2xl bg-white/5 animate-pulse" /> })

---

TASK 3 — Night Score legend below map:

4-item row showing the color scale:
  "Pristine Void" #34d399 | "Rural Sky" #38F0FF | "Suburban" #FFD166 | "Urban" #ef4444
  Each: small colored dot + label text-[10px] text-slate-400
  Style: flex gap-4 flex-wrap justify-center mt-3
  
Do not change the existing STATS or BackButton. Only rebuild the content area.
```

---

### Prompt DARKSKY-2 — AI Sky Photo Analysis + Community Reports

```
I'm building Stellar. The Dark Sky page has a real Leaflet map (from DARKSKY-1).
Now I need to add:
  1. A photo upload tool that uses Claude Vision to analyze sky photos and return a Night Score
  2. A community observation feed showing recent dark sky reports

Read src/app/darksky/page.tsx and src/lib/nightscore.ts before writing.

---

TASK 1 — Create /api/analyze-sky/route.ts:

POST endpoint. Accepts multipart form data with an image file.

  import Anthropic from '@anthropic-ai/sdk'
  
  const client = new Anthropic()
  
  Convert uploaded file to base64.
  
  Call Claude API (claude-sonnet-4-6) with vision:
    System prompt:
      "You are an expert astronomer analyzing night sky photographs to assess light pollution levels.
      Analyze the provided sky photo and return a JSON object with:
      - nightScore: number 0-100 (100 = pristine dark sky)
      - label: string (Pristine Void / Deep Wilderness / Dark Canopy / Rural Sky / Suburban Fringe / Bright Suburban / City Edge / Urban Glow / Urban Core)
      - visibleStars: 'countless' | 'many' | 'moderate' | 'few' | 'very few'
      - milkyWayVisible: boolean
      - lightPollutionDirection: string describing where light glow is (e.g. 'southeast horizon', 'all horizons', 'none visible')
      - advice: string (one sentence of advice for improving the observation site)
      Return only valid JSON, no markdown."
    
    User message: [image content block, base64]
    
  Parse response JSON.
  Return { nightScore, label, visibleStars, milkyWayVisible, lightPollutionDirection, advice }
  
  Error handling: if Claude fails or returns non-JSON, return { error: 'Analysis failed' }

---

TASK 2 — Create src/components/darksky/SkyPhotoAnalyzer.tsx:

'use client'

Section title: "Analyze Your Sky" (text-sm font-medium text-white)
Subtitle: "Upload a photo — AI measures your light pollution" (text-xs text-slate-500)

Upload area:
  Dotted border rounded-2xl, h-32, flex items-center justify-center
  Default: Camera icon (Lucide, 24px, rgba(255,255,255,0.2)) + "Tap to upload sky photo" text-xs text-slate-500
  Accept: image/* (jpg, png, heic)
  On file select: show filename + preview thumbnail

"Analyze" button (full width, teal bg, rounded-2xl):
  Disabled until file selected
  Loading state: "Analyzing with AI..." + spinner

Results display (shown after successful analysis):
  Large Night Score number (text-5xl font-bold) in the score's color
  Label below (text-lg text-white)
  
  Grid of 3 mini stat cards:
    "Stars" / visibleStars
    "Milky Way" / milkyWayVisible ? "Visible" : "Not visible"  
    "Light Glow" / lightPollutionDirection
  Cards: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08), rounded-xl, p-3
  
  Advice box:
    bg rgba(52,211,153,0.06), border rgba(52,211,153,0.15), rounded-xl, p-3, mt-3
    "AI Observation" label text-[10px] uppercase tracking-widest text-teal-400
    Advice text: text-sm text-slate-300

Error state: "Could not analyze photo. Try a clearer night sky image." text-xs text-red-400

---

TASK 3 — Add community reports feed (static mock data for now):

Create a short feed of 4 mock recent reports below the photo analyzer:

  const MOCK_REPORTS = [
    { location: 'Kazbegi, Georgia', score: 88, label: 'Deep Wilderness', date: '2 days ago', user: 'observer_geo' },
    { location: 'Alcobaça, Portugal', score: 74, label: 'Dark Canopy', date: '5 days ago', user: 'cosmic_pt' },
    { location: 'Lofoten, Norway', score: 91, label: 'Pristine Void', date: '1 week ago', user: 'arctic_sky' },
    { location: 'Tbilisi, Georgia', score: 22, label: 'Urban Glow', date: '2 weeks ago', user: 'rezi_geo' },
  ]

Feed title: "Recent Reports" (text-sm font-medium text-white)
Each row:
  Left: colored dot (score color) + location name (text-sm text-white) + date (text-xs text-slate-500)
  Right: score number bold + label text-xs in score color
  border-bottom rgba(255,255,255,0.06), py-3

Import SkyPhotoAnalyzer in darksky/page.tsx and render it after the map.
```

---

## PHASE 3 — Polish & Product Moments

---

### Prompt SHARE-1 — Shareable NFT Success Screen

```
I'm building Stellar. After a mission completes and an NFT mints, I need a success screen that 
users want to screenshot and share on X.

Read these files:
  src/app/missions/page.tsx
  src/components/sky/MissionActive.tsx (if it exists)
  src/components/sky/ObserveFlow.tsx (if it exists)

Find where the success state is rendered after mission completion.

---

TASK 1 — Full-screen success overlay:

When a mission completes (NFT minted), show a fixed inset-0 z-50 overlay:

Background: #070B14 with radial gradient glow: radial-gradient(ellipse at 50% 40%, rgba(52,211,153,0.08) 0%, transparent 70%)

Card (max-w-sm mx-auto px-4, centered vertically):
  
  Mission emoji (64px, text-6xl, text-center, mb-2)
  "Discovery Sealed" (Georgia serif, text-2xl, white, text-center)
  Mission name + date (text-sm text-slate-500, text-center, mb-6)
  
  Proof box (bg rgba(52,211,153,0.04), border rgba(52,211,153,0.15), rounded-2xl, p-4, mb-4):
    "✦ VERIFIED ON SOLANA" (text-[10px] tracking-widest text-teal-400, uppercase, mb-2)
    Stars: "+{starsEarned} Stars" (text-2xl font-bold text-white)
    "1 Discovery NFT minted" (text-xs text-slate-500, mt-1)
    If txHash: link "{txHash.slice(0,8)}...{txHash.slice(-4)} →" → opens explorer.solana.com/tx/{txHash}?cluster=devnet
    
  "Share on X" button (full width, bg rgba(0,0,0,0.5), border rgba(255,255,255,0.15), text-white, rounded-2xl, py-3):
    Tweet text:
      "Just sealed a {missionName} discovery on @solana ✦
      
      Earned {starsEarned} Stars + 1 discovery NFT.
      
      Building the world's first astronomy app on-chain with @StellarApp 🌌
      
      stellarrclub.vercel.app"
    On click: window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank')
    
  "View in Gallery →" button (full width, bg rgba(52,211,153,0.15), border rgba(52,211,153,0.3), text-teal-400, rounded-2xl, py-3):
    Link to /nfts
    
  "Done" (text-xs text-slate-500, text-center, mt-4, cursor-pointer → dismisses overlay)

Animation: on mount, animate from opacity-0 scale-95 to opacity-100 scale-100, 300ms ease-out.

Do not change mint logic. Only change success UI.
```

---

### Prompt PWA-1 — Native App Feel: PWA + Mobile Polish

```
I'm building Stellar, a Next.js 15 astronomy app at stellarrclub.vercel.app for the Colosseum
Frontier hackathon. The app works but feels like a website, not an app — browser chrome visible,
no splash screen, no native-feeling behavior. I need proper PWA support so it feels like a real
app when added to home screen.

Read these files fully before writing anything:
  src/app/layout.tsx
  src/app/page.tsx
  public/ (list directory to see what icons/assets exist)
  next.config.ts (or next.config.js / next.config.mjs — whichever exists)

---

STEP 1 — Create public/manifest.json (or update existing):

{
  "name": "Stellar — Astronomy on Solana",
  "short_name": "Stellar",
  "description": "Observe the night sky, earn Stars, and seal discoveries on Solana.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#070B14",
  "theme_color": "#070B14",
  "categories": ["education", "science", "entertainment"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}

---

STEP 2 — Generate app icons:

Create scripts/generate-icons.ts that generates PWA icons.
Use the canvas npm package (npm install canvas --save-dev if not present).

Icon design (both sizes):
  Background: #070B14
  Centered text "✦" in #FFD166, bold
  192px: font size 100px → save to public/icons/icon-192.png
  512px: font size 260px → save to public/icons/icon-512.png
  Apple touch icon: 180x180, font size 90px → public/icons/apple-touch-icon.png

Add to package.json scripts: "generate:icons": "npx tsx scripts/generate-icons.ts"
Run the script immediately after creating it.

Fallback if canvas fails: use sharp (npm install sharp --save-dev):
  Create 512x512 SVG string with ✦ centered on #070B14 background, convert with sharp to PNG.

Fallback if sharp also fails: create SVG files directly:
  public/icons/icon.svg:
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#070B14"/>
    <text x="256" y="300" text-anchor="middle" font-size="260" fill="#FFD166" font-family="sans-serif">✦</text>
  </svg>
  Reference /icons/icon.svg in the manifest instead of PNGs.

---

STEP 3 — Update src/app/layout.tsx:

Read the file fully first. Merge with existing metadata — don't duplicate.

In the metadata export:
  manifest: '/manifest.json',
  themeColor: '#070B14',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },

Also add <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" /> in <head>.

---

STEP 4 — Safe area padding for notched devices:

Add to src/app/globals.css:

  @supports (padding-top: env(safe-area-inset-top)) {
    .safe-top { padding-top: env(safe-area-inset-top); }
    .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  }

Add safe-top to the body or root wrapper in layout.tsx.
Add safe-bottom to the BottomNav component so it doesn't hide behind the home indicator on iPhones.

---

STEP 5 — Prevent pull-to-refresh and bounce scroll:

Add to src/app/globals.css:

  html, body {
    overscroll-behavior-y: contain;
  }

This removes the two biggest "this is a website" tells on mobile.

---

STEP 6 — Splash screen / flash fix:

Add to src/app/globals.css:

  html {
    background-color: #070B14;
  }

  body {
    background-color: #070B14;
    min-height: 100vh;
    min-height: 100dvh;
  }

The 100dvh ensures full coverage on mobile accounting for dynamic toolbars.

---

STEP 7 — Standalone mode detection:

Create src/hooks/useStandalone.ts:

'use client'
import { useState, useEffect } from 'react'

export function useStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches || (navigator as any).standalone === true)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isStandalone
}

---

STEP 8 — Install prompt banner on homepage:

Edit src/app/page.tsx. Read fully first.

Add a dismissible banner (only on mobile, NOT in standalone mode):

  const [showInstall, setShowInstall] = useState(false)
  const isStandalone = useStandalone()
  
  useEffect(() => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    const dismissed = localStorage.getItem('stellar-install-dismissed')
    if (isMobile && !isStandalone && !dismissed) setShowInstall(true)
  }, [isStandalone])
  
  const dismissInstall = () => {
    setShowInstall(false)
    localStorage.setItem('stellar-install-dismissed', '1')
  }

Render only if showInstall:
  Fixed bottom banner (z-50, above bottom nav):
  bg rgba(52,211,153,0.08), border-top 1px solid rgba(52,211,153,0.2), backdrop-blur
  px-4 py-3

  Row: "📱 Add Stellar to your home screen" (text-sm text-white) + "✕" dismiss button
  Below (iOS only): "Tap Share → Add to Home Screen" (text-xs rgba(255,255,255,0.4))

---

CONSTRAINTS:
- Do not modify any API routes or lib files
- Do not install next-pwa or any PWA plugin
- Do not add a service worker
- All changes backward compatible with existing Privy auth
```

---

### Prompt ONBOARD-1 — First-Time User Onboarding

```
I'm building Stellar. New users (and hackathon judges) land cold with no context. 
I need a 3-step onboarding overlay shown once on first visit.

Read src/app/page.tsx.

---

Create src/components/home/OnboardingOverlay.tsx:

'use client'

Trigger: check localStorage.getItem('stellar_onboarded') on mount. If null → show. If set → return null.

Overlay: fixed inset-0 z-50, bg rgba(7,11,20,0.92), backdrop-blur-md

Container: max-w-xs mx-auto h-full flex flex-col items-center justify-center px-6

Step dot indicator: 3 dots at top, teal filled for current, white/15 for others. Gap-2. mb-10.

Steps:
  Step 1: 🔭 / "Observe the Night Sky" / "Complete sky missions. Photograph the Moon, Jupiter, and beyond."
  Step 2: ⭐ / "Earn Stars Tokens" / "Every verified observation earns Stars — real SPL tokens on Solana. No wallet setup needed."
  Step 3: 🛒 / "Shop Telescopes" / "Spend Stars at partner stores in Georgia, USA, and Europe. Real discounts on real equipment."

Icon: text-5xl text-center mb-4
Heading: Georgia serif, text-2xl text-white text-center mb-3
Body: text-sm text-slate-400 text-center leading-relaxed mb-10

Buttons:
  Steps 1-2: "Next →" — full width, bg rgba(52,211,153,1), text-black font-semibold rounded-2xl py-3
  Step 3: "Get Started →" — same style → on click: localStorage.setItem('stellar_onboarded', '1'), close
  "Skip" below button: text-xs text-slate-600, mt-3, cursor-pointer → same as Get Started

Step transition: CSS transform translateX, 200ms ease. Step going out → -100%, next coming in → 0% from +100%.

Add <OnboardingOverlay /> to src/app/page.tsx just before closing tag of the main wrapper div.
```

---

### Prompt PERF-1 — Performance Optimization

```
I'm building Stellar. The app loads slowly — images aren't optimized, there may be layout thrash,
and some components block the main thread. I need it to feel fast and snappy.

Read these files:
  src/app/page.tsx
  src/app/marketplace/page.tsx
  src/app/sky/page.tsx
  next.config.ts (or next.config.js — whichever exists)

---

TASK 1 — next.config optimization:

Read next.config.ts/js.
Ensure these are set:
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'astroman.ge' },
      { protocol: 'https', hostname: 'www.celestron.com' },
      { protocol: 'https', hostname: 'www.bresser.de' },
      { protocol: 'https', hostname: 'unpkg.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  }
  
  experimental: {
    optimizeCss: true,
  }

---

TASK 2 — Marketplace images:

In src/app/marketplace/page.tsx (or the component that renders product cards):
Find all <img> tags rendering product images.
Replace with Next.js <Image> component:
  import Image from 'next/image'
  <Image src={product.image} alt={product.name} width={400} height={300} 
    className="..." loading="lazy" style={{ objectFit: 'cover' }} />
  
For products with empty image strings: show a placeholder div instead:
  <div className="w-full aspect-[4/3] bg-white/5 rounded-xl flex items-center justify-center">
    <span className="text-3xl">{product category emoji: telescope=🔭 accessory=🔍 digital=📄}</span>
  </div>

---

TASK 3 — Star field canvas optimization:

In src/app/page.tsx, find the star field canvas animation in useEffect.
Add IntersectionObserver to pause animation when canvas is not in viewport:
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) cancelAnimationFrame(raf)
    else draw()
  }, { threshold: 0.1 })
  if (canvas) observer.observe(canvas)
  
Return cleanup: cancelAnimationFrame(raf); observer.disconnect()

---

TASK 4 — Lazy load heavy sections on homepage:

In src/app/page.tsx, find any section that imports a heavy component (charts, maps, complex tables).
Wrap those imports with dynamic():
  import dynamic from 'next/dynamic'
  const HomeSkyPreview = dynamic(() => import('@/components/home/HomeSkyPreview'), {
    loading: () => <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />,
    ssr: false
  })

---

TASK 5 — API route caching:

In src/app/api/sky/forecast/route.ts (if it exists):
Add cache header: 
  headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' }
  (15 min cache — sky data doesn't change minute by minute)

In src/app/api/sky/planets/route.ts (if it exists):
Add cache header:
  headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' }
  (1hr cache — planet positions are slow-changing)

---

TASK 6 — Fix missing React keys:
Search all .map() calls in marketplace, missions, and profile pages.
Any item rendered in a list without key={...} → add a stable key (product.id, mission.id, etc.)

Do NOT change any visual design, API logic, or component structure.
```

---

### Prompt GAMIFY-1 — Gamification Visibility Polish

```
I'm building Stellar. The app has Stars tokens, ranks, and streaks — but they're invisible during 
normal use. I want users to feel progression on every page.

Read:
  src/app/missions/page.tsx
  src/app/profile/page.tsx
  src/lib/rewards.ts (or wherever getRank() is defined)
  src/components/sky/StatsBar.tsx (if it exists)

---

TASK 1 — Streak badge on Missions page:
Find the missions page header area (before the mission list).
If authenticated and streak > 0: show pill "🔥 {streak}-day streak"
  Style: amber (#F59E0B), bg rgba(245,158,11,0.1), border rgba(245,158,11,0.2), rounded-full, text-xs, px-3 py-1
If authenticated and streak === 0: show "Start your streak →" muted text-xs

Fetch streak from /api/streak?walletAddress={address} same as profile page does.

---

TASK 2 — Rank in profile:
Find Stars balance display in profile page.
After the balance, add:
  Rank name (serif, text-lg, white)
  Rank badge pill (purple or teal based on rank level, text-xs)
  Progress line: "X / Y Stars to next rank" (text-xs text-slate-500)
  Example: "1,250 / 2,000 ★ to Expert Observer"

Read getRank() implementation to get correct thresholds and names.

---

TASK 3 — Stars total in mobile profile tab:
In BottomNav.tsx, find the Profile tab.
If authenticated and starsBalance > 0: show a small amber badge below the User icon:
  "{starsBalance}★" — text-[8px] font-bold text-amber-400
  Only render if starsBalance > 0 and authenticated.
Import useAppState to read starsBalance. If threading state into BottomNav is too complex, skip.

Do not change Stars earning amounts or mission logic.
```

---

### Prompt HOME-1 — Homepage Full Refresh

```
I'm building Stellar for Colosseum Frontier. The homepage needs updating.
Read src/app/page.tsx fully before writing.

---

TASK 1 — Update hero subtitle (if not already correct):
Find the subtitle below the main heading. Ensure it reads:
  "Photograph celestial objects from anywhere in the world. Earn Stars tokens, collect discovery NFTs,
  and shop telescopes at your local dealer."

TASK 2 — Update trust line:
Find any small muted line near the CTA (stats or trust signals).
Change to: "Free to join · No wallet needed · Powered by Solana"

TASK 3 — Update "How It Works" copy if present:
  Step 3: "Sky oracle verifies clear conditions on-chain"
  Step 4: "Discovery sealed on Solana as compressed NFT"

TASK 4 — Update "Observe & Earn" section if present:
  Description: "Complete sky missions to earn Stars tokens and compressed NFTs. Redeem at partner stores worldwide."
  CTA button → /missions

TASK 5 — Founder note (for judges):
Below the partner stores section or above the footer:
  "Built solo by an astronomy store owner using AI development tools"
  text-xs rgba(255,255,255,0.18) text-center my-4

TASK 6 — Add "Live on Solana Devnet" pulse indicator:
Near hero stats area, add:
  A small badge: green pulsing dot + "Live on Solana Devnet"
  Style: flex items-center gap-1.5, text-[11px], rgba(52,211,153,0.7)
  Pulsing dot: 6px circle, bg #34d399, animate-pulse

Keep ALL animations, star field, and visual styling. Text changes only.
```

---

### Prompt POLISH-1 — Final Polish Pass

```
I'm building Stellar for Colosseum Frontier. This is the final polish pass before submission.

Read every page file:
  src/app/page.tsx
  src/app/sky/page.tsx
  src/app/missions/page.tsx
  src/app/chat/page.tsx
  src/app/marketplace/page.tsx
  src/app/nfts/page.tsx
  src/app/profile/page.tsx
  src/app/darksky/page.tsx

---

TASK 1 — Loading states:
Every page that fetches async data must show a skeleton while loading.
Skeleton style: rounded-xl or rounded-2xl, bg rgba(255,255,255,0.05), animate-pulse
  Heights: match approximate content height (e.g. product card: h-48, forecast card: h-32)

TASK 2 — Empty states:
  /nfts with no NFTs: 🔭 + "No discoveries yet" + "Start a Mission →" button
  /marketplace empty products: 3 shimmer placeholder cards
  /profile unauthenticated: centered card "Sign in to see your profile" + login button

TASK 3 — Mobile at 375px:
  No horizontal scroll on any page (use overflow-x-hidden on page containers)
  All buttons min-h-[44px] (touch target)
  ASTRA chat input safe-area handled for iPhone bottom bar
  Product cards in marketplace: single column, image max-h-48 object-cover

TASK 4 — Error states:
  Sky forecast fetch fails: show "Sky data unavailable · Check your location" with retry button
  API route fails: show a muted error card, not a blank screen

TASK 5 — Transitions:
  All page navigations: ensure animate-page-enter class is applied to every page's root div
  If globals.css has @keyframes page-enter already — use it consistently

Fix all issues. Do not change features, design, or colors.
```

---

## PHASE 4 — Content + Submission

### Prompt G6 — README (from GLOBAL_PROMPTS.md)
Rewrite README with global positioning, full tech stack, live URL, devnet setup, demo flow.

### Demo Video (Week 4)
2-minute structure:
- 0:00–0:30: "300M amateur astronomers. Zero on-chain. I'm changing that." — founder context, Astroman story
- 0:30–1:30: Live demo — email signup, sky forecast, Moon mission → AI verify → cNFT mints → success screen → gallery → location switch → ASTRA query
- 1:30–2:00: Distribution angle, mainnet plan, URL

### Submission Checklist
- [ ] Live URL works: stellarrclub.vercel.app
- [ ] Full flow: sign up → mission → NFT mints → explorer link works
- [ ] ASTRA responds in English and Georgian
- [ ] Gallery shows real minted NFTs
- [ ] Marketplace shows products for correct region
- [ ] Dark Sky Map loads with real Leaflet map + NASA overlay
- [ ] Photo analyzer works with sky photo upload
- [ ] GitHub repo is public
- [ ] Demo video link works in incognito
- [ ] Submit on May 6 (don't wait until May 10)

---

# PROMPT REFERENCE INDEX

| Prompt | What It Does | Status |
|---|---|---|
| HEADER-1 | Working search modal + profile button + bottom nav fix + constants cleanup | Queue |
| MOBILE-1 | Global mobile spacing, gutters, section gaps | Queue |
| ICONS-1 | Location icon + icon system consistency | Queue |
| HOME-HERO | Remove "Stellar" from hero, fix CTA links | Queue |
| Prompt 2 | Sky Oracle (from LATEST_PROMPTS.md) | Queue |
| Prompt 3 | NFT Minting (from LATEST_PROMPTS.md) | Queue |
| Prompt 4 | Wire Mint + Success (from LATEST_PROMPTS.md) | Queue |
| Prompt 5 | Stars SPL Token (from LATEST_PROMPTS.md) | Queue |
| Prompt 6 | NFT Gallery / Helius DAS (from LATEST_PROMPTS.md) | Queue |
| ASTRA-1 | Standalone ASTRA chat page | Queue |
| MARKET-1 | Celestron USA + Bresser Europe real products | Queue |
| DARKSKY-1 | Real Leaflet map + NASA light pollution overlay + Night Score system | Queue |
| DARKSKY-2 | AI sky photo analysis + community reports feed | Queue |
| SHARE-1 | Shareable NFT success screen | Queue |
| PWA-1 | PWA SVG icons + manifest fix | Queue |
| ONBOARD-1 | First-time user onboarding overlay | Queue |
| PERF-1 | Performance: images, caching, bundle, lazy load | Queue |
| GAMIFY-1 | Streak + rank visibility, Stars in mobile tab | Queue |
| HOME-1 | Homepage refresh — copy, trust line, devnet badge | Queue |
| Prompt 8 | OG Image + Farcaster (from LATEST_PROMPTS.md) | Queue |
| POLISH-1 | Final polish: loading/empty/error states, mobile 375px | Queue |
| G6 | README (from GLOBAL_PROMPTS.md) | Queue |

**Total prompts: 22**
**Already done (not in list): G1–G5, Nav desktop, Profile, ASTRA API, Streak API, Layout metadata, Footer**

---

# WHERE YOU'LL END UP AFTER ALL PROMPTS

When every prompt above is done, Stellar will be:

**UX layer:** Feels like a real native app — search works, profile ring looks polished, bottom nav
is correct, no side gutters, no section gaps, location icon is solid, icons are consistent.

**On-chain layer:** Full Solana devnet core — compressed NFT minting ($0.000005/NFT via Bubblegum),
Stars SPL token with real balances, NFT gallery from Helius DAS API, sky oracle on-chain.

**AI layer:** ASTRA standalone page with streaming Claude responses + real-time sky data injected,
Dark Sky photo analyzer using Claude Vision API to measure light pollution from uploaded sky photos.

**Data layer:** Marketplace with 3 real dealer regions (Georgia/Astroman, USA/Celestron, Europe/Bresser)
with real product names, real image URLs, real prices in USD. All region-aware.

**Dark Sky:** Interactive Leaflet map with NASA VIIRS nighttime light satellite overlay, "Night Score"
system replacing Bortle (0-100 scale with cosmic tier names), AI photo analyzer, community reports.

**Polish:** PWA installable, onboarding overlay, shareable NFT success screen, loading/empty/error
states on every page, performance-optimized images and API caching, gamification visible on every page.

**Submission-ready:** Full demo flow, OG images for social sharing, Farcaster frames, polished README.

---

# WEEKLY X POSTS

## Week 1 (April 11–13)
```
There are 300M+ amateur astronomers worldwide.

Zero apps bringing them on-chain.

Building that for @colosseum Frontier. On @solana.

stellarrclub.vercel.app
```

## Week 2 (April 14–20)
```
Each sky observation on Stellar:

AI verifies your photo
Sky oracle hashes weather conditions
cNFT minted for ~$0.000005
Stars tokens awarded instantly
All gasless — user never sees crypto

Privy + Bubblegum + Claude API on @solana.
```

## Week 3 (April 21–27)
```
New on Stellar: the shareable moment.

Complete an observation.
NFT mints.
Success screen opens — share directly to X.

This is what a viral loop looks like in a real consumer app.
```

## Week 4 (April 28 – May 7)
```
Submitting Stellar to @colosseum Frontier.

The global astronomy app on @solana.

Zero competition. Real business. Real users.

stellarrclub.vercel.app
```
