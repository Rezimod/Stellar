// 2026 astronomy event calendar.
//
// Dates verified against in-the-sky.org and timeanddate.com (eclipse circumstances)
// at compile time. Conjunction windows are listed at the date of closest approach.
//
// Used by:
//   - /sky page: EventBanner shows the next non-dismissed event within 7 days.
//   - /missions page: "Upcoming events this month" card.
//   - /api/observe/log + /api/observe/verify: 2x Stars bonus when an
//     observation lands within ±24h of an event matching the target.
//   - DifficultyExplainer drawer (§6): consumes infoBar.

export type AstroEventType =
  | 'eclipse-lunar'
  | 'eclipse-solar'
  | 'conjunction'
  | 'comet'
  | 'opposition'
  | 'meteor-shower';

export type AstroEventDifficulty = 'naked-eye' | 'binoculars' | 'telescope' | 'expert';

export interface AstroEvent {
  name: string;
  date: string; // YYYY-MM-DD (UTC date of peak / maximum)
  description: string;
  viewingTip: string;
  type: AstroEventType;
  difficulty: AstroEventDifficulty;
  visibilityRegion: string;
  infoBar: string; // 2-sentence plain-language explainer for the drawer
  /**
   * Lowercase target keys this event "boosts" — when an observation's
   * `target` (or identifiedObject) contains any of these substrings AND the
   * observation timestamp is within ±24h of `date`, /api/observe/log doubles
   * the Stars award.
   */
  boostTargets: string[];
  /** Georgian display strings — applied over the English ones by localizeEvent. */
  ka?: Pick<AstroEvent, 'name' | 'description' | 'viewingTip' | 'visibilityRegion' | 'infoBar'>;
}

/** Returns the event with display strings swapped to the given locale. */
export function localizeEvent(e: AstroEvent, locale: string): AstroEvent {
  if (locale !== 'ka' || !e.ka) return e;
  return { ...e, ...e.ka };
}

const EVENTS_2026: AstroEvent[] = [
  // ─── ECLIPSES ────────────────────────────────────────────────────────────
  {
    name: 'Annular Solar Eclipse',
    date: '2026-02-17',
    description: 'Annular eclipse — the Moon covers ~96% of the Sun, leaving a thin ring of fire visible only from Antarctica.',
    viewingTip: 'Path of annularity is over Antarctica. Partial phases visible from southern South America, southern Africa, and the southern Indian Ocean.',
    type: 'eclipse-solar',
    difficulty: 'expert',
    visibilityRegion: 'Antarctica · partial: southern hemisphere',
    infoBar: 'A solar eclipse happens when the Moon passes between the Sun and Earth. In an annular eclipse the Moon is too far from Earth to cover the whole Sun, so a bright ring stays visible — never look without a certified solar filter.',
    ka: {
      name: 'მზის რგოლისებრი დაბნელება',
      description: 'რგოლისებრი დაბნელება — მთვარე მზის ~96%-ს ფარავს და თხელი „ცეცხლის რგოლი“ რჩება, რომელიც მხოლოდ ანტარქტიდიდან ჩანს.',
      viewingTip: 'რგოლისებრი ფაზის ზოლი ანტარქტიდაზე გადის. ნაწილობრივი ფაზები ჩანს სამხრეთ ამერიკის სამხრეთიდან, სამხრეთ აფრიკიდან და ინდოეთის ოკეანის სამხრეთიდან.',
      visibilityRegion: 'ანტარქტიდა · ნაწილობრივი: სამხრეთ ნახევარსფერო',
      infoBar: 'მზის დაბნელება ხდება, როცა მთვარე მზესა და დედამიწას შორის გაივლის. რგოლისებრი დაბნელებისას მთვარე დედამიწისგან ზედმეტად შორსაა, რომ მზე მთლიანად დაფაროს, ამიტომ კაშკაშა რგოლი რჩება — არასოდეს უყურო სერტიფიცირებული მზის ფილტრის გარეშე.',
    },
    boostTargets: ['sun', 'eclipse'],
  },
  {
    name: 'Total Lunar Eclipse',
    date: '2026-03-03',
    description: 'Earth\'s shadow fully covers the Moon — turning it deep red ("blood moon") for ~58 minutes of totality.',
    viewingTip: 'Best viewed from East Asia, Australia, the Pacific, and western North America. No equipment needed — naked eye is fine.',
    type: 'eclipse-lunar',
    difficulty: 'naked-eye',
    visibilityRegion: 'Asia / Pacific / Australia / W. Americas',
    infoBar: 'A lunar eclipse happens when Earth passes between the Sun and the Moon. The Moon turns red because the only sunlight reaching it has been filtered through Earth\'s atmosphere — the same physics as a sunset.',
    ka: {
      name: 'მთვარის სრული დაბნელება',
      description: 'დედამიწის ჩრდილი მთვარეს მთლიანად ფარავს — მთვარე ~58 წუთით მუქ წითლად („სისხლიანი მთვარე“) იქცევა.',
      viewingTip: 'საუკეთესოდ ჩანს აღმოსავლეთ აზიიდან, ავსტრალიიდან, წყნარი ოკეანიდან და ჩრდილოეთ ამერიკის დასავლეთიდან. აღჭურვილობა არ გჭირდება.',
      visibilityRegion: 'აზია / წყნარი ოკეანე / ავსტრალია / დას. ამერიკები',
      infoBar: 'მთვარის დაბნელება ხდება, როცა დედამიწა მზესა და მთვარეს შორის დგება. მთვარე წითლდება, რადგან მასზე მხოლოდ დედამიწის ატმოსფეროში გაფილტრული სინათლე აღწევს — იგივე ფიზიკა, რაც მზის ჩასვლისას.',
    },
    boostTargets: ['moon', 'eclipse'],
  },
  {
    name: 'Total Solar Eclipse',
    date: '2026-08-12',
    description: 'Path of totality sweeps across Iceland, parts of Greenland, and northern Spain. Partial phases across most of Europe — including Georgia at ~50% coverage.',
    viewingTip: 'In the totality path: ~2 minutes of darkness. Outside it (e.g. Georgia): a deep partial eclipse — use certified eclipse glasses or a pinhole projector.',
    type: 'eclipse-solar',
    difficulty: 'naked-eye',
    visibilityRegion: 'Iceland / N. Spain (totality) · partial across Europe inc. Georgia',
    infoBar: 'During a total solar eclipse the Moon completely blocks the Sun, revealing the corona — the Sun\'s outer atmosphere. The corona is only visible during totality; outside that narrow path you only see a partial eclipse and must keep filters on the entire time.',
    ka: {
      name: 'მზის სრული დაბნელება',
      description: 'სრული ფაზის ზოლი გადის ისლანდიაზე, გრენლანდიის ნაწილსა და ჩრდილოეთ ესპანეთზე. ნაწილობრივი ფაზები ევროპის უმეტეს ნაწილში — საქართველოშიც, ~50% დაფარვით.',
      viewingTip: 'სრული ფაზის ზოლში: ~2 წუთი სიბნელე. მის გარეთ (მაგ. საქართველოში): ღრმა ნაწილობრივი დაბნელება — გამოიყენე სერტიფიცირებული დაბნელების სათვალე ან პინჰოლ-პროექტორი.',
      visibilityRegion: 'ისლანდია / ჩრდ. ესპანეთი (სრული) · ნაწილობრივი ევროპაში, მათ შორის საქართველოში',
      infoBar: 'მზის სრული დაბნელებისას მთვარე მზეს მთლიანად ფარავს და ჩანს გვირგვინი — მზის გარე ატმოსფერო. გვირგვინი მხოლოდ სრული ფაზისას ჩანს; ამ ვიწრო ზოლის გარეთ მხოლოდ ნაწილობრივი დაბნელებაა და ფილტრი მთელი დროის განმავლობაში გჭირდება.',
    },
    boostTargets: ['sun', 'eclipse'],
  },
  {
    name: 'Partial Lunar Eclipse',
    date: '2026-08-28',
    description: 'Earth\'s shadow covers about 93% of the Moon at maximum, leaving a small bright sliver. No totality this time.',
    viewingTip: 'Visible from the Americas, Europe, Africa, and western Asia. No equipment needed.',
    type: 'eclipse-lunar',
    difficulty: 'naked-eye',
    visibilityRegion: 'Americas / Europe / Africa / W. Asia',
    infoBar: 'A partial lunar eclipse happens when only part of the Moon enters Earth\'s dark inner shadow (the umbra). The shadowed portion looks bitten out of the Moon — easy to spot at a glance.',
    ka: {
      name: 'მთვარის ნაწილობრივი დაბნელება',
      description: 'დედამიწის ჩრდილი მაქსიმუმში მთვარის ~93%-ს ფარავს, პატარა კაშკაშა ნამგალი რჩება. სრული ფაზა ამჯერად არ იქნება.',
      viewingTip: 'ჩანს ამერიკებიდან, ევროპიდან, აფრიკიდან და დასავლეთ აზიიდან. აღჭურვილობა არ გჭირდება.',
      visibilityRegion: 'ამერიკები / ევროპა / აფრიკა / დას. აზია',
      infoBar: 'მთვარის ნაწილობრივი დაბნელება ხდება, როცა მთვარის მხოლოდ ნაწილი შედის დედამიწის მუქ შიდა ჩრდილში (უმბრაში). დაჩრდილული ნაწილი მთვარეს „მოკბეჩილს“ აჩენს — ერთი შეხედვითაც ადვილი შესამჩნევია.',
    },
    boostTargets: ['moon', 'eclipse'],
  },

  // ─── PLANETARY CONJUNCTIONS / CLOSE APPROACHES ──────────────────────────
  // TODO: verify exact dates against in-the-sky.org closer to each event.
  {
    name: 'Venus–Saturn Close Approach',
    date: '2026-01-24',
    description: 'Venus and Saturn separated by ~3°, both visible in the western evening sky just after sunset.',
    viewingTip: 'Look low in the west 30–45 min after sunset. Venus is the bright one; Saturn is golden, much fainter.',
    type: 'conjunction',
    difficulty: 'naked-eye',
    visibilityRegion: 'Worldwide (evening sky)',
    infoBar: 'A planetary conjunction is when two planets appear close together in our sky from Earth\'s point of view. They\'re still hundreds of millions of kilometres apart in space — the alignment is just our line of sight.',
    ka: {
      name: 'ვენერასა და სატურნის დაახლოება',
      description: 'ვენერა და სატურნი ~3°-ით არიან დაშორებულნი — ორივე ჩანს დასავლეთის საღამოს ცაზე მზის ჩასვლისთანავე.',
      viewingTip: 'შეხედე დაბლა დასავლეთით მზის ჩასვლიდან 30–45 წუთში. ვენერა კაშკაშაა; სატურნი ოქროსფერი და ბევრად მკრთალი.',
      visibilityRegion: 'მთელ მსოფლიოში (საღამოს ცა)',
      infoBar: 'პლანეტების კონიუნქცია ნიშნავს, რომ ორი პლანეტა ჩვენი ცის ხედიდან ერთმანეთთან ახლოს ჩანს. სინამდვილეში ისინი კოსმოსში ასობით მილიონი კილომეტრით არიან დაშორებულნი — უბრალოდ ერთ ხაზზე აღმოჩნდნენ.',
    },
    boostTargets: ['venus', 'saturn'],
  },

  // ─── OPPOSITIONS ─────────────────────────────────────────────────────────
  // Note: no Mars opposition in 2026 — the next one is Feb 19, 2027.
  {
    name: 'Jupiter at Opposition',
    date: '2026-01-10',
    description: 'Jupiter at its closest — largest and brightest in the sky.',
    viewingTip: 'Binoculars show the four Galilean moons. Telescopes reveal cloud bands.',
    type: 'opposition',
    difficulty: 'binoculars',
    visibilityRegion: 'Worldwide',
    infoBar: 'Jupiter at opposition is unmistakable — outshining everything else in the night sky except the Moon and Venus. With any binoculars steadied on a fence or tripod you can resolve the four Galilean moons.',
    ka: {
      name: 'იუპიტერის ოპოზიცია',
      description: 'იუპიტერი ყველაზე ახლოსაა — ცაზე ყველაზე დიდი და კაშკაშა.',
      viewingTip: 'ბინოკლში ოთხი გალილეური მთვარე ჩანს. ტელესკოპი ღრუბლის ზოლებს აჩვენებს.',
      visibilityRegion: 'მთელ მსოფლიოში',
      infoBar: 'იუპიტერი ოპოზიციისას შეუმჩნეველი ვერ დარჩება — ღამის ცაზე მასზე კაშკაშა მხოლოდ მთვარე და ვენერაა. ღობეზე ან შტატივზე დაყრდნობილი ბინოკლითაც კი გაარჩევ ოთხ გალილეურ მთვარეს.',
    },
    boostTargets: ['jupiter'],
  },
  {
    name: 'Saturn at Opposition',
    date: '2026-10-04',
    description: 'Saturn at its biggest and brightest of the year. The rings are nearly edge-on in 2026 — a rare thin-ring view.',
    viewingTip: 'Any telescope shows the rings. Look south after sunset.',
    type: 'opposition',
    difficulty: 'telescope',
    visibilityRegion: 'Worldwide',
    infoBar: 'Saturn at opposition rises at sunset and sets at sunrise — the whole night is observing time. The ring tilt changes year to year; around 2025–2026 the rings are close to edge-on, so they appear as a thin bright line.',
    ka: {
      name: 'სატურნის ოპოზიცია',
      description: 'სატურნი წლის ყველაზე დიდი და კაშკაშა. 2026-ში რგოლები თითქმის გვერდიდან ჩანს — იშვიათი „თხელი რგოლის“ ხედი.',
      viewingTip: 'ნებისმიერი ტელესკოპი აჩვენებს რგოლებს. შეხედე სამხრეთით მზის ჩასვლის შემდეგ.',
      visibilityRegion: 'მთელ მსოფლიოში',
      infoBar: 'სატურნი ოპოზიციისას მზის ჩასვლისას ამოდის და ამოსვლისას ჩადის — მთელი ღამე დაკვირვების დროა. რგოლების დახრა წლიდან წლამდე იცვლება; 2025–2026 წლებში ისინი თითქმის გვერდიდან ჩანს და თხელ კაშკაშა ხაზს ჰგავს.',
    },
    boostTargets: ['saturn'],
  },

  // ─── METEOR SHOWERS ──────────────────────────────────────────────────────
  {
    name: 'Lyrids Meteor Shower',
    date: '2026-04-22',
    description: 'Annual meteor shower producing up to 20 meteors per hour at peak.',
    viewingTip: 'Look northeast after midnight. Best away from city lights.',
    type: 'meteor-shower',
    difficulty: 'naked-eye',
    visibilityRegion: 'Northern hemisphere best',
    infoBar: 'A meteor shower happens when Earth passes through a trail of dust left by a comet. The grains burn up in the upper atmosphere — no telescope helps; the wider your view, the better.',
    ka: {
      name: 'ლირიდების მეტეორული ნაკადი',
      description: 'ყოველწლიური მეტეორული ნაკადი — პიკზე საათში 20 მეტეორამდე.',
      viewingTip: 'შეხედე ჩრდილო-აღმოსავლეთით შუაღამის შემდეგ. საუკეთესოა ქალაქის შუქებისგან მოშორებით.',
      visibilityRegion: 'საუკეთესო ჩრდილოეთ ნახევარსფეროში',
      infoBar: 'მეტეორული ნაკადი ხდება, როცა დედამიწა კომეტის დატოვებულ მტვრის კვალს კვეთს. მარცვლები ატმოსფეროს ზედა ფენებში იწვის — ტელესკოპი არ გჭირდება; რაც უფრო ფართოა ხედი, მით უკეთესი.',
    },
    boostTargets: ['meteor', 'lyrid'],
  },
  {
    name: 'Eta Aquariids Meteor Shower',
    date: '2026-05-06',
    description: 'Debris from Halley\'s Comet — up to 50 meteors/hour at peak.',
    viewingTip: 'Best before dawn. Look toward Aquarius in the east.',
    type: 'meteor-shower',
    difficulty: 'naked-eye',
    visibilityRegion: 'Tropics / southern hemisphere best',
    infoBar: 'The Eta Aquariids come from dust shed by Comet 1P/Halley on its 76-year orbit. The radiant is low for northern observers, so rates are best from the tropics and southern hemisphere.',
    ka: {
      name: 'ეტა-აქვარიიდების მეტეორული ნაკადი',
      description: 'ჰალეის კომეტის ნამსხვრევები — პიკზე საათში 50 მეტეორამდე.',
      viewingTip: 'საუკეთესოა გამთენიისას. შეხედე აღმოსავლეთით, მერწყულის მიმართულებით.',
      visibilityRegion: 'საუკეთესო ტროპიკებსა და სამხრეთ ნახევარსფეროში',
      infoBar: 'ეტა-აქვარიიდები 1P/ჰალეის კომეტის მტვრიდან მოდის, რომელიც მზეს 76 წელიწადში ერთხელ უვლის. რადიანტი ჩრდილოეთიდან დაბალია, ამიტომ ყველაზე მეტი მეტეორი ტროპიკებიდან და სამხრეთიდან ჩანს.',
    },
    boostTargets: ['meteor', 'aquariid', 'halley'],
  },
  {
    name: 'Perseid Meteor Shower',
    date: '2026-08-12',
    description: 'One of the best annual showers — up to 100 meteors per hour. Coincides with the Aug 12 total solar eclipse this year.',
    viewingTip: 'Look northeast after 10 PM. No equipment needed.',
    type: 'meteor-shower',
    difficulty: 'naked-eye',
    visibilityRegion: 'Northern hemisphere',
    infoBar: 'The Perseids are debris from Comet Swift-Tuttle. Peak runs the night of Aug 12–13; you don\'t need to face Perseus directly — meteors streak across the whole sky.',
    ka: {
      name: 'პერსეიდების მეტეორული ნაკადი',
      description: 'წლის ერთ-ერთი საუკეთესო ნაკადი — საათში 100 მეტეორამდე. წელს 12 აგვისტოს მზის სრულ დაბნელებას ემთხვევა.',
      viewingTip: 'შეხედე ჩრდილო-აღმოსავლეთით 22:00-ის შემდეგ. აღჭურვილობა არ გჭირდება.',
      visibilityRegion: 'ჩრდილოეთ ნახევარსფერო',
      infoBar: 'პერსეიდები კომეტა სვიფტ-ტატლის ნამსხვრევებია. პიკი 12–13 აგვისტოს ღამეს მოდის; პერსევსისკენ ყურება არ არის აუცილებელი — მეტეორები მთელ ცაზე ისრიალებენ.',
    },
    boostTargets: ['meteor', 'perseid'],
  },
  {
    name: 'Leonids Meteor Shower',
    date: '2026-11-17',
    description: 'Fast meteors from Comet Tempel-Tuttle — up to 15/hour.',
    viewingTip: 'Best after midnight facing Leo in the east.',
    type: 'meteor-shower',
    difficulty: 'naked-eye',
    visibilityRegion: 'Worldwide',
    infoBar: 'The Leonids are known for occasional meteor storms when Earth crosses fresh debris streams — most years are quiet, but the Leonids are why "meteor storm" is a word.',
    ka: {
      name: 'ლეონიდების მეტეორული ნაკადი',
      description: 'სწრაფი მეტეორები კომეტა ტემპელ-ტატლიდან — საათში 15-მდე.',
      viewingTip: 'საუკეთესოა შუაღამის შემდეგ, ლომის მიმართულებით აღმოსავლეთით.',
      visibilityRegion: 'მთელ მსოფლიოში',
      infoBar: 'ლეონიდები ცნობილია იშვიათი მეტეორული ქარიშხლებით, როცა დედამიწა ახალ ნამსხვრევების ნაკადს კვეთს — წლების უმეტესობა მშვიდია, მაგრამ სწორედ ლეონიდების გამო არსებობს ტერმინი „მეტეორული ქარიშხალი“.',
    },
    boostTargets: ['meteor', 'leonid'],
  },
  {
    name: 'Geminids Meteor Shower',
    date: '2026-12-13',
    description: 'The most reliable shower of the year — up to 120 meteors/hour.',
    viewingTip: 'Start watching at 9 PM. Radiant is near Castor in Gemini.',
    type: 'meteor-shower',
    difficulty: 'naked-eye',
    visibilityRegion: 'Worldwide',
    infoBar: 'The Geminids are unusual — their parent body is an asteroid (3200 Phaethon), not a comet. The shower is active well before midnight, making it the most family-friendly of the year.',
    ka: {
      name: 'გემინიდების მეტეორული ნაკადი',
      description: 'წლის ყველაზე სანდო ნაკადი — საათში 120 მეტეორამდე.',
      viewingTip: 'დაიწყე ყურება 21:00-ზე. რადიანტი ტყუპების თანავარსკვლავედში, კასტორთან ახლოსაა.',
      visibilityRegion: 'მთელ მსოფლიოში',
      infoBar: 'გემინიდები უჩვეულოა — მათი წყარო ასტეროიდია (3200 ფაეთონი) და არა კომეტა. ნაკადი შუაღამემდეც აქტიურია, ამიტომ წლის ყველაზე ოჯახური ნაკადია.',
    },
    boostTargets: ['meteor', 'geminid'],
  },

  // ─── COMETS ──────────────────────────────────────────────────────────────
  // TODO: add a 2026 comet entry only if a real comet brightens enough for
  // northern-hemisphere naked-eye / binocular viewing. Nothing notable as of
  // the Jan 2026 outlook.
];

/**
 * Returns the rare, once-a-year events (eclipses, oppositions, comets) for the
 * year of `fromDate`, sorted by date. These are the headline events worth
 * planning trips for. Capped at `limit` to keep the section scannable.
 */
export function getRareEvents(fromDate: Date, limit = 5): AstroEvent[] {
  const year = fromDate.getFullYear();
  const RARE_TYPES: AstroEventType[] = ['eclipse-solar', 'eclipse-lunar', 'comet'];
  return EVENTS_2026
    .filter(e => RARE_TYPES.includes(e.type))
    .filter(e => new Date(e.date + 'T12:00:00').getFullYear() === year)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getUpcomingEvents(fromDate: Date, daysAhead = 30): AstroEvent[] {
  const from = fromDate.getTime();
  const cutoff = from + daysAhead * 24 * 60 * 60 * 1000;

  return EVENTS_2026.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= from && t <= cutoff;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns events whose `boostTargets` match the given target string, AND
 * whose date is within ±24h of `when`. Used by /api/observe/log to apply
 * the 2x event-window bonus.
 */
export function eventsForTarget(target: string, when: Date): AstroEvent[] {
  if (!target) return [];
  const needle = target.toLowerCase();
  const t = when.getTime();
  const window = 24 * 60 * 60 * 1000;
  return EVENTS_2026.filter(e => {
    const eventTime = new Date(e.date + 'T12:00:00Z').getTime();
    if (Math.abs(eventTime - t) > window) return false;
    return e.boostTargets.some(b => needle.includes(b));
  });
}
