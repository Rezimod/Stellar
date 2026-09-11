'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

/**
 * The site's own date and time, top-right, the way a control room shows it.
 * Blank until the browser takes over: the page is cached and a clock baked
 * into it would be wrong for everyone who loads it later.
 */
export default function CornerClock({
  timezone,
  zoneLabel,
  children,
}: {
  timezone: string;
  zoneLabel: string;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const [stamp, setStamp] = useState<{ date: string; time: string }>({ date: '', time: '--:--' });

  useEffect(() => {
    const date = new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const tick = () => {
      const now = new Date();
      setStamp({ date: date.format(now), time: time.format(now) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone, locale]);

  return (
    <div className="obs-corner">
      <div>
        <div className="obs-corner__date">{stamp.date || ' '}</div>
        <div className="obs-corner__time">{stamp.time}</div>
        <div className="obs-corner__zone">{zoneLabel}</div>
      </div>
      {children && <div className="obs-corner__aside">{children}</div>}
    </div>
  );
}
