import Link from "next/link";
import { getLocale } from 'next-intl/server';

export const metadata = {
  title: "Earn — Stellar",
  description:
    "Three ways to earn from the night sky. Phone, camera, telescope — all tiers welcome.",
};

const TIERS = [
  {
    key: "phone",
    label: "Phone",
    multiplier: "1.0×",
    headline: "Your phone is already a sky sensor.",
    earn: [
      { what: "Verify cloud cover for your location", reward: "5–15 ✦" },
      { what: "Spot the ISS on its evening pass", reward: "25–50 ✦" },
      { what: "Daily check-in streak", reward: "+1 ✦/day" },
    ],
    note: "No gear required. Just step outside.",
  },
  {
    key: "camera",
    label: "Camera",
    multiplier: "1.5×",
    headline: "Verified captures earn the multiplier.",
    earn: [
      { what: "Photograph the moon, a planet, a constellation", reward: "38–75 ✦" },
      { what: "Sponsored mission (Astroman pilot)", reward: "100–500 ✦" },
      { what: "Print-ready captures of rare events", reward: "royalty share" },
    ],
    note: "EXIF + reverse-image checks unlock the multiplier.",
  },
  {
    key: "telescope",
    label: "Telescope",
    multiplier: "2.0×",
    headline: "Pro missions and Astroman redemptions.",
    earn: [
      { what: "Deep-sky and high-resolution captures", reward: "150–500 ✦" },
      { what: "Stargazer Markets (weekly leaderboards)", reward: "pool prizes" },
      { what: "Redeem Stars for telescopes & gear at Astroman", reward: "real product" },
    ],
    note: "Bortle calibration boosts your score in dark-sky locations.",
  },
];

const TONIGHT = [
  {
    title: "ISS pass over Tbilisi",
    when: "22:14 — visible 5 min",
    tier: "phone",
    reward: "50 ✦",
    sponsor: null,
  },
  {
    title: "Saturn at maximum tilt",
    when: "from 22:30, all night",
    tier: "camera",
    reward: "75 ✦",
    sponsor: "Astroman",
  },
  {
    title: "Verify clear sky right now",
    when: "open until sunrise",
    tier: "phone",
    reward: "10 ✦",
    sponsor: null,
  },
];

export default async function EarnPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';
  const tiers = isKa
    ? [
        {
          key: 'phone',
          label: 'ტელეფონი',
          multiplier: '1.0×',
          headline: 'შენი ტელეფონი უკვე ცის სენსორია.',
          earn: [
            { what: 'შენი მდებარეობისთვის ღრუბლიანობის დადასტურება', reward: '5–15 ✦' },
            { what: 'ISS-ის საღამოს გადაფრენის დაფიქსირება', reward: '25–50 ✦' },
            { what: 'ყოველდღიური streak check-in', reward: '+1 ✦/დღე' },
          ],
          note: 'არანაირი აღჭურვილობა არ გჭირდება. უბრალოდ გადი გარეთ.',
        },
        {
          key: 'camera',
          label: 'კამერა',
          multiplier: '1.5×',
          headline: 'დადასტურებული კადრები მეტ ჯილდოს იღებს.',
          earn: [
            { what: 'მთვარის, პლანეტის ან თანავარსკვლავედის გადაღება', reward: '38–75 ✦' },
            { what: 'სპონსორირებული მისია (Astroman pilot)', reward: '100–500 ✦' },
            { what: 'იშვიათი მოვლენების საბეჭდი ხარისხის კადრები', reward: 'როიალთის წილი' },
          ],
          note: 'EXIF და reverse-image შემოწმება ზრდის შენს კოეფიციენტს.',
        },
        {
          key: 'telescope',
          label: 'ტელესკოპი',
          multiplier: '2.0×',
          headline: 'პროფესიონალური მისიები და Astroman-ის რეალური ჯილდოები.',
          earn: [
            { what: 'ღრმა ცის და მაღალი გარჩევადობის კადრები', reward: '150–500 ✦' },
            { what: 'Stargazer Markets (კვირის ლიდერბორდები)', reward: 'საპრიზო ფონდი' },
            { what: 'Stars-ის გადაცვლა ტელესკოპებსა და აქსესუარებზე Astroman-ში', reward: 'რეალური პროდუქტი' },
          ],
          note: 'ბნელი ცის ადგილებში ბორტლის კალიბრაცია შენს ქულას ზრდის.',
        },
      ]
    : TIERS;
  const tonightItems = isKa
    ? [
        { title: 'ISS-ის გადაფრენა თბილისზე', when: '22:14 — ხილულია 5 წუთი', tier: 'ტელეფონი', reward: '50 ✦', sponsor: null },
        { title: 'სატურნი საუკეთესო სიმაღლეზე', when: '22:30-დან, მთელი ღამე', tier: 'კამერა', reward: '75 ✦', sponsor: 'Astroman' },
        { title: 'ახლავე დაადასტურე მოწმენდილი ცა', when: 'ღიაა მზის ამოსვლამდე', tier: 'ტელეფონი', reward: '10 ✦', sponsor: null },
      ]
    : TONIGHT;
  return (
    <main className="min-h-screen bg-[#0A1735] text-white">
      {/* Hero */}
      <section className="border-b border-white/10 px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            {isKa ? 'როგორ გასცემს Stellar ჯილდოებს' : 'How Stellar pays'}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] sm:text-6xl">
            {isKa ? 'ღამის ციდან ჯილდოს მიღების სამი გზა.' : 'Three ways to earn from the night sky.'}
          </h1>
          <p className="mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            {isKa
              ? 'ტელეფონი, კამერა, ტელესკოპი — ყველა დონე იღებს ჯილდოს. დადასტურებული კადრები მეტ ქულას გაძლევს. Stars შეგიძლია Astroman-ში რეალურ ტელესკოპებზე გადაცვალო.'
              : 'Phone, camera, telescope — every tier earns. Verified captures earn more. Stars redeem for real telescopes at Astroman, or trade on-chain.'}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/observe"
              className="rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              {isKa ? 'დაიწყე ამაღამვე' : 'Start earning tonight'}
            </Link>
            <Link href="#tiers" className="text-sm text-white/70 hover:text-white">
              {isKa ? 'ნახე, როგორ მუშაობს თითოეული დონე →' : 'See how each tier earns →'}
            </Link>
          </div>
        </div>
      </section>

      {/* Tier matrix */}
      <section id="tiers" className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-3">
            {tiers.map((t) => (
              <article key={t.key} className="bg-[#0A1735] p-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
                    {t.label}
                  </h2>
                  <span className="font-mono text-2xl tabular-nums text-white">
                    {t.multiplier}
                  </span>
                </div>
                <p className="mt-6 font-display text-xl leading-snug">{t.headline}</p>
                <ul className="mt-8 divide-y divide-white/10">
                  {t.earn.map((row) => (
                    <li
                      key={row.what}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <span className="text-sm text-white/80">{row.what}</span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-white">
                        {row.reward}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-white/50">{t.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tonight */}
      <section className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl sm:text-3xl">{isKa ? 'ამაღამ, შენს ცაზე' : 'Tonight, in your sky'}</h2>
            <span className="font-mono text-xs text-white/50">
              {/* TODO: wire to /api/sky/forecast + user GPS */}
              {isKa ? 'თბილისი, საქართველო' : 'Tbilisi, GE'}
            </span>
          </div>

          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {tonightItems.map((m) => (
              <li
                key={m.title}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                      {m.tier}
                    </span>
                    {m.sponsor && (
                      <span className="rounded-sm border border-amber-500/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                        {isKa ? `სპონსორი · ${m.sponsor}` : `Sponsored · ${m.sponsor}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-base">{m.title}</p>
                  <p className="font-mono text-xs text-white/60">{m.when}</p>
                </div>
                <div className="flex items-center gap-4 sm:shrink-0">
                  <span className="font-mono text-lg tabular-nums">{m.reward}</span>
                  <Link
                    href="/observe"
                    className="rounded-md border border-white/20 px-4 py-2 text-sm hover:border-white/60"
                  >
                    {isKa ? 'დაწყება' : 'Start'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pro upsell */}
      <section className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-white/50">
              {isKa ? 'Stellar Pro' : 'Stellar Pro'}
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
              {isKa ? 'რამდენიმე ღამის დაგეგმვა.' : 'Multi-night planning.'}
              <br />
              {isKa ? 'საკუთარი შეტყობინებები. ლიმიტის გარეშე.' : 'Custom alerts. No limits.'}
            </h2>
            <p className="mt-6 text-white/70">
              {isKa
                ? 'მათთვის, ვინც ღამეს ცის მიხედვით გეგმავს. ASTRA AI ლიმიტის გარეშე, კადრების სრული ექსპორტი, ექსკლუზიური Pro მისიები და ყოველ ჯილდოზე 10%-იანი ბონუსი.'
                : 'For people who plan their nights around the sky. ASTRA AI without rate limits, full export of your captures, exclusive Pro missions, and a 10% boost on every reward.'}
            </p>
          </div>
          <div className="border border-white/10 p-8">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl tabular-nums">$7</span>
              <span className="font-mono text-sm text-white/60">{isKa ? '/ თვე' : '/ month'}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {isKa ? (
                <>
                  <li>+10% Stars ყოველ დადასტურებულ კადრზე</li>
                  <li>ASTRA-სთან ულიმიტო საუბრები</li>
                  <li>14-ღამიანი დაგეგმვა და საკუთარი შეტყობინებები</li>
                  <li>Pro-ისთვის განკუთვნილი Stargazer Markets</li>
                  <li>გაუქმება ნებისმიერ დროს</li>
                </>
              ) : (
                <>
                  <li>+10% Stars on every verified capture</li>
                  <li>Unlimited ASTRA conversations</li>
                  <li>14-night sky planning, custom alerts</li>
                  <li>Pro-only Stargazer Markets</li>
                  <li>Cancel any time</li>
                </>
              )}
            </ul>
            {/* TODO: wire to Stripe via Privy fiat onramp */}
            <button
              type="button"
              className="mt-8 w-full rounded-md bg-white py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              {isKa ? 'გახდი Pro მომხმარებელი' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </section>

      {/* Sponsorship CTA (brand pitch) */}
      <section className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            {isKa ? 'ბრენდებისთვის' : 'For brands'}
          </p>
          <h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
            {isKa ? 'გაუშვი Stargazer Market.' : 'Run a Stargazer Market.'}
            <br />
            {isKa ? 'მიაწვდინე ხმა 60,000 ასტრონომს.' : 'Reach 60,000 astronomers.'}
          </h2>
          <p className="mt-6 max-w-2xl text-white/70">
            {isKa
              ? 'ტელესკოპების ბრენდები, კამერების მწარმოებლები და ასტროტურიზმის პარტნიორები გვიერთდებიან სპონსორირებულ მისიებში ბრენდირებული პრიზებითა და დადასტურებული დაკვირვების მონაცემებით. Astroman ჩვენი მთავარი პარტნიორია.'
              : 'Telescope brands, camera makers, and astrotourism partners run sponsored missions with branded prizes and verified capture data. Astroman is our flagship customer.'}
          </p>
          <Link
            href="mailto:hello@stellarrclub.com"
            className="mt-8 inline-block rounded-md border border-white/20 px-5 py-3 text-sm hover:border-white/60"
          >
            {isKa ? 'მოგვწერე →' : 'Talk to us →'}
          </Link>
        </div>
      </section>

      {/* Trust footer */}
      <section className="border-t border-white/10 px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs leading-relaxed text-white/40">
            {isKa
              ? 'Stars არის SPL ტოკენი Solana mainnet-ზე. ჯილდოები ეფუძნება დადასტურებულ დაკვირვებებს — EXIF მეტამონაცემები, wallet-ებს შორის hash dedup და reverse-image შემოწმება განსაზღვრავს კოეფიციენტს. სტოკ ფოტოები და EXIF-ის გარეშე ატვირთვები მხოლოდ 0.25× ჯილდოს იღებს და NFT-ს არ ქმნის.'
              : 'Stars are an SPL token on Solana mainnet. Earnings are based on verified observations — EXIF metadata, cross-wallet hash dedup, and reverse-image checks gate the multiplier. Stock photos and EXIF-stripped uploads earn at 0.25× and do not mint NFTs.'}
          </p>
        </div>
      </section>
    </main>
  );
}
