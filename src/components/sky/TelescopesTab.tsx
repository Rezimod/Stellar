'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ShoppingBag, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

type Locale = 'en' | 'ka';
type Level = 'beginner' | 'intermediate' | 'advanced' | 'pro';

interface GuideCard {
  level: Level;
  step: number;
  title: { en: string; ka: string };
  body: { en: string; ka: string };
  tip?: { en: string; ka: string };
}

// ─── Telescope Ladder (real Astroman products) ───────────────────────────────

interface LadderScope {
  id: string;
  brand: string;
  name: string;
  image: string;
  priceGEL: number;
  level: Level;
  badge: { en: string; ka: string };
  badgeColor: string;
  // Verified specs
  aperture: number;        // mm
  focalLength: number;     // mm
  type: { en: string; ka: string };
  mount: { en: string; ka: string };
  bestFor: { en: string; ka: string };
  willSee: { en: string; ka: string };
  productUrl?: string;
}

// f-ratio = focal length / aperture, max useful magnification ≈ 2× aperture in mm
const LADDER: LadderScope[] = [
  {
    id: 'scope-bresser-76-300',
    brand: 'Bresser',
    name: 'Junior 76/300 Compact',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/222.jpg',
    priceGEL: 288,
    level: 'beginner',
    badge: { en: 'Entry · Kids', ka: 'საწყისი · ბავშვებისთვის' },
    badgeColor: 'var(--success)',
    aperture: 76,
    focalLength: 300,
    type: { en: 'Newtonian reflector', ka: 'ნიუტონის რეფლექტორი' },
    mount: { en: 'Tabletop alt-azimuth', ka: 'სუფრის ალტ-აზიმუტი' },
    bestFor: { en: 'First scope for ages 7–12. Compact, light, no setup.', ka: 'პირველი ტელესკოპი 7–12 წელზე. კომპაქტური, მსუბუქი.' },
    willSee: { en: 'Moon craters in detail, Jupiter as a disc with its 4 moons, brightest star clusters.', ka: 'მთვარის კრატერები, იუპიტერი დისკოდ 4 მთვარით, კაშკაში გროვები.' },
  },
  {
    id: 'scope-bresser-50-360',
    brand: 'Bresser',
    name: 'Junior 50/360 with Tent',
    image: 'https://astroman.ge/wp-content/uploads/2022/09/22122.jpg',
    priceGEL: 399,
    level: 'beginner',
    badge: { en: 'Gift · Kids', ka: 'საჩუქარი · ბავშვებისთვის' },
    badgeColor: 'var(--success)',
    aperture: 50,
    focalLength: 360,
    type: { en: 'Refractor', ka: 'რეფრაქტორი' },
    mount: { en: 'Tripod alt-azimuth (kit + play tent)', ka: 'ფეხებიანი ალტ-აზიმუტი (კარავთან ერთად)' },
    bestFor: { en: 'Birthday gift, ages 6–10. Comes with a play tent and constellation cards.', ka: 'საჩუქარი 6–10 წლის ბავშვისთვის. კარავთან და თანავარსკვლავედების კარტებთან ერთად.' },
    willSee: { en: 'Moon craters, brightest stars and the brighter planets as small bright dots.', ka: 'მთვარე, კაშკაში ვარსკვლავები, პლანეტები წერტილებად.' },
  },
  {
    id: 'scope-natgeo-60-700',
    brand: 'National Geographic',
    name: '60/700 AZ',
    image: 'https://astroman.ge/wp-content/uploads/2025/11/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    priceGEL: 779,
    level: 'beginner',
    badge: { en: 'Family scope', ka: 'საოჯახო' },
    badgeColor: 'var(--seafoam)',
    aperture: 60,
    focalLength: 700,
    type: { en: 'Refractor (achromat)', ka: 'რეფრაქტორი' },
    mount: { en: 'Full-height alt-az tripod', ka: 'სრული ფეხებიანი ალტ-აზიმუტი' },
    bestFor: { en: 'First "real" telescope. Slow f/11.7 = sharp views of bright targets.', ka: 'პირველი "ნამდვილი" ტელესკოპი. ნელი f/11.7 = მკვეთრი ხედი.' },
    willSee: { en: 'Lunar craters in fine detail, Venus phases, Jupiter\'s cloud belts, Saturn\'s rings clearly.', ka: 'მთვარის კრატერები დეტალურად, ვენერას ფაზები, იუპიტერის ღრუბლების ზოლები, სატურნის რგოლები.' },
  },
  {
    id: 'scope-natgeo-76-700',
    brand: 'National Geographic',
    name: '76/700 Reflector',
    image: 'https://astroman.ge/wp-content/uploads/2024/08/0144181_national-geographic-114900-reflector-telescope-az_550.jpeg',
    priceGEL: 788,
    level: 'beginner',
    badge: { en: 'More aperture', ka: 'მეტი ობიექტივი' },
    badgeColor: 'var(--seafoam)',
    aperture: 76,
    focalLength: 700,
    type: { en: 'Newtonian reflector', ka: 'ნიუტონის რეფლექტორი' },
    mount: { en: 'Alt-azimuth tripod', ka: 'ალტ-აზიმუტური ფეხები' },
    bestFor: { en: 'Step-up beginner who wants to see deep-sky objects, not just planets.', ka: 'შემდეგი ნაბიჯი — ვისაც ღრმა ცაც სურს, არა მხოლოდ პლანეტები.' },
    willSee: { en: 'Everything the 60/700 sees, plus the Orion Nebula, Pleiades star cluster, brighter Messier objects.', ka: 'ყველაფერი, რასაც 60/700, პლუს ორიონის ნისლეული, პლეიადები, კაშკაში მესიერი ობიექტები.' },
  },
  {
    id: 'scope-bresser-venus-76-700',
    brand: 'Bresser',
    name: 'Venus 76/700 AZ',
    image: 'https://astroman.ge/wp-content/uploads/2025/12/2221.jpg',
    priceGEL: 998,
    level: 'beginner',
    badge: { en: 'Quality build', ka: 'ხარისხიანი' },
    badgeColor: 'var(--stars)',
    aperture: 76,
    focalLength: 700,
    type: { en: 'Newtonian reflector', ka: 'ნიუტონის რეფლექტორი' },
    mount: { en: 'Steady alt-az tripod', ka: 'მყარი ალტ-აზიმუტური სამფეხა' },
    bestFor: { en: 'Bresser-built optics with a steadier mount. Ages 12 to adult.', ka: 'Bresser-ის ოპტიკა მყარ სამფეხზე. 12 წლიდან მოზრდილებამდე.' },
    willSee: { en: 'Same targets as the NatGeo 76/700 but with a more stable image at higher magnification.', ka: 'იგივე სამიზნეები, მაგრამ უფრო სტაბილური სურათი მაღალი გადიდებისას.' },
  },
  {
    id: 'scope-foreseen-80',
    brand: 'Foreseen',
    name: '80mm Refractor',
    image: 'https://astroman.ge/wp-content/uploads/2024/08/Telescope.jpg',
    priceGEL: 856,
    level: 'intermediate',
    badge: { en: 'Wide field', ka: 'ფართო ველი' },
    badgeColor: 'var(--stars)',
    aperture: 80,
    focalLength: 400,
    type: { en: 'Refractor (short tube)', ka: 'რეფრაქტორი (მოკლემილიანი)' },
    mount: { en: 'Lightweight alt-az', ka: 'მსუბუქი ალტ-აზიმუტი' },
    bestFor: { en: 'Travel scope and rich-field viewer. Easy to take to dark skies.', ka: 'სამოგზაურო ტელესკოპი. მარტივი წასაღებია ბნელ ცაში.' },
    willSee: { en: 'Wide views of the Milky Way, large nebulae, big star fields. Less magnification on planets.', ka: 'ფართო ხედი ირმის ნახტომზე, დიდი ნისლეულები. პლანეტებზე ნაკლები გადიდება.' },
  },
  {
    id: 'scope-celestron-70az',
    brand: 'Celestron',
    name: 'AstroMaster 70AZ',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/23312.jpg',
    priceGEL: 1258,
    level: 'intermediate',
    badge: { en: 'Quality starter', ka: 'ხარისხიანი დასაწყისი' },
    badgeColor: 'var(--terracotta)',
    aperture: 70,
    focalLength: 900,
    type: { en: 'Refractor (achromat)', ka: 'რეფრაქტორი' },
    mount: { en: 'Manual alt-az with slow-motion controls', ka: 'მექანიკური ალტ-აზიმუტი' },
    bestFor: { en: 'Celestron quality at a reachable price. Ships with 20mm + 10mm eyepieces and a StarPointer red-dot finder.', ka: 'Celestron-ის ხარისხი ხელმისაწვდომ ფასად. 20მმ + 10მმ ოკულარი და StarPointer-ი მოყვება.' },
    willSee: { en: 'Sharp views of the Moon, Saturn\'s rings, Jupiter\'s belts and Galilean moons, Mars surface markings during opposition.', ka: 'მკვეთრი მთვარე, სატურნის რგოლები, იუპიტერის ზოლები და გალილეური მთვარეები, მარსის ზედაპირი ოპოზიციისას.' },
  },
  {
    id: 'scope-nexstar-90slt',
    brand: 'Celestron',
    name: 'NexStar 90SLT',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/1222.jpg',
    priceGEL: 2660,
    level: 'advanced',
    badge: { en: 'GoTo · Computerized', ka: 'GoTo · კომპიუტერული' },
    badgeColor: 'var(--terracotta)',
    aperture: 90,
    focalLength: 1250,
    type: { en: 'Maksutov-Cassegrain', ka: 'მაკსუტოვ-კასეგრენი' },
    mount: { en: 'Single-arm motorized GoTo alt-az', ka: 'მოტორიზებული GoTo ალტ-აზიმუტი' },
    bestFor: { en: 'Beginner with budget who wants to find anything. Auto-aligns and tracks 4,000+ objects from a hand controller.', ka: 'დამწყები მეტი ბიუჯეტით. ავტომატურად ასწორებს და ადევნებს 4,000+ ობიექტს.' },
    willSee: { en: 'Long focal length excels on planets and the Moon. Auto-tracking lets you keep Saturn centered for 30+ minutes.', ka: 'გრძელი ფოკუსი — შესანიშნავია პლანეტებზე. ავტომატური ადევნება სატურნს ცენტრში ინარჩუნებს.' },
  },
  {
    id: 'scope-starsense-dx6',
    brand: 'Celestron',
    name: 'StarSense Explorer DX 6"',
    image: 'https://astroman.ge/wp-content/uploads/2025/09/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    priceGEL: 3998,
    level: 'advanced',
    badge: { en: 'Phone-guided 6"', ka: 'ტელეფონით ნავიგირებული 6"' },
    badgeColor: 'var(--terracotta)',
    aperture: 150,
    focalLength: 750,
    type: { en: 'Newtonian reflector', ka: 'ნიუტონის რეფლექტორი' },
    mount: { en: 'Manual alt-az with phone cradle (StarSense plate-solving)', ka: 'მექანიკური ალტ-აზიმუტი ტელეფონის სლოტით' },
    bestFor: { en: 'Top of the ladder. 150mm aperture finds galaxies and faint nebulae; the StarSense app turns your phone into a finder.', ka: 'ლადერის თავი. 150მმ ობიექტივი ხედავს გალაქტიკებს, StarSense აპი ტელეფონს საძიებო ხელსაწყოდ აქცევს.' },
    willSee: { en: 'Andromeda Galaxy structure, Whirlpool Galaxy, Ring Nebula, dozens of Messier objects from a dark site.', ka: 'ანდრომედას სტრუქტურა, ვორტუნი, რგოლის ნისლეული, ათობით მესიერი ობიექტი ბნელ ცაზე.' },
  },
];

function fmtPrice(gel: number, locale: Locale): string {
  return locale === 'ka' ? `₾${gel.toLocaleString('en-US')}` : `₾${gel.toLocaleString('en-US')}`;
}

function fRatio(focal: number, aperture: number): string {
  const r = focal / aperture;
  return `f/${r >= 10 ? r.toFixed(0) : r.toFixed(1)}`;
}

function maxUseful(aperture: number): number {
  return Math.round(aperture * 2);
}

function TelescopeLadder({ locale }: { locale: Locale }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-text-primary text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
            {locale === 'ka' ? 'ტელესკოპის კიბე' : 'The Telescope Ladder'}
          </p>
          <p className="text-text-muted text-[10px] mt-0.5">
            {locale === 'ka'
              ? `${LADDER.length} მოდელი · 50მმ-დან 150მმ-მდე · ხელმისაწვდომი Astroman-ში`
              : `${LADDER.length} models · 50mm to 150mm · in stock at Astroman`}
          </p>
        </div>
        <Link
          href="/marketplace"
          className="text-[11px] font-medium inline-flex items-center gap-1 hover:opacity-80 flex-shrink-0"
          style={{ color: 'var(--stars)' }}
        >
          <ShoppingBag size={11} />
          {locale === 'ka' ? 'მაღაზია' : 'Shop'}
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        {LADDER.map((s, i) => {
          const isOpen = openId === s.id;
          const fr = fRatio(s.focalLength, s.aperture);
          const max = maxUseful(s.aperture);

          return (
            <div
              key={s.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isOpen ? `${s.badgeColor}40` : 'rgba(255,255,255,0.08)'}`,
                transition: 'border-color 200ms ease',
              }}
            >
              {/* Summary row — always visible */}
              <button
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="w-full flex items-stretch text-left"
              >
                {/* Step number + image */}
                <div className="relative flex-shrink-0" style={{ width: 92, minHeight: 92 }}>
                  <div className="absolute top-1.5 left-1.5 z-[1] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'rgba(7,11,20,0.7)', color: 'var(--text-primary)', backdropFilter: 'blur(4px)' }}>
                    {i + 1}
                  </div>
                  <Image
                    src={s.image}
                    alt={`${s.brand} ${s.name}`}
                    fill
                    className="object-cover"
                    sizes="92px"
                  />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">
                      {s.brand}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `${s.badgeColor}18`,
                        color: s.badgeColor,
                        border: `1px solid ${s.badgeColor}30`,
                      }}
                    >
                      {s.badge[locale]}
                    </span>
                  </div>
                  <p className="text-text-primary font-semibold text-sm leading-tight">
                    {s.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                    <span className="text-text-primary">{s.aperture}mm</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{fr}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">≤{max}×</span>
                  </div>
                </div>

                {/* Price + chevron */}
                <div className="flex flex-col items-end justify-between p-3 flex-shrink-0">
                  <p className="text-[var(--terracotta)] font-bold text-sm">{fmtPrice(s.priceGEL, locale)}</p>
                  {isOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="px-3 pb-3 pt-0 flex flex-col gap-2.5 border-t border-white/[0.05]">
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[9px] uppercase tracking-widest text-text-muted">
                        {locale === 'ka' ? 'ტიპი' : 'Type'}
                      </p>
                      <p className="text-text-primary text-[11px] mt-0.5">{s.type[locale]}</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[9px] uppercase tracking-widest text-text-muted">
                        {locale === 'ka' ? 'სამაგრი' : 'Mount'}
                      </p>
                      <p className="text-text-primary text-[11px] mt-0.5">{s.mount[locale]}</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[9px] uppercase tracking-widest text-text-muted">
                        {locale === 'ka' ? 'ფოკუსი' : 'Focal length'}
                      </p>
                      <p className="text-text-primary text-[11px] mt-0.5 font-mono">{s.focalLength}mm</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[9px] uppercase tracking-widest text-text-muted">
                        {locale === 'ka' ? 'მაქს. გადიდება' : 'Max useful'}
                      </p>
                      <p className="text-text-primary text-[11px] mt-0.5 font-mono">≈ {max}×</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-text-muted mb-0.5">
                      {locale === 'ka' ? 'ვისთვის' : 'Best for'}
                    </p>
                    <p className="text-text-primary text-xs leading-relaxed">{s.bestFor[locale]}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-text-muted mb-0.5">
                      {locale === 'ka' ? 'რას ნახავ' : 'What you\'ll see'}
                    </p>
                    <p className="text-text-primary text-xs leading-relaxed">{s.willSee[locale]}</p>
                  </div>
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: `${s.badgeColor}15`, border: `1px solid ${s.badgeColor}30`, color: s.badgeColor }}
                  >
                    <ShoppingBag size={12} />
                    {locale === 'ka' ? 'მაღაზიაში ნახვა →' : 'View at Astroman →'}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl p-3 flex items-start gap-2 mt-1"
        style={{ background: 'rgba(255, 209, 102,0.04)', border: '1px solid rgba(255, 209, 102,0.12)' }}
      >
        <Sparkles size={12} style={{ color: 'var(--stars)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-text-muted text-[11px] leading-relaxed">
          {locale === 'ka'
            ? 'წესი: მაქსიმალური სასარგებლო გადიდება ≈ 2 × ობიექტივი მმ-ში. 70მმ ტელესკოპი 140×-ზე ჩერდება — კოლოფზე დაწერილი 525× მარკეტინგია.'
            : 'Rule of thumb: max useful magnification ≈ 2× aperture in mm. A 70mm scope tops out at ~140× — the "525×" on the box is marketing.'}
        </p>
      </div>
    </section>
  );
}

// ─── Level guide ─────────────────────────────────────────────────────────────

const LEVEL_CONFIG: { id: Level; label: { en: string; ka: string }; badge: string; color: string; subtitle: { en: string; ka: string } }[] = [
  { id: 'beginner',     label: { en: 'Beginner',     ka: 'დამწყები' },     badge: '🌱', color: 'var(--success)',    subtitle: { en: 'First Light',         ka: 'პირველი ხედი' } },
  { id: 'intermediate', label: { en: 'Intermediate', ka: 'საშუალო' },      badge: '🔭', color: 'var(--stars)',      subtitle: { en: 'Going Deeper',        ka: 'უფრო ღრმად' } },
  { id: 'advanced',     label: { en: 'Advanced',     ka: 'მოწინავე' },     badge: '⚡', color: 'var(--terracotta)', subtitle: { en: 'Serious Observer',    ka: 'სერიოზული დამკვირვებელი' } },
  { id: 'pro',          label: { en: 'Pro',          ka: 'პროფესიონალი' }, badge: '🚀', color: 'var(--terracotta)', subtitle: { en: 'Observatory Level',   ka: 'ობსერვატორიის დონე' } },
];

const GUIDE_CARDS: GuideCard[] = [
  // ─── BEGINNER ───────────────────────────────────────────────────────────────
  {
    level: 'beginner', step: 1,
    title: { en: 'Unboxing Your First Telescope',   ka: 'პირველი ტელესკოპის გახსნა' },
    body:  { en: 'What to expect: the tube (or truss), the mount/tripod, 2 eyepieces (usually 10mm + 25mm), a finderscope, and an accessory tray. Don\'t panic — it looks like a lot, but assembly takes 10 minutes.',
             ka: 'რა გელოდება: მილი, სამაგრი/სამფეხა, 2 ოკულარი (ჩვეულებრივ 10მმ + 25მმ), საძიებო სკოპი და აქსესუარების თარო. ფანიკა არ აქვს — აწყობას 10 წუთი სჭირდება.' },
    tip:   { en: 'Keep ALL packaging. If anything is wrong, you\'ll need it to return.',
             ka: 'შეინახე ყველა შეფუთვა. რამე თუ არასწორია, დაბრუნებისთვის დაგჭირდება.' },
  },
  {
    level: 'beginner', step: 2,
    title: { en: 'Assembly: Attach the Tube', ka: 'აწყობა: მილის დამაგრება' },
    body:  { en: '1. Set up the tripod on flat, stable ground. 2. Attach the mount head (alt-az or equatorial) by tightening the central bolt. 3. Slide the telescope tube onto the mount saddle plate and tighten the clamp. 4. Attach the finderscope on its bracket. Don\'t overtighten — snug is enough.',
             ka: '1. სამფეხა ბრტყელ მიწაზე დადგი. 2. სამაგრი თავი მიამაგრე ცენტრალური ჭანჭიკით. 3. მილი გაასრიალე საუნაგირო ფირფიტაზე და დააჭირე. 4. საძიებო სკოპი დააფიქსირე. ზედმეტად ნუ დაჭერ — საკმარისია მჭიდრო.' },
    tip:   { en: 'Do your first assembly indoors in daylight, not in a dark field.',
             ka: 'პირველად სახლში დღისით ააწყვე, არა ღამე ბნელ მინდორზე.' },
  },
  {
    level: 'beginner', step: 3,
    title: { en: 'Inserting an Eyepiece', ka: 'ოკულარის ჩასმა' },
    body:  { en: 'Loosen the eyepiece holder thumbscrew. Insert the 25mm eyepiece (wider field, easier to find things). Tighten gently. Start with your lowest magnification eyepiece — it gives the widest view and makes objects easiest to find.',
             ka: 'ოკულარის ხრახნი გაუშვი. ჩასვი 25მმ ოკულარი (ფართო ველი). მსუბუქად დააჭირე. დაიწყე ყველაზე დაბალი გადიდებით — ფართო ხედი, ადვილია ობიექტის პოვნა.' },
    tip:   { en: 'Never touch the glass of an eyepiece. Hold it by the barrel.',
             ka: 'არასოდეს არ შეეხო ოკულარის შუშას. დაიჭირე მილის ნაწილში.' },
  },
  {
    level: 'beginner', step: 4,
    title: { en: 'Your First Target: The Moon', ka: 'პირველი სამიზნე: მთვარე' },
    body:  { en: 'The Moon is the perfect first object. Point the telescope roughly at it using the tube sight. Look through the finderscope to center it. Then look through the eyepiece and slowly adjust the focuser until craters appear sharp.',
             ka: 'მთვარე შესანიშნავი პირველი სამიზნეა. მიმართე ტელესკოპი მისკენ. საძიებო სკოპით ცენტრში მოაქციე. შემდეგ ოკულარით — ფოკუსი ნელა შეცვალე კრატერების მკვეთრი ხედვისთვის.' },
    tip:   { en: 'The Moon is so bright it can be harsh. A Moon filter (cheap, worth it) makes the view comfortable and reveals more detail.',
             ka: 'მთვარე ისე კაშკაშია, რომ თვალს სტკივა. მთვარის ფილტრი (იაფი, ღირს) კომფორტულს ხდის ხედვას.' },
  },
  {
    level: 'beginner', step: 5,
    title: { en: 'Dark Adaptation', ka: 'სიბნელეზე ადაპტაცია' },
    body:  { en: 'Your eyes need 20–30 minutes in darkness to reach full night vision. ONE white light destroys it instantly. Use a red flashlight only — red light doesn\'t affect your rod cells the same way.',
             ka: 'თვალებს 20–30 წუთი სჭირდება სიბნელეში სრული ღამის ხედვისთვის. ერთი თეთრი სინათლე მყისიერად ანადგურებს მას. იყენე მხოლოდ წითელი ფანარი.' },
    tip:   { en: 'Set up everything before dark. Know where your eyepieces are by feel, not by turning on a light.',
             ka: 'ყველაფერი ბნელამდე მოამზადე. ოკულარების ადგილი ხელით იცოდე, სინათლის ჩართვის გარეშე.' },
  },
  {
    level: 'beginner', step: 6,
    title: { en: 'Finding Jupiter & Saturn', ka: 'იუპიტერისა და სატურნის პოვნა' },
    body:  { en: 'Both are usually the brightest "stars" that don\'t twinkle. Check the Sky page for tonight\'s positions. Point at the bright object, center in finderscope, focus — Jupiter\'s cloud bands are visible at 50×, Saturn\'s rings at 40×. These are the two most impressive beginner objects.',
             ka: 'ორივე ჩვეულებრივ ყველაზე კაშკაში "ვარსკვლავია" რომელიც არ ციმციმებს. შეამოწმე Sky გვერდი. იუპიტერის ღრუბლები 50×-ზე, სატურნის რგოლები 40×-ზე ჩანს.' },
    tip:   { en: 'Check the Sky page in this app before going outside so you know exactly where to look.',
             ka: 'გასვლამდე შეამოწმე Sky გვერდი ამ აპში, რომ ზუსტად იცოდე სად უნდა იყურო.' },
  },
  {
    level: 'beginner', step: 7,
    title: { en: 'Levelling the Tripod', ka: 'სამფეხის გასწორება' },
    body:  { en: 'A wobbly tripod ruins the view at any magnification. Pick the flattest spot you can find — concrete, paving stones, or hard-packed earth. Extend the inner leg sections rather than the lower flared ones (they\'re sturdier). Hang your accessory tray or a weight from the centre column to dampen vibrations. Check level — most tripod heads have a built-in bubble level.',
             ka: 'არამდგრადი სამფეხი ნებისმიერ გადიდებაზე აფუჭებს ხედვას. იპოვე ყველაზე ბრტყელი ადგილი. გამოიყენე შიდა ფეხების სექცია (უფრო მყარია). თარო ან წონა ცენტრალურ ბოძზე ჩამოკიდე ვიბრაციის ჩასახშობად.' },
    tip:   { en: 'Stand on grass instead of decking. Wooden decks transmit footsteps straight into the eyepiece.',
             ka: 'დადექი ბალახზე და არა ხის იატაკზე. ხე ფეხის ნაბიჯებს პირდაპირ ოკულარში გადასცემს.' },
  },
  {
    level: 'beginner', step: 8,
    title: { en: 'Aligning Your Finderscope', ka: 'საძიებო სკოპის გასწორება' },
    body:  { en: 'Do this in DAYLIGHT before your first night. Aim the telescope at a distant object 500m+ away (a chimney, a streetlight, a mountain peak). Centre it in the main eyepiece using the lowest-power eyepiece. Then look through the finderscope and turn the 2 or 3 alignment screws until the same object is centred in the crosshairs. Now both will point at the same place at night.',
             ka: 'გააკეთე დღისით ღამის სესიამდე. მიმართე ტელესკოპი შორეულ ობიექტზე (500მ+). ცენტრში მოიყვანე მთავარ ოკულარში. შემდეგ საძიებო სკოპით — გამასწორე ხრახნებით ისე, რომ იგივე ობიექტი ცენტრში იყოს. ახლა ორივე ერთსა და იმავე ადგილს მიუთითებს.' },
    tip:   { en: 'A misaligned finder is the #1 reason beginners "can\'t find anything." Spend 5 minutes on this once and the whole hobby gets easier.',
             ka: 'არასწორად გასწორებული საძიებო — №1 მიზეზი, რის გამოც დამწყები ვერაფერს პოულობს. 5 წუთი ერთხელ — და ყველაფერი გამარტივდება.' },
  },
  {
    level: 'beginner', step: 9,
    title: { en: 'Focusing the Image', ka: 'სურათის ფოკუსირება' },
    body:  { en: 'Most beginners over-focus or never reach focus at all. Aim at a bright star. Slowly turn the focuser knob in ONE direction — you\'ll see a fuzzy disc shrink to a point, then expand again. The sharpest moment is the focus point. If you ran out of inward travel, you may need to remove a Barlow or extension tube. Refocus every time you swap an eyepiece.',
             ka: 'უმეტესობა დამწყები ან ზედმეტად აფოკუსებს ან ვერ აღწევს ფოკუსს. მიმართე კაშკაშ ვარსკვლავზე. ნელა აბრუნე ფოკუსის ხელსაწყო ერთი მიმართულებით — ბუნდოვანი დისკი წერტილად შეიკუმშება, შემდეგ ისევ გაიზრდება. ყველაზე მკვეთრი მომენტი ფოკუსის წერტილია. ყოველ ოკულარის გამოცვლისას ხელახლა დააფოკუსე.' },
    tip:   { en: 'A Bahtinov mask (cheap accessory) gives you a star pattern that snaps into perfect focus — far easier than guessing.',
             ka: 'ბახტინოვის ნიღაბი (იაფი) გვაძლევს ნიმუშს, რომელიც სრულყოფილ ფოკუსზე ცხადად ჩნდება.' },
  },
  {
    level: 'beginner', step: 10,
    title: { en: 'Let the Telescope Cool Down', ka: 'მიეცი ტელესკოპს გაცივების დრო' },
    body:  { en: 'A warm telescope brought outside into cold air looks like it\'s under water — heat shimmer rises off the optics for 20–45 minutes. Set the telescope outside (cap on, in a safe spot) at least 30 minutes before observing. Larger reflectors (8"+) can need an hour. The bigger the aperture, the longer the cooldown.',
             ka: 'თბილი ტელესკოპი გარეთ ცივ ჰაერში წყალქვეშ მოყოფილს ჰგავს — სითბოს ცხავი ოპტიკიდან 20–45 წუთი ადის. დააყენე ტელესკოპი გარეთ მინიმუმ 30 წუთით ადრე. დიდი რეფლექტორებს (8"+) საათი სჭირდებათ.' },
    tip:   { en: 'Store the telescope in an unheated garage, shed, or balcony if possible — it\'s already at outdoor temperature.',
             ka: 'შეინახე ტელესკოპი გათბობის გარეშე ფარდულში, ან აივანზე — ის უკვე გარე ტემპერატურაზე იქნება.' },
  },
  {
    level: 'beginner', step: 11,
    title: { en: 'My Image Looks Bad — Why?', ka: 'რატომ ჩანს ცუდად?' },
    body:  { en: 'Most "bad scope" complaints are something else: 1) Trying too high magnification (start at 30–50×, never jump to max). 2) Not focused yet — turn the knob slowly. 3) Heat shimmer from buildings, roads, or the telescope itself. 4) Dirty eyepiece (don\'t touch glass). 5) Looking through a window — never works. 6) Bad seeing tonight (check the Sky page). Move outside, lower the magnification, and refocus.',
             ka: 'უმეტესობა "ცუდი ტელესკოპის" საჩივარი სხვა რამეა: 1) ზედმეტად მაღალი გადიდება (დაიწყე 30–50×-დან). 2) ჯერ არ არის ფოკუსში. 3) სითბოს ცხავი შენობებიდან. 4) ბინძური ოკულარი. 5) ფანჯრიდან ცქერა — არასოდეს მუშაობს. 6) ცუდი ხილვადობა.' },
    tip:   { en: 'Rule of thumb: maximum useful magnification ≈ 2× your aperture in mm. A 70mm scope tops out around 140×, no matter what the box claims.',
             ka: 'წესი: მაქსიმალური სასარგებლო გადიდება ≈ 2× შენი ობიექტივი მმ-ში. 70მმ — 140×-ზე ჩერდება, კოლოფზე რაც არ უნდა ეწეროს.' },
  },
  {
    level: 'beginner', step: 12,
    title: { en: 'Cleaning, Care & Storage', ka: 'წმენდა, მოვლა, შენახვა' },
    body:  { en: 'Less is more. NEVER touch optics with fingers or fabric. Dust on a lens or mirror barely affects the view — leave it. If you must clean: blow with a rubber bulb blower first, then dab (don\'t wipe) with a dedicated optics cleaning solution and lint-free wipe. Store with all caps on, in a dry place. Avoid rapid temperature swings (don\'t bring a cold scope into a hot humid house — condensation will form).',
             ka: 'ნაკლები მეტია. არასოდეს არ შეეხო ოპტიკას თითებით. მტვერი ლინზაზე თითქმის არ ცვლის ხედვას. თუ მაინც ასუფთავებ — ჯერ რეზინის შამფურით უბერე, შემდეგ ოპტიკის სითხით. შეინახე ხუფებით, მშრალ ადგილას.' },
    tip:   { en: 'Open the back of a Newtonian for 30 minutes after a session to let the inside dry before sealing the cap.',
             ka: 'სესიის შემდეგ ნიუტონის უკანა მხარე 30 წუთით გახსენი, რომ შიგნით გაშრეს.' },
  },
  {
    level: 'beginner', step: 13,
    title: { en: 'Transporting the Telescope', ka: 'ტელესკოპის გადატანა' },
    body:  { en: 'A 70–90mm refractor fits in any car back seat. A Dobsonian splits in two — the tube and the rocker box — and both fit easily in a hatchback. Always carry the tube horizontally with both hands; don\'t lift it by the focuser. Re-check the finderscope alignment if you\'ve driven on rough roads. Foam-lined cases protect optics during transport.',
             ka: '70–90მმ რეფრაქტორი ნებისმიერ მანქანაში ეტევა. დობსონიანი ორად იყოფა. ყოველთვის ორი ხელით აიღე ჰორიზონტალურად. ცუდი გზის შემდეგ შეამოწმე საძიებო სკოპის გასწორება.' },
    tip:   { en: 'Wrap eyepieces in a small soft bag in your pocket — don\'t leave them rolling loose in the car.',
             ka: 'ოკულარები ჩაიწყვე რბილ ჩანთაში ჯიბეში — არ დატოვო მანქანაში თავისუფლად.' },
  },

  // ─── INTERMEDIATE ────────────────────────────────────────────────────────────
  {
    level: 'intermediate', step: 1,
    title: { en: 'Understanding Eyepieces', ka: 'ოკულარების გაგება' },
    body:  { en: 'Magnification = telescope focal length ÷ eyepiece focal length. Example: 1000mm telescope + 10mm eyepiece = 100× magnification. Lower mm eyepiece = higher magnification. But more magnification isn\'t always better — atmosphere limits useful power to roughly 50× per inch of aperture.',
             ka: 'გადიდება = ტელესკოპის ფოკუსი ÷ ოკულარის ფოკუსი. მაგ: 1000მმ + 10მმ = 100×. ნაკლები მმ = მეტი გადიდება. მაგრამ მეტი ყოველთვის უკეთესი არ არის — ატმოსფერო ზღუდავს ~50×-ით ინჩზე.' },
    tip:   { en: 'A 2× Barlow lens doubles your eyepiece collection for less than the cost of a single good eyepiece.',
             ka: '2× ბარლოვის ლინზა აორმაგებს ოკულარების კოლექციას ერთი კარგი ოკულარის ფასად.' },
  },
  {
    level: 'intermediate', step: 2,
    title: { en: 'Polar Alignment (Equatorial Mount)', ka: 'პოლარული გასწორება (ეკვატორიული)' },
    body:  { en: 'An equatorial mount compensates for Earth\'s rotation. To use it properly, align the polar axis with Polaris (North Star). 1. Loosen the altitude adjustment. 2. Point the polar axis toward Polaris using the polar scope or by sighting down the polar axis. 3. Lock in place. Now objects stay centered much longer as Earth rotates.',
             ka: 'ეკვატორიული სამაგრი დედამიწის ბრუნვას ანაზღაურებს. პოლარული ღერძი მიმართე პოლარისზე. 1. გაუშვი ალტიტუდი. 2. მიმართე პოლარისზე. 3. ჩაკეტე. ახლა ობიექტები ცენტრში გრძელ დროს რჩებიან.' },
    tip:   { en: 'Perfect polar alignment isn\'t needed for visual observing — "good enough" alignment means objects drift slowly, giving you time to observe.',
             ka: 'სრულყოფილი გასწორება ვიზუალურისთვის არ არის საჭირო — "საკმარისი" გასწორება საკმარისია.' },
  },
  {
    level: 'intermediate', step: 3,
    title: { en: 'Using a GoTo Mount', ka: 'GoTo სამაგრის გამოყენება' },
    body:  { en: 'GoTo mounts have motors and a computer. After a 2–3 star alignment, they can automatically slew to any of thousands of objects. Process: 1. Level the mount. 2. Point roughly north. 3. Power on. 4. Enter date/time/location. 5. Slew to the first alignment star it shows, center it in a high-power eyepiece, confirm. 6. Repeat for star 2 (and 3). Now type any Messier object and watch it find it automatically.',
             ka: 'GoTo სამაგრებს ძრავები და კომპიუტერი აქვთ. 2–3 ვარსკვლავის გასწორების შემდეგ ავტომატურად პოულობენ ნებისმიერს. პროცესი: გაასწორე → გადაიხედე ჩრდილოეთით → ჩართე → შეიყვანე თარიღი/დრო/ადგილი → გასწორება ვარსკვლავებზე → დაიწყე ძებნა.' },
    tip:   { en: 'Bad alignment star centering is the #1 reason GoTo fails. Take your time centering at high power.',
             ka: 'ცუდად გაცენტრება №1 მიზეზია, რის გამოც GoTo უშედეგოა. ნუ ჩქარობ.' },
  },
  {
    level: 'intermediate', step: 4,
    title: { en: 'Observing Deep Sky Objects', ka: 'ღრმა ცის დაკვირვება' },
    body:  { en: 'Nebulas and galaxies need dark skies — get away from city lights. Use the lowest magnification eyepiece for the widest field. Learn "star hopping": navigate from a bright star to your target using star patterns as a map.',
             ka: 'ნისლეულებსა და გალაქტიკებს ბნელი ცა სჭირდებათ — წახვედი ქალაქის შუქებიდან. ისწავლე "ვარსკვლავთა ხტომა": კაშკაშ ვარსკვლავიდან სამიზნემდე ვარსკვლავთა ნიმუშების მიხედვით.' },
    tip:   { en: '"Averted vision" — look slightly to the side of a faint object. Your peripheral vision is more sensitive to faint light than your central vision.',
             ka: '"გვერდითი ხედვა" — შეხედე ოდნავ გვერდით სუსტ ობიექტს. პერიფერიული ხედვა უფრო მგრძნობიარეა.' },
  },
  {
    level: 'intermediate', step: 5,
    title: { en: 'Telescope Filters', ka: 'ტელესკოპის ფილტრები' },
    body:  { en: 'Light pollution (LPR) filter: blocks sodium streetlight wavelengths, helps nebulas stand out from light-polluted skies. Moon filter: neutral density, reduces brightness. O-III filter: shows emission nebulas dramatically — the Veil Nebula goes from invisible to stunning. Color filters (planetary): #21 orange enhances Jupiter\'s cloud belts.',
             ka: 'სინათლის დაბინძურების ფილტრი ბლოკავს ქუჩის ნათურის ტალღებს. მთვარის ფილტრი ამცირებს კაშკაშს. O-III ფილტრი — ნისლეულებს დრამატულად აჩვენებს. ფერადი ფილტრები — პლანეტებზე #21 ნარინჯისფერი იუპიტერის ზოლებს აძლიერებს.' },
    tip:   { en: 'Filters don\'t help with galaxies or star clusters — they work best on nebulas and planets.',
             ka: 'ფილტრები არ შველის გალაქტიკებს ან ვარსკვლავთა გროვებს.' },
  },
  {
    level: 'intermediate', step: 6,
    title: { en: 'Reading a Star Chart', ka: 'ცის რუკის წაკითხვა' },
    body:  { en: 'Star charts show magnitude (star brightness) as dot size. Larger dot = brighter. The sky is a sphere — charts show a flat projection. To use: hold the chart above your head facing the direction you want, rotate until the horizon labels match. Find a bright reference star, then hop to your target.',
             ka: 'რუკები ვარსკვლავთა სიკაშკაშეს წერტილების ზომით აჩვენებენ. დიდი წერტილი = კაშკაში. ცა სფეროა, რუკა ბრტყელი პროექციაა. გამოყენება: ზემოთ ასწიე, აბრუნე ჰორიზონტის ლეიბლების შესაბამისად.' },
    tip:   { en: 'Stellarium (free app) shows the sky in real time. Use it to plan targets before you go outside.',
             ka: 'Stellarium (უფასო აპი) რეალურ დროში აჩვენებს ცას. გამოიყენე გასვლამდე.' },
  },

  // ─── ADVANCED ────────────────────────────────────────────────────────────────
  {
    level: 'advanced', step: 1,
    title: { en: 'Collimating a Newtonian Reflector', ka: 'ნიუტონის რეფლექტორის კოლიმაცია' },
    body:  { en: 'Collimation = aligning the mirrors so light focuses correctly. Check if needed: look through the eyepiece holder (no eyepiece) at the secondary mirror — it should appear centered and round. Steps: 1. Use a collimation cap (or Cheshire eyepiece). 2. Adjust secondary mirror tilt with the 3 screws until the primary mirror reflection is centered. 3. Adjust primary mirror tilt (3 screws at the bottom) until the reflection of the secondary appears centered in the primary. Takes 5 minutes once you understand it.',
             ka: 'კოლიმაცია = სარკეების გასწორება. შეამოწმე: ოკულარის ნახვრეტიდან (ოკულარის გარეშე) მეორე სარკე უნდა იყოს ცენტრში და მრგვალი. ნაბიჯები: 1. კოლიმაციის ხუფი ან Cheshire ოკულარი. 2. მეორე სარკის დახრა 3 ხრახნით. 3. პირველი სარკის დახრა ბოლო ხრახნებით.' },
    tip:   { en: 'Check collimation every session. Transporting a telescope almost always knocks mirrors slightly out of alignment.',
             ka: 'შეამოწმე ყოველ სესიაზე. გადატანა თითქმის ყოველთვის ცვლის გასწორებას.' },
  },
  {
    level: 'advanced', step: 2,
    title: { en: 'Astrophotography Basics', ka: 'ასტროფოტოგრაფიის საფუძვლები' },
    body:  { en: 'You need: a DSLR or mirrorless camera, a T-ring adapter for your telescope, and a remote shutter release. Start with the Moon (easy) then planets. For deep sky: you need tracking (equatorial mount with drive). Settings for planets: ISO 800–1600, 1/30 – 1/500s, shoot video, stack frames. For deep sky: ISO 1600–3200, 30–300 second exposures.',
             ka: 'გჭირდება: DSLR ან mirrorless კამერა, T-რგოლი ადაპტერი, დისტანციური ჩამშვები. დაიწყე მთვარით → პლანეტებით → ღრმა ცა. ღრმა ცისთვის: ეკვატორიული სამაგრი მძრავი. პარამეტრები: პლანეტები — ISO 800–1600, ვიდეო. ღრმა ცა — ISO 1600–3200, 30–300 წმ ექსპოზიცია.' },
    tip:   { en: 'Shoot RAW, not JPEG. You can\'t recover blown highlights from JPEG.',
             ka: 'გადიღე RAW, არა JPEG. JPEG-ს ვერ აღადგენ.' },
  },
  {
    level: 'advanced', step: 3,
    title: { en: 'Image Stacking for Planets', ka: 'პლანეტების კადრების დასტა' },
    body:  { en: 'Video of planets through a telescope contains hundreds of frames. Most are blurry due to atmospheric turbulence — a few are sharp. Software (AutoStakkert, free) automatically selects the sharpest frames and stacks them into one image. Then sharpen with wavelets in RegiStax. Result: amateur planetary images that rival professional telescopes from 20 years ago.',
             ka: 'პლანეტების ვიდეო ასეულობით კადრს შეიცავს. უმეტესობა ბუნდოვანია — რამდენიმე მკვეთრია. AutoStakkert (უფასო) ავტომატურად ირჩევს ყველაზე მკვეთრებს და აკავშირებს. RegiStax-ით აფერადებ.' },
    tip:   { en: 'Shoot at least 2000 frames. Even on a bad night, 5% will be sharp. That\'s 100 frames to stack.',
             ka: 'გადიღე მინიმუმ 2000 კადრი. ცუდ ღამეშიც 5% მკვეთრი იქნება — 100 კადრი დასტისთვის.' },
  },
  {
    level: 'advanced', step: 4,
    title: { en: 'Choosing Your Next Telescope', ka: 'შემდეგი ტელესკოპის არჩევა' },
    body:  { en: 'Already have a 70–80mm refractor? Next step: 6–8" Dobsonian reflector — maximum aperture for the price, incredible views of everything. Want to photograph? An apochromatic (APO) refractor + equatorial GoTo mount is the entry point. Budget: €800–2000 for a capable imaging setup. Already have 8" visual scope? Consider a 10–12" Dobsonian for visual work, or dedicate to imaging with a dedicated astronomy camera.',
             ka: 'უკვე გაქვს 70–80მმ რეფრაქტორი? შემდეგი: 6–8" დობსონიანი — მაქსიმალური ობიექტივი ფასისთვის. ფოტოგრაფია? APO რეფრაქტორი + ეკვატორიული GoTo. ბიუჯეტი: €800–2000.' },
    tip:   { en: 'Visit astroman.ge for telescopes available in Georgia with local support.',
             ka: 'ეწვიე astroman.ge-ს — ხელმისაწვდომი ტელესკოპები საქართველოში ადგილობრივი მხარდაჭერით.' },
  },
  {
    level: 'advanced', step: 5,
    title: { en: 'Light Pollution & Dark Sites', ka: 'სინათლის დაბინძურება და ბნელი ადგილები' },
    body:  { en: 'Bortle scale: 1 (pristine dark, Milky Way casts shadows) to 9 (inner city). Most cities are Bortle 7–8. You need Bortle 4 or better for deep sky work. Find dark sites at lightpollutionmap.info. In Georgia: Kazbegi, Tusheti, and Javakheti plateau offer Bortle 3–4 skies.',
             ka: 'ბორტლის სკალა: 1 (პრისტინული) — 9 (ცენტრალური ქალაქი). ქალაქები ჩვეულებრივ 7–8. ღრმა ცისთვის სჭირდება 4 ან უკეთესი. საქართველოში: ყაზბეგი, თუშეთი, ჯავახეთის პლატო — ბორტლი 3–4.' },
    tip:   { en: 'Even at a dark site, wait for astronomical twilight to end (about 90 minutes after sunset). Nautical twilight is not dark enough.',
             ka: 'ბნელ ადგილზეც დაელოდე ასტრონომიული ბინდის დასრულებას (~90 წთ მზის ჩასვლის შემდეგ).' },
  },
  {
    level: 'advanced', step: 6,
    title: { en: 'Polar Alignment: Drift Method', ka: 'პოლარული გასწორება: დრიფტის მეთოდი' },
    body:  { en: 'For astrophotography, you need precise polar alignment — the polar scope method isn\'t accurate enough. Use the drift method: 1. Point at a star near the meridian and on the equator. 2. Watch for N/S drift over 5 minutes. 3. Adjust azimuth until drift stops. 4. Point at a star in the east, watch for drift, adjust altitude. Repeat until drift is under 1 arcminute per minute.',
             ka: 'ასტროფოტოგრაფიისთვის ზუსტი გასწორება. პოლარული სკოპი ვერ აკმაყოფილებს. დრიფტის მეთოდი: მიმართე ვარსკვლავზე → 5 წთ დააკვირდი დრიფტს → გაასწორე → გაიმეორე.' },
    tip:   { en: 'PHD2 (free autoguiding software) has a built-in drift alignment assistant that makes this much easier.',
             ka: 'PHD2 (უფასო) ჩაშენებული დრიფტის ასისტენტი აქვს.' },
  },

  // ─── PRO ─────────────────────────────────────────────────────────────────────
  {
    level: 'pro', step: 1,
    title: { en: 'Autoguiding', ka: 'ავტოგაიდინგი' },
    body:  { en: 'Autoguiding uses a second small camera watching a guide star and making tiny corrections to the mount motor in real-time. This is how amateurs take 2–3 hour exposures without star trails. Hardware needed: guide scope (50–80mm), guide camera (ZWO ASI120 or similar), computer running PHD2 (free). PHD2 calibrates automatically and keeps the guide star within 1–2 arcseconds for hours.',
             ka: 'ავტოგაიდინგი — დამხმარე კამერა აკვირდება გაიდ ვარსკვლავს და ცვლის სამაგრის ძრავს რეალურ დროში. ასე იღებენ 2–3 საათიან ექსპოზიციებს. გაიდ სკოპი (50–80მმ), კამერა (ZWO ASI120), PHD2 (უფასო).' },
    tip:   { en: 'Buy a dedicated guide camera, not a webcam. ZWO ASI120 Mini (~€130) is the industry standard for beginners.',
             ka: 'იყიდე სპეციალური გაიდ კამერა, არა ვებკამერა. ZWO ASI120 Mini (~€130) სტანდარტია.' },
  },
  {
    level: 'pro', step: 2,
    title: { en: 'Narrowband Imaging', ka: 'ვიწროზოლიანი იმეჯინგი' },
    body:  { en: 'Narrowband filters (Ha, OIII, SII) pass only specific wavelengths emitted by nebulas. They work in light-polluted skies and even moonlit nights. Ha (hydrogen-alpha, 656nm): reveals emission nebulas in stunning detail. Combine Ha + OIII + SII → Hubble Palette (SHO) — the colors of Hubble images. Camera: a dedicated astronomy camera (cooled CMOS, e.g. ZWO ASI533MC Pro) outperforms DSLRs for this work.',
             ka: 'ვიწროზოლიანი ფილტრები (Ha, OIII, SII) მხოლოდ კონკრეტულ ტალღას ატარებენ. მუშაობენ დაბინძურებულ ცაშიც. Ha (656ნმ) — ნისლეულებს დეტალურად აჩვენებს. SHO ფერის სქემა = ჰაბლის ფერები.' },
    tip:   { en: 'Start with a 7nm Ha filter on an uncooled camera. Even from a light-polluted backyard, Orion Nebula in Ha is jaw-dropping.',
             ka: 'დაიწყე 7ნმ Ha ფილტრით. დაბინძურებული ეზოდანაც ორიონის ნისლეული Ha-ში გასაოცარია.' },
  },
  {
    level: 'pro', step: 3,
    title: { en: 'Building a Permanent Observatory', ka: 'მუდმივი ობსერვატორიის აშენება' },
    body:  { en: 'A roll-off-roof or dome observatory eliminates 90% of setup time. Roll-off roof: simpler, cheaper, any telescope fits. Pier-mount the telescope for perfect polar alignment that never changes. Leave it polar aligned permanently — start imaging within 10 minutes of sunset. Key requirements: concrete pier (vibration isolation), power, network (remote control), weather station.',
             ka: 'მუდმივი ობსერვატორია 90%-ით ამცირებს დროს. გასახსნელი სახურავი — მარტივი, იაფი. ბეტონის ბურჯი — მუდმივი პოლარული გასწორება. გჭირდება: ბურჯი, ელექტროენერგია, ქსელი, ამინდის სადგური.' },
    tip:   { en: 'A garden shed conversion with a cut-out roof costs under €2000 and changes your astronomy completely. No more carrying equipment.',
             ka: 'ბაღის ფარდულის გადაკეთება გასახსნელი სახურავით ღირს €2000-ზე ნაკლები — სრულიად ცვლის ჰობის.' },
  },
  {
    level: 'pro', step: 4,
    title: { en: 'Remote & Robotic Observatories', ka: 'დისტანციური ობსერვატორიები' },
    body:  { en: 'Services like iTelescope.net and Telescope.Live let you book time on professional-grade telescopes worldwide (0.4m–1m aperture) and receive your images by email. Per-minute billing, no equipment required. For astrophotographers in cloudy climates, a remote site in Spain, Chile, or Australia gives 200+ clear nights per year.',
             ka: 'iTelescope.net და Telescope.Live გაძლევენ პროფესიონალური ტელესკოპის დაჯავშნას (0.4–1მ). ღრუბლიანი კლიმატისთვის — დისტანციური ადგილი ესპანეთში, ჩილეში 200+ ნათელი ღამე წელიწადში.' },
    tip:   { en: 'Start with iTelescope.net\'s free trial. Shoot the Orion Nebula on a 0.5m scope from Australia and see what\'s actually possible.',
             ka: 'დაიწყე iTelescope.net-ის უფასო ცდით. გადიღე ორიონი 0.5მ ტელესკოპით ავსტრალიიდან.' },
  },
  {
    level: 'pro', step: 5,
    title: { en: 'Spectroscopy', ka: 'სპექტროსკოპია' },
    body:  { en: 'A diffraction grating attachment to your telescope splits starlight into a spectrum, revealing the star\'s chemical composition and radial velocity. Entry level: Star Analyzer 100 (~€200) fits any 1.25" focuser. You can classify stars, detect binary systems, and even measure Doppler shifts as stars move toward/away from Earth. The AAVSO Spectroscopy group welcomes amateur data — your observations can contribute to published science.',
             ka: 'დიფრაქციული ბადე ვარსკვლავის სინათლეს სპექტრად ჰყოფს — ავლენს ქიმიურ შემადგენლობას. საწყისი: Star Analyzer 100 (~€200). შეგიძლია კლასიფიცირება, ორმაგი ვარსკვლავების გამოვლენა, დოპლერის ეფექტი.' },
    tip:   { en: 'Start by measuring the spectrum of Vega, Arcturus, and Betelgeuse side by side — the differences in absorption lines are stunning.',
             ka: 'დაიწყე ვეგას, არქტურუსის და ბეთელგეიზის სპექტრის გაზომვით.' },
  },
  {
    level: 'pro', step: 6,
    title: { en: 'Contributing to Real Science', ka: 'რეალური მეცნიერების წვლილი' },
    body:  { en: 'Your telescope can do real science. Opportunities: Variable star monitoring (AAVSO) — track stellar brightness changes. Exoplanet transit photometry — measure dips as planets cross their stars. Asteroid occultation timing — requires only a stopwatch and good sky. Near-Earth asteroid tracking — reported to the Minor Planet Center.',
             ka: 'შენი ტელესკოპი რეალურ მეცნიერებაში დაგეხმარება. ცვლადი ვარსკვლავები (AAVSO), ექსოპლანეტების ტრანზიტი, ასტეროიდების ოკულტაცია, ახლომდებარე ასტეროიდების ადევნება.' },
    tip:   { en: 'The AAVSO website has a target list of stars that need observations tonight. Your data fills gaps that professional telescopes can\'t cover.',
             ka: 'AAVSO საიტს აქვს ვარსკვლავების სია, ვინც ამაღამ დაკვირვებას ითხოვს.' },
  },
];

export default function TelescopesTab() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'ka' ? 'ka' : 'en';
  const [level, setLevel] = useState<Level>('beginner');

  const activeConfig = LEVEL_CONFIG.find(l => l.id === level)!;
  const cards = GUIDE_CARDS.filter(c => c.level === level);

  return (
    <div className="flex flex-col gap-5">
      <TelescopeLadder locale={locale} />

      <div className="border-t border-white/[0.06]" />

      <div>
        <p className="text-text-primary text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
          {locale === 'ka' ? 'სახელმძღვანელო დონის მიხედვით' : 'Field Guide by Level'}
        </p>
        <p className="text-text-muted text-[10px] mt-0.5">
          {locale === 'ka' ? 'პირველი ხედვიდან მუდმივ ობსერვატორიამდე' : 'From first light to a permanent observatory'}
        </p>
      </div>

      {/* Level selector — sticky */}
      <div
        className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide"
        style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--canvas)', paddingTop: '4px' }}
      >
        {LEVEL_CONFIG.map(l => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all duration-200"
            style={level === l.id ? {
              background: l.color,
              color: 'var(--canvas)',
              border: 'none',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
            }}
          >
            <span>{l.badge}</span>
            <span>{l.label[locale]}</span>
          </button>
        ))}
      </div>

      {/* Level header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{activeConfig.badge}</span>
        <div>
          <p className="text-text-primary text-sm font-semibold">{activeConfig.label[locale]}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: activeConfig.color + '99' }}>
            {activeConfig.subtitle[locale]}
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
              <p className="text-text-primary text-sm font-semibold leading-snug">{card.title[locale]}</p>
            </div>
            <p className="text-text-muted text-xs leading-relaxed">{card.body[locale]}</p>
            {card.tip && (
              <div
                className="rounded-lg p-3 text-xs leading-relaxed"
                style={{
                  background: `${activeConfig.color}08`,
                  border: `1px solid ${activeConfig.color}20`,
                  color: activeConfig.color,
                }}
              >
                💡 {card.tip[locale]}
              </div>
            )}
            {level === 'intermediate' && card.step === 4 && (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--stars)' }}
              >
                {locale === 'ka' ? 'ნახე ტელესკოპები Astroman-ში →' : 'Browse telescopes at Astroman →'}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
