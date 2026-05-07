import Link from "next/link";

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

export default function EarnPage() {
  return (
    <main className="min-h-screen bg-[#0A1735] text-white">
      {/* Hero */}
      <section className="border-b border-white/10 px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            How Stellar pays
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] sm:text-6xl">
            Three ways to earn from the night sky.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Phone, camera, telescope — every tier earns. Verified captures earn more. Stars
            redeem for real telescopes at Astroman, or trade on-chain.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/observe"
              className="rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              Start earning tonight
            </Link>
            <Link href="#tiers" className="text-sm text-white/70 hover:text-white">
              See how each tier earns →
            </Link>
          </div>
        </div>
      </section>

      {/* Tier matrix */}
      <section id="tiers" className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-3">
            {TIERS.map((t) => (
              <article key={t.key} className="bg-[#0A1735] p-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
                    {t.label}
                  </h2>
                  <span className="font-mono text-2xl tabular-nums text-white">
                    {t.multiplier}
                  </span>
                </div>
                <p className="mt-6 font-serif text-xl leading-snug">{t.headline}</p>
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
            <h2 className="font-serif text-2xl sm:text-3xl">Tonight, in your sky</h2>
            <span className="font-mono text-xs text-white/50">
              {/* TODO: wire to /api/sky/forecast + user GPS */}
              Tbilisi, GE
            </span>
          </div>

          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {TONIGHT.map((m) => (
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
                        Sponsored · {m.sponsor}
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
                    Start
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
              Stellar Pro
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              Multi-night planning.
              <br />
              Custom alerts. No limits.
            </h2>
            <p className="mt-6 text-white/70">
              For people who plan their nights around the sky. ASTRA AI without rate limits,
              full export of your captures, exclusive Pro missions, and a 10% boost on every
              reward.
            </p>
          </div>
          <div className="border border-white/10 p-8">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl tabular-nums">$7</span>
              <span className="font-mono text-sm text-white/60">/ month</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li>+10% Stars on every verified capture</li>
              <li>Unlimited ASTRA conversations</li>
              <li>14-night sky planning, custom alerts</li>
              <li>Pro-only Stargazer Markets</li>
              <li>Cancel any time</li>
            </ul>
            {/* TODO: wire to Stripe via Privy fiat onramp */}
            <button
              type="button"
              className="mt-8 w-full rounded-md bg-white py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>

      {/* Sponsorship CTA (brand pitch) */}
      <section className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            For brands
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
            Run a Stargazer Market.
            <br />
            Reach 60,000 astronomers.
          </h2>
          <p className="mt-6 max-w-2xl text-white/70">
            Telescope brands, camera makers, and astrotourism partners run sponsored missions
            with branded prizes and verified capture data. Astroman is our flagship customer.
          </p>
          <Link
            href="mailto:hello@stellarrclub.com"
            className="mt-8 inline-block rounded-md border border-white/20 px-5 py-3 text-sm hover:border-white/60"
          >
            Talk to us →
          </Link>
        </div>
      </section>

      {/* Trust footer */}
      <section className="border-t border-white/10 px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs leading-relaxed text-white/40">
            Stars are an SPL token on Solana mainnet. Earnings are based on verified
            observations — EXIF metadata, cross-wallet hash dedup, and reverse-image checks
            gate the multiplier. Stock photos and EXIF-stripped uploads earn at 0.25× and do
            not mint NFTs.
          </p>
        </div>
      </section>
    </main>
  );
}
