// One service worker for the whole site: push for the website, an offline
// cache for the game. The build id in the URL is what versions the cache.

export const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}`;
const CACHED = ['/_next/static/', '/explore/', '/solar-system/', '/brand/'];

/** Everything this page has already fetched that the worker would cache:
 *  on a first visit the worker was not in control while it loaded, so the
 *  page hands the list over and the game works offline from the next launch. */
function loadedAssets(): string[] {
  const origin = window.location.origin;
  return performance.getEntriesByType('resource')
    .map((e) => e.name)
    .filter((u) => u.startsWith(origin) && CACHED.some((p) => u.startsWith(origin + p)));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    const worker = reg.active;
    if (worker) {
      const send = () => worker.postMessage({ type: 'cache', urls: loadedAssets() });
      send();
      // The game chunk and its models arrive after this runs; send again once the page has settled.
      window.setTimeout(send, 8000);
    }
    return reg;
  } catch {
    return null;
  }
}
