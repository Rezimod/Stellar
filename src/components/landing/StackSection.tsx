interface StackCard {
  tag: string;
  name: string;
  desc: string;
}

const CARDS: StackCard[] = [
  { tag: 'L1',     name: 'Solana',     desc: 'Compressed NFTs via Bubblegum, gasless mints.' },
  { tag: 'AUTH',   name: 'Privy',      desc: 'Email login. Embedded wallet. No seed phrase.' },
  { tag: 'AI',     name: 'Claude',     desc: 'ASTRA companion + photo verification.' },
  { tag: 'ORACLE', name: 'Open-Meteo', desc: 'Sky conditions hashed and sealed on chain.' },
];

export default function StackSection() {
  return (
    <section className="py-16 md:py-24 bg-white/[0.012] border-t-[0.5px] border-[rgba(232,230,221,0.06)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-[640px] text-center mb-8 md:mb-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(232,230,221,0.4)]">
          05 · THE STACK
        </span>
        <h2 className="mt-3 font-display font-medium tracking-[-0.02em] text-[24px] md:text-[32px] text-[#F8F4EC]">
          Invisible infrastructure.
        </h2>
        <p className="mt-3 text-[13px] md:text-[14px] text-[rgba(232,230,221,0.55)]">
          Real Solana underneath. Zero crypto on the surface.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map((c) => (
          <div
            key={c.tag}
            className="rounded-[10px] border-[0.5px] border-[rgba(232,230,221,0.08)] p-[14px] md:p-[18px]"
          >
            <div className="font-mono text-[9px] tracking-[0.18em] text-[rgba(232,230,221,0.4)]">
              {c.tag}
            </div>
            <div className="mt-2 font-display text-[15px] md:text-[16px] text-[#F8F4EC]">
              {c.name}
            </div>
            <p className="mt-1.5 text-[11px] leading-[1.5] text-[rgba(232,230,221,0.5)]">
              {c.desc}
            </p>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
