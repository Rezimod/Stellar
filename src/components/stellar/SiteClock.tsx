'use client';

import { useEffect, useState } from 'react';

/** The time at the telescope, ticking. Server and first paint print nothing, so hydration never disagrees. */
export default function SiteClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <>—</>;
  return <>{new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(now)}</>;
}
