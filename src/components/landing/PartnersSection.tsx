export default function PartnersSection() {
  return (
    <section className="border-y border-[rgba(232,230,221,0.06)] py-7 md:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 md:gap-x-9">
        <span className="font-serif text-[15px] md:text-[17px] text-[rgba(232,230,221,0.7)]">
          Astroman
        </span>

        <span aria-hidden className="hidden md:block h-[14px] w-px bg-[rgba(232,230,221,0.12)]" />

        <span className="font-sans text-[12px] md:text-[14px] font-medium tracking-[0.16em] md:tracking-[0.22em] text-[rgba(232,230,221,0.55)]">
          BRESSER
        </span>

        <span aria-hidden className="hidden md:block h-[14px] w-px bg-[rgba(232,230,221,0.12)]" />

        <span className="font-sans text-[12px] md:text-[14px] font-medium tracking-[0.16em] md:tracking-[0.18em] text-[rgba(232,230,221,0.55)]">
          LEVENHUK
        </span>

        <span aria-hidden className="hidden md:block h-[14px] w-px bg-[rgba(232,230,221,0.12)]" />

        <span className="font-sans text-[12px] md:text-[14px] font-medium tracking-[0.16em] md:tracking-[0.2em] text-[rgba(232,230,221,0.55)]">
          CELESTRON
        </span>
      </div>

      <p className="mx-auto mt-3.5 max-w-[400px] px-4 text-center font-serif italic text-[11px] text-[rgba(232,230,221,0.35)]">
        Real telescopes. Real partnerships. Earned in-app, redeemed in Tbilisi.
      </p>
    </section>
  );
}
