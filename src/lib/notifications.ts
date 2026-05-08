export const NOTIFICATION_CATEGORIES = [
  'tonightTargets',
  'planetAlerts',
  'rareEvents',
  'clearSky',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationPrefs = {
  master: boolean;
} & Record<NotificationCategory, boolean>;

export const DEFAULT_PREFS: NotificationPrefs = {
  master: false,
  tonightTargets: true,
  planetAlerts: true,
  rareEvents: true,
  clearSky: true,
};

export const PREFS_STORAGE_KEY = 'stellar.notification.prefs';

export function readPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: NotificationPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function notify(
  category: NotificationCategory,
  title: string,
  body: string,
  opts: { tag?: string; icon?: string } = {},
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const prefs = readPrefs();
  if (!prefs.master || !prefs[category]) return;
  try {
    new Notification(title, {
      body,
      tag: opts.tag ?? `stellar-${category}`,
      icon: opts.icon ?? '/icon.png',
      silent: false,
    });
  } catch {
    /* noop */
  }
}
