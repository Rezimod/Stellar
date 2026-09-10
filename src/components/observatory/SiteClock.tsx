'use client';

import { useEffect, useState } from 'react';

/**
 * The site's wall clock, ticking.
 *
 * Rendered blank on the server: the page is cached for minutes and a clock
 * baked into it would be wrong for all of them. The dashes are the same width
 * as the digits, so nothing shifts when the browser takes over.
 */
export default function SiteClock({ timezone }: { timezone: string }) {
  const [stamp, setStamp] = useState('--:--:--');

  useEffect(() => {
    const format = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const tick = () => setStamp(format.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  return <span className="obs-clock">{stamp}</span>;
}
