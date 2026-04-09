'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useAppState } from '@/hooks/useAppState';
import { QUIZZES, type QuizDef } from '@/lib/quizzes';
import QuizActive from '@/components/sky/QuizActive';

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'events';
type Locale = 'en' | 'ka';

// ─── Planet data ────────────────────────────────────────────────────────────

const PLANETS = [
  {
    emoji: '☿', key: 'mercury',
    name: { en: 'Mercury', ka: 'მერკური' },
    facts: {
      en: ['Closest planet to the Sun', 'No atmosphere — extreme temperature swings', 'A year is just 88 Earth days'],
      ka: ['ყველაზე ახლო პლანეტა მზისთვის', 'ატმოსფეროს გარეშე — ექსტრემალური ტემპერატურა', 'წელი = 88 დედამიწის დღე'],
    },
    tip: { en: 'Visible low on the horizon just after sunset or before sunrise. Never easy — catch it during greatest elongation.', ka: 'ჩანს ჰორიზონტთან მაღლა მზის ჩასვლის შემდეგ ან ამოსვლამდე.' },
    color: '#b0b0b0',
  },
  {
    emoji: '♀', key: 'venus',
    name: { en: 'Venus', ka: 'ვენერა' },
    facts: {
      en: ['Brightest planet — brighter than any star', 'Hottest planet (462°C) despite not being closest', 'Shows phases like the Moon in a telescope'],
      ka: ['ყველაზე კაშკაში პლანეტა — ნებისმიერ ვარსკვლავზე კაშკაში', 'ყველაზე ცხელი პლანეტა (462°C)', 'ტელესკოპში ფაზებს აჩვენებს, როგორც მთვარე'],
    },
    tip: { en: 'Blazing "evening star" or "morning star" — unmistakable. Telescope shows its phases but surface is hidden by clouds.', ka: 'გასაოცარი "საღამოს ვარსკვლავი" — შეუცდომელი. ტელესკოპში ფაზები ჩანს.' },
    color: '#e8c87a',
  },
  {
    emoji: '🌍', key: 'earth',
    name: { en: 'Earth', ka: 'დედამიწა' },
    facts: {
      en: ['Only known planet with life', 'One large moon stabilizes axial tilt', '71% surface covered by water'],
      ka: ['ერთადერთი ცნობილი პლანეტა სიცოცხლით', 'ერთი დიდი მთვარე ღერძის დახრას ასტაბილიზებს', 'ზედაპირის 71% წყლითაა დაფარული'],
    },
    tip: { en: 'Our home. Its Moon is the finest telescope target — visible every clear night.', ka: 'ჩვენი სახლი. მისი მთვარე — ყველაზე შესანიშნავი სამიზნე.' },
    color: '#4a90d9',
  },
  {
    emoji: '♂', key: 'mars',
    name: { en: 'Mars', ka: 'მარსი' },
    facts: {
      en: ['Red color from iron oxide (rust) in soil', 'Two tiny moons: Phobos and Deimos', 'Next opposition: May 2026 — best viewing in years'],
      ka: ['წითელი ფერი რკინის ოქსიდისგან ნიადაგში', 'ორი პატარა მთვარე: ფობოსი და დეიმოსი', 'შემდეგი ოპოზიცია: 2026 მაისი'],
    },
    tip: { en: 'At opposition you can see the polar ice caps and surface markings with 100mm+ aperture.', ka: 'ოპოზიციისას 100 მმ+ ობიექტივით ჩანს პოლარული ქუდები.' },
    color: '#c1440e',
  },
  {
    emoji: '♃', key: 'jupiter',
    name: { en: 'Jupiter', ka: 'იუპიტერი' },
    facts: {
      en: ['Largest planet — 1,300 Earths fit inside', 'Great Red Spot: a storm older than 400 years', '4 Galilean moons visible in binoculars'],
      ka: ['ყველაზე დიდი — 1,300 დედამიწა ეტევა', 'დიდი წითელი ლაქა: 400+ წლის ქარიშხალი', '4 გალილეური მთვარე ბინოკლით ჩანს'],
    },
    tip: { en: 'Any telescope shows cloud bands and the four Galilean moons. Opposition: Oct 2026.', ka: 'ნებისმიერ ტელესკოპში ღრუბლის ზოლები და 4 მთვარე ჩანს. ოპოზიცია: 2026 ოქტომბერი.' },
    color: '#c88b3a',
  },
  {
    emoji: '♄', key: 'saturn',
    name: { en: 'Saturn', ka: 'სატურნი' },
    facts: {
      en: ['Iconic ring system made of ice and rock', 'Least dense planet — would float on water', '83 known moons including giant Titan'],
      ka: ['ყინულისა და ქვის რგოლების სისტემა', 'ყველაზე ნაკლები სიმკვრივე — წყალზე ამომივა', '83 ცნობილი მთვარე, მათ შორის გიგანტური ტიტანი'],
    },
    tip: { en: 'The rings are visible in even a 60mm telescope — one of the most breathtaking sights in astronomy. Opposition: Sep 2026.', ka: '60 მმ ტელესკოპშიც კი ჩანს რგოლები. ოპოზიცია: 2026 სექტემბერი.' },
    color: '#e8d5a3',
  },
  {
    emoji: '⛢', key: 'uranus',
    name: { en: 'Uranus', ka: 'ურანი' },
    facts: {
      en: ['Rotates on its side (98° axial tilt)', 'Blue-green color from methane in atmosphere', 'Faint rings discovered in 1977'],
      ka: ['ბრუნავს გვერდით (98° ღერძული დახრა)', 'ლურჯ-მწვანე ფერი მეთანიდან ატმოსფეროში', 'სუსტი რგოლები აღმოაჩინეს 1977 წელს'],
    },
    tip: { en: 'Visible to the naked eye in dark skies. A telescope shows its blue-green disc but little detail.', ka: 'შავ ცაზე შეიძლება შიშველი თვალით ჩანს. ტელესკოპი აჩვენებს ლურჯ-მწვანე დისკს.' },
    color: '#7de8e8',
  },
  {
    emoji: '♆', key: 'neptune',
    name: { en: 'Neptune', ka: 'ნეპტუნი' },
    facts: {
      en: ['Windiest planet — winds up to 2,100 km/h', 'Takes 165 years to orbit the Sun', 'Largest moon Triton orbits backwards'],
      ka: ['ყველაზე ქარიანი — 2,100 კმ/სთ', '165 წელი სჭირდება მზის გარშემო ბრუნვას', 'ყველაზე დიდი მთვარე ტრიტონი ბრუნავს საწინააღმდეგოდ'],
    },
    tip: { en: 'Requires binoculars or a telescope to see. Appears as a tiny blue dot even in large instruments.', ka: 'ბინოკლი ან ტელესკოპი სჭირდება. დიდ ინსტრუმენტშიც პატარა ლურჯი წერტილი ჩანს.' },
    color: '#3f54ba',
  },
];

// ─── Deep sky objects ────────────────────────────────────────────────────────

const DSO = [
  {
    id: 'm42', emoji: '✨',
    name: { en: 'Orion Nebula (M42)', ka: 'ორიონის ნისლეული (M42)' },
    type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' },
    distance: { en: '1,344 light-years', ka: '1,344 სინათლის წელი' },
    desc: { en: 'A stellar nursery — new stars forming inside glowing gas clouds. Visible to the naked eye as the fuzzy middle "star" in Orion\'s Sword.', ka: 'ვარსკვლავთა სკოლა — ახალი ვარსკვლავები იქმნება გამნათებელ გაზის ღრუბლებში. შიშველი თვალით ჩანს ორიონის ხმლის შუა "ვარსკვლავად".' },
    scope: { en: 'Any telescope. Even binoculars show the nebula clearly.', ka: 'ნებისმიერი ტელესკოპი. ბინოკლიც კი კარგად აჩვენებს.' },
    color: '#7a5fff',
  },
  {
    id: 'm31', emoji: '🌌',
    name: { en: 'Andromeda Galaxy (M31)', ka: 'ანდრომედას გალაქტიკა (M31)' },
    type: { en: 'Spiral Galaxy', ka: 'სპირალური გალაქტიკა' },
    distance: { en: '2.5 million light-years', ka: '2.5 მილიონი სინათლის წელი' },
    desc: { en: 'The nearest major galaxy and the farthest object visible to the naked eye. It contains over 1 trillion stars and is on a collision course with the Milky Way in 4.5 billion years.', ka: 'ყველაზე ახლო მთავარი გალაქტიკა. შეიცავს 1 ტრილიონზე მეტ ვარსკვლავს და ირმის ნახტომს 4.5 მილიარდ წელიწადში შეეჯახება.' },
    scope: { en: 'Visible naked eye in dark skies. Binoculars show its elliptical glow. Wide-field telescope shows dust lanes.', ka: 'შავ ცაზე შიშველი თვალით ჩანს. ბინოკლი კარგად აჩვენებს.' },
    color: '#14b8a6',
  },
  {
    id: 'm45', emoji: '💫',
    name: { en: 'Pleiades — Seven Sisters (M45)', ka: 'პლეიადები — შვიდი და (M45)' },
    type: { en: 'Open Cluster', ka: 'ღია გროვა' },
    distance: { en: '444 light-years', ka: '444 სინათლის წელი' },
    desc: { en: 'One of the nearest and most famous star clusters. The naked eye sees 6–7 stars but binoculars reveal hundreds. Astronomers in ancient Georgia, Greece, and Japan all recorded this cluster.', ka: 'ყველაზე ახლო და ცნობილი ვარსკვლავთა გროვა. შიშველი თვალი 6–7 ვარსკვლავს ხედავს, ბინოკლი — ასობითს.' },
    scope: { en: 'Best in binoculars or a very wide-field telescope. High magnification makes it too large to fit in view.', ka: 'საუკეთესო ბინოკლით. მაღალი გადიდება ზედმეტად ზრდის.' },
    color: '#38f0ff',
  },
  {
    id: 'm1', emoji: '🔭',
    name: { en: 'Crab Nebula (M1)', ka: 'კიბოს ნისლეული (M1)' },
    type: { en: 'Supernova Remnant', ka: 'სუპერნოვის ნარჩენი' },
    distance: { en: '6,523 light-years', ka: '6,523 სინათლის წელი' },
    desc: { en: 'The expanding debris cloud from a supernova explosion observed by Chinese astronomers in 1054 AD. A pulsar at its center spins 30 times per second.', ka: 'სუპერნოვის აფეთქებიდან გაფართოებული ნარჩენი — ჩინელმა ასტრონომებმა 1054 წელს დააფიქსირეს. ცენტრში პულსარი 30-ჯერ/წმ ბრუნავს.' },
    scope: { en: 'Requires 150mm+ aperture. Appears as a faint oval smudge. One of the most historically significant objects.', ka: '150 მმ+ ობიექტივი სჭირდება. სუსტი ოვალური ლაქა ჩანს.' },
    color: '#f59e0b',
  },
  {
    id: 'm13', emoji: '⭐',
    name: { en: 'Hercules Cluster (M13)', ka: 'ჰერკულესის გროვა (M13)' },
    type: { en: 'Globular Cluster', ka: 'გლობულარული გროვა' },
    distance: { en: '25,100 light-years', ka: '25,100 სინათლის წელი' },
    desc: { en: 'One of the finest globular clusters in the northern sky — a sphere of ~300,000 stars packed together. In 1974 scientists sent the Arecibo radio message toward it.', ka: 'ჩრდილოეთ ნახევარსფეროში ერთ-ერთი საუკეთესო გლობულარული გროვა — ~300,000 ვარსკვლავი.' },
    scope: { en: 'Small telescope shows a fuzzy ball. 150mm+ resolves individual stars at the edges. Best in summer.', ka: 'პატარა ტელესკოპი ბუნდოვან ბურთს აჩვენებს. 150 მმ+ ინდივიდუალურ ვარსკვლავებს გამოყოფს.' },
    color: '#ffd166',
  },
  {
    id: 'm57', emoji: '💍',
    name: { en: 'Ring Nebula (M57)', ka: 'რგოლის ნისლეული (M57)' },
    type: { en: 'Planetary Nebula', ka: 'პლანეტური ნისლეული' },
    distance: { en: '2,300 light-years', ka: '2,300 სინათლის წელი' },
    desc: { en: 'A dying star\'s outer layers blown off into a glowing ring of gas. Located in Lyra, near the bright star Vega. A classic showpiece object for telescope owners.', ka: 'მომაკვდავი ვარსკვლავის გარე ფენები, გაზის გამბრწყინავ რგოლად. ლირაში, ნათელი ვეგასთან ახლოს.' },
    scope: { en: 'Requires 100mm+ telescope. The smoke-ring shape is obvious at 100× magnification.', ka: '100 მმ+ ტელესკოპი სჭირდება. 100× გადიდებაზე კვამლის რგოლი ნათლად ჩანს.' },
    color: '#34d399',
  },
];

// ─── Events data ─────────────────────────────────────────────────────────────

const ALL_EVENTS = [
  { date: '2026-04-22', emoji: '☄️', name: { en: 'Lyrids Meteor Shower', ka: 'ლირიდების მეტეორული ნაკადი' }, desc: { en: 'Up to 20 meteors/hour. Look NE after midnight.', ka: 'საათში 20 მეტეორამდე. შეხედე ჩრდ.-აღმ.-ით შუაღამის შემდეგ.' } },
  { date: '2026-05-06', emoji: '☄️', name: { en: 'Eta Aquariids Shower', ka: 'ეტა-აქვარიიდების ნაკადი' }, desc: { en: 'Debris from Halley\'s Comet — up to 50/hour. Best before dawn.', ka: 'ჰალეის კომეტის ნარჩენები — 50+/სთ. საუკეთესოა გამთენიისას.' } },
  { date: '2026-05-17', emoji: '♂', name: { en: 'Mars at Opposition', ka: 'მარსის ოპოზიცია' }, desc: { en: 'Mars at its closest and brightest. Surface detail visible in telescopes.', ka: 'მარსი ყველაზე ახლოს და კაშკაში. ტელესკოპში ზედაპირი ჩანს.' } },
  { date: '2026-08-12', emoji: '☄️', name: { en: 'Perseid Meteor Shower', ka: 'პერსეიდების მეტეორული ნაკადი' }, desc: { en: 'Up to 100 meteors/hour — best summer shower. No equipment needed.', ka: 'საათში 100 მეტეორამდე — ყველაზე კარგი ზაფხულის ნაკადი.' } },
  { date: '2026-09-15', emoji: '♄', name: { en: 'Saturn at Opposition', ka: 'სატურნის ოპოზიცია' }, desc: { en: 'Saturn at its biggest and brightest. Rings tilted 22° toward Earth.', ka: 'სატურნი ყველაზე დიდი და კაშკაში. რგოლები 22°-ით გადახრილია.' } },
  { date: '2026-10-19', emoji: '♃', name: { en: 'Jupiter at Opposition', ka: 'იუპიტერის ოპოზიცია' }, desc: { en: 'Jupiter\'s cloud bands and moons are at their finest. Best night of the year for Jupiter.', ka: 'იუპიტერის ღრუბლის ზოლები და მთვარეები ყველაზე კარგია.' } },
  { date: '2026-11-17', emoji: '☄️', name: { en: 'Leonids Meteor Shower', ka: 'ლეონიდების მეტეორული ნაკადი' }, desc: { en: 'Fast, bright meteors from Comet Tempel-Tuttle. Up to 15/hour.', ka: 'სწრაფი, კაშკაში მეტეორები კომეტ ტემპელ-ტუტლედან. 15+/სთ.' } },
  { date: '2026-12-13', emoji: '☄️', name: { en: 'Geminids Meteor Shower', ka: 'გემინიდების მეტეორული ნაკადი' }, desc: { en: 'The most reliable shower of the year — up to 120/hour. Starts at 9 PM.', ka: 'წლის ყველაზე სანდო ნაკადი — 120+/სთ. იწყება 21:00-ზე.' } },
];

function daysFromNow(dateStr: string): number {
  return Math.round((new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86400000);
}

// ─── Tab content components ───────────────────────────────────────────────────

function PlanetsTab({ locale }: { locale: Locale }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {PLANETS.map(p => (
        <button
          key={p.key}
          onClick={() => setExpanded(expanded === p.key ? null : p.key)}
          className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${p.color}18`, border: `1px solid ${p.color}40` }}>
              {p.emoji}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{p.name[locale]}</p>
              <p className="text-slate-500 text-xs">{p.facts[locale][0]}</p>
            </div>
            <span className="text-slate-600 text-xs ml-2">{expanded === p.key ? '▲' : '▼'}</span>
          </div>
          {expanded === p.key && (
            <div className="mt-4 pl-13 flex flex-col gap-3" style={{ paddingLeft: '52px' }}>
              <ul className="flex flex-col gap-1.5">
                {p.facts[locale].map((f, i) => (
                  <li key={i} className="text-slate-300 text-xs flex gap-2">
                    <span style={{ color: p.color }}>•</span> {f}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                🔭 {p.tip[locale]}
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function DeepSkyTab({ locale }: { locale: Locale }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {DSO.map(obj => (
        <button
          key={obj.id}
          onClick={() => setExpanded(expanded === obj.id ? null : obj.id)}
          className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${obj.color}18`, border: `1px solid ${obj.color}40` }}>
              {obj.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug">{obj.name[locale]}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${obj.color}20`, color: obj.color }}>{obj.type[locale]}</span>
                <span className="text-slate-600 text-xs">{obj.distance[locale]}</span>
              </div>
            </div>
            <span className="text-slate-600 text-xs ml-2">{expanded === obj.id ? '▲' : '▼'}</span>
          </div>
          {expanded === obj.id && (
            <div className="mt-4 flex flex-col gap-2" style={{ paddingLeft: '52px' }}>
              <p className="text-slate-300 text-xs leading-relaxed">{obj.desc[locale]}</p>
              <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                🔭 {obj.scope[locale]}
              </div>
            </div>
          )}
        </button>
      ))}
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

function EventsTab({ locale }: { locale: Locale }) {
  const now = Date.now();
  const upcoming = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() >= now);
  const past = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() < now);

  return (
    <div className="flex flex-col gap-3">
      {upcoming.length > 0 && (
        <>
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            {locale === 'ka' ? 'მომავალი მოვლენები' : 'Upcoming Events'}
          </p>
          {upcoming.map(ev => {
            const days = daysFromNow(ev.date);
            return (
              <div key={ev.date} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.12)' }}>
                    {ev.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white font-semibold text-sm leading-snug">{ev.name[locale]}</p>
                      <span className="text-[#38F0FF] text-[10px] font-mono flex-shrink-0">
                        {days === 0 ? (locale === 'ka' ? 'დღეს' : 'Today') : days === 1 ? (locale === 'ka' ? 'ხვალ' : 'Tomorrow') : `${days}d`}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{ev.desc[locale]}</p>
                    <p className="text-slate-600 text-[10px] mt-1 font-mono">{ev.date}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
      {past.length > 0 && (
        <>
          <p className="text-xs text-slate-600 uppercase tracking-wider mt-2">
            {locale === 'ka' ? 'გასული მოვლენები' : 'Past Events'}
          </p>
          {past.map(ev => (
            <div key={ev.date} className="glass-card p-4 opacity-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 grayscale"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {ev.emoji}
                </div>
                <div>
                  <p className="text-slate-400 font-medium text-sm">{ev.name[locale]}</p>
                  <p className="text-slate-600 text-[10px] font-mono">{ev.date}</p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; en: string; ka: string }[] = [
  { id: 'planets',  en: 'Planets',    ka: 'პლანეტები' },
  { id: 'deepsky',  en: 'Deep Sky',   ka: 'ღრმა ცა' },
  { id: 'quizzes',  en: 'Quizzes',    ka: 'ქვიზები' },
  { id: 'events',   en: 'Sky Events', ka: 'ცის მოვლენები' },
];

export default function LearnPage() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'ka' ? 'ka' : 'en';
  const [tab, setTab] = useState<Tab>('planets');
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);

  return (
    <>
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            {locale === 'ka' ? 'ასტრონომიის სახელმძღვანელო' : 'Astronomy Guide'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {locale === 'ka' ? 'პლანეტები, ღრმა ცა, ქვიზები, ცის მოვლენები' : 'Planets, deep sky objects, quizzes, and sky events'}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all duration-200 min-h-[36px]"
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
              {t[locale]}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'planets'  && <PlanetsTab locale={locale} />}
        {tab === 'deepsky'  && <DeepSkyTab locale={locale} />}
        {tab === 'quizzes'  && <QuizzesTab locale={locale} onStart={setActiveQuiz} />}
        {tab === 'events'   && <EventsTab locale={locale} />}
      </div>
    </>
  );
}
