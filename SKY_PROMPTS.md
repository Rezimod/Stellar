# SKY PAGE UPGRADE PROMPTS — Stellar

Run in order: SKY-P1 → SKY-P2 → SKY-P3 → SKY-P4

---

## SKY-PROMPT 1 — Shared Location Hook + Reliability Fixes

```
I'm building Stellar for Colosseum Frontier. The sky page has a critical problem:
TonightHighlights, ForecastGrid, and PlanetGrid each independently call
navigator.geolocation.getCurrentPosition(). This causes 3 browser permission
requests in sequence, 3×5s timeout delays, and inconsistent coordinates.

Read these files fully before editing:
  src/components/sky/TonightHighlights.tsx
  src/components/sky/ForecastGrid.tsx
  src/components/sky/PlanetGrid.tsx
  src/app/sky/page.tsx

---

Step 1 — Create src/hooks/useLocation.ts

A client-side hook that:
- Calls geolocation once, caches the result in a module-level variable
  (so if called by 3 components, browser asks permission only once)
- Returns { lat, lng, ready } — ready=false until we have coordinates
- Falls back to Tbilisi ({ lat: 41.6941, lng: 44.8337 }) on error or if
  geolocation is unavailable
- Timeout: 5000ms

```ts
const TBILISI = { lat: 41.6941, lng: 44.8337 };
let cachedLocation: { lat: number; lng: number } | null = null;
let pendingCallbacks: ((loc: { lat: number; lng: number }) => void)[] = [];
let requested = false;

export function useLocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    cachedLocation
  );

  useEffect(() => {
    if (cachedLocation) { setLoc(cachedLocation); return; }
    pendingCallbacks.push(setLoc);
    if (requested) return;
    requested = true;

    if (!navigator.geolocation) {
      const fb = TBILISI;
      cachedLocation = fb;
      pendingCallbacks.forEach(cb => cb(fb));
      pendingCallbacks = [];
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const result = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cachedLocation = result;
        pendingCallbacks.forEach(cb => cb(result));
        pendingCallbacks = [];
      },
      () => {
        cachedLocation = TBILISI;
        pendingCallbacks.forEach(cb => cb(TBILISI));
        pendingCallbacks = [];
      },
      { timeout: 5000 }
    );
  }, []);

  return { ...(loc ?? TBILISI), ready: loc !== null };
}
```

Step 2 — Refactor TonightHighlights.tsx

Replace the existing geolocation logic with useLocation().
The component already has a compute(lat, lng) function pattern —
call it when ready===true.
Remove the TBILISI constant and the geolocation useEffect block.
Add import { useLocation } from '@/hooks/useLocation'.

Step 3 — Refactor ForecastGrid.tsx

Same pattern — replace geolocation block with useLocation().
Only call fetch when ready===true.

Step 4 — Refactor PlanetGrid.tsx

Same pattern.

Step 5 — Fix SunMoonBar.tsx silent failure

Currently: `.catch(() => {})` — if API fails, spinner shows forever.
Fix: add error state, show a minimal fallback row on failure instead of
hanging skeleton. On error, show:
  <div className="glass-card p-3 text-xs text-slate-600 text-center">
    Sun/moon data unavailable
  </div>

Step 6 — Create src/app/sky/loading.tsx

A skeleton that matches the actual page layout:
- Title placeholder (h-7 w-32)
- TonightHighlights placeholder (h-20)
- SunMoonBar placeholder (h-10)
- ForecastGrid placeholder: 1 tall card (h-36) + 6 small cards in grid-cols-2 sm:grid-cols-3
- Planet section: title + 6 card skeletons in grid-cols-2 sm:grid-cols-3 (h-28 each)
All placeholder divs: className="bg-white/[0.04] rounded-xl animate-pulse"

---

TESTING:
1. Open sky page — geolocation prompt should appear exactly once
2. Disable geolocation in browser — should use Tbilisi coords silently
3. Kill /api/sky/sun-moon in devtools (block request) — SunMoonBar should
   show fallback text, not infinite shimmer
4. Open sky page with slow connection — loading.tsx skeleton should appear
```

---

## SKY-PROMPT 2 — TonightHighlights Hero Redesign

```
I'm building Stellar for Colosseum Frontier. The TonightHighlights component
currently shows one text line like "Best tonight: Jupiter at 45° — clear skies
20:00–23:00". For demo day, judges need to immediately feel what the sky is like
tonight. It must be a proper visual card — the hero of the sky page.

Read these files fully:
  src/components/sky/TonightHighlights.tsx
  src/lib/sky-data.ts (SkyHour has: cloudCover, temp, humidity, wind, visibility)
  src/lib/planets.ts (PlanetInfo has: key, altitude, magnitude, visible, rise)

Rewrite TonightHighlights.tsx completely. Keep the same data-fetching approach
(useLocation hook after SKY-P1, or keep existing geolocation if P1 not done yet).

---

The new design has THREE possible states:

STATE A — Clear night (best cloudCover < 30):

┌─────────────────────────────────────────────────────┐
│ TONIGHT'S SKY          [● GO badge — green]          │
│                                                      │
│ ☁ 12%    🌡 14°C    💨 8 km/h                        │
│                                                      │
│ Best window: 21:00 – 23:30                           │
│                                                      │
│ Visible tonight: ♃ Jupiter (45°)  ♄ Saturn (32°)    │
└─────────────────────────────────────────────────────┘

STATE B — Partly cloudy (30–60%):

┌─────────────────────────────────────────────────────┐
│ TONIGHT'S SKY          [◐ MAYBE badge — amber]       │
│                                                      │
│ ☁ 45%    🌡 11°C    💨 12 km/h                       │
│                                                      │
│ Clearest window: 22:00 – 23:00                       │
│                                                      │
│ Might see: ♃ Jupiter if clouds part                 │
└─────────────────────────────────────────────────────┘

STATE C — Cloudy night (>60%):

┌─────────────────────────────────────────────────────┐
│ TONIGHT'S SKY          [✕ SKIP badge — red/muted]   │
│                                                      │
│ ☁ 82%    🌡 9°C    💨 18 km/h                        │
│                                                      │
│ Next clear night: Thursday, Apr 11                   │
└─────────────────────────────────────────────────────┘

---

Implementation:

The card outer container: glass-card p-5, dynamic border based on state:
  go:    border-[#34d399]/30, boxShadow: '0 0 24px rgba(52,211,153,0.06)'
  maybe: border-[#FFD166]/30, boxShadow: '0 0 24px rgba(255,209,102,0.06)'
  skip:  border-white/10

Header row: flex items-center justify-between
  Left: small label "TONIGHT'S SKY" text-[10px] uppercase tracking-widest
    color: go=#34d399/60, maybe=#FFD166/60, skip=white/20
  Right: badge — same badgeStyles as ForecastCard.tsx (import from there or copy)
    go: "● GO", maybe: "◐ MAYBE", skip: "✕ SKIP"

Stats row: flex items-center gap-4 mt-3 text-sm
  ☁ {cloudCover}%   🌡 {Math.round(temp)}°C   💨 {Math.round(wind)} km/h
  Each: text-white/80, the icon emoji flex-shrink-0

Best window row (mt-2): if window exists:
  "Best window: {window}" — text-[#38F0FF] text-xs font-medium
  else if state is 'skip':
  "Next clear night: {nextClearDate}" — text-slate-400 text-xs
  if no clear night in 7 days:
  "Cloudy all week — check back tomorrow" — text-slate-500 text-xs

Visible planets row (only for go/maybe states, mt-3 pt-3 border-t border-white/[0.05]):
  Show up to 2 visible planets sorted by altitude:
  Flex row, gap-3. For each:
    Planet emoji (use PLANET_EMOJIS map: moon=🌕,mercury=☿,venus=♀,mars=♂,jupiter=♃,saturn=♄)
    Name + altitude: "Jupiter (45°)" — text-white text-xs
  If no visible planets: show nothing (skip the row entirely)

Data: fetch from /api/sky/forecast and /api/sky/planets using useLocation.
"Evening" = hours 19:00–23:59 local time.
Use the lowest cloudCover hour in that range for the stats row values.

Loading state: glass-card h-[120px] animate-pulse (taller than before)

If fetch fails: return null (hide the card silently)

Use useTranslations('sky') for the "TONIGHT'S SKY" label (key: 'tonightHighlight').
Everything else can be hardcoded English for now.
```

---

## SKY-PROMPT 3 — ForecastCard Upgrade (Temperature + Wind + Cleaner Design)

```
I'm building Stellar for Colosseum Frontier. The forecast cards fetch temperature
and wind from Open-Meteo but never display them. This is wasted data that makes
the forecast look incomplete.

Read these files fully:
  src/components/sky/ForecastCard.tsx
  src/components/sky/ForecastGrid.tsx
  src/lib/sky-data.ts (SkyHour: cloudCover, visibility, temp, humidity, wind)

---

Changes to ForecastCard.tsx:

1. TODAY CARD — redesign the stats grid.

Current: 3 nested glass-card boxes (ugly — cards inside cards)
New: flat rows without nesting, cleaner layout:

Replace the current `grid grid-cols-3 gap-3` of nested glass-cards with:

<div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
  <Stat label={t('cloudCover')}    value={`${bestHour.cloudCover}%`}
        color={bestHour.cloudCover < 30 ? '#34d399' : bestHour.cloudCover < 60 ? '#FFD166' : '#f87171'} />
  <Stat label={t('visibility')}    value={`${visKm} km`} />
  <Stat label="Temperature"        value={`${Math.round(bestHour.temp)}°C`} />
  <Stat label="Wind"               value={`${Math.round(bestHour.wind)} km/h`} />
</div>

Where Stat is a small inline component (no file — define inside ForecastCard.tsx):
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-white text-base font-bold" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

Also add below the stats grid, if window !== '—':
<div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-2">
  <span className="text-[#38F0FF] text-[10px] uppercase tracking-widest">{t('bestHours')}</span>
  <span className="text-white text-xs font-medium">{window}</span>
</div>

2. FUTURE DAY CARDS — add temperature to the compact card.

Current layout: date + badge on top row, then "☁ 45% 👁 40 km" row.
New: add a third row with temp range for the night hours (20:00–00:00):

After the existing cloud/vis row, add:
  const nightHours = day.hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const temps = nightHours.map(h => h.temp);
  const minTemp = temps.length ? Math.round(Math.min(...temps)) : null;
  const maxTemp = temps.length ? Math.round(Math.max(...temps)) : null;

Add below the ☁ row:
  {minTemp !== null && (
    <span className="text-xs text-slate-500">🌡 {minTemp}–{maxTemp}°C</span>
  )}

3. FORECAST GRID — fix the "Retry" button text.

In ForecastGrid.tsx, the retry button text is hardcoded "Retry".
Change to use t('retry') and add 'retry' key to en.json and ka.json:
  en.json → "retry": "Retry"
  ka.json → "retry": "თავიდან"

Also fix the error message: currently reads t('forecastError') with "Tap to retry".
On desktop, "Tap" is wrong. Change the translation value in en.json to:
  "forecastError": "Could not load forecast"
And show the retry button separately below it.

---

TESTING:
1. Open sky page — today card should show cloud %, visibility, temperature, wind
2. Check 7-day cards — each should show temperature range for night hours
3. On mobile 375px: stats grid should be readable (2-col layout, not 3)
4. Kill the forecast API in devtools — should show error message + Retry button
```

---

## SKY-PROMPT 4 — PlanetCard + PlanetDetail Upgrade

```
I'm building Stellar for Colosseum Frontier. The PlanetCard component uses tiny
colored dots to represent planets and shows raw numbers like "45° alt", "123° NE",
"mag 4.5" with no context. For a consumer astronomy app, this must look polished.

Read these files fully:
  src/components/sky/PlanetCard.tsx
  src/components/sky/PlanetDetail.tsx
  src/lib/planets.ts (PlanetInfo shape)
  src/messages/en.json (planets namespace)

---

Changes to PlanetCard.tsx:

1. Replace colored dot with planet emoji.

Remove DOT_COLOR map entirely.
Add:
const PLANET_EMOJI: Record<string, string> = {
  moon:    '🌕',
  mercury: '☿',
  venus:   '♀',
  mars:    '♂',
  jupiter: '♃',
  saturn:  '♄',
};

In the header, replace:
  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[...] ?? ...}`} />
With:
  <span className="text-lg flex-shrink-0 leading-none">{PLANET_EMOJI[planet.key] ?? '✦'}</span>

2. Improve the altitude display.

Replace the raw "45° alt · 123° NE · mag 4.5" row with:

{/* Altitude bar */}
<div className="flex items-center gap-2">
  <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
    <div
      className="h-1 rounded-full transition-all"
      style={{
        width: `${Math.min(100, Math.max(0, (planet.altitude / 90) * 100))}%`,
        background: planet.altitude > 30
          ? 'linear-gradient(90deg, #34d399, #38F0FF)'
          : planet.altitude > 10
          ? 'linear-gradient(90deg, #FFD166, #F59E0B)'
          : 'rgba(255,255,255,0.2)',
      }}
    />
  </div>
  <span className="text-[11px] text-slate-400 flex-shrink-0">{planet.altitude}°</span>
</div>

3. Fix the rise/transit/set label row.

Current: lowercase hardcoded "rise" / "transit" / "set"
Change to use translation keys. Add to en.json under 'planets':
  "rise": "Rise", "transit": "Transit", "set": "Set"
And use t('rise'), t('transit'), t('set') in the map.

4. On the "not visible" badge, improve the display.

Current: "Rises at HH:MM" (cramped, small font)
If planet is below horizon (altitude <= 10) but has a rise time:
  Show: "{PLANET_EMOJI} rises {hhmm}" in a more readable label
If no rise time (circumpolar or never rises today):
  Show: "Below horizon"

---

Changes to PlanetDetail.tsx:

Read the full file and fix the hardcoded English labels.

1. All the row labels in the detail modal are hardcoded English strings like
   "Status", "Altitude", "Azimuth", "Magnitude", "Rises at", "Highest at",
   "Sets at", "Constellation", "Viewing tip".

   Add these to en.json under 'planets' namespace:
   "status": "Status", "altitudeLabel": "Altitude", "azimuthLabel": "Azimuth",
   "magnitudeLabel": "Magnitude", "risesAt": "Rises at" (may already exist),
   "highestAt": "Highest at", "setsAt": "Sets at", "constellation": "Constellation",
   "viewingTip": "Viewing tip"

   Add matching Georgian in ka.json.

2. The direction names (North, NE, East, etc.) are hardcoded in dirFull().
   Replace with a simple lookup:
   const DIR_LABELS: Record<string, string> = {
     N:'North', NE:'Northeast', E:'East', SE:'Southeast',
     S:'South', SW:'Southwest', W:'West', NW:'Northwest'
   };

3. The modal does not lock body scroll.
   Add to the fixed overlay div's useEffect:
   useEffect(() => {
     document.body.style.overflow = 'hidden';
     return () => { document.body.style.overflow = ''; };
   }, []);

---

Changes to PlanetGrid.tsx:

Fix the hardcoded "No planet data available." empty state.
Replace with:
  <p className="text-[var(--text-secondary)] text-sm">{t('noPlanets')}</p>
Add to en.json: "noPlanets": "No planet data available"
Add to ka.json: "noPlanets": "პლანეტის მონაცემი მიუწვდომელია"

---

TESTING:
1. Open sky page → planets section — each card should show planet emoji, not dot
2. Jupiter card (usually highest) — altitude bar should be mostly filled and green/teal
3. Mercury card (low altitude) — bar should be short and amber/dim
4. Tap a planet card → detail modal — row labels should be proper English
5. On mobile, open a detail modal → page behind should not scroll
6. If planets API returns empty array → "No planet data available" in current locale
```
