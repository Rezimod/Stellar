'use client';

import { useEffect, useRef } from 'react';

// setInterval that only ticks while the tab is visible.
// Pauses on visibilitychange → 'hidden' and resumes on 'visible' so
// background tabs stop burning CPU + battery.
export function useVisibleInterval(
  callback: () => void,
  delay: number | null,
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    let id: number | null = null;

    const start = () => {
      if (id !== null) return;
      id = window.setInterval(() => savedCallback.current(), delay);
    };
    const stop = () => {
      if (id === null) return;
      window.clearInterval(id);
      id = null;
    };

    if (typeof document === 'undefined' || !document.hidden) start();
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [delay]);
}
