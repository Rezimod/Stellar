'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAppState } from '@/hooks/useAppState';
import { QUIZZES, type QuizDef } from '@/lib/quizzes';
import QuizActive from '@/components/sky/QuizActive';
import TelescopesTab from '@/components/sky/TelescopesTab';

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'events' | 'telescopes';
type Locale = 'en' | 'ka';

// ─── Planet data ────────────────────────────────────────────────────────────

const PLANETS = [
  {
    emoji: '☿', key: 'mercury', img: '/images/planets/mercury.jpg',
    name: { en: 'Mercury', ka: 'მერკური' },
    facts: {
      en: ['Closest planet to the Sun', 'No atmosphere — extreme temperature swings', 'A year is just 88 Earth days'],
      ka: ['ყველაზე ახლო პლანეტა მზისთვის', 'ატმოსფეროს გარეშე — ექსტრემალური ტემპერატურა', 'წელი = 88 დედამიწის დღე'],
    },
    tip: { en: 'Visible low on the horizon just after sunset or before sunrise. Never easy — catch it during greatest elongation.', ka: 'ჩანს ჰორიზონტთან მაღლა მზის ჩასვლის შემდეგ ან ამოსვლამდე.' },
    kidsLine: { en: 'Tiny and fast — a year here is only 88 days!', ka: 'პატარა და სწრაფი — წელი აქ მხოლოდ 88 დღეა!' },
    kidsFact: { en: 'Without an atmosphere, temperatures swing from 430°C during the day to -180°C at night!', ka: 'ატმოსფეროს გარეშე ტემპერატურა დღით 430°C-ს აღწევს, ღამით კი -180°C-მდე ეცემა!' },
    color: '#b0b0b0',
  },
  {
    emoji: '♀', key: 'venus', img: '/images/planets/venus.jpg',
    name: { en: 'Venus', ka: 'ვენერა' },
    facts: {
      en: ['Brightest planet — brighter than any star', 'Hottest planet (462°C) despite not being closest', 'Shows phases like the Moon in a telescope'],
      ka: ['ყველაზე კაშკაში პლანეტა — ნებისმიერ ვარსკვლავზე კაშკაში', 'ყველაზე ცხელი პლანეტა (462°C)', 'ტელესკოპში ფაზებს აჩვენებს, როგორც მთვარე'],
    },
    tip: { en: 'Blazing "evening star" or "morning star" — unmistakable. Telescope shows its phases but surface is hidden by clouds.', ka: 'გასაოცარი "საღამოს ვარსკვლავი" — შეუცდომელი. ტელესკოპში ფაზები ჩანს.' },
    kidsLine: { en: "It's hotter than an oven — hot enough to melt lead!", ka: 'ქურაზე უფრო ცხელია — ტყვიის დნობა შეუძლია!' },
    kidsFact: { en: 'A day on Venus is longer than its entire year — it spins super slowly!', ka: 'ვენერაზე ერთი დღე მთელ წელზე გრძელია — ძალიან ნელა ბრუნავს!' },
    color: '#e8c87a',
  },
  {
    emoji: '🌍', key: 'earth', img: '/images/planets/earth.jpg',
    name: { en: 'Earth', ka: 'დედამიწა' },
    facts: {
      en: ['Only known planet with life', 'One large moon stabilizes axial tilt', '71% surface covered by water'],
      ka: ['ერთადერთი ცნობილი პლანეტა სიცოცხლით', 'ერთი დიდი მთვარე ღერძის დახრას ასტაბილიზებს', 'ზედაპირის 71% წყლითაა დაფარული'],
    },
    tip: { en: 'Our home. Its Moon is the finest telescope target — visible every clear night.', ka: 'ჩვენი სახლი. მისი მთვარე — ყველაზე შესანიშნავი სამიზნე.' },
    kidsLine: { en: 'Our home! The only planet with oceans, air, and life.', ka: 'ჩვენი სახლი! ერთადერთი პლანეტა ოკეანეებით, ჰაერით და სიცოცხლით.' },
    kidsFact: { en: 'Earth is the only planet not named after a Roman god or goddess!', ka: 'დედამიწა ერთადერთი პლანეტაა, რომელსაც რომაული ღვთაების სახელი არ ჰქვია!' },
    color: '#4a90d9',
  },
  {
    emoji: '♂', key: 'mars', img: '/images/planets/mars.jpg',
    name: { en: 'Mars', ka: 'მარსი' },
    facts: {
      en: ['Red color from iron oxide (rust) in soil', 'Two tiny moons: Phobos and Deimos', 'Next opposition: May 2026 — best viewing in years'],
      ka: ['წითელი ფერი რკინის ოქსიდისგან ნიადაგში', 'ორი პატარა მთვარე: ფობოსი და დეიმოსი', 'შემდეგი ოპოზიცია: 2026 მაისი'],
    },
    tip: { en: 'At opposition you can see the polar ice caps and surface markings with 100mm+ aperture.', ka: 'ოპოზიციისას 100 მმ+ ობიექტივით ჩანს პოლარული ქუდები.' },
    kidsLine: { en: 'Scientists have sent 50 robots to explore this red world!', ka: 'მეცნიერებმა 50 რობოტი გაუშვეს ამ წითელი სამყაროს შესასწავლად!' },
    kidsFact: { en: 'Mars has the tallest volcano in the solar system — Olympus Mons is 3× taller than Everest!', ka: 'მარსზე მზის სისტემის უმაღლესი ვულკანია — ოლიმპ მონსი ევერესტზე 3-ჯერ მაღალია!' },
    color: '#c1440e',
  },
  {
    emoji: '♃', key: 'jupiter', img: '/images/planets/jupiter.jpg',
    name: { en: 'Jupiter', ka: 'იუპიტერი' },
    facts: {
      en: ['Largest planet — 1,300 Earths fit inside', 'Great Red Spot: a storm older than 400 years', '4 Galilean moons visible in binoculars'],
      ka: ['ყველაზე დიდი — 1,300 დედამიწა ეტევა', 'დიდი წითელი ლაქა: 400+ წლის ქარიშხალი', '4 გალილეური მთვარე ბინოკლით ჩანს'],
    },
    tip: { en: 'Any telescope shows cloud bands and the four Galilean moons. Opposition: Oct 2026.', ka: 'ნებისმიერ ტელესკოპში ღრუბლის ზოლები და 4 მთვარე ჩანს. ოპოზიცია: 2026 ოქტომბერი.' },
    kidsLine: { en: 'One storm here (the Great Red Spot) is bigger than Earth!', ka: 'ერთი ქარიშხალი (დიდი წითელი ლაქა) დედამიწაზე დიდია!' },
    kidsFact: { en: 'Jupiter is so big that all the other planets could fit inside it with room to spare!', ka: 'იუპიტერი იმდენად დიდია, რომ ყველა სხვა პლანეტა მასში ჩაეტევა!' },
    color: '#c88b3a',
  },
  {
    emoji: '♄', key: 'saturn', img: '/images/planets/saturn.jpg',
    name: { en: 'Saturn', ka: 'სატურნი' },
    facts: {
      en: ['Iconic ring system made of ice and rock', 'Least dense planet — would float on water', '83 known moons including giant Titan'],
      ka: ['ყინულისა და ქვის რგოლების სისტემა', 'ყველაზე ნაკლები სიმკვრივე — წყალზე ამომივა', '83 ცნობილი მთვარე, მათ შორის გიგანტური ტიტანი'],
    },
    tip: { en: 'The rings are visible in even a 60mm telescope — one of the most breathtaking sights in astronomy. Opposition: Sep 2026.', ka: '60 მმ ტელესკოპშიც კი ჩანს რგოლები. ოპოზიცია: 2026 სექტემბერი.' },
    kidsLine: { en: 'Its rings are made of billions of ice and rock pieces!', ka: 'მისი რგოლები მილიარდობით ყინულის და ქვის ნაჭრებისგან შედგება!' },
    kidsFact: { en: 'Saturn is so light it could float on water — if you had a big enough ocean!', ka: 'სატურნი იმდენად მსუბუქია, რომ წყალზე ამოვა — საკმარისი ოკეანე რომ გვქონდეს!' },
    color: '#e8d5a3',
  },
  {
    emoji: '⛢', key: 'uranus', img: '/images/planets/uranus.jpg',
    name: { en: 'Uranus', ka: 'ურანი' },
    facts: {
      en: ['Rotates on its side (98° axial tilt)', 'Blue-green color from methane in atmosphere', 'Faint rings discovered in 1977'],
      ka: ['ბრუნავს გვერდით (98° ღერძული დახრა)', 'ლურჯ-მწვანე ფერი მეთანიდან ატმოსფეროში', 'სუსტი რგოლები აღმოაჩინეს 1977 წელს'],
    },
    tip: { en: 'Visible to the naked eye in dark skies. A telescope shows its blue-green disc but little detail.', ka: 'შავ ცაზე შეიძლება შიშველი თვალით ჩანს. ტელესკოპი აჩვენებს ლურჯ-მწვანე დისკს.' },
    kidsLine: { en: "It rolls around the Sun on its side — like a bowling ball!", ka: 'მზის გარშემო გვერდულად ბრუნავს — სათამაშო ბურთივით!' },
    kidsFact: { en: 'Uranus has 27 moons, many named after characters from Shakespeare plays!', ka: 'ურანს 27 მთვარე აქვს, ბევრი შექსპირის პიესების პერსონაჟების სახელს ატარებს!' },
    color: '#7de8e8',
  },
  {
    emoji: '♆', key: 'neptune', img: '/images/planets/neptune.jpg',
    name: { en: 'Neptune', ka: 'ნეპტუნი' },
    facts: {
      en: ['Windiest planet — winds up to 2,100 km/h', 'Takes 165 years to orbit the Sun', 'Largest moon Triton orbits backwards'],
      ka: ['ყველაზე ქარიანი — 2,100 კმ/სთ', '165 წელი სჭირდება მზის გარშემო ბრუნვას', 'ყველაზე დიდი მთვარე ტრიტონი ბრუნავს საწინააღმდეგოდ'],
    },
    tip: { en: 'Requires binoculars or a telescope to see. Appears as a tiny blue dot even in large instruments.', ka: 'ბინოკლი ან ტელესკოპი სჭირდება. დიდ ინსტრუმენტშიც პატარა ლურჯი წერტილი ჩანს.' },
    kidsLine: { en: 'Winds here blow at 2,100 km/h — the fastest in the solar system!', ka: 'ქარი აქ 2,100 კმ/სთ სიჩქარით ქრის — მზის სისტემაში ყველაზე სწრაფი!' },
    kidsFact: { en: 'Neptune was discovered by math — scientists predicted where it was before looking for it!', ka: 'ნეპტუნი მათემატიკით აღმოაჩინეს — მეცნიერებმა წინასწარ განჭვრიტეს სად იქნებოდა!' },
    color: '#3f54ba',
  },
];

// ─── Deep sky objects ────────────────────────────────────────────────────────

const DSO = [
  {
    id: 'm42', emoji: '✨', img: '/images/dso/m42.jpg',
    name: { en: 'Orion Nebula (M42)', ka: 'ორიონის ნისლეული (M42)' },
    type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' },
    distance: { en: '1,344 light-years', ka: '1,344 სინათლის წელი' },
    desc: { en: 'A stellar nursery — new stars forming inside glowing gas clouds. Visible to the naked eye as the fuzzy middle "star" in Orion\'s Sword.', ka: 'ვარსკვლავთა სკოლა — ახალი ვარსკვლავები იქმნება გამნათებელ გაზის ღრუბლებში. შიშველი თვალით ჩანს ორიონის ხმლის შუა "ვარსკვლავად".' },
    scope: { en: 'Any telescope. Even binoculars show the nebula clearly.', ka: 'ნებისმიერი ტელესკოპი. ბინოკლიც კი კარგად აჩვენებს.' },
    kidsLine: { en: 'A giant baby star factory — 700 new stars are being born inside it right now!', ka: 'გიგანტური ვარსკვლავების სამეანო სახლი — 700 ახალი ვარსკვლავი იბადება ახლა!' },
    color: '#7a5fff',
  },
  {
    id: 'm31', emoji: '🌌', img: '/images/dso/m31.jpg',
    name: { en: 'Andromeda Galaxy (M31)', ka: 'ანდრომედას გალაქტიკა (M31)' },
    type: { en: 'Spiral Galaxy', ka: 'სპირალური გალაქტიკა' },
    distance: { en: '2.5 million light-years', ka: '2.5 მილიონი სინათლის წელი' },
    desc: { en: 'The nearest major galaxy and the farthest object visible to the naked eye. It contains over 1 trillion stars and is on a collision course with the Milky Way in 4.5 billion years.', ka: 'ყველაზე ახლო მთავარი გალაქტიკა. შეიცავს 1 ტრილიონზე მეტ ვარსკვლავს და ირმის ნახტომს 4.5 მილიარდ წელიწადში შეეჯახება.' },
    scope: { en: 'Visible naked eye in dark skies. Binoculars show its elliptical glow. Wide-field telescope shows dust lanes.', ka: 'შავ ცაზე შიშველი თვალით ჩანს. ბინოკლი კარგად აჩვენებს.' },
    kidsLine: { en: "The farthest thing you can see with your own eyes — 2.5 million light-years away!", ka: 'ყველაზე შორი რამ, რაც შიშველი თვალით ჩანს — 2.5 მილიონი სინათლის წელი!' },
    color: '#14b8a6',
  },
  {
    id: 'm45', emoji: '💫', img: '/images/dso/m45.jpg',
    name: { en: 'Pleiades — Seven Sisters (M45)', ka: 'პლეიადები — შვიდი და (M45)' },
    type: { en: 'Open Cluster', ka: 'ღია გროვა' },
    distance: { en: '444 light-years', ka: '444 სინათლის წელი' },
    desc: { en: 'One of the nearest and most famous star clusters. The naked eye sees 6–7 stars but binoculars reveal hundreds. Astronomers in ancient Georgia, Greece, and Japan all recorded this cluster.', ka: 'ყველაზე ახლო და ცნობილი ვარსკვლავთა გროვა. შიშველი თვალი 6–7 ვარსკვლავს ხედავს, ბინოკლი — ასობითს.' },
    scope: { en: 'Best in binoculars or a very wide-field telescope. High magnification makes it too large to fit in view.', ka: 'საუკეთესო ბინოკლით. მაღალი გადიდება ზედმეტად ზრდის.' },
    kidsLine: { en: 'These 7 sister stars have guided sailors and farmers for thousands of years!', ka: 'ეს 7 და-ვარსკვლავი ათასობით წლის განმავლობაში ზღვაოსნებსა და ფერმერებს ეხმარებოდა!' },
    color: '#38f0ff',
  },
  {
    id: 'm1', emoji: '🔭', img: '/images/dso/m1.jpg',
    name: { en: 'Crab Nebula (M1)', ka: 'კიბოს ნისლეული (M1)' },
    type: { en: 'Supernova Remnant', ka: 'სუპერნოვის ნარჩენი' },
    distance: { en: '6,523 light-years', ka: '6,523 სინათლის წელი' },
    desc: { en: 'The expanding debris cloud from a supernova explosion observed by Chinese astronomers in 1054 AD. A pulsar at its center spins 30 times per second.', ka: 'სუპერნოვის აფეთქებიდან გაფართოებული ნარჩენი — ჩინელმა ასტრონომებმა 1054 წელს დააფიქსირეს. ცენტრში პულსარი 30-ჯერ/წმ ბრუნავს.' },
    scope: { en: 'Requires 150mm+ aperture. Appears as a faint oval smudge. One of the most historically significant objects.', ka: '150 მმ+ ობიექტივი სჭირდება. სუსტი ოვალური ლაქა ჩანს.' },
    kidsLine: { en: 'This star exploded 1,000 years ago — Chinese astronomers watched it happen!', ka: 'ეს ვარსკვლავი 1,000 წლის წინ აფეთქდა — ჩინელი ასტრონომები უყურებდნენ!' },
    color: '#f59e0b',
  },
  {
    id: 'm13', emoji: '⭐', img: '/images/dso/m13.jpg',
    name: { en: 'Hercules Cluster (M13)', ka: 'ჰერკულესის გროვა (M13)' },
    type: { en: 'Globular Cluster', ka: 'გლობულარული გროვა' },
    distance: { en: '25,100 light-years', ka: '25,100 სინათლის წელი' },
    desc: { en: 'One of the finest globular clusters in the northern sky — a sphere of ~300,000 stars packed together. In 1974 scientists sent the Arecibo radio message toward it.', ka: 'ჩრდილოეთ ნახევარსფეროში ერთ-ერთი საუკეთესო გლობულარული გროვა — ~300,000 ვარსკვლავი.' },
    scope: { en: 'Small telescope shows a fuzzy ball. 150mm+ resolves individual stars at the edges. Best in summer.', ka: 'პატარა ტელესკოპი ბუნდოვან ბურთს აჩვენებს. 150 მმ+ ინდივიდუალურ ვარსკვლავებს გამოყოფს.' },
    kidsLine: { en: 'A ball of 300,000 stars all packed together — like a giant cosmic city!', ka: '300,000 ვარსკვლავი ერთად — გიგანტური კოსმოსური ქალაქივით!' },
    color: '#ffd166',
  },
  {
    id: 'm57', emoji: '💍', img: '/images/dso/m57.jpg',
    name: { en: 'Ring Nebula (M57)', ka: 'რგოლის ნისლეული (M57)' },
    type: { en: 'Planetary Nebula', ka: 'პლანეტური ნისლეული' },
    distance: { en: '2,300 light-years', ka: '2,300 სინათლის წელი' },
    desc: { en: 'A dying star\'s outer layers blown off into a glowing ring of gas. Located in Lyra, near the bright star Vega. A classic showpiece object for telescope owners.', ka: 'მომაკვდავი ვარსკვლავის გარე ფენები, გაზის გამბრწყინავ რგოლად. ლირაში, ნათელი ვეგასთან ახლოს.' },
    scope: { en: 'Requires 100mm+ telescope. The smoke-ring shape is obvious at 100× magnification.', ka: '100 მმ+ ტელესკოპი სჭირდება. 100× გადიდებაზე კვამლის რგოლი ნათლად ჩანს.' },
    kidsLine: { en: "A dead star's last breath — it puffed out its outer shell like a smoke ring!", ka: 'მომაკვდავი ვარსკვლავის ბოლო სუნთქვა — გარე გარსი კვამლის რგოლივით გამოფრქვა!' },
    color: '#34d399',
  },
  {
    id: 'm17', emoji: '🌊', img: '/images/dso/m17.jpg',
    name: { en: 'Omega Nebula (M17)', ka: 'ომეგა ნისლეული (M17)' },
    type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' },
    distance: { en: '5,500 light-years', ka: '5,500 სინათლის წელი' },
    desc: { en: 'One of the brightest nebulas in the sky — a cloud of glowing gas where new stars are actively forming. Shaped like a swan or the Greek letter Omega, depending on how you look at it.', ka: 'ცის ერთ-ერთი ყველაზე კაშკაში ნისლეული — გამბრწყინავი გაზის ღრუბელი, სადაც ახალი ვარსკვლავები იქმნება.' },
    scope: { en: 'Visible in binoculars. Any telescope shows the glowing bar clearly. 150mm+ begins to reveal wispy detail.', ka: 'ბინოკლით ჩანს. ნებისმიერი ტელესკოპი კარგად აჩვენებს.' },
    kidsLine: { en: 'A baby star factory — hundreds of new suns being born here right now!', ka: 'ვარსკვლავების სამეანო სახლი — ასობით ახალი მზე იბადება ახლა!' },
    color: '#f97316',
  },
  {
    id: 'm51', emoji: '🌀', img: '/images/dso/m51.jpg',
    name: { en: 'Whirlpool Galaxy (M51)', ka: 'მოქცევის გალაქტიკა (M51)' },
    type: { en: 'Interacting Galaxies', ka: 'ურთიერთმოქმედი გალაქტიკები' },
    distance: { en: '23 million light-years', ka: '23 მილიონი სინათლის წელი' },
    desc: { en: 'Two galaxies in the process of colliding and merging. The Whirlpool is being distorted by the gravitational pull of its smaller companion (NGC 5195). Charles Messier discovered it in 1773.', ka: 'ორი გალაქტიკა, რომლებიც ერთმანეთთან შეჯახებისა და შერწყმის პროცესშია.' },
    scope: { en: '100mm shows a faint smudge with a brighter core. 200mm+ on a dark night shows the spiral arms and the companion galaxy as a separate spot.', ka: '100 მმ აჩვენებს სუსტ ლაქას. 200 მმ+ ბნელ ღამეს ხვეული მკლავები ჩანს.' },
    kidsLine: { en: 'Two galaxies crashing into each other — this takes billions of years!', ka: 'ორი გალაქტიკა ერთმანეთს ეჯახება — ეს მილიარდობით წელს გრძელდება!' },
    color: '#6366f1',
  },
  {
    id: 'm8', emoji: '🏝️', img: '/images/dso/m8.jpg',
    name: { en: 'Lagoon Nebula (M8)', ka: 'ლაგუნა ნისლეული (M8)' },
    type: { en: 'Emission Nebula', ka: 'ემისიური ნისლეული' },
    distance: { en: '4,100 light-years', ka: '4,100 სინათლის წელი' },
    desc: { en: 'A large glowing cloud of hydrogen gas bisected by a dark dust lane that gives it the appearance of a lagoon. Home to the bright star cluster NGC 6530 — its young hot stars illuminate the surrounding gas.', ka: 'წყალბადის გაზის დიდი გამბრწყინავი ღრუბელი, რომელსაც ბნელი მტვრის ზოლი ყოფს.' },
    scope: { en: 'Visible to the naked eye in dark skies as a brighter patch of Milky Way. Binoculars show the nebula clearly. Any telescope shows the embedded star cluster.', ka: 'ბნელ ცაზე შიშველი თვალით ჩანს. ბინოკლი კარგად აჩვენებს.' },
    kidsLine: { en: 'A glowing pink cloud where baby stars are being born right now!', ka: 'ვარდისფერი გამბრწყინავი ღრუბელი, სადაც ვარსკვლავები იბადება ახლა!' },
    color: '#ec4899',
  },
  {
    id: 'ngc869', emoji: '💎', img: '/images/dso/ngc869.jpg',
    name: { en: 'Double Cluster (NGC 869 & 884)', ka: 'ორმაგი გროვა (NGC 869 & 884)' },
    type: { en: 'Open Cluster Pair', ka: 'ღია გროვის წყვილი' },
    distance: { en: '7,500 light-years', ka: '7,500 სინათლის წელი' },
    desc: { en: 'Two spectacular open star clusters sitting side by side in Perseus. Each contains hundreds of young, hot blue-white stars. They are physically related — both formed from the same giant molecular cloud roughly 13 million years ago.', ka: 'ორი შთამბეჭდავი ღია ვარსკვლავთა გროვა პერსევსში გვერდიგვერდ. თითოეული ასობით ახალ ვარსკვლავს შეიცავს.' },
    scope: { en: 'Magnificent in binoculars — both fit in the same field of view. A telescope at low power fills the eyepiece with sparkling stars.', ka: 'ბინოკლით შთამბეჭდავია — ორივე ერთ ხედვის ველში ჩანს. ტელესკოპი ვარსკვლავებით სავსე სანახაობას გვიჩვენებს.' },
    kidsLine: { en: 'Two giant star cities sitting right next to each other in space!', ka: 'ორი გიგანტური ვარსკვლავთა ქალაქი კოსმოსში გვერდიგვერდ!' },
    color: '#38f0ff',
  },
];

// ─── Constellations ──────────────────────────────────────────────────────────

const CONSTELLATIONS = [
  {
    id: 'orion',
    name: { en: 'Orion', ka: 'ორიონი' },
    img: '/images/constellations/orion.jpg',
    season: { en: 'Winter', ka: 'ზამთარი' },
    stars: 7,
    desc: { en: 'The Hunter — easiest constellation to find. Three bright stars form the famous belt.', ka: 'მონადირე — ყველაზე ადვილად მოსაძებნი. სამი კაშკაში ვარსკვლავი ქმნის სარტყელს.' },
    highlight: { en: 'Contains the Orion Nebula (M42) and red supergiant Betelgeuse', ka: 'შეიცავს ორიონის ნისლეულს (M42) და ბეთელგეიზეს' },
    color: '#f97316',
  },
  {
    id: 'ursa-major',
    name: { en: 'Ursa Major', ka: 'დიდი დათვი' },
    img: '/images/constellations/ursa-major.jpg',
    season: { en: 'Year-round (north)', ka: 'მთელი წელი (ჩრდილოეთი)' },
    stars: 7,
    desc: { en: 'The Great Bear — contains the Big Dipper, which points to the North Star.', ka: 'დიდი დათვი — შეიცავს "დიდ ჩარხს", რომელიც ჩრდილოეთის ვარსკვლავისკენ მიუთითებს.' },
    highlight: { en: 'The two end stars of the Big Dipper always point toward Polaris', ka: 'ჩარხის ორი ბოლო ვარსკვლავი ყოველთვის პოლარისისკენ მიუთითებს' },
    color: '#38f0ff',
  },
  {
    id: 'cassiopeia',
    name: { en: 'Cassiopeia', ka: 'კასიოპეა' },
    img: '/images/constellations/cassiopeia.jpg',
    season: { en: 'Autumn/Winter', ka: 'შემოდგომა/ზამთარი' },
    stars: 5,
    desc: { en: 'The Queen — W or M shape in the north sky. Never sets from Georgia.', ka: 'დედოფალი — W ან M ფორმა ჩრდილოეთ ცაზე. საქართველოდან არასოდეს ჩადის.' },
    highlight: { en: 'Opposite Ursa Major across the pole — use it when the Dipper is low', ka: 'პოლუსის მეორე მხარეს დიდი დათვის პირდაპირ — გამოიყენე, როდესაც ჩარხი დაბლაა' },
    color: '#8B5CF6',
  },
  {
    id: 'scorpius',
    name: { en: 'Scorpius', ka: 'მორიელი' },
    img: '/images/constellations/scorpius.jpg',
    season: { en: 'Summer', ka: 'ზაფხული' },
    stars: 18,
    desc: { en: 'The Scorpion — one of the most dramatic constellations with a curved tail dipping into the Milky Way.', ka: 'მორიელი — ერთ-ერთი ყველაზე დრამატული. მოხრილი კუდი ირმის ნახტომში ეშვება.' },
    highlight: { en: 'Antares is a red supergiant at its heart — 700× the Sun\'s diameter', ka: 'ანტარესი წითელი ზეგიგანტია — მზის 700-ჯერ დიდი' },
    color: '#ef4444',
  },
  {
    id: 'cygnus',
    name: { en: 'Cygnus', ka: 'გედი' },
    img: '/images/constellations/cygnus.jpg',
    season: { en: 'Summer/Autumn', ka: 'ზაფხული/შემოდგომა' },
    stars: 9,
    desc: { en: 'The Swan — forms a clear cross (Northern Cross) flying along the Milky Way.', ka: 'გედი — ნათელ ჯვარს ქმნის (ჩრდილოეთის ჯვარი) ირმის ნახტომში.' },
    highlight: { en: 'Deneb marks the tail — one of the most luminous stars visible to the naked eye', ka: 'დენები კუდს ნიშნავს — ერთ-ერთი ყველაზე ნათელი ვარსკვლავი' },
    color: '#FFD166',
  },
  {
    id: 'leo',
    name: { en: 'Leo', ka: 'ლომი' },
    img: '/images/constellations/leo.jpg',
    season: { en: 'Spring', ka: 'გაზაფხული' },
    stars: 9,
    desc: { en: 'The Lion — a prominent spring constellation with a backwards question-mark shape called the Sickle.', ka: 'ლომი — გაზაფხულის თვალსაჩინო თანავარსკვლავედი. კითხვის ნიშნის ფორმა "მამელს" ქმნის.' },
    highlight: { en: 'Regulus, its brightest star, sits almost exactly on the ecliptic', ka: 'რეგულუსი, ყველაზე კაშკაში ვარსკვლავი, ეკლიპტიკაზე ზის' },
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

function PlanetsTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest">
          {locale === 'ka' ? '8 პლანეტა' : '8 objects'} · {locale === 'ka' ? 'შეეხე დეტალებისთვის' : 'tap to expand'}
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

function DeepSkyTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest">
          {locale === 'ka' ? '10 ობიექტი' : '10 objects'} · {locale === 'ka' ? 'ბინოკლიდან პროფ. ტელესკოპამდე' : 'binoculars to large telescope'}
        </span>
      </div>
      {DSO.map(obj => (
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${obj.color}20`, color: obj.color }}>{obj.type[locale]}</span>
                <span className="text-slate-600 text-xs">{obj.distance[locale]}</span>
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
                  <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                    style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                    🔭 {obj.scope[locale]}
                  </div>
                </>
              )}
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
  const [showPast, setShowPast] = useState(false);
  const nextEvent = upcoming[0];

  const dayLabel = (d: number) =>
    d === 0 ? (locale === 'ka' ? 'დღეს' : 'Today')
    : d === 1 ? (locale === 'ka' ? 'ხვალ' : 'Tomorrow')
    : `${d}d`;

  return (
    <div className="flex flex-col gap-3">
      {nextEvent && (
        <div className="glass-card p-4" style={{ boxShadow: '0 0 20px rgba(255,209,102,0.04)', borderColor: 'rgba(255,209,102,0.2)' }}>
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
        <div className="glass-card overflow-hidden">
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
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; icon: string; en: string; ka: string }[] = [
  { id: 'planets',    icon: '🪐', en: 'Planets',    ka: 'პლანეტები' },
  { id: 'deepsky',    icon: '🌌', en: 'Deep Sky',   ka: 'ღრმა ცა' },
  { id: 'telescopes', icon: '🔭', en: 'Telescopes', ka: 'ტელესკოპები' },
  { id: 'quizzes',    icon: '🧠', en: 'Quizzes',    ka: 'ქვიზები' },
  { id: 'events',     icon: '📅', en: 'Sky Events', ka: 'ცის მოვლენები' },
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
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                {locale === 'ka' ? 'სტელარის აკადემია' : 'Stellar Academy'}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {locale === 'ka' ? 'ასტრონომია — დამწყებიდან პროფესიონალამდე' : 'Astronomy from first light to deep space'}
              </p>
            </div>
          </div>
          {completedQuizzes.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
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
          <button
            onClick={() => setKidsMode(k => !k)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all self-start"
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
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
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
              <span className="hidden sm:inline">{t[locale]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'planets'     && <PlanetsTab locale={locale} kidsMode={kidsMode} />}
        {tab === 'deepsky'     && <DeepSkyTab locale={locale} kidsMode={kidsMode} />}
        {tab === 'quizzes'     && <QuizzesTab locale={locale} onStart={setActiveQuiz} />}
        {tab === 'events'      && <EventsTab locale={locale} />}
        {tab === 'telescopes'  && <TelescopesTab />}
      </div>
    </>
  );
}
