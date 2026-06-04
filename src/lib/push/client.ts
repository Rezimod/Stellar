// Client-side Web Push: register the service worker, manage the subscription,
// and sync it to the server. All functions no-op gracefully where push is
// unsupported (older browsers, iOS Safari before a home-screen install).

const SW_URL = '/sw.js';

export interface PushMeta {
  wallet?: string | null;
  lat?: number;
  lon?: number;
  city?: string;
  prefs?: Record<string, boolean>;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Register the SW, subscribe to push, and store the subscription server-side. */
export async function enablePush(meta: PushMeta): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return false;

  try {
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: json.keys,
        wallet: meta.wallet ?? undefined,
        lat: meta.lat,
        lon: meta.lon,
        city: meta.city,
        prefs: meta.prefs,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Update the stored prefs/location for the existing subscription, if any. */
export async function syncPushMeta(meta: PushMeta): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: json.keys,
        wallet: meta.wallet ?? undefined,
        lat: meta.lat,
        lon: meta.lon,
        city: meta.city,
        prefs: meta.prefs,
      }),
    });
  } catch {
    /* best-effort */
  }
}

/** Unsubscribe locally and remove the subscription server-side. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch {
    /* best-effort */
  }
}
