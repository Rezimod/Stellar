// Cosmic Daily — one space fact + a 1-tap micro-quiz, rotating deterministically
// by day-of-year so everyone sees the same item each day and it cycles roughly
// monthly. Pure data + a selector; no network. Bilingual (en / ka).

export interface CosmicDailyItem {
  fact: { en: string; ka: string };
  question: { en: string; ka: string };
  options: { en: string[]; ka: string[] };
  /** Index into `options` of the correct answer. */
  correct: number;
  explain: { en: string; ka: string };
}

const ITEMS: CosmicDailyItem[] = [
  {
    fact: {
      en: 'A day on Venus is longer than its year — it spins so slowly that one rotation takes 243 Earth days, but it orbits the Sun in 225.',
      ka: 'დღე ვენერაზე უფრო გრძელია, ვიდრე მისი წელი — ერთი ბრუნვა 243 დღეს გრძელდება, მზის გარშემო კი 225 დღეში მოძრაობს.',
    },
    question: { en: 'Which planet has a day longer than its year?', ka: 'რომელ პლანეტას აქვს დღე უფრო გრძელი, ვიდრე წელი?' },
    options: { en: ['Mercury', 'Venus', 'Mars', 'Jupiter'], ka: ['მერკური', 'ვენერა', 'მარსი', 'იუპიტერი'] },
    correct: 1,
    explain: { en: 'Venus rotates once every 243 days but orbits the Sun in 225.', ka: 'ვენერა 243 დღეში ერთხელ ბრუნავს, მზის გარშემო კი 225 დღეში.' },
  },
  {
    fact: {
      en: 'Jupiter has at least 95 known moons. Its four largest — Io, Europa, Ganymede and Callisto — are visible in binoculars.',
      ka: 'იუპიტერს სულ მცირე 95 ცნობილი მთვარე ჰყავს. ოთხი უდიდესი — იო, ევროპა, განიმედე და კალისტო — ბინოკლითაც ჩანს.',
    },
    question: { en: 'How many of Jupiter’s moons can you see with binoculars?', ka: 'იუპიტერის რამდენი მთვარის დანახვა შეიძლება ბინოკლით?' },
    options: { en: ['None', 'Two', 'Four', 'Twelve'], ka: ['არცერთის', 'ორის', 'ოთხის', 'თორმეტის'] },
    correct: 2,
    explain: { en: 'The four Galilean moons are bright enough for binoculars.', ka: 'ოთხი გალილეური მთვარე საკმარისად კაშკაშაა ბინოკლისთვის.' },
  },
  {
    fact: {
      en: 'Light from the Sun takes about 8 minutes 20 seconds to reach Earth — so you always see the Sun as it was, never as it is.',
      ka: 'მზის სინათლეს დედამიწამდე მოსვლას დაახლოებით 8 წუთი და 20 წამი სჭირდება — ანუ მზეს ყოველთვის წარსულში ხედავ.',
    },
    question: { en: 'How long does sunlight take to reach Earth?', ka: 'რამდენ ხანში აღწევს მზის სინათლე დედამიწას?' },
    options: { en: ['8 seconds', '8 minutes', '8 hours', 'Instantly'], ka: ['8 წამში', '8 წუთში', '8 საათში', 'მყისიერად'] },
    correct: 1,
    explain: { en: 'About 8 minutes 20 seconds across ~150 million km.', ka: 'დაახლოებით 8 წუთი 20 წამი ~150 მლნ კმ-ზე.' },
  },
  {
    fact: {
      en: 'Saturn’s rings are mostly water ice, span ~280,000 km, yet are often only about 10 metres thick.',
      ka: 'სატურნის რგოლები ძირითადად წყლის ყინულია, ~280,000 კმ სიგანის, მაგრამ ხშირად მხოლოდ ~10 მეტრის სისქის.',
    },
    question: { en: 'What are Saturn’s rings mostly made of?', ka: 'რისგან შედგება ძირითადად სატურნის რგოლები?' },
    options: { en: ['Rock', 'Water ice', 'Gas', 'Dust'], ka: ['ქვისგან', 'წყლის ყინულისგან', 'გაზისგან', 'მტვრისგან'] },
    correct: 1,
    explain: { en: 'Billions of ice chunks, from grains to boulders.', ka: 'მილიარდობით ყინულის ნატეხი — მარცვლიდან ლოდამდე.' },
  },
  {
    fact: {
      en: 'The Andromeda Galaxy is the most distant thing visible to the naked eye — 2.5 million light-years away, and on a collision course with us.',
      ka: 'ანდრომედას გალაქტიკა ყველაზე შორეული ობიექტია, რომელიც შეუიარაღებელი თვალით ჩანს — 2.5 მლნ სინათლის წლის მანძილზე.',
    },
    question: { en: 'How far away is the Andromeda Galaxy?', ka: 'რა მანძილზეა ანდრომედას გალაქტიკა?' },
    options: { en: ['2,500 light-years', '25,000 light-years', '2.5 million light-years', '2.5 billion light-years'], ka: ['2,500 სინათლის წელი', '25,000 სინათლის წელი', '2.5 მლნ სინათლის წელი', '2.5 მლრდ სინათლის წელი'] },
    correct: 2,
    explain: { en: 'And it will merge with the Milky Way in ~4.5 billion years.', ka: 'და ~4.5 მლრდ წელიწადში ირმის ნახტომს შეერწყმის.' },
  },
  {
    fact: {
      en: 'A teaspoon of neutron-star material would weigh about a billion tonnes on Earth.',
      ka: 'ნეიტრონული ვარსკვლავის მასალის ერთი ჩაის კოვზი დედამიწაზე დაახლოებით მილიარდ ტონას იწონიდა.',
    },
    question: { en: 'A teaspoon of neutron star weighs about…', ka: 'ნეიტრონული ვარსკვლავის ერთი კოვზი იწონის დაახლოებით…' },
    options: { en: ['A kilogram', 'A tonne', 'A billion tonnes', 'A gram'], ka: ['ერთ კილოგრამს', 'ერთ ტონას', 'მილიარდ ტონას', 'ერთ გრამს'] },
    correct: 2,
    explain: { en: 'Neutron stars cram a Sun’s mass into a city-sized sphere.', ka: 'ნეიტრონული ვარსკვლავი მზის მასას ქალაქის ზომის სფეროში ატევს.' },
  },
  {
    fact: {
      en: 'Mars has the tallest volcano in the solar system — Olympus Mons, about 22 km high, nearly three times Everest.',
      ka: 'მარსზეა მზის სისტემის უმაღლესი ვულკანი — ოლიმპუს მონსი, დაახლოებით 22 კმ სიმაღლის, თითქმის ევერესტზე სამჯერ მაღალი.',
    },
    question: { en: 'Where is the solar system’s tallest volcano?', ka: 'სად არის მზის სისტემის უმაღლესი ვულკანი?' },
    options: { en: ['Earth', 'Venus', 'Mars', 'Io'], ka: ['დედამიწაზე', 'ვენერაზე', 'მარსზე', 'იოზე'] },
    correct: 2,
    explain: { en: 'Olympus Mons rises ~22 km above the Martian plains.', ka: 'ოლიმპუს მონსი მარსის ვაკეებზე ~22 კმ-ით მაღლა დგას.' },
  },
  {
    fact: {
      en: 'The Moon is drifting away from Earth at about 3.8 cm per year — roughly the rate your fingernails grow.',
      ka: 'მთვარე დედამიწას შორდება წელიწადში დაახლოებით 3.8 სმ-ით — დაახლოებით იმ სიჩქარით, რომლითაც ფრჩხილები იზრდება.',
    },
    question: { en: 'The Moon is slowly…', ka: 'მთვარე ნელ-ნელა…' },
    options: { en: ['Getting closer', 'Drifting away', 'Staying put', 'Shrinking fast'], ka: ['უახლოვდება', 'შორდება', 'უძრავადაა', 'სწრაფად პატარავდება'] },
    correct: 1,
    explain: { en: 'About 3.8 cm farther every year.', ka: 'ყოველწლიურად ~3.8 სმ-ით უფრო შორს.' },
  },
  {
    fact: {
      en: 'Betelgeuse, the red shoulder of Orion, is so huge that if placed where the Sun is, it would swallow Mars’ orbit.',
      ka: 'ბეტელგეიზე, ორიონის წითელი მხარი, იმდენად დიდია, რომ მზის ადგილზე რომ ყოფილიყო, მარსის ორბიტას შთანთქავდა.',
    },
    question: { en: 'Betelgeuse is a giant star in which constellation?', ka: 'ბეტელგეიზე გიგანტური ვარსკვლავია რომელ თანავარსკვლავედში?' },
    options: { en: ['Orion', 'Scorpius', 'Lyra', 'Taurus'], ka: ['ორიონში', 'მორიელში', 'ქნარში', 'კურო'] },
    correct: 0,
    explain: { en: 'It marks Orion’s shoulder and may go supernova “soon.”', ka: 'ის ორიონის მხარს აღნიშნავს და შესაძლოა მალე სუპერნოვად იქცეს.' },
  },
  {
    fact: {
      en: 'Space is completely silent — sound needs a medium to travel through, and a vacuum has none.',
      ka: 'კოსმოსში სრული სიჩუმეა — ბგერას გასავრცელებლად გარემო სჭირდება, ვაკუუმში კი არ არსებობს.',
    },
    question: { en: 'Why can’t sound travel in space?', ka: 'რატომ ვერ ვრცელდება ბგერა კოსმოსში?' },
    options: { en: ['Too cold', 'No medium', 'Too dark', 'Too fast'], ka: ['ძალიან ცივა', 'არ არის გარემო', 'ძალიან ბნელა', 'ძალიან სწრაფია'] },
    correct: 1,
    explain: { en: 'A vacuum has no air or matter to carry vibrations.', ka: 'ვაკუუმში არ არის ჰაერი ან ნივთიერება ვიბრაციის გადასატანად.' },
  },
  {
    fact: {
      en: 'The Pleiades star cluster (M45) is about 100 million years old and contains over a thousand stars.',
      ka: 'პლეადების ვარსკვლავთგროვა (M45) დაახლოებით 100 მლნ წლისაა და ათასზე მეტ ვარსკვლავს შეიცავს.',
    },
    question: { en: 'The Pleiades are a…', ka: 'პლეადები არის…' },
    options: { en: ['Single star', 'Star cluster', 'Galaxy', 'Planet'], ka: ['ერთი ვარსკვლავი', 'ვარსკვლავთგროვა', 'გალაქტიკა', 'პლანეტა'] },
    correct: 1,
    explain: { en: 'An open cluster of young, hot blue stars.', ka: 'ახალგაზრდა, ცხელი ლურჯი ვარსკვლავების ღია გროვა.' },
  },
  {
    fact: {
      en: 'Neptune was found by maths before it was ever seen — astronomers predicted its position from Uranus’ wobble in 1846.',
      ka: 'ნეპტუნი მათემატიკით აღმოაჩინეს, სანამ მას დაინახავდნენ — 1846 წელს ურანის რყევით იწინასწარმეტყველეს მისი ადგილი.',
    },
    question: { en: 'Neptune was first located using…', ka: 'ნეპტუნი პირველად აღმოაჩინეს…' },
    options: { en: ['A telescope by chance', 'Mathematics', 'A space probe', 'Naked eye'], ka: ['ტელესკოპით შემთხვევით', 'მათემატიკით', 'ზონდით', 'შეუიარაღებელი თვალით'] },
    correct: 1,
    explain: { en: 'Predicted from Uranus’ orbital deviations, then observed.', ka: 'იწინასწარმეტყველეს ურანის ორბიტის გადახრით, შემდეგ დააკვირდნენ.' },
  },
  {
    fact: {
      en: 'There may be more stars in the observable universe than grains of sand on every beach on Earth.',
      ka: 'სამყაროში შესაძლოა მეტი ვარსკვლავი იყოს, ვიდრე ქვიშის მარცვალი დედამიწის ყველა პლაჟზე.',
    },
    question: { en: 'The observable universe has roughly how many stars?', ka: 'სამყაროში დაახლოებით რამდენი ვარსკვლავია?' },
    options: { en: ['Millions', 'Billions', 'Sextillions+', 'Exactly a trillion'], ka: ['მილიონები', 'მილიარდები', 'სექსტილიონები+', 'ზუსტად ტრილიონი'] },
    correct: 2,
    explain: { en: 'Estimates run to 10^22–10^24 stars.', ka: 'შეფასებები 10^22–10^24 ვარსკვლავამდე აღწევს.' },
  },
  {
    fact: {
      en: 'A full Moon is about 14 times brighter than a quarter Moon — not twice, because of how sunlight hits its rough surface.',
      ka: 'სავსე მთვარე დაახლოებით 14-ჯერ უფრო კაშკაშაა, ვიდრე ნახევარმთვარე — არა ორჯერ, არამედ ზედაპირზე სინათლის დაცემის გამო.',
    },
    question: { en: 'Compared to a quarter Moon, a full Moon is about…', ka: 'ნახევარმთვარესთან შედარებით სავსე მთვარე დაახლოებით…' },
    options: { en: ['2× brighter', '14× brighter', 'The same', '100× brighter'], ka: ['2-ჯერ კაშკაშა', '14-ჯერ კაშკაშა', 'იგივე', '100-ჯერ კაშკაშა'] },
    correct: 1,
    explain: { en: 'Shadows vanish at full Moon, boosting reflected light.', ka: 'სავსე მთვარეზე ჩრდილები ქრება, არეკლილი სინათლე იზრდება.' },
  },
];

/** Stable day index so the item is the same all day and rotates ~monthly. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export function getCosmicDaily(date: Date = new Date()): CosmicDailyItem {
  return ITEMS[dayOfYear(date) % ITEMS.length];
}
