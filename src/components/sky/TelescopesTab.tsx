'use client';

import { useState } from 'react';

type Level = 'beginner' | 'intermediate' | 'advanced' | 'pro';

interface GuideCard {
  level: Level;
  step: number;
  title: string;
  body: string;
  tip?: string;
}

const LEVEL_CONFIG: { id: Level; label: string; badge: string; color: string; subtitle: string }[] = [
  { id: 'beginner',     label: 'Beginner',     badge: '🌱', color: '#34d399', subtitle: 'First Light' },
  { id: 'intermediate', label: 'Intermediate', badge: '🔭', color: '#FFD166', subtitle: 'Going Deeper' },
  { id: 'advanced',     label: 'Advanced',     badge: '⚡', color: '#38F0FF', subtitle: 'Serious Observer' },
  { id: 'pro',          label: 'Pro',          badge: '🚀', color: '#8B5CF6', subtitle: 'Observatory Level' },
];

const GUIDE_CARDS: GuideCard[] = [
  // ─── BEGINNER ───────────────────────────────────────────────────────────────
  {
    level: 'beginner', step: 1,
    title: 'Unboxing Your First Telescope',
    body: 'What to expect: the tube (or truss), the mount/tripod, 2 eyepieces (usually 10mm + 25mm), a finderscope, and an accessory tray. Don\'t panic — it looks like a lot, but assembly takes 10 minutes.',
    tip: 'Keep ALL packaging. If anything is wrong, you\'ll need it to return.',
  },
  {
    level: 'beginner', step: 2,
    title: 'Assembly: Attach the Tube',
    body: '1. Set up the tripod on flat, stable ground. 2. Attach the mount head (alt-az or equatorial) by tightening the central bolt. 3. Slide the telescope tube onto the mount saddle plate and tighten the clamp. 4. Attach the finderscope on its bracket. Don\'t overtighten — snug is enough.',
    tip: 'Do your first assembly indoors in daylight, not in a dark field.',
  },
  {
    level: 'beginner', step: 3,
    title: 'Inserting an Eyepiece',
    body: 'Loosen the eyepiece holder thumbscrew. Insert the 25mm eyepiece (wider field, easier to find things). Tighten gently. Start with your lowest magnification eyepiece — it gives the widest view and makes objects easiest to find.',
    tip: 'Never touch the glass of an eyepiece. Hold it by the barrel.',
  },
  {
    level: 'beginner', step: 4,
    title: 'Your First Target: The Moon',
    body: 'The Moon is the perfect first object. Point the telescope roughly at it using the tube sight. Look through the finderscope to center it. Then look through the eyepiece and slowly adjust the focuser until craters appear sharp.',
    tip: 'The Moon is so bright it can be harsh. A Moon filter (cheap, worth it) makes the view comfortable and reveals more detail.',
  },
  {
    level: 'beginner', step: 5,
    title: 'Dark Adaptation',
    body: 'Your eyes need 20–30 minutes in darkness to reach full night vision. ONE white light destroys it instantly. Use a red flashlight only — red light doesn\'t affect your rod cells the same way.',
    tip: 'Set up everything before dark. Know where your eyepieces are by feel, not by turning on a light.',
  },
  {
    level: 'beginner', step: 6,
    title: 'Finding Jupiter & Saturn',
    body: 'Both are usually the brightest "stars" that don\'t twinkle. Check the Sky page for tonight\'s positions. Point at the bright object, center in finderscope, focus — Jupiter\'s cloud bands are visible at 50×, Saturn\'s rings at 40×. These are the two most impressive beginner objects.',
    tip: 'Check the Sky page in this app before going outside so you know exactly where to look.',
  },

  // ─── INTERMEDIATE ────────────────────────────────────────────────────────────
  {
    level: 'intermediate', step: 1,
    title: 'Understanding Eyepieces',
    body: 'Magnification = telescope focal length ÷ eyepiece focal length. Example: 1000mm telescope + 10mm eyepiece = 100× magnification. Lower mm eyepiece = higher magnification. But more magnification isn\'t always better — atmosphere limits useful power to roughly 50× per inch of aperture.',
    tip: 'A 2× Barlow lens doubles your eyepiece collection for less than the cost of a single good eyepiece.',
  },
  {
    level: 'intermediate', step: 2,
    title: 'Polar Alignment (Equatorial Mount)',
    body: 'An equatorial mount compensates for Earth\'s rotation. To use it properly, align the polar axis with Polaris (North Star). 1. Loosen the altitude adjustment. 2. Point the polar axis toward Polaris using the polar scope or by sighting down the polar axis. 3. Lock in place. Now objects stay centered much longer as Earth rotates.',
    tip: 'Perfect polar alignment isn\'t needed for visual observing — "good enough" alignment means objects drift slowly, giving you time to observe.',
  },
  {
    level: 'intermediate', step: 3,
    title: 'Using a GoTo Mount',
    body: 'GoTo mounts have motors and a computer. After a 2–3 star alignment, they can automatically slew to any of thousands of objects. Process: 1. Level the mount. 2. Point roughly north. 3. Power on. 4. Enter date/time/location. 5. Slew to the first alignment star it shows, center it in a high-power eyepiece, confirm. 6. Repeat for star 2 (and 3). Now type any Messier object and watch it find it automatically.',
    tip: 'Bad alignment star centering is the #1 reason GoTo fails. Take your time centering at high power.',
  },
  {
    level: 'intermediate', step: 4,
    title: 'Observing Deep Sky Objects',
    body: 'Nebulas and galaxies need dark skies — get away from city lights. Use the lowest magnification eyepiece for the widest field. Learn "star hopping": navigate from a bright star to your target using star patterns as a map.',
    tip: '"Averted vision" — look slightly to the side of a faint object. Your peripheral vision is more sensitive to faint light than your central vision.',
  },
  {
    level: 'intermediate', step: 5,
    title: 'Telescope Filters',
    body: 'Light pollution (LPR) filter: blocks sodium streetlight wavelengths, helps nebulas stand out from light-polluted skies. Moon filter: neutral density, reduces brightness. O-III filter: shows emission nebulas dramatically — the Veil Nebula goes from invisible to stunning. Color filters (planetary): #21 orange enhances Jupiter\'s cloud belts.',
    tip: 'Filters don\'t help with galaxies or star clusters — they work best on nebulas and planets.',
  },
  {
    level: 'intermediate', step: 6,
    title: 'Reading a Star Chart',
    body: 'Star charts show magnitude (star brightness) as dot size. Larger dot = brighter. The sky is a sphere — charts show a flat projection. To use: hold the chart above your head facing the direction you want, rotate until the horizon labels match. Find a bright reference star, then hop to your target.',
    tip: 'Stellarium (free app) shows the sky in real time. Use it to plan targets before you go outside.',
  },

  // ─── ADVANCED ────────────────────────────────────────────────────────────────
  {
    level: 'advanced', step: 1,
    title: 'Collimating a Newtonian Reflector',
    body: 'Collimation = aligning the mirrors so light focuses correctly. Check if needed: look through the eyepiece holder (no eyepiece) at the secondary mirror — it should appear centered and round. Steps: 1. Use a collimation cap (or Cheshire eyepiece). 2. Adjust secondary mirror tilt with the 3 screws until the primary mirror reflection is centered. 3. Adjust primary mirror tilt (3 screws at the bottom) until the reflection of the secondary appears centered in the primary. Takes 5 minutes once you understand it.',
    tip: 'Check collimation every session. Transporting a telescope almost always knocks mirrors slightly out of alignment.',
  },
  {
    level: 'advanced', step: 2,
    title: 'Astrophotography Basics',
    body: 'You need: a DSLR or mirrorless camera, a T-ring adapter for your telescope, and a remote shutter release. Start with the Moon (easy) then planets. For deep sky: you need tracking (equatorial mount with drive). Settings for planets: ISO 800–1600, 1/30 – 1/500s, shoot video, stack frames. For deep sky: ISO 1600–3200, 30–300 second exposures.',
    tip: 'Shoot RAW, not JPEG. You can\'t recover blown highlights from JPEG.',
  },
  {
    level: 'advanced', step: 3,
    title: 'Image Stacking for Planets',
    body: 'Video of planets through a telescope contains hundreds of frames. Most are blurry due to atmospheric turbulence — a few are sharp. Software (AutoStakkert, free) automatically selects the sharpest frames and stacks them into one image. Then sharpen with wavelets in RegiStax. Result: amateur planetary images that rival professional telescopes from 20 years ago.',
    tip: 'Shoot at least 2000 frames. Even on a bad night, 5% will be sharp. That\'s 100 frames to stack.',
  },
  {
    level: 'advanced', step: 4,
    title: 'Choosing Your Next Telescope',
    body: 'Already have a 70–80mm refractor? Next step: 6–8" Dobsonian reflector — maximum aperture for the price, incredible views of everything. Want to photograph? An apochromatic (APO) refractor + equatorial GoTo mount is the entry point. Budget: €800–2000 for a capable imaging setup. Already have 8" visual scope? Consider a 10–12" Dobsonian for visual work, or dedicate to imaging with a dedicated astronomy camera.',
    tip: 'Visit astroman.ge for telescopes available in Georgia with local support.',
  },
  {
    level: 'advanced', step: 5,
    title: 'Light Pollution & Dark Sites',
    body: 'Bortle scale: 1 (pristine dark, Milky Way casts shadows) to 9 (inner city). Most cities are Bortle 7–8. You need Bortle 4 or better for deep sky work. Find dark sites at lightpollutionmap.info. In Georgia: Kazbegi, Tusheti, and Javakheti plateau offer Bortle 3–4 skies.',
    tip: 'Even at a dark site, wait for astronomical twilight to end (about 90 minutes after sunset). Nautical twilight is not dark enough.',
  },
  {
    level: 'advanced', step: 6,
    title: 'Polar Alignment: Drift Method',
    body: 'For astrophotography, you need precise polar alignment — the polar scope method isn\'t accurate enough. Use the drift method: 1. Point at a star near the meridian and on the equator. 2. Watch for N/S drift over 5 minutes. 3. Adjust azimuth until drift stops. 4. Point at a star in the east, watch for drift, adjust altitude. Repeat until drift is under 1 arcminute per minute.',
    tip: 'PHD2 (free autoguiding software) has a built-in drift alignment assistant that makes this much easier.',
  },

  // ─── PRO ─────────────────────────────────────────────────────────────────────
  {
    level: 'pro', step: 1,
    title: 'Autoguiding',
    body: 'Autoguiding uses a second small camera watching a guide star and making tiny corrections to the mount motor in real-time. This is how amateurs take 2–3 hour exposures without star trails. Hardware needed: guide scope (50–80mm), guide camera (ZWO ASI120 or similar), computer running PHD2 (free). PHD2 calibrates automatically and keeps the guide star within 1–2 arcseconds for hours.',
    tip: 'Buy a dedicated guide camera, not a webcam. ZWO ASI120 Mini (~€100) is the industry standard for beginners.',
  },
  {
    level: 'pro', step: 2,
    title: 'Narrowband Imaging',
    body: 'Narrowband filters (Ha, OIII, SII) pass only specific wavelengths emitted by nebulas. They work in light-polluted skies and even moonlit nights. Ha (hydrogen-alpha, 656nm): reveals emission nebulas in stunning detail. Combine Ha + OIII + SII → Hubble Palette (SHO) — the colors of Hubble images. Camera: a dedicated astronomy camera (cooled CMOS, e.g. ZWO ASI533MC Pro) outperforms DSLRs for this work.',
    tip: 'Start with a 7nm Ha filter on an uncooled camera. Even from a light-polluted backyard, Orion Nebula in Ha is jaw-dropping.',
  },
  {
    level: 'pro', step: 3,
    title: 'Building a Permanent Observatory',
    body: 'A roll-off-roof or dome observatory eliminates 90% of setup time. Roll-off roof: simpler, cheaper, any telescope fits. Pier-mount the telescope for perfect polar alignment that never changes. Leave it polar aligned permanently — start imaging within 10 minutes of sunset. Key requirements: concrete pier (vibration isolation), power, network (remote control), weather station.',
    tip: 'A garden shed conversion with a cut-out roof costs under €2000 and changes your astronomy completely. No more carrying equipment.',
  },
  {
    level: 'pro', step: 4,
    title: 'Remote & Robotic Observatories',
    body: 'Services like iTelescope.net and Telescope.Live let you book time on professional-grade telescopes worldwide (0.4m–1m aperture) and receive your images by email. Per-minute billing, no equipment required. For astrophotographers in cloudy climates, a remote site in Spain, Chile, or Australia gives 200+ clear nights per year.',
    tip: 'Start with iTelescope.net\'s free trial. Shoot the Orion Nebula on a 0.5m scope from Australia and see what\'s actually possible.',
  },
  {
    level: 'pro', step: 5,
    title: 'Spectroscopy',
    body: 'A diffraction grating attachment to your telescope splits starlight into a spectrum, revealing the star\'s chemical composition and radial velocity. Entry level: Star Analyzer 100 (~€200) fits any 1.25" focuser. You can classify stars, detect binary systems, and even measure Doppler shifts as stars move toward/away from Earth. The AAVSO Spectroscopy group welcomes amateur data — your observations can contribute to published science.',
    tip: 'Start by measuring the spectrum of Vega, Arcturus, and Betelgeuse side by side — the differences in absorption lines are stunning.',
  },
  {
    level: 'pro', step: 6,
    title: 'Contributing to Real Science',
    body: 'Your telescope can do real science. Opportunities: Variable star monitoring (AAVSO) — track stellar brightness changes. Exoplanet transit photometry — measure dips as planets cross their stars. Asteroid occultation timing — requires only a stopwatch and good sky. Near-Earth asteroid tracking — reported to the Minor Planet Center.',
    tip: 'The AAVSO website has a target list of stars that need observations tonight. Your data fills gaps that professional telescopes can\'t cover.',
  },
];

export default function TelescopesTab() {
  const [level, setLevel] = useState<Level>('beginner');

  const activeConfig = LEVEL_CONFIG.find(l => l.id === level)!;
  const cards = GUIDE_CARDS.filter(c => c.level === level);

  return (
    <div className="flex flex-col gap-4">
      {/* Level selector — sticky */}
      <div
        className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide"
        style={{ position: 'sticky', top: 0, zIndex: 10, background: '#070B14', paddingTop: '4px' }}
      >
        {LEVEL_CONFIG.map(l => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all duration-200"
            style={level === l.id ? {
              background: l.color,
              color: '#070B14',
              border: 'none',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b',
            }}
          >
            <span>{l.badge}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* Level header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{activeConfig.badge}</span>
        <div>
          <p className="text-white text-sm font-semibold">{activeConfig.label}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: activeConfig.color + '99' }}>
            {activeConfig.subtitle}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {cards.map(card => (
          <div key={card.step} className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                style={{
                  background: `${activeConfig.color}20`,
                  color: activeConfig.color,
                  border: `1px solid ${activeConfig.color}40`,
                }}
              >
                {card.step}
              </span>
              <p className="text-white text-sm font-semibold leading-snug">{card.title}</p>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{card.body}</p>
            {card.tip && (
              <div
                className="rounded-lg p-3 text-xs leading-relaxed"
                style={{
                  background: `${activeConfig.color}08`,
                  border: `1px solid ${activeConfig.color}20`,
                  color: activeConfig.color,
                }}
              >
                💡 {card.tip}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
