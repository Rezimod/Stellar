'use client';

import { useState } from 'react';
import BackButton from '@/components/shared/BackButton';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAppState } from '@/hooks/useAppState';
import { QUIZZES, type QuizDef } from '@/lib/quizzes';
import QuizActive from '@/components/sky/QuizActive';
import TelescopesTab from '@/components/sky/TelescopesTab';
import TonightsBanner from '@/components/learn/TonightsBanner';
import { PLANETS, DSO, CONSTELLATIONS, ALL_EVENTS, daysFromNow, type Locale } from '@/lib/learn-data';

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'guide' | 'telescopes';

// ─── Tab content components ───────────────────────────────────────────────────

function PlanetsTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest">
          {locale === 'ka' ? '9 ობიექტი' : '9 objects'} · {locale === 'ka' ? 'შეეხე დეტალებისთვის' : 'tap to expand'}
        </span>
      </div>
      {PLANETS.map(p => (
        <button
          key={p.key}
          onClick={() => setExpanded(expanded === p.key ? null : p.key)}
          className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative"
              style={{ border: `1px solid ${p.color}40` }}>
              <Image
                src={p.img}
                alt={p.name['en']}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="flex-1">
              {(p.key === 'moon' || p.key === 'jupiter') && (
                <span className="inline-block mb-0.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest"
                  style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.2)', color: '#FFD166' }}>
                  ★ {locale === 'ka' ? 'საუკეთესო პირველი სამიზნე' : 'Best First Target'}
                </span>
              )}
              <p className="text-white font-semibold text-sm">{p.name[locale]}</p>
              <p className="text-slate-500 text-xs">{kidsMode ? p.kidsLine[locale] : p.facts[locale][0]}</p>
            </div>
            <span className="text-slate-600 text-xs ml-2">{expanded === p.key ? '▲' : '▼'}</span>
          </div>
          {expanded === p.key && (
            <div className="mt-4 flex flex-col gap-3" style={{ paddingLeft: '52px' }}>
              <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                <Image
                  src={p.img}
                  alt={p.name[locale]}
                  fill
                  className="object-cover"
                  sizes="(max-width: 672px) 100vw, 672px"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                <p className="absolute bottom-2 left-3 text-white text-xs font-semibold opacity-80">{p.name[locale]}</p>
              </div>
              {kidsMode ? (
                <div className="flex flex-col gap-2">
                  <p className="text-slate-300 text-xs leading-relaxed">⭐ {p.kidsLine[locale]}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{p.kidsFact[locale]}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {p.facts[locale].map((f, i) => (
                    <li key={i} className="text-slate-300 text-xs flex gap-2">
                      <span style={{ color: p.color }}>•</span> {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                🔭 {kidsMode ? p.tip[locale].split('.')[0] + '.' : p.tip[locale]}
              </div>
              <Link
                href="/sky"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: p.color }}
              >
                🔭 {locale === 'ka' ? `იხილე ${p.name[locale]} ღამის პროგნოზში →` : `See ${p.name[locale]} in tonight's forecast →`}
              </Link>
              {'missionId' in p && p.missionId && (
                <Link
                  href="/missions"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#FFD166' }}
                >
                  ✦ {locale === 'ka' ? `${p.name[locale]} მისიის დაწყება →` : `Start ${p.name[locale]} Mission →`}
                </Link>
              )}
            </div>
          )}
        </button>
      ))}
      <div className="mt-2 pt-4 border-t border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">
          {locale === 'ka' ? 'თანავარსკვლავედები' : 'Constellations'}
        </p>
        <div className="flex flex-col gap-3">
          {CONSTELLATIONS.map(c => (
            <div key={c.id} className="glass-card overflow-hidden">
              <div className="relative w-full" style={{ height: '120px' }}>
                <Image src={c.img} alt={c.name['en']} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(7,11,20,0.85) 40%, transparent 100%)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-4 gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-base">{c.name[locale]}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30` }}>
                      {c.season[locale]}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-[240px]">{c.desc[locale]}</p>
                  <p className="text-xs mt-0.5" style={{ color: c.color }}>{c.highlight[locale]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EQ_BADGES = {
  naked_eye:  { label: { en: 'Naked Eye',    ka: 'შიშველი თვალი' }, icon: '👁', color: '#34d399' },
  binoculars: { label: { en: 'Binoculars',   ka: 'ბინოკლი' },       icon: '🔭', color: '#FFD166' },
  small_scope:{ label: { en: '100mm+ Scope', ka: '100მმ+ ტელ.' },   icon: '🔭', color: '#38F0FF' },
  large_scope:{ label: { en: '150mm+ Scope', ka: '150მმ+ ტელ.' },   icon: '🔭', color: '#8B5CF6' },
} as const;

const DSO_SEASONS: Record<string, { en: string; ka: string }> = {
  m42:   { en: 'Winter',  ka: 'ზამთარი' },
  m31:   { en: 'Autumn',  ka: 'შემოდგომა' },
  m45:   { en: 'Winter',  ka: 'ზამთარი' },
  m8:    { en: 'Summer',  ka: 'ზაფხული' },
  m13:   { en: 'Summer',  ka: 'ზაფხული' },
  m17:   { en: 'Summer',  ka: 'ზაფხული' },
  ngc869:{ en: 'Autumn',  ka: 'შემოდგომა' },
  m57:   { en: 'Summer',  ka: 'ზაფხული' },
  m51:   { en: 'Spring',  ka: 'გაზაფხული' },
  m1:    { en: 'Winter',  ka: 'ზამთარი' },
};

type EqFilter = 'all' | 'naked_eye' | 'binoculars' | 'small_scope' | 'large_scope';

function DeepSkyTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [eqFilter, setEqFilter] = useState<EqFilter>('all');

  const filtered = eqFilter === 'all' ? DSO : DSO.filter(d => d.equipment === eqFilter);

  const filterOptions: { id: EqFilter; label: string; icon: string }[] = [
    { id: 'all',        label: locale === 'ka' ? 'ყველა' : 'All',         icon: '✦' },
    { id: 'naked_eye',  label: EQ_BADGES.naked_eye.label[locale],          icon: EQ_BADGES.naked_eye.icon },
    { id: 'binoculars', label: EQ_BADGES.binoculars.label[locale],         icon: EQ_BADGES.binoculars.icon },
    { id: 'small_scope',label: EQ_BADGES.small_scope.label[locale],        icon: EQ_BADGES.small_scope.icon },
    { id: 'large_scope',label: EQ_BADGES.large_scope.label[locale],        icon: EQ_BADGES.large_scope.icon },
  ];

  const countFor = (id: EqFilter) =>
    id === 'all' ? DSO.length : DSO.filter(d => d.equipment === id).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="scroll-x scrollbar-hide flex gap-1.5 pb-1">
        {filterOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setEqFilter(opt.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex-shrink-0 transition-all duration-200"
            style={eqFilter === opt.id ? {
              background: 'rgba(255,209,102,0.12)',
              border: '1px solid rgba(255,209,102,0.3)',
              color: '#FFD166',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b',
            }}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
            <span className="opacity-50">({countFor(opt.id)})</span>
          </button>
        ))}
      </div>

      {filtered.map(obj => {
        const eqBadge = EQ_BADGES[obj.equipment];
        const season = DSO_SEASONS[obj.id];
        return (
          <button
            key={obj.id}
            onClick={() => setExpanded(expanded === obj.id ? null : obj.id)}
            className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative"
                style={{ border: `1px solid ${obj.color}40` }}>
                <Image
                  src={obj.img}
                  alt={obj.name['en']}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-snug">{obj.name[locale]}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${obj.color}20`, color: obj.color }}>{obj.type[locale]}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: `${eqBadge.color}18`, color: eqBadge.color, border: `1px solid ${eqBadge.color}25` }}>
                    {eqBadge.icon} {eqBadge.label[locale]}
                  </span>
                </div>
              </div>
              <span className="text-slate-600 text-xs ml-2">{expanded === obj.id ? '▲' : '▼'}</span>
            </div>
            {expanded === obj.id && (
              <div className="mt-4 flex flex-col gap-2" style={{ paddingLeft: '52px' }}>
                <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                  <Image
                    src={obj.img}
                    alt={obj.name[locale]}
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 100vw, 672px"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                  <p className="absolute bottom-2 left-3 text-white text-xs font-semibold opacity-80">{obj.name[locale]}</p>
                </div>
                {kidsMode ? (
                  <>
                    <p className="text-slate-300 text-xs leading-relaxed">⭐ {obj.kidsLine[locale]}</p>
                    <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                      style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                      🔭 {locale === 'ka' ? 'საჭირო ინსტრუმენტი: ' : 'Scope needed: '}{obj.scope[locale].split('.')[0]}.
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-300 text-xs leading-relaxed">{obj.desc[locale]}</p>
                    {/* Info row: equipment + distance + season */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${eqBadge.color}18`, color: eqBadge.color, border: `1px solid ${eqBadge.color}25` }}>
                        {eqBadge.icon} {eqBadge.label[locale]}
                      </span>
                      <span className="text-[10px] text-slate-500">{obj.distance[locale]}</span>
                      {season && (
                        <span className="text-[10px] text-slate-500">
                          {locale === 'ka' ? 'სეზონი: ' : 'Best in: '}{season[locale]}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                      style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                      🔭 {obj.scope[locale]}
                    </div>
                  </>
                )}
                {'missionId' in obj && obj.missionId && (
                  <Link
                    href="/missions"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 mt-1"
                    style={{ color: '#FFD166' }}
                  >
                    ✦ {locale === 'ka' ? `${obj.name[locale]} მისიის დაწყება →` : `Start ${obj.name[locale]} Mission →`}
                  </Link>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function QuizzesTab({ locale, onStart }: { locale: Locale; onStart: (q: QuizDef) => void }) {
  const { state } = useAppState();
  const quizzes = state.completedQuizzes ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500 text-xs leading-relaxed">
        {locale === 'ka'
          ? 'შეამოწმე შენი ასტრონომიული ცოდნა. 10 კითხვა, სწორ პასუხზე 10 ✦.'
          : 'Test your astronomy knowledge. 10 questions, 10 ✦ per correct answer.'}
      </p>
      {QUIZZES.map(quiz => {
        const results = quizzes.filter(r => r.quizId === quiz.id);
        const best = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;
        const bestStars = best !== null ? best * quiz.starsPerCorrect : null;

        return (
          <div key={quiz.id} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}>
                {quiz.emoji}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{quiz.title[locale]}</p>
                <p className="text-slate-500 text-xs">{quiz.description[locale]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {best !== null && (
                <span className="text-[#FFD166] text-xs font-medium">
                  {locale === 'ka' ? 'საუკეთესო' : 'Best'}: {best}/{quiz.questions.length} · +{bestStars} ✦
                </span>
              )}
              <button
                onClick={() => onStart(quiz)}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
              >
                {best !== null ? (locale === 'ka' ? 'კვლავ თამაში' : 'Play Again') : (locale === 'ka' ? 'დაწყება →' : 'Start →')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const GLOSSARY_TERMS = [
  { term: 'Aperture', termKa: 'აპერტურა', def: 'The diameter of the telescope\'s main lens or mirror. Bigger aperture = more light gathered = fainter objects visible. The single most important telescope spec.', defKa: 'ტელესკოპის მთავარი ლინზის ან სარკის დიამეტრი. მეტი აპერტურა = მეტი სინათლე.' },
  { term: 'Focal length', termKa: 'ფოკუსური მანძილი', def: 'The distance from the lens/mirror to where light focuses. Longer focal length = higher magnification with the same eyepiece. Measured in mm.', defKa: 'მანძილი ლინზიდან/სარკიდან ფოკუსამდე. მმ-ში იზომება.' },
  { term: 'Magnification', termKa: 'გადიდება', def: 'Telescope focal length ÷ eyepiece focal length = magnification. Example: 1000mm scope + 10mm eyepiece = 100×. More isn\'t always better — atmosphere limits useful magnification.', defKa: 'ტელესკოპის ფოკუსი ÷ ოკულარის ფოკუსი. მაგ: 1000მმ + 10მმ = 100×.' },
  { term: 'f-ratio', termKa: 'f-რაციო', def: 'Focal length ÷ aperture. f/5 = "fast" (wide field, good for nebulas). f/10 = "slow" (narrow field, good for planets). Lower f-ratio = brighter image at same magnification.', defKa: 'ფოკუსური მანძილი ÷ აპერტურა. f/5 = სწრაფი, f/10 = ნელი.' },
  { term: 'Bortle scale', termKa: 'ბორტლის სკალა', def: 'A 1–9 rating of sky darkness. 1 = pristine dark sky (Milky Way casts shadows). 5 = suburban. 9 = city center (only Moon and planets visible). Check the Dark Sky Map to find your local Bortle rating.', defKa: '1–9 შეფასება ცის სიბნელისა. 1 = პრისტინული, 9 = ქალაქის ცენტრი.' },
  { term: 'Light-year', termKa: 'სინათლის წელი', def: 'Distance light travels in one year: 9.46 trillion km. Used for interstellar distances. When you see the Andromeda Galaxy (2.5M light-years away), you\'re seeing light that left 2.5 million years ago.', defKa: 'მანძილი, რასაც სინათლე ერთ წელიწადში გადის: 9.46 ტრილიონი კმ.' },
  { term: 'Collimation', termKa: 'კოლიმაცია', def: 'Aligning a reflector telescope\'s mirrors so they focus light correctly. Needs checking every session for Newtonians. Uses a collimation cap or laser collimator.', defKa: 'რეფლექტორის სარკეების გასწორება. ნიუტონისთვის ყოველ სესიაზე საჭიროა.' },
  { term: 'Opposition', termKa: 'ოპოზიცია', def: 'When a planet is directly opposite the Sun from Earth — closest and brightest. Best time to observe outer planets. Jupiter opposition Oct 2026, Saturn Sep 2026.', defKa: 'როცა პლანეტა მზის საპირისპიროდაა — ყველაზე ახლო და კაშკაში.' },
  { term: 'Seeing', termKa: 'ხილვადობა', def: 'How steady the atmosphere is — affects sharpness at high magnification. Good seeing = steady stars. Bad seeing = twinkling, blurry planets. Check the Sky page for tonight\'s conditions.', defKa: 'ატმოსფეროს სტაბილურობა — გავლენას ახდენს სიმკვეთრეზე.' },
  { term: 'Terminator', termKa: 'ტერმინატორი', def: 'The shadow line on the Moon between the lit and dark sides. This is where craters look most dramatic — sunlight hits at an angle creating long shadows. Best area to observe on any night.', defKa: 'მთვარეზე ჩრდილის ხაზი განათებულ და ბნელ მხარეს შორის.' },
  { term: 'Meridian', termKa: 'მერიდიანი', def: 'An imaginary line from north to south passing directly overhead. Objects are highest (best viewing) when they cross the meridian — called "transit".', defKa: 'წარმოსახვითი ხაზი ჩრდილოეთიდან სამხრეთამდე თავის ზემოთ.' },
  { term: 'Alt-Az mount', termKa: 'ალტ-აზ მონტირება', def: 'A mount that moves up-down (altitude) and left-right (azimuth). Simple to use. Most beginner telescopes use this type. Doesn\'t track the sky automatically.', defKa: 'ზემოთ-ქვემოთ და მარცხნივ-მარჯვნივ მოძრავი მონტირება. მარტივია.' },
  { term: 'Equatorial mount', termKa: 'ეკვატორული მონტირება', def: 'A mount aligned with Earth\'s rotation axis. One motor can track objects across the sky. Required for long-exposure astrophotography. More complex to set up than Alt-Az.', defKa: 'დედამიწის ბრუნვის ღერძზე გათანაბრებული. ერთი ძრავით ადევნებს ობიექტებს.' },
];

const BORTLE_SEGMENTS = [
  { range: '1–2', color: '#34d399', label: { en: 'Pristine',  ka: 'პრისტინული'  }, desc: { en: 'Milky Way structure, zodiacal light, thousands of stars', ka: 'ირმის ნახტომი, ზოდიაქური სინათლე, ათასობით ვარსკვლავი' } },
  { range: '3–4', color: '#FFD166', label: { en: 'Rural',     ka: 'სოფელი'       }, desc: { en: 'Milky Way visible, 100+ stars, good for deep sky',      ka: 'ირმის ნახტომი ჩანს, 100+ ვარსკვლავი, კარგი ღრმა ცისთვის' } },
  { range: '5–6', color: '#f97316', label: { en: 'Suburban',  ka: 'გარეუბანი'    }, desc: { en: 'Milky Way faint, planets and bright clusters',           ka: 'ირმის ნახტომი სუსტია, პლანეტები და კაშკაში გროვები' } },
  { range: '7–9', color: '#ef4444', label: { en: 'City',      ka: 'ქალაქი'       }, desc: { en: 'Moon and brightest planets only',                        ka: 'მხოლოდ მთვარე და ყველაზე კაშკაში პლანეტები' } },
];

function GuideTab({ locale }: { locale: Locale }) {
  const [glossaryOpen, setGlossaryOpen] = useState(true);
  const [pollutionOpen, setPollutionOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Events state
  const now = Date.now();
  const upcoming = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() >= now);
  const past = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() < now);
  const [showPast, setShowPast] = useState(false);
  const nextEvent = upcoming[0];

  const dayLabel = (d: number) =>
    d === 0 ? (locale === 'ka' ? 'დღეს' : 'Today')
    : d === 1 ? (locale === 'ka' ? 'ხვალ' : 'Tomorrow')
    : `${d}d`;

  const filteredTerms = GLOSSARY_TERMS.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    t.def.toLowerCase().includes(search.toLowerCase()) ||
    t.termKa.toLowerCase().includes(search.toLowerCase()) ||
    t.defKa.toLowerCase().includes(search.toLowerCase())
  );

  const renderDef = (def: string) => {
    const parts = def.split(/(Sky page|Dark Sky Map)/g);
    return parts.map((part, i) =>
      part === 'Sky page' ? (
        <Link key={i} href="/sky" onClick={e => e.stopPropagation()} className="text-[#14B8A6] hover:opacity-80">{part}</Link>
      ) : part === 'Dark Sky Map' ? (
        <Link key={i} href="/darksky" onClick={e => e.stopPropagation()} className="text-[#14B8A6] hover:opacity-80">{part}</Link>
      ) : part
    );
  };

  return (
    <div className="flex flex-col gap-3">

      {/* Section A: Glossary */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setGlossaryOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'ასტრონომიის გლოსარი' : 'Astronomy Glossary'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              {locale === 'ka' ? `${GLOSSARY_TERMS.length} ტერმინი` : `${GLOSSARY_TERMS.length} terms`}
            </p>
          </div>
          <span className="text-slate-600 text-xs">{glossaryOpen ? '▲' : '▼'}</span>
        </button>
        {glossaryOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={locale === 'ka' ? 'ტერმინის ძიება...' : 'Search terms...'}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {filteredTerms.length === 0 ? (
                <p className="text-slate-600 text-xs py-2">{locale === 'ka' ? 'ვერ მოიძებნა' : 'No results'}</p>
              ) : filteredTerms.map(t => (
                <div key={t.term} className="py-2 border-b border-white/[0.04] last:border-0">
                  <p className="text-white font-semibold text-sm">{locale === 'ka' ? t.termKa : t.term}</p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-0.5">
                    {renderDef(locale === 'ka' ? t.defKa : t.def)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section B: Light Pollution */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setPollutionOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'სინათლის დაბინძურება' : 'Understanding Light Pollution'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              {locale === 'ka' ? 'ბორტლის სკალა' : 'Bortle scale explained'}
            </p>
          </div>
          <span className="text-slate-600 text-xs">{pollutionOpen ? '▲' : '▼'}</span>
        </button>
        {pollutionOpen && (
          <div className="px-4 pb-4 flex flex-col gap-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              {locale === 'ka'
                ? 'სინათლის დაბინძურება — ხელოვნური განათება, რომელიც ღამის ცაში ვრცელდება. ის ბნავს სუსტ ვარსკვლავებს, ნისლეულებს და ირმის ნახტომს. ბორტლის სკალა 1-დან 9-მდე ცის სიბნელეს ზომავს.'
                : 'Light pollution is artificial light scattered into the night sky. It washes out faint stars, nebulas, and the Milky Way. The Bortle scale measures sky darkness from 1 (pristine) to 9 (inner city).'}
            </p>
            {/* Bortle bar */}
            <div className="flex flex-col gap-3">
              {BORTLE_SEGMENTS.map(seg => (
                <div key={seg.range} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5 w-14 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${seg.color}20`, color: seg.color, border: `1px solid ${seg.color}30` }}>
                    {seg.range}
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{seg.label[locale]}</p>
                    <p className="text-slate-500 text-[10px] leading-relaxed">{seg.desc[locale]}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/darksky"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', color: '#14B8A6' }}
            >
              🗺 {locale === 'ka' ? 'იპოვე ბნელი ცა შენ მახლობლად →' : 'Find dark skies near you →'}
            </Link>
          </div>
        )}
      </div>

      {/* Section C: Events */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setEventsOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? '2026 — ასტრონომიული მოვლენები' : '2026 Astronomical Events'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              {upcoming.length} {locale === 'ka' ? 'მომდევნო' : 'upcoming'}
            </p>
          </div>
          <span className="text-slate-600 text-xs">{eventsOpen ? '▲' : '▼'}</span>
        </button>
        {eventsOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            {nextEvent && (
              <div className="rounded-xl p-4" style={{ boxShadow: '0 0 20px rgba(255,209,102,0.04)', border: '1px solid rgba(255,209,102,0.2)', background: 'rgba(255,209,102,0.03)' }}>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,209,102,0.6)' }}>
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
            )}
            {upcoming.length > 1 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4">
                  {upcoming.slice(1).map(ev => (
                    <div key={ev.date} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.1)' }}>
                        {ev.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{ev.name[locale]}</p>
                        <p className="text-slate-500 text-xs truncate">{ev.date} · {ev.desc[locale].split('.')[0]}.</p>
                      </div>
                      <span className="text-[#38F0FF] text-xs font-mono flex-shrink-0">
                        {dayLabel(daysFromNow(ev.date))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <button
                onClick={() => setShowPast(s => !s)}
                className="text-xs text-slate-600 flex items-center gap-1.5 hover:text-slate-400 transition-colors self-start"
              >
                <span>{showPast ? '▲' : '▼'}</span>
                {past.length} {locale === 'ka' ? 'გასული მოვლენა' : `past event${past.length !== 1 ? 's' : ''}`}
              </button>
            )}
            {showPast && (
              <div className="flex flex-col gap-2">
                {past.map(ev => (
                  <div key={ev.date} className="flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 grayscale"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {ev.emoji}
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium">{ev.name[locale]}</p>
                      <p className="text-slate-600 text-[10px] font-mono">{ev.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ASTRA promo ─────────────────────────────────────────────────────────────

function AstraPromo({ locale }: { locale: Locale }) {
  return (
    <Link
      href="/chat"
      className="flex items-center gap-4 px-5 py-5 rounded-2xl transition-all active:scale-[0.98] hover:border-[#38F0FF]/30"
      style={{ background: 'linear-gradient(135deg, rgba(56,240,255,0.08), rgba(26,143,160,0.04))', border: '1px solid rgba(56,240,255,0.18)' }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(56,240,255,0.12)', border: '1px solid rgba(56,240,255,0.25)' }}>
          <span className="text-[#38F0FF] text-lg">✦</span>
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34d399] border-2 border-[#080e1e]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">ASTRA AI</p>
        <p className="text-slate-400 text-xs mt-0.5">
          {locale === 'ka' ? 'შენი AI ასტრონომიული ასისტენტი · ჩათი →' : 'Your AI astronomy assistant · Chat →'}
        </p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; icon: string; en: string; ka: string }[] = [
  { id: 'planets',    icon: '🪐', en: 'Planets',  ka: 'პლანეტები' },
  { id: 'deepsky',    icon: '🌌', en: 'Deep Sky', ka: 'ღრმა ცა' },
  { id: 'telescopes', icon: '🔭', en: 'Scopes',   ka: 'ტელესკოპები' },
  { id: 'quizzes',    icon: '🧠', en: 'Quizzes',  ka: 'ქვიზები' },
  { id: 'guide',      icon: '📖', en: 'Guide',    ka: 'გზამკვლევი' },
];

export default function LearnPage() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'ka' ? 'ka' : 'en';
  const [tab, setTab] = useState<Tab>('planets');
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [kidsMode, setKidsMode] = useState(false);
  const { state } = useAppState();
  const completedQuizzes = state.completedQuizzes ?? [];

  return (
    <>
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter flex flex-col gap-5">
        <BackButton />
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'სწავლა' : 'Learn'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {locale === 'ka' ? 'ასტრონომია, ქვიზები, ASTRA AI.' : 'Astronomy guides, quizzes, and AI assistant.'}
            </p>
          </div>
          {(
            <button
              onClick={() => setKidsMode(k => !k)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0"
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
              <span className="hidden sm:inline">{kidsMode
                ? (locale === 'ka' ? 'ბავშვების რეჟიმი' : 'Kids Mode ON')
                : (locale === 'ka' ? 'ბავშვების რეჟიმი' : 'Kids Mode')}</span>
            </button>
          )}
        </div>

        {completedQuizzes.length > 0 && (
          <div className="flex items-center gap-3 text-xs -mt-3">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span style={{ color: '#34d399' }}>✓</span>
              {completedQuizzes.length} {locale === 'ka' ? 'ქვიზი დასრულებული' : 'quizzes completed'}
            </span>
            <span className="text-white/10">·</span>
            <span style={{ color: '#FFD166' }}>
              ✦ {completedQuizzes.reduce((sum, r) => sum + r.stars, 0)} earned
            </span>
          </div>
        )}

        {/* Tonight's Banner */}
        <TonightsBanner locale={locale} />

        {/* Tab bar — scroll-x ensures touch scrolling works even under overflow-x:clip body */}
        <div className="scroll-x scrollbar-hide flex gap-1.5 pb-1">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all duration-200 min-h-[36px]"
              style={tab === t.id ? {
                background: 'rgba(255,209,102,0.12)',
                border: '1px solid rgba(255,209,102,0.3)',
                color: '#FFD166',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b',
              }}
            >
              <span>{t.icon}</span>
              <span>{t[locale]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'planets'    ? <PlanetsTab key="planets" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'deepsky'    ? <DeepSkyTab key="deepsky" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'quizzes'    ? <QuizzesTab key="quizzes" locale={locale} onStart={setActiveQuiz} /> : null}
        {tab === 'guide'      ? <GuideTab key="guide" locale={locale} /> : null}
        {tab === 'telescopes' ? <TelescopesTab key="telescopes" /> : null}

        <AstraPromo locale={locale} />
      </div>
    </>
  );
}
