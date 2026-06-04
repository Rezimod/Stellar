import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, ne, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { pushSubscription } from '@/lib/schema';
import { getTonightSky, type TonightSky } from '@/lib/tonight-sky';
import { getUpcomingEvents } from '@/lib/astro-events';
import { sendPush, pushConfigured, type PushPayload } from '@/lib/push/send';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Only notify when tonight is genuinely worth going out for.
const CLEAR_SKY_THRESHOLD = 65;
const MAX_BATCH = 500;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends the project's CRON_SECRET as a bearer token.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, skipped: 'no-db' });
  if (!pushConfigured()) return NextResponse.json({ ok: true, skipped: 'no-vapid' });

  const today = todayStr();

  // Skip devices already notified today (one push/day max).
  const subs = await db
    .select()
    .from(pushSubscription)
    .where(or(isNull(pushSubscription.lastNotifiedDate), ne(pushSubscription.lastNotifiedDate, today)))
    .limit(MAX_BATCH);

  // Event reminder takes priority over clear-sky; computed once for everyone.
  const upcoming = getUpcomingEvents(new Date(), 1);
  const eventToday = upcoming.find((e) => e.date === today) ?? null;

  // Cache sky by ~1km location bucket so we don't refetch weather per device.
  const skyCache = new Map<string, Promise<TonightSky | null>>();
  function skyFor(lat: number, lon: number): Promise<TonightSky | null> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    let p = skyCache.get(key);
    if (!p) {
      p = getTonightSky(lat, lon).catch(() => null);
      skyCache.set(key, p);
    }
    return p;
  }

  let sent = 0;
  let gone = 0;

  for (const sub of subs) {
    let payload: PushPayload | null = null;
    // Respect the user's toggles. Legacy rows with no prefs get everything.
    const prefs = (sub.prefs as Record<string, boolean> | null) ?? {};
    const wantsEvents = prefs.skyEvents !== false;
    const wantsWeather = prefs.weatherAlerts !== false;

    if (eventToday && wantsEvents) {
      payload = {
        title: `Tonight: ${eventToday.name}`,
        body: eventToday.infoBar || 'A sky event peaks tonight — tap for details.',
        url: '/missions',
        tag: `event-${eventToday.date}`,
      };
    } else if (wantsWeather && sub.lat != null && sub.lon != null) {
      const sky = await skyFor(sub.lat, sub.lon);
      if (sky && sky.score.score >= CLEAR_SKY_THRESHOLD && sky.bestTarget) {
        const place = sub.city ? ` over ${sub.city}` : '';
        payload = {
          title: `Clear skies${place} tonight`,
          body: `${sky.bestTarget.name} is ${sky.bestTarget.placement}. Tap to find it.`,
          url: '/sky',
          tag: `clearsky-${today}`,
        };
      }
    }

    if (!payload) continue;

    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload,
    );
    if (result === 'gone') {
      await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint));
      gone++;
    } else if (result === 'ok') {
      await db
        .update(pushSubscription)
        .set({ lastNotifiedDate: today })
        .where(eq(pushSubscription.endpoint, sub.endpoint));
      sent++;
    }
  }

  return NextResponse.json({ ok: true, candidates: subs.length, sent, gone, event: eventToday?.name ?? null });
}
