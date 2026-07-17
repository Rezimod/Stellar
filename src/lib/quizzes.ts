export interface QuizQuestion {
  q: { en: string; ka: string };
  options: { en: string; ka: string }[];
  correct: number;
  explanation: { en: string; ka: string };
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

// Reward scales with difficulty — harder quizzes pay more per correct answer.
export const STARS_PER_CORRECT_BY_DIFFICULTY: Record<QuizDifficulty, number> = {
  easy: 5,
  medium: 7,
  hard: 10,
};

export interface QuizDef {
  id: string;
  emoji: string;
  title: { en: string; ka: string };
  description: { en: string; ka: string };
  difficulty: QuizDifficulty;
  starsPerCorrect: number;
  questions: QuizQuestion[];
}

/** Maximum Stars a single quiz can pay (all questions correct), derived from
 *  the catalog so the award-stars policy cap can never drift from the data. */
export function maxQuizStars(): number {
  return Math.max(...QUIZZES.map((q) => q.questions.length * q.starsPerCorrect));
}

/** Full payout for one quiz (all questions correct) — the number shown on quiz cards. */
export function quizReward(quiz: QuizDef): number {
  return quiz.questions.length * quiz.starsPerCorrect;
}

/** A wallet can earn Stars from at most this many quizzes in any trailing 7-day
 *  window — enforced server-side in /api/award-stars and mirrored in the UI. */
export const MAX_QUIZ_REWARDS_PER_WEEK = 6;

export interface QuizScore {
  correct: number;
  total: number;
  stars: number;
  passed: boolean;
}

// Server-authoritative scoring. The client submits the picked option index per
// question (-1 for a timed-out no-pick); we score against the answer key here so
// the Stars payout never depends on a client-reported amount. Mirrors the
// QuizActive gate: needs >=70% correct AND no timed-out questions.
export function scoreQuiz(quizId: string, picks: number[]): QuizScore | null {
  const quiz = QUIZZES.find((q) => q.id === quizId);
  if (!quiz) return null;
  const total = quiz.questions.length;
  if (!Array.isArray(picks) || picks.length !== total) return null;
  let correct = 0;
  let anyTimeout = false;
  for (let i = 0; i < total; i++) {
    const pick = picks[i];
    if (typeof pick !== 'number' || pick < 0) { anyTimeout = true; continue; }
    if (pick === quiz.questions[i].correct) correct++;
  }
  const passThreshold = Math.ceil(total * 0.7);
  const passed = correct >= passThreshold && !anyTimeout;
  return { correct, total, stars: passed ? correct * quiz.starsPerCorrect : 0, passed };
}

export const QUIZZES: QuizDef[] = [
  {
    id: 'solar-system',
    emoji: '☀️',
    title: { en: 'Solar System', ka: 'მზის სისტემა' },
    description: { en: 'Test your knowledge of planets, moons, and our cosmic neighborhood.', ka: 'შეამოწმე ცოდნა პლანეტების, მთვარეების და ჩვენი კოსმოსური სამეზობლოს შესახებ.' },
    difficulty: 'easy',
    starsPerCorrect: STARS_PER_CORRECT_BY_DIFFICULTY.easy,
    questions: [
      {
        q: { en: 'How many planets are in our solar system?', ka: 'რამდენი პლანეტაა ჩვენს მზის სისტემაში?' },
        options: [
          { en: '7', ka: '7' },
          { en: '8', ka: '8' },
          { en: '9', ka: '9' },
          { en: '10', ka: '10' },
        ],
        correct: 1,
        explanation: { en: 'Our solar system has 8 planets. Pluto was reclassified as a dwarf planet in 2006 by the IAU.', ka: 'ჩვენს მზის სისტემაში 8 პლანეტაა. პლუტონი 2006 წელს IAU-მ ჯუჯა პლანეტად გადააკვალიფიცირა.' },
      },
      {
        q: { en: 'Which is the largest planet in our solar system?', ka: 'რომელია ყველაზე დიდი პლანეტა მზის სისტემაში?' },
        options: [
          { en: 'Saturn', ka: 'სატურნი' },
          { en: 'Neptune', ka: 'ნეპტუნი' },
          { en: 'Jupiter', ka: 'იუპიტერი' },
          { en: 'Uranus', ka: 'ურანი' },
        ],
        correct: 2,
        explanation: { en: 'Jupiter is so massive that all other planets combined would still be smaller — it contains 1,300 Earths by volume.', ka: 'იუპიტერი იმდენად დიდია, რომ ყველა სხვა პლანეტა ერთად მაინც პატარა იქნება — მასში 1,300 დედამიწა ეტევა.' },
      },
      {
        q: { en: 'Which planet is known as the Red Planet?', ka: 'რომელ პლანეტას ეძახიან წითელ პლანეტას?' },
        options: [
          { en: 'Venus', ka: 'ვენერა' },
          { en: 'Mars', ka: 'მარსი' },
          { en: 'Mercury', ka: 'მერკური' },
          { en: 'Jupiter', ka: 'იუპიტერი' },
        ],
        correct: 1,
        explanation: { en: 'Mars gets its red color from iron oxide (rust) covering its surface and fine dust in its thin atmosphere.', ka: 'მარსი წითელია ნიადაგში რკინის ოქსიდის (ჟანგის) გამო, რომელიც მის ზედაპირს ფარავს.' },
      },
      {
        q: { en: 'Which planet is closest to the Sun?', ka: 'რომელი პლანეტაა მზესთან ყველაზე ახლოს?' },
        options: [
          { en: 'Venus', ka: 'ვენერა' },
          { en: 'Earth', ka: 'დედამიწა' },
          { en: 'Mercury', ka: 'მერკური' },
          { en: 'Mars', ka: 'მარსი' },
        ],
        correct: 2,
        explanation: { en: 'Mercury orbits just 57.9 million km from the Sun. A year on Mercury is only 88 Earth days.', ka: 'მერკური მხოლოდ 57.9 მილიონ კმ-ზეა მზიდან. მერკურის ერთი წელი მხოლოდ 88 დედამიწის დღეა.' },
      },
      {
        q: { en: 'Which planet has the most visible rings?', ka: 'რომელ პლანეტას აქვს ყველაზე თვალსაჩინო რგოლები?' },
        options: [
          { en: 'Jupiter', ka: 'იუპიტერი' },
          { en: 'Uranus', ka: 'ურანი' },
          { en: 'Neptune', ka: 'ნეპტუნი' },
          { en: 'Saturn', ka: 'სატურნი' },
        ],
        correct: 3,
        explanation: { en: "Saturn's rings are 282,000 km wide but only 10–100 meters thick — thinner proportionally than a sheet of paper.", ka: 'სატურნის რგოლები 282,000 კმ სიგანისაა, მაგრამ მხოლოდ 10–100 მეტრი სისქის — ქაღალდის ფურცელზე თხელია პროპორციულად.' },
      },
      {
        q: { en: 'Which is the hottest planet in the solar system?', ka: 'რომელია ყველაზე ცხელი პლანეტა მზის სისტემაში?' },
        options: [
          { en: 'Mercury', ka: 'მერკური' },
          { en: 'Venus', ka: 'ვენერა' },
          { en: 'Mars', ka: 'მარსი' },
          { en: 'Jupiter', ka: 'იუპიტერი' },
        ],
        correct: 1,
        explanation: { en: 'Despite not being closest to the Sun, Venus traps heat via a runaway greenhouse effect — surface is 462°C.', ka: 'მიუხედავად იმისა, რომ მზესთან ყველაზე ახლო არ არის, ვენერა სათბურის ეფექტის გამო 462°C-მდე ცხელდება.' },
      },
      {
        q: { en: 'How long does Earth take to orbit the Sun?', ka: 'რამდენ ხანს სჭირდება დედამიწას მზის ირგვლივ ბრუნვა?' },
        options: [
          { en: '24 hours', ka: '24 საათი' },
          { en: '30 days', ka: '30 დღე' },
          { en: '365 days', ka: '365 დღე' },
          { en: '400 days', ka: '400 დღე' },
        ],
        correct: 2,
        explanation: { en: "Earth's orbital period of 365.25 days defines our calendar year. The 0.25 day is why we add a leap day every 4 years.", ka: 'დედამიწის ორბიტალური პერიოდი 365.25 დღეა. 0.25 დღის გამო ყოველ 4 წელიწადში ერთხელ 366-დღიანი წელი გვაქვს.' },
      },
      {
        q: { en: "What are Jupiter's four large moons collectively called?", ka: 'რა ჰქვია იუპიტერის ოთხ დიდ მთვარეს ერთობლივად?' },
        options: [
          { en: 'The Galilean Moons', ka: 'გალილეური მთვარეები' },
          { en: 'The Jovian Moons', ka: 'იოვური მთვარეები' },
          { en: 'The Giant Moons', ka: 'გიგანტური მთვარეები' },
          { en: 'The Inner Moons', ka: 'შიდა მთვარეები' },
        ],
        correct: 0,
        explanation: { en: 'Io, Europa, Ganymede, and Callisto were discovered by Galileo in 1610 — the first moons seen around another planet.', ka: 'იო, ევროპა, განიმედი და კალისტო გალილეომ 1610 წელს აღმოაჩინა — პირველი მთვარეები სხვა პლანეტის გარშემო.' },
      },
      {
        q: { en: 'Which planet rotates on its side (extreme axial tilt ~98°)?', ka: 'რომელი პლანეტა ბრუნავს გვერდულად (~98° ღერძული დახრა)?' },
        options: [
          { en: 'Neptune', ka: 'ნეპტუნი' },
          { en: 'Saturn', ka: 'სატურნი' },
          { en: 'Uranus', ka: 'ურანი' },
          { en: 'Venus', ka: 'ვენერა' },
        ],
        correct: 2,
        explanation: { en: 'Uranus was knocked onto its side by a massive collision early in solar system history. Its poles get 42 years of sunlight followed by 42 years of darkness.', ka: 'ურანი გვერდზე გადაიქცა ადრეული კოლიზიის შედეგად. მის პოლუსებს 42 წლის მზე ედგება, შემდეგ 42 წლის სიბნელე.' },
      },
      {
        q: { en: 'Which is the largest moon in the solar system?', ka: 'რომელია ყველაზე დიდი მთვარე მზის სისტემაში?' },
        options: [
          { en: 'The Moon (Earth)', ka: 'მთვარე (დედამიწის)' },
          { en: 'Titan (Saturn)', ka: 'ტიტანი (სატურნის)' },
          { en: 'Ganymede (Jupiter)', ka: 'განიმედი (იუპიტერის)' },
          { en: 'Triton (Neptune)', ka: 'ტრიტონი (ნეპტუნის)' },
        ],
        correct: 2,
        explanation: { en: 'Ganymede is larger than Mercury and has its own magnetic field — the only moon in the solar system that does.', ka: 'განიმედი მერკურიზე დიდია და საკუთარი მაგნიტური ველი აქვს — ერთადერთი მთვარე მზის სისტემაში ასეთი.' },
      },
    ],
  },
  {
    id: 'constellations',
    emoji: '✦',
    title: { en: 'Stars & Constellations', ka: 'ვარსკვლავები და თანავარსკვლავედები' },
    description: { en: 'How well do you know the night sky, its patterns, and famous stars?', ka: 'რამდენად კარგად იცნობ ღამის ცას, მის ნახატებს და ცნობილ ვარსკვლავებს?' },
    difficulty: 'medium',
    starsPerCorrect: STARS_PER_CORRECT_BY_DIFFICULTY.medium,
    questions: [
      {
        q: { en: 'How many official constellations are recognized by the IAU?', ka: 'რამდენი ოფიციალური თანავარსკვლავედია IAU-ს მიერ აღიარებული?' },
        options: [
          { en: '48', ka: '48' },
          { en: '72', ka: '72' },
          { en: '88', ka: '88' },
          { en: '100', ka: '100' },
        ],
        correct: 2,
        explanation: { en: 'The IAU defined 88 official constellations in 1930, dividing the entire sky so every star belongs to exactly one constellation.', ka: 'IAU-მ 1930 წელს 88 ოფიციალური თანავარსკვლავედი განსაზღვრა, ისე რომ ყოველი ვარსკვლავი ზუსტად ერთ მათგანს მიეკუთვნება.' },
      },
      {
        q: { en: 'What is the brightest star in the night sky?', ka: 'რომელია ყველაზე კაშკაში ვარსკვლავი ღამის ცაზე?' },
        options: [
          { en: 'Polaris', ka: 'პოლარისი' },
          { en: 'Betelgeuse', ka: 'ბეთელგეიზე' },
          { en: 'Sirius', ka: 'სირიუსი' },
          { en: 'Vega', ka: 'ვეგა' },
        ],
        correct: 2,
        explanation: { en: "Sirius (Alpha Canis Majoris) shines at magnitude -1.46 — so bright it's visible in daylight with the right conditions.", ka: 'სირიუსი (ალფა დიდი ძაღლის) -1.46 სიკაშკაშისაა — იმდენად კაშკაში, რომ სწორ პირობებში დღისითაც ჩანს.' },
      },
      {
        q: { en: 'Which constellation contains the North Star (Polaris)?', ka: 'რომელ თანავარსკვლავედშია ჩრდილოეთის ვარსკვლავი (პოლარისი)?' },
        options: [
          { en: 'Ursa Major', ka: 'დიდი დათვი' },
          { en: 'Cassiopeia', ka: 'კასიოპეა' },
          { en: 'Orion', ka: 'ორიონი' },
          { en: 'Ursa Minor', ka: 'პატარა დათვი' },
        ],
        correct: 3,
        explanation: { en: 'Polaris sits within 0.7° of the true North Celestial Pole, making it the fixed point the entire sky appears to rotate around.', ka: 'პოლარისი ჭეშმარიტი ჩრდილოეთის ცის პოლუსიდან 0.7°-შია — ფიქსირებული წერტილი, რომლის გარშემო მთელი ცა ბრუნავს.' },
      },
      {
        q: { en: 'What is the largest constellation in the sky?', ka: 'რომელია ყველაზე დიდი თანავარსკვლავედი ცაზე?' },
        options: [
          { en: 'Orion', ka: 'ორიონი' },
          { en: 'Hydra', ka: 'ჰიდრა' },
          { en: 'Virgo', ka: 'ქალწული' },
          { en: 'Centaurus', ka: 'კენტავრი' },
        ],
        correct: 1,
        explanation: { en: 'Hydra, the Water Snake, stretches over 100° of sky — it would take over 6 hours for it to fully rise over the horizon.', ka: 'ჰიდრა, წყლის გველი, 100°-ზე მეტ ცის არეს მოიცავს — მის სრულ ამოსვლას 6 საათზე მეტი სჭირდება.' },
      },
      {
        q: { en: 'Which constellation is known as "The Hunter"?', ka: 'რომელ თანავარსკვლავედს ეძახიან "მონადირეს"?' },
        options: [
          { en: 'Perseus', ka: 'პერსევსი' },
          { en: 'Hercules', ka: 'ჰერკულესი' },
          { en: 'Orion', ka: 'ორიონი' },
          { en: 'Sagittarius', ka: 'მშვილდოსანი' },
        ],
        correct: 2,
        explanation: { en: 'Orion represents the hunter from Greek mythology. His belt of three stars (Alnitak, Alnilam, Mintaka) is one of the most recognizable patterns in the sky.', ka: 'ორიონი ბერძნული მითოლოგიის მონადირეს წარმოადგენს. სამი ვარსკვლავის სარტყელი ცის ყველაზე ადვილად შესამჩნევი ნიმუშია.' },
      },
      {
        q: { en: 'What color is the star Betelgeuse in Orion?', ka: 'რა ფერის ვარსკვლავია ბეთელგეიზე ორიონში?' },
        options: [
          { en: 'Blue-white', ka: 'ლურჯ-თეთრი' },
          { en: 'Yellow', ka: 'ყვითელი' },
          { en: 'Red-orange', ka: 'წითელ-ნარინჯისფერი' },
          { en: 'White', ka: 'თეთრი' },
        ],
        correct: 2,
        explanation: { en: "Betelgeuse is a red supergiant — one of the largest stars known. Its orange-red color indicates a surface temperature of ~3,500°C, compared to our Sun's 5,500°C.", ka: 'ბეთელგეიზე წითელი ზეგიგანტია — ერთ-ერთი ყველაზე დიდი ცნობილი ვარსკვლავი. ნარინჯისფერ-წითელი ფერი ~3,500°C ზედაპირის ტემპერატურაზე მიუთითებს.' },
      },
      {
        q: { en: 'The Pleiades (Seven Sisters) belong to which constellation?', ka: 'პლეიადები (შვიდი და) რომელ თანავარსკვლავედს მიეკუთვნება?' },
        options: [
          { en: 'Gemini', ka: 'ტყუპები' },
          { en: 'Taurus', ka: 'კური' },
          { en: 'Aries', ka: 'ვერძი' },
          { en: 'Orion', ka: 'ორიონი' },
        ],
        correct: 1,
        explanation: { en: 'The Pleiades are in Taurus the Bull. In Greek myth, they were seven sisters — one dimmed out of grief for the fall of Troy.', ka: 'პლეიადები კურის თანავარსკვლავედშია. ბერძნულ მითში შვიდი და იყო — ერთი დამუქდა ტროის დაცემაზე მწუხარებისგან.' },
      },
      {
        q: { en: 'What is the nearest star to our solar system?', ka: 'რომელია ყველაზე ახლო ვარსკვლავი ჩვენი მზის სისტემისთვის?' },
        options: [
          { en: 'Sirius', ka: 'სირიუსი' },
          { en: 'Vega', ka: 'ვეგა' },
          { en: 'Proxima Centauri', ka: 'პროქსიმა ცენტავრი' },
          { en: "Barnard's Star", ka: 'ბარნარდის ვარსკვლავი' },
        ],
        correct: 2,
        explanation: { en: "Proxima Centauri is just 4.24 light-years away — part of the Alpha Centauri triple star system. At Voyager's speed, it would take 73,000 years to reach.", ka: 'პროქსიმა ცენტავრი მხოლოდ 4.24 სინათლის წელია — ალფა ცენტავრის სამობ-ვარსკვლავური სისტემის ნაწილი.' },
      },
      {
        q: { en: 'The Milky Way galaxy is what type of galaxy?', ka: 'ირმის ნახტომი რა ტიპის გალაქტიკაა?' },
        options: [
          { en: 'Elliptical', ka: 'ელიფსური' },
          { en: 'Irregular', ka: 'არარეგულარული' },
          { en: 'Barred spiral', ka: 'ზოლიანი სპირალური' },
          { en: 'Ring', ka: 'რგოლური' },
        ],
        correct: 2,
        explanation: { en: 'The Milky Way is a barred spiral galaxy — its bar-shaped center is clearly visible in infrared images from the Spitzer Space Telescope.', ka: 'ირმის ნახტომი ზოლიანი სპირალური გალაქტიკაა — მისი ზოლური ცენტრი Spitzer-ის ინფრაწითელ სურათებში კარგად ჩანს.' },
      },
      {
        q: { en: 'Which constellation contains the Andromeda Galaxy (M31)?', ka: 'რომელ თანავარსკვლავედშია ანდრომედას გალაქტიკა (M31)?' },
        options: [
          { en: 'Pegasus', ka: 'პეგასი' },
          { en: 'Perseus', ka: 'პერსევსი' },
          { en: 'Cassiopeia', ka: 'კასიოპეა' },
          { en: 'Andromeda', ka: 'ანდრომედა' },
        ],
        correct: 3,
        explanation: { en: "The Andromeda Galaxy (M31) is in the constellation Andromeda. At 2.5 million light-years, it's the farthest object visible to the naked eye.", ka: 'ანდრომედას გალაქტიკა (M31) ანდრომედას თანავარსკვლავედშია. 2.5 მილიონი სინათლის წლის მანძილით, ის ყველაზე შორი ობიექტია შიშველი თვალით.' },
      },
    ],
  },
  {
    id: 'telescopes',
    emoji: '🔭',
    title: { en: 'Telescopes & Optics', ka: 'ტელესკოპები და ოპტიკა' },
    description: { en: 'Essential knowledge for telescope owners and serious observers.', ka: 'აუცილებელი ცოდნა ტელესკოპის მფლობელებისა და სერიოზული დამკვირვებლებისთვის.' },
    difficulty: 'medium',
    starsPerCorrect: STARS_PER_CORRECT_BY_DIFFICULTY.medium,
    questions: [
      {
        q: { en: 'What does "aperture" mean for a telescope?', ka: 'რას ნიშნავს "ობიექტივი" ტელესკოპისთვის?' },
        options: [
          { en: 'The length of the tube', ka: 'მილის სიგრძე' },
          { en: 'The diameter of the main lens or mirror', ka: 'მთავარი ლინზის ან სარკის დიამეტრი' },
          { en: 'The magnification power', ka: 'გადიდების ძალა' },
          { en: 'The weight of the telescope', ka: 'ტელესკოპის წონა' },
        ],
        correct: 1,
        explanation: { en: 'Aperture is everything in a telescope — it determines how much light is collected and therefore the limit of what you can see.', ka: 'ობიექტივი ტელესკოპში ყველაფერია — ის განსაზღვრავს რამდენი სინათლე იკრიბება და შესაბამისად — რის დანახვაა შესაძლებელი.' },
      },
      {
        q: { en: 'Which type of telescope uses mirrors to collect light?', ka: 'რომელი ტიპის ტელესკოპი იყენებს სარკეებს სინათლის შეგროვებისთვის?' },
        options: [
          { en: 'Refractor', ka: 'რეფრაქტორი' },
          { en: 'Reflector (Newtonian)', ka: 'რეფლექტორი (ნიუტონის)' },
          { en: 'Binoculars', ka: 'ბინოკლი' },
          { en: 'Spotting scope', ka: 'საყურე სკოპი' },
        ],
        correct: 1,
        explanation: { en: 'Reflecting telescopes (Newtonians, Cassegrains) use curved mirrors. Refracting telescopes use glass lenses. Reflectors offer more aperture per dollar.', ka: 'ასახვის ტელესკოპები (ნიუტონის, კასეგრენის) მოხრილ სარკეებს იყენებენ. გარდატეხის ტელესკოპები შუშის ლინზებს.' },
      },
      {
        q: { en: 'How is telescope magnification calculated?', ka: 'როგორ გამოითვლება ტელესკოპის გადიდება?' },
        options: [
          { en: 'Aperture ÷ Focal Length', ka: 'ობიექტივი ÷ ფოკუსური სიგრძე' },
          { en: 'Focal Length ÷ Eyepiece Focal Length', ka: 'ფოკუსური სიგრძე ÷ ოკულარის ფოკუსური სიგრძე' },
          { en: 'Aperture × Eyepiece', ka: 'ობიექტივი × ოკულარი' },
          { en: 'Tube length ÷ Aperture', ka: 'მილის სიგრძე ÷ ობიექტივი' },
        ],
        correct: 1,
        explanation: { en: 'Focal length (FL) of the telescope divided by FL of the eyepiece = magnification. A 1000mm scope with a 10mm eyepiece = 100× power.', ka: 'ტელესკოპის ფოკუსური სიგრძე გაყოფილი ოკულარის ფოკუსურ სიგრძეზე = გადიდება. 1000 მმ სკოპი + 10 მმ ოკულარი = 100×.' },
      },
      {
        q: { en: 'What does a Barlow lens do?', ka: 'რას აკეთებს ბარლოვის ლინზა?' },
        options: [
          { en: 'Reduces magnification', ka: 'ამცირებს გადიდებას' },
          { en: 'Filters light', ka: 'ფილტრავს სინათლეს' },
          { en: 'Increases magnification (typically 2× or 3×)', ka: 'ზრდის გადიდებას (ჩვეულებრივ 2× ან 3×)' },
          { en: 'Corrects color aberration', ka: 'ასწორებს ფერის აბერაციას' },
        ],
        correct: 2,
        explanation: { en: 'A Barlow lens increases the effective focal length of the telescope, multiplying magnification of any eyepiece inserted after it.', ka: 'ბარლოვის ლინზა ზრდის ტელესკოპის ეფექტურ ფოკუსურ სიგრძეს, რაც ნებისმიერი ოკულარის გადიდებას ამრავლებს.' },
      },
      {
        q: { en: 'Who invented the reflecting telescope?', ka: 'ვინ გამოიგონა ასახვის ტელესკოპი?' },
        options: [
          { en: 'Galileo Galilei', ka: 'გალილეო გალილეი' },
          { en: 'Isaac Newton', ka: 'ისააკ ნიუტონი' },
          { en: 'Edwin Hubble', ka: 'ედვინ ჰაბლი' },
          { en: 'Johannes Kepler', ka: 'იოჰანეს კეპლერი' },
        ],
        correct: 1,
        explanation: { en: 'Isaac Newton built the first practical reflecting telescope in 1668. Galileo used a refractor — he never used a mirror-based scope.', ka: 'ისააკ ნიუტონმა 1668 წელს პირველი პრაქტიკული ასახვის ტელესკოპი ააგო. გალილეო გარდატეხის ტელესკოპს იყენებდა.' },
      },
      {
        q: { en: 'What is the "focal ratio" (f/ratio) of a telescope?', ka: 'რა არის ტელესკოპის "ფოკუსური თანაფარდობა" (f/ratio)?' },
        options: [
          { en: 'Aperture divided by focal length', ka: 'ობიექტივი გაყოფილი ფოკუსური სიგრძეზე' },
          { en: 'Focal length divided by aperture', ka: 'ფოკუსური სიგრძე გაყოფილი ობიექტივზე' },
          { en: 'Magnification divided by weight', ka: 'გადიდება გაყოფილი წონაზე' },
          { en: 'Eyepiece size divided by magnification', ka: 'ოკულარის ზომა გაყოფილი გადიდებაზე' },
        ],
        correct: 1,
        explanation: { en: "Focal ratio tells you how 'fast' a telescope is. f/5 is fast (wide field, short exposures), f/10 is slow (narrow field, high magnification).", ka: 'ფოკუსური თანაფარდობა გვეუბნება ტელესკოპი "სწრაფია" თუ "ნელი". f/5 სწრაფია (ფართო ველი), f/10 ნელი (ვიწრო ველი, მაღალი გადიდება).' },
      },
      {
        q: { en: 'Which mount type is best for astrophotography?', ka: 'რომელი სამაგრის ტიპია საუკეთესო ასტროფოტოგრაფიისთვის?' },
        options: [
          { en: 'Alt-azimuth (Dobsonian)', ka: 'ალტ-აზიმუტური (დობსონის)' },
          { en: 'Equatorial (GoTo)', ka: 'ეკვატორიალური (GoTo)' },
          { en: 'Tabletop', ka: 'სუფრის' },
          { en: 'Fork mount', ka: 'ჩანგლის სამაგრი' },
        ],
        correct: 1,
        explanation: { en: "Equatorial GoTo mounts compensate for Earth's rotation and can track objects precisely — essential for astrophotography exposures longer than 30 seconds.", ka: 'ეკვატორიალური GoTo სამაგრები ანაზღაურებენ დედამიწის ბრუნვას და ობიექტებს ზუსტად ადევნებენ — 30 წამზე გრძელი ექსპოზიციებისთვის აუცილებელია.' },
      },
      {
        q: { en: 'What is the purpose of a finderscope?', ka: 'რა მიზანი აქვს საძიებო სკოპს?' },
        options: [
          { en: 'To increase magnification', ka: 'გადიდების გაზრდა' },
          { en: 'To locate objects before viewing at high magnification', ka: 'ობიექტების მოძებნა მაღალი გადიდებით ყურებამდე' },
          { en: 'To photograph deep sky objects', ka: 'ღრმა ცის ობიექტების ფოტოგრაფია' },
          { en: 'To filter light pollution', ka: 'სინათლის დაბინძურების ფილტრაცია' },
        ],
        correct: 1,
        explanation: { en: 'A finderscope has a wide field of view (typically 6–7°) making it easy to locate the region of sky where your target is before switching to high power.', ka: 'საძიებო სკოპს ფართო ხედვის ველი აქვს (ჩვეულებრივ 6–7°) — ადვილია სამიზნის მიდამოს პოვნა სანამ მაღალ გადიდებაზე გადახვალ.' },
      },
      {
        q: { en: 'What does "dark adaptation" mean for observers?', ka: 'რას ნიშნავს "სიბნელეზე ადაპტაცია" დამკვირვებლებისთვის?' },
        options: [
          { en: 'Painting the telescope black', ka: 'ტელესკოპის შავად შეღებვა' },
          { en: 'Eyes adjusting to darkness for better night vision (takes ~20–30 min)', ka: 'თვალების სიბნელეზე მორგება ღამის ხილვისთვის (~20–30 წთ)' },
          { en: 'Using a red flashlight only', ka: 'მხოლოდ წითელი ფანარის გამოყენება' },
          { en: 'Setting up the telescope in shade', ka: 'ტელესკოპის ჩრდილში განთავსება' },
        ],
        correct: 1,
        explanation: { en: 'After 20–30 minutes in true darkness, your pupils dilate fully and rod cells reach peak sensitivity — letting you see objects 100× fainter than with unadapted eyes.', ka: '20–30 წუთის სიბნელეში ყოფნის შემდეგ გუგები სრულად ფართოვდება და ბადურის ჩხირი უჯრედები მაქსიმალურ მგრძნობელობას აღწევენ.' },
      },
      {
        q: { en: 'Which eyepiece gives higher magnification — 4mm or 25mm?', ka: 'რომელი ოკულარი იძლევა უფრო მაღალ გადიდებას — 4 მმ თუ 25 მმ?' },
        options: [
          { en: '25mm', ka: '25 მმ' },
          { en: 'Both are the same', ka: 'ორივე ერთნაირია' },
          { en: '4mm', ka: '4 მმ' },
          { en: 'Depends on the telescope', ka: 'დამოკიდებულია ტელესკოპზე' },
        ],
        correct: 2,
        explanation: { en: 'Shorter focal length eyepiece = higher magnification. The 4mm eyepiece on a 1000mm telescope gives 250×. The 25mm gives only 40×.', ka: 'მოკლე ფოკუსური სიგრძის ოკულარი = მაღალი გადიდება. 4 მმ ოკულარი 1000 მმ სკოპზე 250× იძლევა. 25 მმ მხოლოდ 40×.' },
      },
    ],
  },
  {
    id: 'universe',
    emoji: '🌌',
    title: { en: 'Universe & Cosmology', ka: 'სამყარო და კოსმოლოგია' },
    description: { en: 'The Big Bang, black holes, dark matter — how big is everything?', ka: 'დიდი აფეთქება, შავი ხვრელები, ბნელი მატერია.' },
    difficulty: 'hard',
    starsPerCorrect: STARS_PER_CORRECT_BY_DIFFICULTY.hard,
    questions: [
      {
        q: { en: 'How old is the universe?', ka: 'რამდენი წლისაა სამყარო?' },
        options: [
          { en: '4.5 billion years', ka: '4.5 მილიარდი წელი' },
          { en: '13.8 billion years', ka: '13.8 მილიარდი წელი' },
          { en: '100 billion years', ka: '100 მილიარდი წელი' },
          { en: '1 trillion years', ka: '1 ტრილიონი წელი' },
        ],
        correct: 1,
        explanation: { en: 'The universe is 13.8 billion years old, measured by the cosmic microwave background radiation left over from the Big Bang.', ka: 'სამყარო 13.8 მილიარდი წლისაა — გაზომილია დიდი აფეთქებიდან დარჩენილი კოსმიური მიკროტალღური ფონური გამოსხივებით.' },
      },
      {
        q: { en: 'What is the approximate speed of light in a vacuum?', ka: 'რა არის სინათლის სიჩქარე ვაკუუმში?' },
        options: [
          { en: '30,000 km/s', ka: '30,000 კმ/წმ' },
          { en: '300,000 km/s', ka: '300,000 კმ/წმ' },
          { en: '3,000,000 km/s', ka: '3,000,000 კმ/წმ' },
          { en: '3,000 km/s', ka: '3,000 კმ/წმ' },
        ],
        correct: 1,
        explanation: { en: 'Light travels at 299,792 km/s in a vacuum — fast enough to circle Earth 7.5 times per second. Nothing with mass can reach this speed.', ka: 'სინათლე 299,792 კმ/წმ სიჩქარით მოძრაობს ვაკუუმში — 1 წამში დედამიწას 7.5-ჯერ შემოუვლის.' },
      },
      {
        q: { en: 'What is a light-year?', ka: 'რა არის სინათლის წელი?' },
        options: [
          { en: 'The time it takes light to travel from the Sun to Earth', ka: 'დრო, რომელიც სინათლეს მზიდან დედამიწამდე სჭირდება' },
          { en: 'The distance light travels in one year (~9.46 trillion km)', ka: 'მანძილი, რომელსაც სინათლე ერთ წელიწადში გადის (~9.46 ტრილიონი კმ)' },
          { en: 'One billion kilometers', ka: 'ერთი მილიარდი კილომეტრი' },
          { en: 'The age of a star in light units', ka: 'ვარსკვლავის ასაკი სინათლის ერთეულებში' },
        ],
        correct: 1,
        explanation: { en: 'A light-year is a unit of distance, not time — the distance light covers in one year: about 9.46 trillion kilometers or 63,241 AU.', ka: 'სინათლის წელი მანძილის ერთეულია, არა დროის — მანძილი, რომელსაც სინათლე ერთ წელიწადში გადის: დაახლოებით 9.46 ტრილიონი კმ.' },
      },
      {
        q: { en: 'What is a black hole?', ka: 'რა არის შავი ხვრელი?' },
        options: [
          { en: 'A region where gravity is so strong that nothing, not even light, can escape', ka: 'ადგილი, სადაც სიმძიმის ძალა იმდენად ძლიერია, რომ ვერაფერი, სინათლეც კი, ვერ გაიქცევა' },
          { en: 'A dead star that no longer emits light', ka: 'მკვდარი ვარსკვლავი, რომელიც სინათლეს აღარ ასხივებს' },
          { en: 'An empty region of space with no stars', ka: 'კოსმოსის ცარიელი ადგილი ვარსკვლავების გარეშე' },
          { en: 'A dark nebula that blocks background stars', ka: 'ბნელი ნისლეული, რომელიც ფონის ვარსკვლავებს ფარავს' },
        ],
        correct: 0,
        explanation: { en: 'A black hole forms when a massive star collapses under its own gravity. Its event horizon is the point of no return — not even light escapes beyond it.', ka: 'შავი ხვრელი წარმოიქმნება, როდესაც მასიური ვარსკვლავი საკუთარი სიმძიმით იჩოჩება. მოვლენის ჰორიზონტი — დაბრუნების წერტილია.' },
      },
      {
        q: { en: 'When did the Big Bang occur?', ka: 'როდის მოხდა დიდი აფეთქება?' },
        options: [
          { en: '4.5 billion years ago', ka: '4.5 მილიარდი წლის წინ' },
          { en: '13.8 billion years ago', ka: '13.8 მილიარდი წლის წინ' },
          { en: '1 billion years ago', ka: '1 მილიარდი წლის წინ' },
          { en: '50 billion years ago', ka: '50 მილიარდი წლის წინ' },
        ],
        correct: 1,
        explanation: { en: 'The Big Bang occurred 13.8 billion years ago — the moment all space, time, and energy began from an infinitely hot, dense state and has been expanding ever since.', ka: 'დიდი აფეთქება 13.8 მილიარდი წლის წინ მოხდა — მომენტი, როდესაც სივრცე, დრო და ენერგია უსასრულოდ ცხელი, მკვრივი მდგომარეობიდან დაიწყო.' },
      },
      {
        q: { en: 'Approximately what percentage of the universe is dark matter?', ka: 'სამყაროს დაახლოებით რამდენი პროცენტია ბნელი მატერია?' },
        options: [
          { en: '5%', ka: '5%' },
          { en: '27%', ka: '27%' },
          { en: '68%', ka: '68%' },
          { en: '50%', ka: '50%' },
        ],
        correct: 1,
        explanation: { en: "The universe is ~5% ordinary matter, ~27% dark matter, and ~68% dark energy. Dark matter doesn't emit light but its gravity shapes galaxies.", ka: 'სამყარო შედგება ~5% ჩვეულებრივი მატერიისგან, ~27% ბნელი მატერიისა და ~68% ბნელი ენერგიისგან. ბნელი მატერია სინათლეს არ ასხივებს, მაგრამ სიმძიმით გალაქტიკებს ქმნის.' },
      },
      {
        q: { en: 'How many galaxies are estimated in the observable universe?', ka: 'რამდენი გალაქტიკაა სავარაუდოდ დასაკვირვებელ სამყაროში?' },
        options: [
          { en: 'About 200 billion', ka: 'დაახლოებით 200 მილიარდი' },
          { en: 'About 2 trillion', ka: 'დაახლოებით 2 ტრილიონი' },
          { en: 'About 100 million', ka: 'დაახლოებით 100 მილიონი' },
          { en: 'About 10 billion', ka: 'დაახლოებით 10 მილიარდი' },
        ],
        correct: 1,
        explanation: { en: 'A 2016 study revised the count to ~2 trillion galaxies — 10× more than previously thought. Most are too faint and distant for current telescopes to see.', ka: '2016 წლის კვლევამ გადასინჯა რაოდენობა ~2 ტრილიონ გალაქტიკამდე — 10-ჯერ მეტი, ვიდრე ადრე ეგონათ.' },
      },
      {
        q: { en: 'What is a supernova?', ka: 'რა არის სუპერნოვა?' },
        options: [
          { en: 'A new star being born from a nebula', ka: 'ახალი ვარსკვლავი, რომელიც ნისლეულიდან იბადება' },
          { en: 'A massive star exploding at the end of its life', ka: 'მასიური ვარსკვლავის აფეთქება სიცოცხლის ბოლოს' },
          { en: 'Two galaxies colliding', ka: 'ორი გალაქტიკის შეჯახება' },
          { en: 'A comet hitting a planet', ka: 'კომეტა, რომელიც პლანეტას ეჯახება' },
        ],
        correct: 1,
        explanation: { en: 'A supernova is the catastrophic explosion of a massive star. For a brief period it can outshine an entire galaxy and forges heavy elements like iron and gold.', ka: 'სუპერნოვა მასიური ვარსკვლავის კატასტროფული აფეთქებაა. მოკლე დროით შეიძლება მთელ გალაქტიკაზე კაშკაში იყოს.' },
      },
      {
        q: { en: 'What is a neutron star?', ka: 'რა არის ნეიტრონული ვარსკვლავი?' },
        options: [
          { en: 'A star made entirely of hydrogen and helium', ka: 'ვარსკვლავი, რომელიც მთლიანად წყალბადსა და ჰელიუმს შეიცავს' },
          { en: 'The ultra-dense remnant of a supernova explosion', ka: 'სუპერნოვის აფეთქების ულტრა-მკვრივი ნარჩენი' },
          { en: 'A star with no nuclear fusion', ka: 'ვარსკვლავი ბირთვული შერწყმის გარეშე' },
          { en: 'A black hole in early formation', ka: 'ადრეულ ფორმირებაში შავი ხვრელი' },
        ],
        correct: 1,
        explanation: { en: 'A neutron star is the remnant core of a collapsed massive star — about 20 km across but 1–3 solar masses. A teaspoon of neutron star material weighs ~10 million tons.', ka: 'ნეიტრონული ვარსკვლავი ჩაქცეული მასიური ვარსკვლავის ნარჩენი ბირთვია — დაახლოებით 20 კმ დიამეტრი, მაგრამ 1–3 მზის მასა.' },
      },
      {
        q: { en: "What did Edwin Hubble discover in 1929?", ka: 'რა აღმოაჩინა ედვინ ჰაბლმა 1929 წელს?' },
        options: [
          { en: 'The existence of black holes', ka: 'შავი ხვრელების არსებობა' },
          { en: 'That the universe is expanding', ka: 'რომ სამყარო ფართოვდება' },
          { en: 'The first exoplanet', ka: 'პირველი ექსოპლანეტა' },
          { en: 'That the Milky Way is spiral-shaped', ka: 'რომ ირმის ნახტომი სპირალური ფორმისაა' },
        ],
        correct: 1,
        explanation: { en: "Hubble observed that distant galaxies are moving away from us — the farther they are, the faster they recede. This became the cornerstone of Big Bang cosmology.", ka: 'ჰაბლმა შენიშნა, რომ შორეული გალაქტიკები ჩვენგან შორდებიან — რაც შორს, მით სწრაფად. ეს გახდა დიდი აფეთქების კოსმოლოგიის საფუძველი.' },
      },
    ],
  },
  {
    id: 'space-exploration',
    emoji: '🚀',
    title: { en: 'Space Exploration', ka: 'კოსმოსის კვლევა' },
    description: { en: 'Rockets, astronauts, missions — the history of humanity in space.', ka: 'რაკეტები, ასტრონავტები, მისიები.' },
    difficulty: 'hard',
    starsPerCorrect: STARS_PER_CORRECT_BY_DIFFICULTY.hard,
    questions: [
      {
        q: { en: 'Who was the first human to travel to space?', ka: 'ვინ იყო პირველი ადამიანი კოსმოსში?' },
        options: [
          { en: 'Neil Armstrong', ka: 'ნილ არმსტრონგი' },
          { en: 'Alan Shepard', ka: 'ალან შეპარდი' },
          { en: 'Yuri Gagarin', ka: 'იური გაგარინი' },
          { en: 'Buzz Aldrin', ka: 'ბაზ ოლდრინი' },
        ],
        correct: 2,
        explanation: { en: 'Yuri Gagarin became the first human in space on April 12, 1961, aboard Vostok 1. His flight lasted 108 minutes and completed one orbit of Earth.', ka: 'იური გაგარინი 1961 წლის 12 აპრილს გახდა პირველი ადამიანი კოსმოსში — ვოსტოკ 1-ით. ფრენა 108 წუთი გაგრძელდა.' },
      },
      {
        q: { en: 'Which mission first landed humans on the Moon?', ka: 'რომელმა მისიამ პირველად დაასხა ადამიანები მთვარეზე?' },
        options: [
          { en: 'Apollo 10', ka: 'აპოლო 10' },
          { en: 'Apollo 11', ka: 'აპოლო 11' },
          { en: 'Apollo 13', ka: 'აპოლო 13' },
          { en: 'Gemini 7', ka: 'ჯემინი 7' },
        ],
        correct: 1,
        explanation: { en: 'Apollo 11 landed on the Moon on July 20, 1969. Neil Armstrong and Buzz Aldrin walked on the surface while Michael Collins orbited above.', ka: 'აპოლო 11 მთვარეზე 1969 წლის 20 ივლისს დაეშვა. ნილ არმსტრონგი და ბაზ ოლდრინი ზედაპირზე გავიდნენ, მაიკლ კოლინზი კი ორბიტაზე დარჩა.' },
      },
      {
        q: { en: 'What was the first space station launched into orbit?', ka: 'რომელი იყო პირველი კოსმოსური სადგური ორბიტაზე?' },
        options: [
          { en: 'Skylab (USA, 1973)', ka: 'სქაილაბ (აშშ, 1973)' },
          { en: 'Mir (Soviet Union, 1986)', ka: 'მირ (საბჭოთა კავშირი, 1986)' },
          { en: 'Salyut 1 (Soviet Union, 1971)', ka: 'სალიუტ 1 (საბჭოთა კავშირი, 1971)' },
          { en: 'ISS (1998)', ka: 'ISS (1998)' },
        ],
        correct: 2,
        explanation: { en: "Salyut 1 was launched by the Soviet Union on April 19, 1971 — the world's first space station. It hosted cosmonauts for 23 days.", ka: 'სალიუტ 1 საბჭოთა კავშირმა 1971 წლის 19 აპრილს გაუშვა — მსოფლიოს პირველი კოსმოსური სადგური. 23 დღე კოსმონავტები ჰყავდა.' },
      },
      {
        q: { en: 'In what year was the Hubble Space Telescope launched?', ka: 'რომელ წელს გაუშვეს კოსმოსური ტელესკოპი ჰაბლი?' },
        options: [
          { en: '1985', ka: '1985' },
          { en: '1990', ka: '1990' },
          { en: '1995', ka: '1995' },
          { en: '2000', ka: '2000' },
        ],
        correct: 1,
        explanation: { en: 'Hubble was launched on April 24, 1990 aboard Space Shuttle Discovery. A flawed mirror was corrected by astronauts in 1993, transforming it into a world-class observatory.', ka: 'ჰაბლი 1990 წლის 24 აპრილს გაუშვეს Discovery-ით. 1993 წელს ასტრონავტებმა გამოასწორეს გაუმართავი სარკე.' },
      },
      {
        q: { en: 'Which Mars rover is currently operating on the surface?', ka: 'რომელი მარსის როვერი ამჟამად მუშაობს ზედაპირზე?' },
        options: [
          { en: 'Opportunity', ka: 'ოპორტუნიტი' },
          { en: 'Spirit', ka: 'სპირიტი' },
          { en: 'Curiosity', ka: 'კიურიოსიტი' },
          { en: 'Perseverance', ka: 'პერსევერანსი' },
        ],
        correct: 3,
        explanation: { en: 'Perseverance landed in Jezero Crater on February 18, 2021 and is still operating. Curiosity is also active. Spirit and Opportunity are no longer functioning.', ka: 'პერსევერანსი ჯეზერო კრატერში 2021 წლის 18 თებერვალს დაეშვა და კვლავ მუშაობს. კიურიოსიტიც აქტიურია.' },
      },
      {
        q: { en: 'How many countries originally built the International Space Station (ISS)?', ka: 'რამდენმა ქვეყანამ ააგო საერთაშორისო კოსმოსური სადგური (ISS)?' },
        options: [
          { en: '5', ka: '5' },
          { en: '10', ka: '10' },
          { en: '15', ka: '15' },
          { en: '25', ka: '25' },
        ],
        correct: 2,
        explanation: { en: '15 countries built the ISS: the USA, Russia, Canada, Japan, and 11 European nations. Assembly began in 1998 and it has been continuously occupied since November 2000.', ka: '15 ქვეყანამ ააგო ISS: აშშ, რუსეთი, კანადა, იაპონია და 11 ევროპული სახელმწიფო. 2000 წლის ნოემბრიდან მუდმივად დასახლებულია.' },
      },
      {
        q: { en: 'Where is Voyager 1 now?', ka: 'სად არის ვოიაჯერ 1 ახლა?' },
        options: [
          { en: 'Orbiting Saturn', ka: 'სატურნის ორბიტაზე' },
          { en: 'In the Oort Cloud', ka: 'ოორტის ღრუბელში' },
          { en: 'In interstellar space, past the heliopause', ka: 'ვარსკვლავთშორის სივრცეში, ჰელიოპაუზის მიღმა' },
          { en: 'Approaching Alpha Centauri', ka: 'ალფა ცენტავრისკენ მიმავალ გზაზე' },
        ],
        correct: 2,
        explanation: { en: 'Launched in 1977, Voyager 1 crossed the heliopause in 2012 and is now in interstellar space — the farthest human-made object from Earth, over 24 billion km away.', ka: '1977 წელს გაშვებული ვოიაჯერ 1 2012 წელს გადაკვეთა ჰელიოპაუზი და ახლა ვარსკვლავთშორის სივრცეშია — 24 მილიარდ კმ-ზე.' },
      },
      {
        q: { en: "In what year did SpaceX fly its first crewed mission to the ISS?", ka: 'რომელ წელს მიფრინდა SpaceX-ის პირველი ეკიპაჟი ISS-ზე?' },
        options: [
          { en: '2015', ka: '2015' },
          { en: '2018', ka: '2018' },
          { en: '2020', ka: '2020' },
          { en: '2022', ka: '2022' },
        ],
        correct: 2,
        explanation: { en: "SpaceX Demo-2 launched on May 30, 2020, carrying astronauts Bob Behnken and Doug Hurley — the first crewed orbital launch from US soil since the Space Shuttle retired in 2011.", ka: 'SpaceX Demo-2 2020 წლის 30 მაისს გაფრინდა — პირველი ეკიპაჟის ორბიტალური გაშვება აშშ-დან 2011 წლიდან.' },
      },
      {
        q: { en: 'Who was the first woman in space?', ka: 'ვინ იყო პირველი ქალი კოსმოსში?' },
        options: [
          { en: 'Sally Ride', ka: 'სალი რაიდი' },
          { en: 'Valentina Tereshkova', ka: 'ვალენტინა ტერეშკოვა' },
          { en: 'Svetlana Savitskaya', ka: 'სვეტლანა სავიცკაია' },
          { en: 'Mae Jemison', ka: 'მეი ჯემისონი' },
        ],
        correct: 1,
        explanation: { en: 'Valentina Tereshkova became the first woman in space on June 16, 1963, flying solo aboard Vostok 6. She remains the only woman to have flown a solo space mission.', ka: 'ვალენტინა ტერეშკოვა 1963 წლის 16 ივნისს გახდა პირველი ქალი კოსმოსში — ვოსტოკ 6-ით მარტო გაფრინდა.' },
      },
      {
        q: { en: 'In what year was the James Webb Space Telescope launched?', ka: 'რომელ წელს გაუშვეს ჯეიმს ვების კოსმოსური ტელესკოპი?' },
        options: [
          { en: '2018', ka: '2018' },
          { en: '2019', ka: '2019' },
          { en: '2021', ka: '2021' },
          { en: '2023', ka: '2023' },
        ],
        correct: 2,
        explanation: { en: 'JWST launched on December 25, 2021, and reached its L2 observation point in January 2022. It sees in infrared and can observe the first galaxies formed after the Big Bang.', ka: 'JWST 2021 წლის 25 დეკემბერს გაუშვეს და 2022 წლის იანვარში L2 წერტილს მიაღწია. ის ინფრაწითელ სპექტრში ხედავს.' },
      },
    ],
  },
];
