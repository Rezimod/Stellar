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
    <div className="animate-pulse" aria-hidden>
      <div className="aspect-square w-full max-w-[360px] mx-auto rounded-full bg-white/[0.04]" />
      <div className="mt-8 h-3 w-72 max-w-full mx-auto bg-white/[0.05] rounded" />
      <div className="mt-10 grid grid-cols-3 gap-3 max-w-[480px] mx-auto">
        <div className="h-16 bg-white/[0.04] rounded" />
        <div className="h-16 bg-white/[0.04] rounded" />
        <div className="h-16 bg-white/[0.04] rounded" />
      </div>
    </div>
  ),
});

export default TonightAtAGlance;
