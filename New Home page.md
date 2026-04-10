Prompt A — Hero Section Redesign
I'm redesigning the homepage of Stellar (src/app/page.tsx), a Next.js 15 astronomy app.
Read src/app/page.tsx fully before writing anything. Also read src/app/globals.css and any layout file.

GOAL: Redesign only the Hero section (the very top, above "How It Works").
Keep ALL existing sections below it untouched for now.

DESIGN BRIEF — Hero:
The hero must feel like opening a high-end space telescope app.
Dark cosmic background. The entire section should fill 100vh.
Inspired by: Robinhood's live data hook on load, Strava's immediate personal status, Linear's crisp typographic hierarchy.

Changes:

1. Background:
   Remove the current plain dark background from the hero wrapper.
   Add a subtle animated star field: inject a <canvas id="stars-canvas"> absolutely behind everything.
   Write a small <Script> (strategy="afterInteractive") or useEffect that draws 120 random white dots (radius 0.5–1.2px, opacity 0.2–0.7) on the canvas and slowly moves them downward at 0.15px/frame in a requestAnimationFrame loop. Canvas must fill the hero div.
   Add a radial gradient overlay on top of canvas: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(52,211,153,0.06) 0%, transparent 70%).

2. Top announcement bar (NEW — above the nav):
   Thin bar, full width, height 32px, background rgba(52,211,153,0.08), border-bottom 1px solid rgba(52,211,153,0.12).
   Content: small teal dot + "Live: Sky conditions updating · Tbilisi clear 12%" (use static text for now, we'll wire it later)
   Plus right side: "2nd place · Superteam Georgia Hackathon ✦" in rgba(255,255,255,0.4) text-xs.
   On mobile, hide the right side text.

3. Hero headline:
   Keep the existing ✦ STELLAR ✦ badge above the title.
   Change the main h1 to split into three animated lines:
     Line 1: "Observe the"  (white, opacity 0.9)
     Line 2: "Night Sky." (teal gradient text: from #34d399 to #38F0FF, using background-clip: text)
     Line 3: "Earn your place." (white, opacity 0.5, text-sm tracking-widest uppercase)
   Animate each line with a CSS fadeInUp: starting opacity 0, translateY(20px), ending opacity at target, translateY(0). Delays: 0.1s, 0.3s, 0.5s. Duration 0.8s ease-out. Use @keyframes fadeInUp in a <style> tag or CSS module — whichever the project uses.

4. Hero sub-copy (replace existing):
   "Complete telescope observations. Earn Stars tokens. Collect verified NFTs. Shop with real discounts from Georgia's first astronomy store."
   Max-width 480px, centered. Line-height 1.7. Color rgba(255,255,255,0.55).

5. CTA row (replace existing):
   Two buttons side by side, centered:
   Primary: "Start Observing →" — keep existing brass/gold gradient style
   Secondary: "Tonight's Targets" — glass style: background rgba(255,255,255,0.06), border 1px solid rgba(255,255,255,0.12), text white, hover: background rgba(255,255,255,0.1). Links to /sky.
   Add a small text below buttons: "Free to join · No seed phrase required" in rgba(255,255,255,0.25) text-xs.

6. Live stats strip (NEW — below CTA, still inside hero):
   Three small stat cards in a row, max-width 480px, centered, gap-3.
   Each card: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-xl, px-4 py-3.
   Card 1: "✦ Stars Token" / "Live on Solana" (teal text)
   Card 2: "🔭 NFT Missions" / "Seal your obs." (gold text)
   Card 3: "🛒 Real Rewards" / "From Astroman" (white text)
   On mobile, stack vertically.

7. Scroll indicator:
   At the very bottom of the hero div, add a centered bouncing chevron-down (use existing lucide ChevronDown if available, otherwise unicode ⌄).
   CSS animation: translateY loop 0→6px→0, 1.5s infinite, ease-in-out.
   Color: rgba(255,255,255,0.25).

CONSTRAINTS:
- Do not change the nav component.
- Do not change anything below the hero.
- Use only existing color tokens already in the app: #070B14 background, #FFD166 gold, #34d399 teal, #38F0FF blue.
- No new npm packages for this prompt.
- All new styles inline or in a style tag — do not edit globals.css.

Prompt B — Tonight's Sky Preview Strip
I'm redesigning the homepage of Stellar (src/app/page.tsx).
Read src/app/page.tsx fully. Also read src/app/sky/page.tsx and src/lib/planets.ts to understand what sky data looks like.

GOAL: Replace the current "Tonight's Targets" section on the homepage with a much richer Sky Preview Strip.
This is a mini version of the /sky page embedded on the homepage. Clicking anything goes to /sky.

This section sits just below the hero. Keep all other sections below it intact.

SECTION DESIGN — "Tonight's Sky":

1. Section header:
   Left: section label "Tonight's Sky" (white, serif, text-xl or text-2xl)
   Right: "View full forecast →" link to /sky (teal, text-sm)
   Add a live badge beside the title: small pulsing green dot + "Live" text (rgba(52,211,153,0.8), text-xs).
   The pulsing dot: CSS animation scale 1→1.4→1, 2s infinite, using a box-shadow of 0 0 0 4px rgba(52,211,153,0.2).

2. Sky condition banner (NEW — compact bar above the planet cards):
   Single full-width bar, background rgba(52,211,153,0.06), border 1px solid rgba(52,211,153,0.12), rounded-xl, px-4 py-2.
   Content in one row: 
     Left: "Cloud Cover: 12%" · "Visibility: Excellent" · "Best time: 21:00–01:00"
     Right: "Tbilisi, Georgia" + small location pin icon.
   All values are static for now. Text: rgba(255,255,255,0.6), text-xs. The "Excellent" word is teal.
   On mobile, wrap into two rows.

3. Planet cards row (replace existing target list):
   Horizontal scroll container (overflow-x: auto, scrollbar hidden via scrollbar-width: none + ::-webkit-scrollbar display:none).
   Show 6 cards. Each card: min-width 140px, flex-shrink-0, background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-2xl, p-4.
   
   Card content:
   - Large emoji or planet initial (text-3xl, centered)
   - Planet name (white, text-sm, font-semibold, mt-2)
   - Visibility badge: pill with background based on status:
       Excellent → rgba(52,211,153,0.15) bg, #34d399 text
       Good → rgba(255,209,102,0.15) bg, #FFD166 text
       Fair → rgba(148,163,184,0.15) bg, rgba(255,255,255,0.5) text
   - Rise/set times: "Rises 20:14" in rgba(255,255,255,0.35) text-xs (static text for now)
   
   On hover: card border becomes rgba(52,211,153,0.3), translateY(-2px), transition 200ms.
   Entire card is a link to /missions.

   Targets (use these static values for now):
   { name: "Moon", emoji: "🌕", status: "Excellent", time: "Rises 18:40" }
   { name: "Jupiter", emoji: "🪐", status: "Excellent", time: "Rises 20:14" }
   { name: "Saturn", emoji: "🪐", status: "Good", time: "Rises 22:30" }
   { name: "Orion Nebula", emoji: "✨", status: "Good", time: "Visible 21:00" }
   { name: "Pleiades", emoji: "⭐", status: "Excellent", time: "Visible 20:45" }
   { name: "Andromeda", emoji: "🌌", status: "Good", time: "Visible 22:00" }

4. 7-day forecast ribbon (NEW):
   Below the planet cards. A single row of 7 day-chips.
   Each chip: small rounded rect, width ~80px, background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.06), px-3 py-2, text-center.
   Content: day label (Mon/Tue etc, text-xs, rgba(255,255,255,0.4)) + badge ("Go" / "Maybe" / "Skip").
   Badge colors:
     Go → teal background rgba(52,211,153,0.15), teal text
     Maybe → gold background rgba(255,209,102,0.12), gold text
     Skip → slate background rgba(148,163,184,0.08), gray text
   Use these static values: Mon=Go, Tue=Go, Wed=Maybe, Thu=Skip, Fri=Go, Sat=Go, Sun=Maybe.
   Today (first chip): border-color rgba(52,211,153,0.4), slightly brighter.

CONSTRAINTS:
- Do not touch the hero section (Prompt A output).
- Do not touch sections below this one.
- No new npm packages.
- No API calls in this prompt — all static values, we'll wire later.
- Keep all existing color tokens.

Prompt C — Missions Preview + Leaderboard Side-by-Side
I'm redesigning the homepage of Stellar (src/app/page.tsx).
Read src/app/page.tsx fully. Also read src/app/missions/page.tsx and understand what a mission looks like (name, emoji, stars, difficulty).

GOAL: Replace the current leaderboard section and add a side-by-side Missions Preview + Leaderboard section.
This is the third section on the homepage, sitting below the Sky Preview Strip.

Keep everything above and below untouched.

SECTION DESIGN — Two-column layout on desktop, stacked on mobile (grid-cols-1 md:grid-cols-2, gap-6):

LEFT COLUMN — "Active Missions":
Header row: "Active Missions" (white, serif, text-xl) + "All missions →" link to /missions (teal, text-sm).

Show 3 mission cards vertically stacked, gap-3:
Each card: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-2xl, p-4.
Card layout:
  - Top row: emoji (text-2xl) + mission name (white, font-semibold, text-sm) + difficulty badge on far right
    Difficulty badges: Beginner → rgba(52,211,153,0.15) bg, teal text | Advanced → rgba(56,240,255,0.12) bg, #38F0FF text | Expert → rgba(255,100,100,0.12) bg, #ff6464 text
  - Middle row: description in rgba(255,255,255,0.45) text-xs (truncate to 1 line)
  - Bottom row: stars reward "✦ +80" in #FFD166 font-bold text-sm + progress bar on right (width 120px, height 4px, bg rgba(255,255,255,0.08), filled portion rgba(52,211,153,0.6), rounded-full)
  
  Progress bar fill widths (static): Mission 1 = 0%, Mission 2 = 35%, Mission 3 = 0% (to show variety).
  
  On hover: border rgba(255,255,255,0.15), translateY(-1px), transition 200ms ease.
  Each card links to /missions.

Mission data (static):
  { emoji: "🌕", name: "Lunar Observation", difficulty: "Beginner", stars: 50, desc: "Observe and photograph the Moon's craters through your telescope.", progress: 0 }
  { emoji: "🪐", name: "Jupiter's Moons", difficulty: "Advanced", stars: 120, desc: "Track the four Galilean moons over a single evening.", progress: 35 }
  { emoji: "✨", name: "Deep Sky Survey", difficulty: "Expert", stars: 200, desc: "Locate and capture 5 Messier objects in one night.", progress: 0 }

Below the 3 cards, add a subtle completion motivator:
  "Complete all missions to unlock: Free Custom Star Map + 20% telescope discount"
  Style: text-xs, rgba(255,255,255,0.3), text-center, mt-2.

RIGHT COLUMN — "Leaderboard":
Header row: "Leaderboard" (white, serif, text-xl) + "This week" pill (static, rgba(255,255,255,0.06) bg, text-xs text-gray).

Single card: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-2xl, overflow-hidden.

5 rows inside. Each row: flex, items-center, gap-3, px-4 py-3, border-bottom 1px solid rgba(255,255,255,0.04) (last row no border).

Row content:
  - Rank number: text-sm font-bold. #1 = teal, #2 = #FFD166, #3 = rgba(255,180,100,0.8), #4-5 = rgba(255,255,255,0.3).
  - Avatar circle: 32px, bg from a color derived from initials (cycle through: rgba(52,211,153,0.2), rgba(56,240,255,0.2), rgba(255,209,102,0.2), rgba(148,163,184,0.2)). Two-letter initials in white, text-xs, font-bold, centered.
  - Name + location: name in white text-sm, location in rgba(255,255,255,0.35) text-xs below.
  - Stars on far right: "✦ 1280" in #FFD166 font-bold text-sm.
  - Special icon for #1: small 🔭 emoji before the stars count.

Row 1 (you): highlight with background rgba(52,211,153,0.06) and left border 2px solid #34d399. Only if user is logged in — for now show the highlight on row 1 always as demo.

Leaderboard data (keep existing):
  #1 AstroHunter · Tbilisi · 1280
  #2 StarFinder · Lisbon · 940
  #3 NebulaScout · Tokyo · 820
  #4 CosmicEye · Arizona · 650
  #5 MoonWatcher · Berlin · 410

Below the leaderboard card, add NFT count stat:
  "47 observations sealed on Solana this week"
  Style: text-xs, rgba(255,255,255,0.25), text-center, mt-2.

CONSTRAINTS:
- Do not touch any section above or below.
- No new npm packages.
- Keep all color tokens consistent with rest of redesign.
- On mobile: missions column first, leaderboard second.

Prompt D — Rewards & Marketplace Preview
I'm redesigning the homepage of Stellar (src/app/page.tsx).
Read src/app/page.tsx fully. Also read src/app/marketplace/page.tsx to understand what products exist (names, prices, descriptions).

GOAL: Replace the current "Observe & Earn" and "Explore the Platform" sections with a single, more compelling Rewards & Store section.
This is the fourth section on the homepage. Keep all sections above and below untouched.

SECTION DESIGN — "Earn Stars. Spend Stars.":

1. Section header (full width):
   Left: "Earn Stars. Spend Real Rewards." (white, serif, text-2xl)
   Subheading below: "Complete missions → earn Stars tokens → redeem for Astroman gear." (rgba(255,255,255,0.45), text-sm)

2. Rewards tier row (3 cards, grid-cols-3 on desktop, grid-cols-1 on mobile, gap-4):
   Each card: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-2xl, p-5.
   
   Card 1 — First Observation:
     Icon area: moon emoji, text-3xl.
     Title: "First Observation" (white, font-semibold).
     Reward: "Free Moon Lamp" (gold, font-bold, mt-1).
     Stars needed: "50 ✦" in teal, text-sm.
     Status bar: 0% (empty, but visible).
   
   Card 2 — Complete 5 Missions:
     Icon: star emoji text-3xl.
     Title: "Mission Complete"
     Reward: "Custom Star Map PDF"
     Stars: "500 ✦" teal.
     Status: 0%.
   
   Card 3 — Power Observer:
     Icon: telescope emoji text-3xl.
     Title: "Power Observer"
     Reward: "20% telescope discount"
     Stars: "1000 ✦" teal.
     Status: 0%.
   
   Each card has a locked icon (🔒) in bottom right corner, rgba(255,255,255,0.2). When earned (status 100%) it would become a checkmark — static for now.

3. Progress teaser (full width bar, below the 3 cards):
   Background rgba(255,255,255,0.04), border rgba(255,255,255,0.08), rounded-xl, px-5 py-4.
   Left side: "Your Stars" label + "0 ✦" in gold font-bold text-2xl below.
   Right side: horizontal progress bar. Label "Next reward at 50 ✦". Bar: bg rgba(255,255,255,0.06), filled portion teal, width 0% (empty), height 6px, rounded-full.
   On mobile: stack vertically.

4. Store preview (3 product cards below, horizontal scroll on mobile):
   Header: "Shop with Stars →" (right-aligned, links to /marketplace, teal text-sm).
   3 product cards in a row: min-width 180px, flex-shrink-0, background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08), rounded-2xl, p-4, gap-3.
   
   Each product card:
   - Product name (white, text-sm, font-semibold)
   - Price: "29 GEL" in gold font-bold
   - Stars price: "or 500 ✦" in teal text-xs below
   - Button: "View →" — small, glass style, border rgba(255,255,255,0.12), hover teal border.
   Button links to /marketplace.
   
   Products (use these, matching what's in marketplace):
   { name: "Custom Star Map", price: "29 GEL", stars: "500 ✦" }
   { name: "Moon Lamp", price: "45 GEL", stars: "750 ✦" }
   { name: "Bresser Junior Telescope", price: "299 GEL", stars: "5000 ✦" }

CONSTRAINTS:
- Remove the existing "Explore the Platform" three-link section (astroman.ge / club / Stellar) — replace with this section entirely.
- Remove the existing "Observe & Earn" section — absorbed into this section.
- Keep "How It Works" section (the 4-step flow) — do not touch it.
- No new npm packages.
- All color tokens consistent.

Prompt E — ASTRA AI Teaser + How It Works Refresh
I'm redesigning the homepage of Stellar (src/app/page.tsx).
Read src/app/page.tsx and src/app/chat/page.tsx fully before writing.

GOAL: Two targeted changes in this prompt:
  (1) Refresh the "How It Works" section visually (keep content, change appearance)
  (2) Add a new ASTRA AI teaser section between "How It Works" and the Rewards section

PART 1 — Refresh "How It Works":
Keep the existing 4 steps (Observe, Capture, Verify, Mint) and their descriptions.
Change the visual treatment:

Replace the current layout with a 4-column grid on desktop (grid-cols-2 md:grid-cols-4), 1-col on mobile.
Each step card: background rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.07), rounded-2xl, p-5.

Top of each card: large step number rendered as: "01" "02" "03" "04" in a 40px circle, bg rgba(52,211,153,0.08), border 1px solid rgba(52,211,153,0.15), color rgba(52,211,153,0.6), font-mono text-xs centered.

Step name: white, font-semibold, text-sm, mt-3.
Step description: rgba(255,255,255,0.4), text-xs, line-height 1.6, mt-1.

Between cards (desktop only): a subtle arrow connector → rendered as a thin teal line with arrow end. Add these as absolutely positioned elements inside a relative parent container. Arrow: 1px solid rgba(52,211,153,0.2), width ~20px, with a small ▶ at the end (text-xs, teal, opacity 0.4). Position: vertically centered between cards, horizontal gap.

On mobile: no arrows between cards. Just the stacked cards.

PART 2 — ASTRA AI Teaser section (new, between "How It Works" and Rewards):
Section header: "Meet ASTRA" (white, serif, text-2xl, centered) + subtitle "Your AI astronomer. Available 24/7." (rgba(255,255,255,0.45), text-sm, centered, mt-1).

Chat bubble mockup (max-width 480px, centered, mt-6):
A static 3-bubble conversation in a phone-style container:
  Container: background rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.08), rounded-3xl, p-6, overflow-hidden.
  
  Bubble 1 (user, right-aligned):
    "What can I see tonight with a 70mm telescope?"
    Background rgba(56,240,255,0.12), border rgba(56,240,255,0.2), text white, text-sm, rounded-2xl rounded-br-sm, px-4 py-2, max-width 80%, ml-auto.
  
  Bubble 2 (ASTRA, left-aligned, after a gap of mt-3):
    "Tonight is excellent! Jupiter is at magnitude -2.4, well above 40° altitude. You'll see the four Galilean moons in a line. Saturn rises at 22:30 with its rings at 26° tilt — stunning through your scope."
    Background rgba(255,255,255,0.06), border rgba(255,255,255,0.1), text rgba(255,255,255,0.85), text-sm, rounded-2xl rounded-bl-sm, px-4 py-2, max-width 85%.
    Above this bubble: small "ASTRA ✦" label in teal text-xs, mb-1.
  
  Bubble 3 (user, right-aligned, mt-3):
    "Best viewing window?"
    Same style as bubble 1. Shorter.
  
  After bubble 3: typing indicator (ASTRA responding):
    Left-aligned, same card style as ASTRA bubble.
    Three animated dots: small circles, 6px each, animated opacity 0→1→0 staggered 0.3s each, infinite. Color teal.
    Label "ASTRA is thinking..." in rgba(255,255,255,0.3) text-xs beside dots.

CTA below the mockup (centered, mt-6):
  "Ask ASTRA anything →" button.
  Style: background linear-gradient(135deg, rgba(56,240,255,0.15), rgba(52,211,153,0.15)), border 1px solid rgba(52,211,153,0.3), text white, rounded-xl, px-6 py-3, text-sm.
  Hover: border rgba(52,211,153,0.6), background slightly brighter.
  Links to /chat.

Add 3 example prompt pills below the button (click to go to /chat):
  "What's visible tonight in Tbilisi?"
  "Telescope recommendations for beginners"
  "Explain Jupiter's Red Spot"
  Style: pill shape, border rgba(255,255,255,0.1), text rgba(255,255,255,0.45), text-xs, px-3 py-1.5, cursor-pointer, hover border rgba(52,211,153,0.3).

CONSTRAINTS:
- Do not touch the hero, sky strip, missions/leaderboard, or rewards sections.
- No new npm packages.
- Typing indicator animation: CSS only, no JS.
- Static content only — no API calls.

Prompt F — Nav, Footer, Mobile Polish & Full Cohesion Pass
I'm doing a final polish pass on the Stellar homepage (src/app/page.tsx) and the navigation/footer components.
Read these files fully before writing anything:
  src/app/page.tsx
  Any nav component used in the layout (check src/app/layout.tsx to find it)
  Any footer component

GOAL: Three things in this prompt:
  (1) Improve the navigation bar
  (2) Replace the footer with a tighter, more informative one
  (3) Full mobile responsiveness audit of the entire page

PART 1 — Navigation bar improvements:

Read the existing nav component. Make these changes:

A. Add a Stars balance display (right side of nav, left of the login button):
   If user is authenticated (usePrivy): show "✦ 0" in gold, bg rgba(255,209,102,0.1), border rgba(255,209,102,0.2), rounded-lg, px-3 py-1, text-sm. Clicking it goes to /profile.
   If not authenticated: show nothing.

B. Add an active indicator to nav links:
   Current page link should have: border-bottom 2px solid #34d399, color white (not muted).
   Use usePathname() from next/navigation.
   Non-active links: rgba(255,255,255,0.5), hover white, transition 200ms.

C. Mobile nav (bottom sticky bar):
   On screens below md breakpoint, add a fixed bottom bar (position: fixed, bottom: 0, left: 0, right: 0, z-50).
   Background: rgba(7,11,20,0.92), backdrop-filter: blur(12px), border-top: 1px solid rgba(255,255,255,0.08).
   5 icon+label tabs: Sky 🌌 · Missions 🔭 · Home ⭐ (center, slightly elevated) · Chat 💬 · Profile 👤.
   Each tab: flex-col, items-center, gap-0.5, text (9px), py-2, px-3.
   Active tab: teal color. Inactive: rgba(255,255,255,0.35).
   Center "Home" tab: 48px circle, bg rgba(52,211,153,0.15), border 1px solid rgba(52,211,153,0.3), slightly above the bar (margin-top -12px, position relative).
   Add padding-bottom: 72px to the page body/main so content doesn't hide behind the sticky bar on mobile.

D. On desktop (md+): hide the bottom sticky bar. Show the existing horizontal top nav.

PART 2 — Footer replacement:

Replace the existing footer with a new compact footer. Three columns on desktop, stacked on mobile.

Column 1 — Stellar:
  Logo + "STELLAR" wordmark.
  "Astronomy on Solana · Powered by Astroman"
  Small: "Open source · MIT License" + GitHub link (to github.com/Morningbriefrezi/Stellar).
  "47 observations sealed on-chain" — teal, text-xs.

Column 2 — Platform:
  Nav links as a vertical list: Sky Forecast · Missions · ASTRA AI · Marketplace · NFT Gallery · Profile.
  Text-sm, rgba(255,255,255,0.45), hover white, transition.

Column 3 — Community:
  "Built in Tbilisi, Georgia 🇬🇪" text.
  "2nd place · Superteam Georgia Hackathon" badge (small pill, gold border, gold text, text-xs).
  Links: Astroman Store (external) · Solana Explorer (links to devnet explorer) · Colosseum.
  Social: small icon row — GitHub + (future: Twitter/X placeholder).

Bottom bar below the columns:
  Thin separator rgba(255,255,255,0.06).
  Left: "© 2026 Astroman · Stellar"
  Right: "Built on Solana · Devnet" + a small Solana logo (use text "◎ Solana" if no image available).
  Text-xs, rgba(255,255,255,0.25).

PART 3 — Mobile audit:

Go through src/app/page.tsx and check every section added in Prompts A–E.
For any section where you find content overflowing or looking broken at mobile (< 640px):
  - Planet cards horizontal scroll: confirm scrollbar is hidden and it scrolls with touch.
  - Two-column missions/leaderboard: must stack to single column.
  - Three-column rewards: must stack to single column.
  - ASTRA chat bubbles: max-width 480px must become 100% on mobile.
  - Hero stats strip: 3 cards side by side must stack to column on mobile.
  - Hero headline: confirm font sizes don't overflow at 375px width.
  - Add touch-action: pan-x to horizontal scroll containers.
  
  Fix any found issues. Do not change the visual design — only the responsive behavior.

FINAL: After all changes, add a comment block at the very top of page.tsx:
// STELLAR Homepage v2.0 — Redesigned for Colosseum Frontier Hackathon 2026
// Sections: Hero → Sky Preview → Missions + Leaderboard → How It Works → ASTRA → Rewards → Footer
// Colors: #070B14 bg · #34d399 teal · #FFD166 gold · #38F0FF blue

CONSTRAINTS:
- No new npm packages.
- All changes must be backward compatible with existing Privy auth and useAppState hooks.
- Do not change any API routes, lib files, or other pages.
- All animations: respect prefers-reduced-motion — wrap in @media (prefers-reduced-motion: no-preference).