'use client';

function vibrate(ms: number) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // Silently ignore — vibration API not available
  }
}

export function useHaptic() {
  return {
    light:  () => vibrate(10),
    medium: () => vibrate(25),
    heavy:  () => vibrate(50),
  };
}
