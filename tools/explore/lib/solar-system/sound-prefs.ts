// One switch for every sound Explore Mode and the Moon make, kept on the
// device. Both synthesisers read it when they are built and follow it while
// they live, so a pilot who wants a silent deck gets one everywhere.

const KEY = 'stellar_sound';
const listeners = new Set<(on: boolean) => void>();
let cached: boolean | null = null;

export function soundOn(): boolean {
  if (cached !== null) return cached;
  try {
    cached = typeof localStorage === 'undefined' ? true : localStorage.getItem(KEY) !== 'off';
  } catch {
    cached = true;
  }
  return cached;
}

export function setSoundOn(on: boolean) {
  cached = on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // Private mode — the switch lives for the session only.
  }
  for (const l of listeners) l(on);
}

export function onSoundChange(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
