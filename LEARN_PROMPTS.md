# LEARN PAGE UPGRADE PROMPTS — Stellar

Goal: make src/app/chat/page.tsx the best astronomy learning experience
for both kids and adults, with a full telescope setup guide.

Run in order: LEARN-P1 → LEARN-P2 → LEARN-P3 → LEARN-P4

---

## LEARN-PROMPT 1 — Telescope Guide Tab (New Section)

```
I'm building Stellar for Colosseum Frontier. The Learn page currently has
Planets, Deep Sky, Quizzes, and Sky Events tabs. I need to add a fifth tab:
"Telescopes" — a structured setup and usage guide from complete beginner
to professional level. This is the most important addition because the app
is built by Astroman, Georgia's telescope store — this guide must be the
definitive telescope resource.

Read this file fully: src/app/chat/page.tsx

Add a new tab 'telescopes' to TAB_CONFIG:
  { id: 'telescopes', en: 'Telescopes', ka: 'ტელესკოპები' }

Update the Tab type to include 'telescopes'.

---

Create a TelescopesTab component inside chat/page.tsx (or extract to
src/components/sky/TelescopesTab.tsx if the file gets too long).

The tab has 4 LEVEL sections. Each section has an emoji badge + level label
and contains CARDS. Each card has: step number, title, body text, and an
optional "Pro tip" callout.

Render: level selector at the top (4 pill buttons: Beginner / Intermediate /
Advanced / Pro), then show only cards for the selected level.
Default selected level: 'beginner'.

Level pill style (selected):
  background: level color (see below), color: #070B14, border: none
Level pill style (unselected):
  background: rgba(255,255,255,0.04), border: 1px solid rgba(255,255,255,0.08), color: #64748b

Level colors:
  beginner:     '#34d399' (green)
  intermediate: '#FFD166' (amber)
  advanced:     '#38F0FF' (teal)
  pro:          '#8B5CF6' (purple)

---

LEVEL 1 — BEGINNER ("First Light")
Badge: 🌱  Color: #34d399

Card 1 — Unboxing Your First Telescope
  What to expect: the tube (or truss), the mount/tripod, 2 eyepieces (usually
  10mm + 25mm), a finderscope, and an accessory tray. Don't panic — it looks
  like a lot, but assembly takes 10 minutes.
  Pro tip: Keep ALL packaging. If anything is wrong, you'll need it to return.

Card 2 — Assembly: Attach the Tube
  1. Set up the tripod on flat, stable ground. 2. Attach the mount head (alt-az
  or equatorial) by tightening the central bolt. 3. Slide the telescope tube
  onto the mount saddle plate and tighten the clamp. 4. Attach the finderscope
  on its bracket. Don't overtighten — snug is enough.
  Pro tip: Do your first assembly indoors in daylight, not in a dark field.

Card 3 — Inserting an Eyepiece
  Loosen the eyepiece holder thumbscrew. Insert the 25mm eyepiece (wider field,
  easier to find things). Tighten gently. Start with your lowest magnification
  eyepiece — it gives the widest view and makes objects easiest to find.
  Pro tip: Never touch the glass of an eyepiece. Hold it by the barrel.

Card 4 — Your First Target: The Moon
  The Moon is the perfect first object. Point the telescope roughly at it
  using the tube sight. Look through the finderscope to center it. Then look
  through the eyepiece and slowly adjust the focuser until craters appear sharp.
  Pro tip: The Moon is so bright it can be harsh. A Moon filter (cheap, worth it)
  makes the view comfortable and reveals more detail.

Card 5 — Dark Adaptation
  Your eyes need 20–30 minutes in darkness to reach full night vision.
  ONE white light destroys it instantly. Use a red flashlight only — red
  light doesn't affect your rod cells the same way.
  Pro tip: Set up everything before dark. Know where your eyepieces are
  by feel, not by turning on a light.

Card 6 — Finding Jupiter & Saturn
  Both are usually the brightest "stars" that don't twinkle. Check the Sky
  page for tonight's positions. Point at the bright object, center in
  finderscope, focus — Jupiter's cloud bands are visible at 50×, Saturn's
  rings at 40×. These are the two most impressive beginner objects.
  Pro tip: Check the Sky page in this app before going outside so you know
  exactly where to look.

---

LEVEL 2 — INTERMEDIATE ("Going Deeper")
Badge: 🔭  Color: #FFD166

Card 1 — Understanding Eyepieces
  Magnification = telescope focal length ÷ eyepiece focal length.
  Example: 1000mm telescope + 10mm eyepiece = 100× magnification.
  Lower mm eyepiece = higher magnification. But more magnification isn't
  always better — atmosphere limits useful power to roughly 50× per inch
  of aperture.
  Pro tip: A 2× Barlow lens doubles your eyepiece collection for less than
  the cost of a single good eyepiece.

Card 2 — Polar Alignment (Equatorial Mount)
  An equatorial mount compensates for Earth's rotation. To use it properly,
  align the polar axis with Polaris (North Star). 1. Loosen the altitude
  adjustment. 2. Point the polar axis toward Polaris using the polar scope
  or by sighting down the polar axis. 3. Lock in place. Now objects stay
  centered much longer as Earth rotates.
  Pro tip: Perfect polar alignment isn't needed for visual observing —
  "good enough" alignment means objects drift slowly, giving you time to observe.

Card 3 — Using a GoTo Mount
  GoTo mounts have motors and a computer. After a 2–3 star alignment, they
  can automatically slew to any of thousands of objects. Process:
  1. Level the mount. 2. Point roughly north. 3. Power on.
  4. Enter date/time/location. 5. Slew to the first alignment star it shows,
  center it in a high-power eyepiece, confirm. 6. Repeat for star 2 (and 3).
  Now type any Messier object and watch it find it automatically.
  Pro tip: Bad alignment star centering is the #1 reason GoTo fails.
  Take your time centering at high power.

Card 4 — Observing Deep Sky Objects
  Nebulas and galaxies need dark skies — get away from city lights. Use the
  lowest magnification eyepiece for the widest field. Learn "star hopping":
  navigate from a bright star to your target using star patterns as a map.
  Pro tip: "Averted vision" — look slightly to the side of a faint object.
  Your peripheral vision is more sensitive to faint light than your central
  vision.

Card 5 — Telescope Filters
  Light pollution (LPR) filter: blocks sodium streetlight wavelengths, helps
  nebulas stand out from light-polluted skies.
  Moon filter: neutral density, reduces brightness.
  O-III filter: shows emission nebulas dramatically — the Veil Nebula goes
  from invisible to stunning.
  Color filters (planetary): #21 orange enhances Jupiter's cloud belts.
  Pro tip: Filters don't help with galaxies or star clusters — they work
  best on nebulas and planets.

Card 6 — Reading a Star Chart
  Star charts show magnitude (star brightness) as dot size. Larger dot = brighter.
  The sky is a sphere — charts show a flat projection. To use: hold the chart
  above your head facing the direction you want, rotate until the horizon labels
  match. Find a bright reference star, then hop to your target.
  Pro tip: Stellarium (free app) shows the sky in real time. Use it to plan
  targets before you go outside.

---

LEVEL 3 — ADVANCED ("Serious Observer")
Badge: ⚡  Color: #38F0FF

Card 1 — Collimating a Newtonian Reflector
  Collimation = aligning the mirrors so light focuses correctly.
  Check if needed: look through the eyepiece holder (no eyepiece) at the
  secondary mirror — it should appear centered and round.
  Steps: 1. Use a collimation cap (or Cheshire eyepiece).
  2. Adjust secondary mirror tilt with the 3 screws until the primary mirror
  reflection is centered. 3. Adjust primary mirror tilt (3 screws at the
  bottom) until the reflection of the secondary appears centered in the
  primary. Takes 5 minutes once you understand it.
  Pro tip: Check collimation every session. Transporting a telescope almost
  always knocks mirrors slightly out of alignment.

Card 2 — Astrophotography Basics
  You need: a DSLR or mirrorless camera, a T-ring adapter for your telescope,
  and a remote shutter release. Start with the Moon (easy) then planets.
  For deep sky: you need tracking (equatorial mount with drive).
  Settings for planets: ISO 800–1600, 1/30 – 1/500s, shoot video, stack frames.
  For deep sky: ISO 1600–3200, 30–300 second exposures.
  Pro tip: Shoot RAW, not JPEG. You can't recover blown highlights from JPEG.

Card 3 — Image Stacking for Planets
  Video of planets through a telescope contains hundreds of frames.
  Most are blurry due to atmospheric turbulence — a few are sharp.
  Software (AutoStakkert, free) automatically selects the sharpest frames
  and stacks them into one image. Then sharpen with wavelets in RegiStax.
  Result: amateur planetary images that rival professional telescopes from
  20 years ago.
  Pro tip: Shoot at least 2000 frames. Even on a bad night, 5% will be sharp.
  That's 100 frames to stack.

Card 4 — Choosing Your Next Telescope
  Already have a 70–80mm refractor? Next step: 6–8" Dobsonian reflector —
  maximum aperture for the price, incredible views of everything.
  Want to photograph? An apochromatic (APO) refractor + equatorial GoTo mount
  is the entry point. Budget: €800–2000 for a capable imaging setup.
  Already have 8" visual scope? Consider a 10–12" Dobsonian for visual work,
  or dedicate to imaging with a dedicated astronomy camera.
  Pro tip: Visit astroman.ge for telescopes available in Georgia with local support.

Card 5 — Light Pollution & Dark Sites
  Bortle scale: 1 (pristine dark, Milky Way casts shadows) to 9 (inner city).
  Most cities are Bortle 7–8. You need Bortle 4 or better for deep sky work.
  Find dark sites at lightpollutionmap.info. In Georgia: Kazbegi, Tusheti,
  and Javakheti plateau offer Bortle 3–4 skies.
  Pro tip: Even at a dark site, wait for astronomical twilight to end
  (about 90 minutes after sunset). Nautical twilight is not dark enough.

Card 6 — Polar Alignment: Drift Method
  For astrophotography, you need precise polar alignment — the polar scope
  method isn't accurate enough. Use the drift method:
  1. Point at a star near the meridian and on the equator.
  2. Watch for N/S drift over 5 minutes.
  3. Adjust azimuth until drift stops.
  4. Point at a star in the east, watch for drift, adjust altitude.
  Repeat until drift is under 1 arcminute per minute.
  Pro tip: PHD2 (free autoguiding software) has a built-in drift alignment
  assistant that makes this much easier.

---

LEVEL 4 — PRO ("Observatory Level")
Badge: 🚀  Color: #8B5CF6

Card 1 — Autoguiding
  Autoguiding uses a second small camera watching a guide star and making
  tiny corrections to the mount motor in real-time. This is how amateurs
  take 2–3 hour exposures without star trails.
  Hardware needed: guide scope (50–80mm), guide camera (ZWO ASI120 or similar),
  computer running PHD2 (free). PHD2 calibrates automatically and keeps the
  guide star within 1–2 arcseconds for hours.
  Pro tip: Buy a dedicated guide camera, not a webcam. ZWO ASI120 Mini
  (~€100) is the industry standard for beginners.

Card 2 — Narrowband Imaging
  Narrowband filters (Ha, OIII, SII) pass only specific wavelengths emitted
  by nebulas. They work in light-polluted skies and even moonlit nights.
  Ha (hydrogen-alpha, 656nm): reveals emission nebulas in stunning detail.
  Combine Ha + OIII + SII → Hubble Palette (SHO) — the colors of Hubble images.
  Camera: a dedicated astronomy camera (cooled CMOS, e.g. ZWO ASI533MC Pro)
  outperforms DSLRs for this work.
  Pro tip: Start with a 7nm Ha filter on an uncooled camera. Even from a
  light-polluted backyard, Orion Nebula in Ha is jaw-dropping.

Card 3 — Building a Permanent Observatory
  A roll-off-roof or dome observatory eliminates 90% of setup time.
  Roll-off roof: simpler, cheaper, any telescope fits. Pier-mount the telescope
  for perfect polar alignment that never changes. Leave it polar aligned
  permanently — start imaging within 10 minutes of sunset.
  Key requirements: concrete pier (vibration isolation), power, network
  (remote control), weather station.
  Pro tip: A garden shed conversion with a cut-out roof costs under €2000
  and changes your astronomy completely. No more carrying equipment.

Card 4 — Remote & Robotic Observatories
  Services like iTelescope.net and Telescope.Live let you book time on
  professional-grade telescopes worldwide (0.4m–1m aperture) and receive
  your images by email. Per-minute billing, no equipment required.
  For astrophotographers in cloudy climates, a remote site in Spain, Chile,
  or Australia gives 200+ clear nights per year.
  Pro tip: Start with iTelescope.net's free trial. Shoot the Orion Nebula
  on a 0.5m scope from Australia and see what's actually possible.

Card 5 — Spectroscopy
  A diffraction grating attachment to your telescope splits starlight into
  a spectrum, revealing the star's chemical composition and radial velocity.
  Entry level: Star Analyzer 100 (~€200) fits any 1.25" focuser.
  You can classify stars, detect binary systems, and even measure Doppler
  shifts as stars move toward/away from Earth.
  The AAVSO Spectroscopy group welcomes amateur data — your observations
  can contribute to published science.
  Pro tip: Start by measuring the spectrum of Vega, Arcturus, and Betelgeuse
  side by side — the differences in absorption lines are stunning.

Card 6 — Contributing to Real Science
  Your telescope can do real science. Opportunities:
  Variable star monitoring (AAVSO) — track stellar brightness changes.
  Exoplanet transit photometry — measure dips as planets cross their stars.
  Asteroid occultation timing — requires only a stopwatch and good sky.
  Near-Earth asteroid tracking — reported to the Minor Planet Center.
  Pro tip: The AAVSO website has a target list of stars that need observations
  tonight. Your data fills gaps that professional telescopes can't cover.

---

Data structure:
Define the data as a const array inside the component:
type Level = 'beginner' | 'intermediate' | 'advanced' | 'pro';
interface GuideCard { level: Level; step: number; title: string; body: string; tip?: string; }

Card render:
<div className="glass-card p-4 flex flex-col gap-3">
  <div className="flex items-start gap-3">
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${levelColor}20`, color: levelColor, border: `1px solid ${levelColor}40` }}>
      {card.step}
    </span>
    <p className="text-white text-sm font-semibold leading-snug">{card.title}</p>
  </div>
  <p className="text-slate-400 text-xs leading-relaxed">{card.body}</p>
  {card.tip && (
    <div className="rounded-lg p-3 text-xs leading-relaxed"
      style={{ background: `${levelColor}08`, border: `1px solid ${levelColor}20`, color: levelColor }}>
      💡 {card.tip}
    </div>
  )}
</div>

Level selector stays sticky at the top while scrolling (position: sticky, top: 0, z-10, bg-[#070B14] py-2).

---

TESTING:
1. Open Learn page — "Telescopes" tab should appear in tab bar
2. All 4 levels should show correct number of cards (6 each = 24 total)
3. Level switcher pill should highlight selected level with level's color
4. On mobile 375px: cards should be readable, level pills should not overflow
5. "Pro tip" callouts should use the level's accent color
```

---

## LEARN-PROMPT 2 — Quiz Engine Upgrade + 2 New Quizzes

```
I'm building Stellar for Colosseum Frontier. The quiz system works but is
missing two critical things: (1) answer explanations — users get green/red
but don't learn WHY the answer is correct, and (2) we only have 3 quizzes.
For the world's best learning page, every wrong answer must be a teaching moment.

Read these files fully:
  src/components/sky/QuizActive.tsx
  src/lib/quizzes.ts

---

PART A — Add "explanation" field to QuizQuestion in src/lib/quizzes.ts

Update the interface:
  export interface QuizQuestion {
    q: { en: string; ka: string };
    options: { en: string; ka: string }[];
    correct: number;
    explanation: { en: string; ka: string };  // ← add this
  }

Add explanation to ALL existing questions. Here are the explanations:

SOLAR SYSTEM quiz explanations (in order):
1. "Our solar system has 8 planets. Pluto was reclassified as a dwarf planet in 2006 by the IAU."
2. "Jupiter is so massive that all other planets combined would still be smaller — it contains 1,300 Earths by volume."
3. "Mars gets its red color from iron oxide (rust) covering its surface and fine dust in its thin atmosphere."
4. "Mercury orbits just 57.9 million km from the Sun. A year on Mercury is only 88 Earth days."
5. "Saturn's rings are 282,000 km wide but only 10–100 meters thick — thinner proportionally than a sheet of paper."
6. "Despite not being closest to the Sun, Venus traps heat via a runaway greenhouse effect — surface is 462°C."
7. "Earth's orbital period of 365.25 days defines our calendar year. The 0.25 day is why we add a leap day every 4 years."
8. "Io, Europa, Ganymede, and Callisto were discovered by Galileo in 1610 — the first moons seen around another planet."
9. "Uranus was knocked onto its side by a massive collision early in solar system history. Its poles get 42 years of sunlight."
10. "Ganymede is larger than Mercury and has its own magnetic field — the only moon in the solar system that does."

CONSTELLATIONS quiz explanations (in order):
1. "The IAU defined 88 official constellations in 1930, dividing the entire sky so every star belongs to exactly one constellation."
2. "Sirius (Alpha Canis Majoris) shines at magnitude -1.46 — so bright it's visible in daylight with the right conditions."
3. "Polaris sits within 0.7° of the true North Celestial Pole, making it the fixed point the entire sky appears to rotate around."
4. "Hydra, the Water Snake, stretches over 100° of sky — it would take over 6 hours for it to fully rise over the horizon."
5. "Orion represents the hunter from Greek mythology. His belt of three stars (Alnitak, Alnilam, Mintaka) is one of the most recognizable patterns."
6. "Betelgeuse is a red supergiant — one of the largest stars known. Its orange-red color indicates a surface temperature of ~3,500°C, compared to our Sun's 5,500°C."
7. "The Pleiades are in Taurus the Bull. In Greek myth, they were seven sisters — one dimmed (becoming barely visible) out of grief for the fall of Troy."
8. "Proxima Centauri is just 4.24 light-years away — part of the Alpha Centauri triple star system. At Voyager's speed, it would take 73,000 years to reach."
9. "The Milky Way is a barred spiral galaxy — its bar-shaped center is clearly visible in infrared images from the Spitzer Space Telescope."
10. "The Andromeda Galaxy (M31) is in the constellation Andromeda. At 2.5 million light-years, it's the farthest object visible to the naked eye."

TELESCOPES quiz explanations (in order):
1. "Aperture is everything in a telescope — it determines how much light is collected and therefore the limit of what you can see."
2. "Reflecting telescopes (Newtonians, Cassegrains) use curved mirrors. Refracting telescopes use glass lenses. Reflectors offer more aperture per dollar."
3. "Focal length (FL) of the telescope divided by FL of the eyepiece = magnification. A 1000mm scope with a 10mm eyepiece = 100× power."
4. "A Barlow lens increases the effective focal length of the telescope, multiplying magnification of any eyepiece inserted after it."
5. "Isaac Newton built the first practical reflecting telescope in 1668. Galileo used a refractor — he never used a mirror-based scope."
6. "Focal ratio (f/ratio) tells you how 'fast' a telescope is. f/5 is fast (wide field, short exposures), f/10 is slow (narrow field, high magnification)."
7. "Equatorial GoTo mounts compensate for Earth's rotation and can track objects precisely — essential for astrophotography exposures longer than 30 seconds."
8. "A finderscope has a wide field of view (typically 6–7°) making it easy to locate the region of sky where your target is before switching to high power."
9. "After 20–30 minutes in true darkness, your pupils dilate fully and rod cells in your retina reach peak sensitivity — allowing you to see objects 100× fainter than with unadapted eyes."
10. "Shorter focal length eyepiece = higher magnification. The 4mm eyepiece on a 1000mm telescope gives 250×. The 25mm gives only 40×."

---

PART B — Update QuizActive.tsx to show explanations

In the 'feedback' phase, after the answer highlight appears, show the explanation.

Below the options list, when phase === 'feedback', add:
  <div
    className="mt-4 rounded-xl p-4 text-xs leading-relaxed animate-fade-in"
    style={{
      background: selected === q.correct
        ? 'rgba(52,211,153,0.08)'
        : 'rgba(239,68,68,0.08)',
      border: selected === q.correct
        ? '1px solid rgba(52,211,153,0.2)'
        : '1px solid rgba(239,68,68,0.2)',
      color: '#94a3b8',
    }}
  >
    <span className="font-semibold" style={{ color: selected === q.correct ? '#34d399' : '#f87171' }}>
      {selected === q.correct ? '✓ Correct — ' : '✗ Incorrect — '}
    </span>
    {q.explanation[locale]}
  </div>

Also increase the auto-advance timeout from 900ms to 2500ms when an
explanation is shown (so users have time to read it).
Change: setTimeout(..., 900) → setTimeout(..., 2500)

---

PART C — Improve the result screen in QuizActive.tsx

The current result screen shows only the final score. Add a breakdown section
showing which questions the user got right and wrong.

Add state: const [answers, setAnswers] = useState<boolean[]>([]);
In pick(): after setScore, add: setAnswers(prev => [...prev, i === q.correct]);

In the result screen, after the score/stars display, add:
  <div className="w-full mt-2">
    <div className="flex flex-wrap gap-1.5 justify-center">
      {answers.map((correct, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{
            background: correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
            border: correct ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)',
            color: correct ? '#34d399' : '#f87171',
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
    <p className="text-slate-600 text-[10px] text-center mt-2">
      {answers.filter(Boolean).length} correct · {answers.filter(b => !b).length} wrong
    </p>
  </div>

---

PART D — Add 2 new quizzes to src/lib/quizzes.ts

Add to the QUIZZES array (after the existing 3):

Quiz 4: Universe & Cosmology
  id: 'universe'
  emoji: '🌌'
  title: { en: 'Universe & Cosmology', ka: 'სამყარო და კოსმოლოგია' }
  description: { en: 'The Big Bang, black holes, dark matter — how big is everything?', ka: 'დიდი აფეთქება, შავი ხვრელები, ბნელი მატერია.' }
  starsPerCorrect: 10
  10 questions covering:
  1. Age of the universe (13.8 billion years)
  2. Speed of light (~300,000 km/s)
  3. What a light-year is (distance light travels in 1 year)
  4. What is a black hole (region where gravity so strong nothing escapes)
  5. The Big Bang — when did it happen (13.8 billion years ago)
  6. Dark matter — what percentage of universe (~27%)
  7. Number of galaxies in observable universe (~2 trillion)
  8. What is a supernova (explosion of a massive dying star)
  9. What is a neutron star (ultra-dense remnant of supernova)
  10. Hubble's discovery (universe is expanding)
  Each question: 4 options, correct index, explanation.

Quiz 5: Space Exploration
  id: 'space-exploration'
  emoji: '🚀'
  title: { en: 'Space Exploration', ka: 'კოსმოსის კვლევა' }
  description: { en: 'Rockets, astronauts, missions — the history of humanity in space.', ka: 'რაკეტები, ასტრონავტები, მისიები.' }
  starsPerCorrect: 10
  10 questions covering:
  1. First human in space (Yuri Gagarin, 1961)
  2. First Moon landing (Apollo 11, July 1969)
  3. First space station (Salyut 1, Soviet Union, 1971)
  4. Hubble Space Telescope launch year (1990)
  5. Mars rover currently operating (Perseverance, landed 2021)
  6. ISS — how many countries built it (15 countries)
  7. Voyager 1 — where is it now (interstellar space, past heliopause)
  8. SpaceX first crewed mission year (2020 — Demo-2)
  9. First woman in space (Valentina Tereshkova, 1963)
  10. James Webb Space Telescope launch year (2021)
  Each question: 4 options, correct index, explanation.

Write all 10 questions for both quizzes fully — don't use placeholders.
Include both English and Georgian for each question/option/explanation.
Georgian translations should be natural, not machine-translated.
(If Georgian is uncertain, use English for both — better than bad Georgian.)

---

TESTING:
1. Start any quiz — answer a question — explanation should appear below options
2. Answer correctly — explanation border/color should be green
3. Answer incorrectly — explanation border should be red, showing correct answer
4. Complete a quiz — result screen should show the numbered breakdown grid
5. New quizzes (Universe, Space Exploration) should appear in the Quizzes tab
6. Verify auto-advance now waits 2.5 seconds (enough to read explanation)
```

---

## LEARN-PROMPT 3 — Planets & Deep Sky Content Upgrade + Kids Mode

```
I'm building Stellar for Colosseum Frontier. The Planets and Deep Sky tabs
show good content but it's all the same density — adults and kids see
identical text. I need to: (1) add a "Kids Mode" toggle that shows simpler,
wonder-focused content, (2) enrich the planet data with more facts,
(3) expand Deep Sky from 6 to 10 objects, (4) add "Observe Tonight →" CTAs
linking to the Sky page.

Read this file fully: src/app/chat/page.tsx

---

PART A — Kids Mode toggle

Add state to LearnPage: const [kidsMode, setKidsMode] = useState(false)

In the page header, after the subtitle, add a toggle:
  <button
    onClick={() => setKidsMode(k => !k)}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all mt-3"
    style={kidsMode ? {
      background: 'rgba(255,209,102,0.15)',
      border: '1px solid rgba(255,209,102,0.4)',
      color: '#FFD166',
    } : {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#64748b',
    }}
  >
    <span>{kidsMode ? '⭐' : '🌙'}</span>
    {kidsMode
      ? (locale === 'ka' ? 'ბავშვების რეჟიმი' : 'Kids Mode ON')
      : (locale === 'ka' ? 'ჩართე ბავშვების რეჟიმი' : 'Kids Mode')}
  </button>

Pass kidsMode as a prop to PlanetsTab and DeepSkyTab.

---

PART B — Add kids content to the PLANETS data array

For each planet, add a new field:
  kidsLine: { en: string; ka: string }  // one sentence, wonder-focused, 8-12 words
  kidsFact: { en: string; ka: string }  // one amazing fact, simple language

Kids line values (en):
  moon:    "Earth's only natural satellite — we walked on it in 1969!"
  mercury: "Tiny and fast — a year here is only 88 days!"
  venus:   "It's hotter than an oven — hot enough to melt lead!"
  earth:   "Our home! The only planet with oceans, air, and life."
  mars:    "Scientists have sent 50 robots to explore this red world."
  jupiter: "One storm here (the Great Red Spot) is bigger than Earth!"
  saturn:  "Its rings are made of billions of ice and rock pieces."
  uranus:  "It rolls around the Sun on its side — like a bowling ball!"
  neptune: "Winds here blow at 2,100 km/h — the fastest in the solar system!"

In PlanetsTab, when kidsMode is true:
- Replace p.facts[locale][0] (the subtitle) with p.kidsLine[locale]
- In the expanded section, show ONLY p.kidsLine and p.kidsFact
  instead of the full facts list — keep it to 2 lines max
- Add a ⭐ emoji before the kids content block
- Keep the telescope tip section (🔭) but shorter: show only first sentence

When kidsMode is false: show the existing adult content unchanged.

---

PART C — Add "Observe Tonight →" CTA to planet expanded sections

At the bottom of each expanded planet section (for BOTH kids and adult mode),
add a small link button:
  <Link
    href="/sky"
    className="inline-flex items-center gap-1.5 text-xs font-medium mt-2 transition-opacity hover:opacity-80"
    style={{ color: p.color }}
  >
    🔭 See {p.name[locale]} in tonight's forecast →
  </Link>

Import Link from 'next/link' if not already imported.

---

PART D — Expand Deep Sky from 6 to 10 objects

Add these 4 objects to the DSO array (after the existing 6):

Object 7 — Omega Nebula (M17)
  id: 'm17', emoji: '🌊'
  name: { en: 'Omega Nebula (M17)', ka: 'ომეგა ნისლეული (M17)' }
  type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' }
  distance: { en: '5,500 light-years', ka: '5,500 სინათლის წელი' }
  color: '#f97316'
  desc en: 'One of the brightest nebulas in the sky — a cloud of glowing gas where new stars are actively forming. Shaped like a swan or the Greek letter Omega, depending on how you look at it.'
  desc ka: 'ცის ერთ-ერთი ყველაზე კაშკაში ნისლეული — გამბრწყინავი გაზის ღრუბელი, სადაც ახალი ვარსკვლავები იქმნება.'
  scope en: 'Visible in binoculars. Any telescope shows the glowing bar clearly. 150mm+ begins to reveal wispy detail.'
  scope ka: 'ბინოკლით ჩანს. ნებისმიერი ტელესკოპი კარგად აჩვენებს.'
  kidsLine: { en: "A baby star factory — hundreds of new suns being born here right now!", ka: "ვარსკვლავების სამეანო სახლი — ასობით ახალი მზე იბადება!" }

Object 8 — Whirlpool Galaxy (M51)
  id: 'm51', emoji: '🌀'
  name: { en: 'Whirlpool Galaxy (M51)', ka: 'მოქცევის გალაქტიკა (M51)' }
  type: { en: 'Interacting Galaxies', ka: 'ურთიერთმოქმედი გალაქტიკები' }
  distance: { en: '23 million light-years', ka: '23 მილიონი სინათლის წელი' }
  color: '#6366f1'
  desc en: 'Two galaxies in the process of colliding and merging. The Whirlpool is being distorted by the gravitational pull of its smaller companion (NGC 5195). Charles Messier discovered it in 1773.'
  desc ka: 'ორი გალაქტიკა, რომლებიც ერთმანეთთან შეჯახებისა და შერწყმის პროცესშია.'
  scope en: '100mm shows a faint smudge with a brighter core. 200mm+ on a dark night shows the spiral arms and the companion galaxy as a separate spot.'
  scope ka: '100 მმ აჩვენებს სუსტ ლაქას. 200 მმ+ ბნელ ღამეს ხვეული მკლავები ჩანს.'
  kidsLine: { en: "Two galaxies crashing into each other — this takes billions of years!", ka: "ორი გალაქტიკა ერთმანეთს ეჯახება — ეს მილიარდობით წელს გრძელდება!" }

Object 9 — Lagoon Nebula (M8)
  id: 'm8', emoji: '🏝️'
  name: { en: 'Lagoon Nebula (M8)', ka: 'ლაგუნა ნისლეული (M8)' }
  type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' }
  distance: { en: '4,100 light-years', ka: '4,100 სინათლის წელი' }
  color: '#ec4899'
  desc en: 'A large glowing cloud of hydrogen gas bisected by a dark dust lane that gives it the appearance of a lagoon. Home to the bright star cluster NGC 6530 — its young hot stars illuminate the surrounding gas.'
  desc ka: 'წყალბადის გაზის დიდი გამბრწყინავი ღრუბელი, რომელსაც ბნელი მტვრის ზოლი ყოფს.'
  scope en: 'Visible to the naked eye in dark skies as a brighter patch of Milky Way. Binoculars show the nebula clearly. Any telescope shows the embedded star cluster.'
  scope ka: 'ბნელ ცაზე შიშველი თვალით ჩანს. ბინოკლი კარგად აჩვენებს.'
  kidsLine: { en: "A glowing pink cloud where baby stars are being born right now!", ka: "ვარდისფერი გამბრწყინავი ღრუბელი, სადაც ვარსკვლავები იბადება!" }

Object 10 — Double Cluster (NGC 869 & 884)
  id: 'ngc869', emoji: '💎'
  name: { en: 'Double Cluster (NGC 869 & 884)', ka: 'ორმაგი გროვა (NGC 869 & 884)' }
  type: { en: 'Open Cluster Pair', ka: 'ღია გროვის წყვილი' }
  distance: { en: '7,500 light-years', ka: '7,500 სინათლის წელი' }
  color: '#38f0ff'
  desc en: 'Two spectacular open star clusters sitting side by side in Perseus. Each contains hundreds of young, hot blue-white stars. They are physically related — both formed from the same giant molecular cloud roughly 13 million years ago.'
  desc ka: 'ორი შთამბეჭდავი ღია ვარსკვლავთა გროვა პერსევსში გვერდიგვერდ. თითოეული ასობით ახალ ვარსკვლავს შეიცავს.'
  scope en: 'Magnificent in binoculars — both fit in the same field of view. A telescope at low power fills the eyepiece with sparkling stars.'
  scope ka: 'ბინოკლით შთამბეჭდავია — ორივე ერთ ხედვის ველში ჩანს. ტელესკოპი ვარსკვლავებით სავსე სანახაობას გვიჩვენებს.'
  kidsLine: { en: "Two giant star cities sitting right next to each other in space!", ka: "ორი გიგანტური ვარსკვლავთა ქალაქი კოსმოსში გვერდიგვერდ!" }

In DeepSkyTab, when kidsMode is true:
- Show obj.kidsLine instead of obj.desc in expanded section
- Add a simplified "🔭 Scope needed:" line showing just the first sentence of scope
- Keep it to 3 lines max in kids mode

---

TESTING:
1. Toggle Kids Mode ON — planet subtitles should change to simpler one-liners
2. Expand a planet in kids mode — should show only 2 lines of content
3. Expand a planet in adult mode — should show full facts list
4. All 10 deep sky objects should appear in the Deep Sky tab
5. Tap "See Jupiter in tonight's forecast →" — should navigate to /sky
6. Kids Mode toggle should persist state while switching tabs within the page
```

---

## LEARN-PROMPT 4 — Page Structure, Header, Sky Events Upgrade, Learning Path

```
I'm building Stellar for Colosseum Frontier. The Learn page needs structural
improvements: a better header showing learning progress, an upgraded Sky Events
tab with countdown timers, and a "learning path" intro that connects all sections.
This is the final polish pass to make it feel like a premium learning product.

Read this file fully: src/app/chat/page.tsx

---

PART A — Page header upgrade

Replace the existing simple h1 + subtitle with a richer header section:

<div className="flex flex-col gap-3">
  {/* Title row */}
  <div className="flex items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
        {locale === 'ka' ? 'სტელარის აკადემია' : 'Stellar Academy'}
      </h1>
      <p className="text-slate-500 text-sm mt-0.5">
        {locale === 'ka'
          ? 'ასტრონომია — დამწყებიდან პროფესიონალამდე'
          : 'Astronomy from first light to deep space'}
      </p>
    </div>
  </div>

  {/* Quick stats row — show total quizzes completed + stars earned from quizzes */}
  {completedQuizzes.length > 0 && (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="text-[#34d399]">✓</span>
        {completedQuizzes.length} {locale === 'ka' ? 'ქვიზი დასრულებული' : 'quizzes completed'}
      </span>
      <span className="text-white/10">·</span>
      <span className="text-[#FFD166]">
        ✦ {completedQuizzes.reduce((sum, r) => sum + r.stars, 0)} earned
      </span>
    </div>
  )}
</div>

Get completedQuizzes from useAppState() at the top of LearnPage.

---

PART B — Add tab icons to the tab bar

Update TAB_CONFIG with emoji icons:
  planets:    { icon: '🪐', en: 'Planets', ka: 'პლანეტები' }
  deepsky:    { icon: '🌌', en: 'Deep Sky', ka: 'ღრმა ცა' }
  telescopes: { icon: '🔭', en: 'Telescopes', ka: 'ტელესკოპები' }
  quizzes:    { icon: '🧠', en: 'Quizzes', ka: 'ქვიზები' }
  events:     { icon: '📅', en: 'Sky Events', ka: 'ცის მოვლენები' }

Tab button shows icon + label. On mobile (< sm breakpoint), show only the icon
using responsive classes:
  <span>{t.icon}</span>
  <span className="hidden sm:inline">{t[locale]}</span>

This prevents the tab bar from overflowing on 375px screens while keeping
labels visible on larger screens.

---

PART C — Sky Events tab complete redesign

The current EventsTab is a plain list. Replace it with:

1. Add a countdown for the next event at the top:

const nextEvent = upcoming[0];
if (nextEvent) show:
  <div className="glass-card p-4 border-[#FFD166]/20" style={{ boxShadow: '0 0 20px rgba(255,209,102,0.04)' }}>
    <p className="text-[10px] text-[#FFD166]/60 uppercase tracking-widest mb-2">
      {locale === 'ka' ? 'მომდევნო მოვლენა' : 'Next Up'}
    </p>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{nextEvent.emoji}</span>
        <div>
          <p className="text-white font-semibold text-sm">{nextEvent.name[locale]}</p>
          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{nextEvent.desc[locale]}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[#FFD166] text-2xl font-bold leading-none">{daysFromNow(nextEvent.date)}</p>
        <p className="text-slate-600 text-[10px] mt-0.5">{locale === 'ka' ? 'დღეში' : 'days'}</p>
      </div>
    </div>
  </div>

2. Upcoming events list (after the featured card):

For each remaining upcoming event (slice(1)):
  Use a more compact card layout:
  <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
      style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.1)' }}>
      {ev.emoji}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-medium">{ev.name[locale]}</p>
      <p className="text-slate-500 text-xs">{ev.date} · {ev.desc[locale].split('.')[0]}.</p>
    </div>
    <span className="text-[#38F0FF] text-xs font-mono flex-shrink-0">
      {daysFromNow(ev.date) === 0 ? 'Today'
       : daysFromNow(ev.date) === 1 ? 'Tomorrow'
       : `${daysFromNow(ev.date)}d`}
    </span>
  </div>

Wrap all upcoming events (from slice(1)) in a glass-card with no padding on
the container, each item having px-4:
  <div className="glass-card overflow-hidden">
    <div className="px-4">
      {upcoming.slice(1).map(ev => ...)}
    </div>
  </div>

3. Past events: collapse them behind a toggle.

Add state: const [showPast, setShowPast] = useState(false)

Replace the current past events list with:
  {past.length > 0 && (
    <button
      onClick={() => setShowPast(s => !s)}
      className="text-xs text-slate-600 flex items-center gap-1.5 hover:text-slate-400 transition-colors"
    >
      <span>{showPast ? '▲' : '▼'}</span>
      {past.length} {locale === 'ka' ? 'გასული მოვლენა' : `past event${past.length !== 1 ? 's' : ''}`}
    </button>
  )}
  {showPast && (
    <div className="flex flex-col gap-2">
      {past.map(ev => (
        <div key={ev.date} className="flex items-center gap-3 opacity-40">
          ... (compact format, grayscale)
        </div>
      ))}
    </div>
  )}

---

PART D — Add section dividers with labels between tab sections

In PlanetsTab, add a header before the list:
  <div className="flex items-center gap-2 mb-1">
    <span className="text-slate-600 text-[10px] uppercase tracking-widest">
      {locale === 'ka' ? '9 ობიექტი' : '9 objects'} · {locale === 'ka' ? 'შეეხე დეტალებისთვის' : 'tap to expand'}
    </span>
  </div>

In DeepSkyTab, add:
  <div className="flex items-center gap-2 mb-1">
    <span className="text-slate-600 text-[10px] uppercase tracking-widest">
      {locale === 'ka' ? '10 ობიექტი' : '10 objects'} · {locale === 'ka' ? 'ბინოკლიდან პროფ. ტელესკოპამდე' : 'binoculars to large telescope'}
    </span>
  </div>

---

PART E — Connect the Telescopes tab to the Marketplace

At the bottom of the Intermediate level "Choosing Your Next Telescope" card
(Card 4, already written in LEARN-P1), add a CTA link:

  <Link
    href="/marketplace"
    className="inline-flex items-center gap-1.5 text-xs font-semibold mt-2 transition-opacity hover:opacity-80"
    style={{ color: '#FFD166' }}
  >
    Browse telescopes at Astroman →
  </Link>

Import Link from 'next/link' if not already imported.

---

TESTING:
1. Open Learn page — header should show "Stellar Academy" and subtitle
2. Complete a quiz, return to Learn — header should show quiz count and stars
3. Tab icons should show on all screen sizes, labels only on sm+
4. Sky Events tab — next event should appear as featured card with day countdown
5. Past events should be hidden behind "X past events" toggle
6. In Telescopes tab > Intermediate > "Choosing Your Next Telescope" card —
   "Browse telescopes at Astroman →" link should navigate to /marketplace
7. On 375px mobile — tab bar should not overflow (icon-only on mobile)
```
