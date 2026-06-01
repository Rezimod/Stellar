import * as Location from 'expo-location';

export type Observer = { lat: number; lon: number; source: 'gps' | 'default' };

// Astroman's home sky — used until GPS is available or if permission is denied.
export const DEFAULT_OBSERVER: Observer = { lat: 41.7151, lon: 44.8271, source: 'default' };

/**
 * Current observer location for ephemeris. Balanced accuracy is plenty for sky
 * positions (a few km of error is negligible for altitude/azimuth) and is fast
 * and battery-cheap. Falls back to Tbilisi on denial or error — the agent
 * always has a valid sky to compute.
 */
export async function getObserverLocation(): Promise<Observer> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DEFAULT_OBSERVER;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' };
  } catch {
    return DEFAULT_OBSERVER;
  }
}
