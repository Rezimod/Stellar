'use client';

import dynamic from 'next/dynamic';

// TonightAtAGlance lives ~80% of the way down the home page and pulls in
// astronomy-engine (~100KB min) plus the sky-data hook. There is zero reason
// to ship that JS in the initial bundle — defer until the client hydrates and
// the user has scrolled near it. SSR is skipped because the component is
// purely client-driven (geolocation + live planet positions) and renders a
// skeleton that matches its own loading state during hydration.
const TonightAtAGlance = dynamic(() => import('./TonightAtAGlance'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse max-w-[1000px] mx-auto" aria-hidden>
      <div className="grid items-center gap-7 md:gap-14 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col items-center">
          <div className="aspect-square w-full max-w-[230px] md:max-w-[360px] mx-auto rounded-full bg-white/[0.04]" />
          <div className="mt-5 h-3 w-60 max-w-full bg-white/[0.05] rounded" />
          <div className="mt-5 grid grid-cols-3 gap-2 w-full max-w-[340px]">
            <div className="h-14 bg-white/[0.04] rounded" />
            <div className="h-14 bg-white/[0.04] rounded" />
            <div className="h-14 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-7 bg-white/[0.03] rounded" />
          ))}
        </div>
      </div>
    </div>
  ),
});

export default TonightAtAGlance;
