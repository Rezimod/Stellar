'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const TonightAtAGlance = dynamic(() => import('./TonightAtAGlance'), {
  ssr: false,
});

function TonightSkeleton() {
  return (
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
  );
}

export default function TonightAtAGlanceLazy() {
  const gateRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = gateRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={gateRef}>
      {ready ? <TonightAtAGlance /> : <TonightSkeleton />}
    </div>
  );
}
