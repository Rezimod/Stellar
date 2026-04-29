import Link from 'next/link';

interface Row {
  name: string;
  detail: string;
  stars: number;
}

const ROWS: Row[] = [
  { name: 'The Moon',     detail: 'Naked eye · beginner', stars: 50 },
  { name: 'Jupiter',      detail: 'Galilean moons',       stars: 75 },
  { name: 'Saturn',       detail: 'Ring system',          stars: 100 },
  { name: 'Andromeda',    detail: 'Deep sky · hard',      stars: 175 },
  { name: 'Crab Nebula',  detail: 'Expert',               stars: 250 },
];

export default function MissionsSection() {
  return (
    <section className="py-16 md:py-24 bg-[linear-gradient(180deg,transparent_0%,rgba(94, 234, 212,0.025)_100%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--seafoam)]/70">
            03 · MISSIONS
          </span>
          <h2 className="mt-3 font-display font-medium tracking-[-0.02em] text-[24px] md:text-[32px] text-[#E8E6DD]">
            Seven missions await.
          </h2>
          <p className="mt-3 text-[13px] md:text-[14px] leading-[1.65] text-[rgba(232,230,221,0.6)] max-w-[440px]">
            From the Moon to the Crab Nebula. Each verified observation earns Stars
            and mints a compressed NFT to your wallet.
          </p>
          <Link
            href="/missions"
            className="mt-6 inline-flex items-center justify-center rounded-lg border-[0.5px] border-[rgba(94, 234, 212,0.3)] bg-[rgba(94, 234, 212,0.12)] px-5 py-2.5 text-[12px] font-medium text-[var(--seafoam)] transition-colors hover:bg-[rgba(94, 234, 212,0.18)]"
          >
            View missions  →
          </Link>
        </div>

        <div className="rounded-[14px] border-[0.5px] border-[rgba(232,230,221,0.08)] bg-[rgba(232,230,221,0.025)] p-[14px] md:p-[18px]">
          {ROWS.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-baseline justify-between py-3 ${
                i < ROWS.length - 1 ? 'border-b-[0.5px] border-[rgba(232,230,221,0.06)]' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-[13px] md:text-[14px] text-[#E8E6DD]">
                  {row.name}
                </div>
                <div className="mt-0.5 text-[10px] text-[rgba(232,230,221,0.45)]">
                  {row.detail}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-[var(--terracotta)] font-mono">
                +{row.stars} ✦
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
