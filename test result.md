UX Audit Report: Stellar (stellarrclub.vercel.app)
📊 Overall Score: 5.5 / 10

"A genuinely interesting concept held back by half-built pages, two competing navigation systems, and a critical trust gap between what the landing page promises and what the app actually delivers."


🔴 Critical Fixes (8 issues)

Marketplace is empty — /marketplace renders just the word "Marketplace". It's in the primary nav on every page.
Profile page is blank — /profile shows nothing but navbar and footer.
Sky Forecast has no data — /sky shows headings but no planet positions or weather data (client-side fetch likely failing silently).
/darksky 404s — linked from the /observe footer but doesn't exist.
/gallery 404s — linked from the club/missions secondary nav.
Two conflicting navigation systems — main site uses Sky | Learn | Marketplace | Missions | Profile; club section uses Club | Missions | Gallery | Profile. Feels like two different apps.
Missions 100% gated — no preview of missions before requiring full 3-step onboarding (wallet + mint + telescope).
/observe page has zero incentive copy — one sentence + one button, unlike the rich reward breakdown on the landing page.

🟡 Important Improvements (8 issues)

"KA" Georgian language default confuses international users
Inconsistent naming: "Learn" vs "Astronomy Guide" vs "ASTRA AI" all point to /chat
"Mint" step label contradicts "Club Membership" heading
Three separate domains in the footer creates ecosystem confusion + Vercel subdomain hurts credibility
/leaderboard 404s despite leaderboard existing on the homepage
All "Tonight's Targets" cards link to the same gated /missions page
No loading states on data-driven pages (/sky, /marketplace)
/chat shows a static planet encyclopedia, not an AI chat interface despite the route name

✅ What's Working Well

Hero copy — "Observe. Verify. Collect." is clear and memorable
How It Works flow — 4 steps, zero jargon, instantly understandable
Reward specificity — concrete physical rewards (20% telescope discount, Moon Lamp, Star Map)
"No wallet? No problem" — excellent Web3 onboarding copy addressing the #1 anxiety
Leaderboard social proof — real city names create community feeling
Astronomy Guide content — solid educational foundation with planets, quizzes, sky events
3-step visual stepper on /club gives clear progress sense

📋 Score Breakdown
AreaScoreLanding Page7.5/10Onboarding Flow (/club)6/10Core Features (Sky, Missions, Observe)3.5/10Marketplace1/10Profile1/10Navigation Consistency3/10Copy & Messaging7/10Information Architecture4/10
🎯 Prioritized Fix Order

Stub Marketplace with 3–4 locked reward items
Stub Profile with sign-in prompt + reward breakdown
Fix Sky page (geolocation prompt + loading skeleton + fallback)
Remove /darksky and /gallery from nav until built
Unify navbar across the entire app
Show mission previews before the auth gate
Get a custom domain before demo