import { describe, expect, it } from 'vitest';
import { jumpChoices, lightYearsBetween, resolveDestination } from '@/lib/solar-system/star-routes';

describe('star routes', () => {
  it('falls back to the default hop when the pick is the current system', () => {
    expect(resolveDestination('sol', 'sol')).toBe('alphaCentauri');
    expect(resolveDestination('gargantua', 'gargantua')).toBe('sol');
    expect(resolveDestination('alphaCentauri', '')).toBe('sol');
    expect(resolveDestination('sol', 'gargantua')).toBe('gargantua');
  });

  it('measures the routes in light years', () => {
    expect(lightYearsBetween('sol', 'alphaCentauri')).toBeCloseTo(4.37);
    expect(lightYearsBetween('alphaCentauri', 'gargantua')).toBeGreaterThan(1e9);
    expect(lightYearsBetween('sol', 'sol')).toBe(0);
  });

  it('offers every system except the one the ship is in, Gargantua included from any', () => {
    expect(jumpChoices('sol')).toEqual(['alphaCentauri', 'gargantua']);
    expect(jumpChoices('alphaCentauri')).toEqual(['sol', 'gargantua']);
    expect(jumpChoices('gargantua')).toEqual(['sol', 'alphaCentauri']);
  });
});
