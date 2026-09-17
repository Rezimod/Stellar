import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentQuality, detectQuality, onQualityChange, qualityProfile, QUALITY_LEVELS, resetQualityDetection, type DeviceSignals } from '@/game/quality';
import { resetSettings, updateSettings } from '@/game/settings';

const desktop: DeviceSignals = { gpu: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640, OpenGL 4.1)', cores: 4, touch: false, width: 1440, memoryGB: 16 };

describe('quality presets', () => {
  beforeEach(() => { localStorage.clear(); resetSettings(); resetQualityDetection(); });

  it('the target Mac (Iris Plus 640, 4 cores) starts balanced', () => {
    expect(detectQuality(desktop)).toBe('balanced');
  });
  it('touch, narrow, few cores or little memory start on performance', () => {
    expect(detectQuality({ ...desktop, touch: true })).toBe('performance');
    expect(detectQuality({ ...desktop, width: 720 })).toBe('performance');
    expect(detectQuality({ ...desktop, cores: 2 })).toBe('performance');
    expect(detectQuality({ ...desktop, memoryGB: 2 })).toBe('performance');
    expect(detectQuality({ ...desktop, gpu: 'Google SwiftShader' })).toBe('performance');
  });
  it('a strong GPU with enough cores starts high; unknown hardware stays balanced', () => {
    expect(detectQuality({ ...desktop, gpu: 'ANGLE (Apple, Apple M2, OpenGL 4.1)', cores: 8 })).toBe('high');
    expect(detectQuality({ ...desktop, gpu: 'NVIDIA GeForce RTX 3060', cores: 12 })).toBe('high');
    expect(detectQuality({ ...desktop, gpu: 'NVIDIA GeForce RTX 3060', cores: 4 })).toBe('balanced');
    expect(detectQuality({ ...desktop, gpu: '', cores: 8 })).toBe('balanced');
  });
  it('every preset is ordered: nothing costs more on a lower preset', () => {
    const [p, b, h] = QUALITY_LEVELS.map(qualityProfile);
    expect(p.maxPixelRatio).toBeLessThanOrEqual(b.maxPixelRatio);
    expect(b.maxPixelRatio).toBeLessThanOrEqual(h.maxPixelRatio);
    expect(p.shadowMapSize).toBeLessThanOrEqual(b.shadowMapSize);
    expect(p.dustMax).toBeLessThanOrEqual(b.dustMax);
    expect(p.printsMax).toBeLessThanOrEqual(b.printsMax);
    expect(p.stars).toBeLessThanOrEqual(b.stars);
    expect(p.propDensity).toBeLessThanOrEqual(b.propDensity);
    expect(p.msaa).toBeLessThanOrEqual(h.msaa);
    expect(p.lite).toBe(true);
    expect(b.lite).toBe(false);
  });
  it('the player\'s choice overrides the device, and listeners hear only real changes', () => {
    const seen: string[] = [];
    const off = onQualityChange((q) => seen.push(q.level));
    const auto = currentQuality().level;
    updateSettings({ quality: 'performance' });
    expect(currentQuality().level).toBe('performance');
    updateSettings({ sensitivity: 2 });
    updateSettings({ quality: 'performance' });
    updateSettings({ quality: 'high' });
    expect(seen).toEqual(auto === 'performance' ? ['high'] : ['performance', 'high']);
    off();
    updateSettings({ quality: 'balanced' });
    expect(seen.length).toBe(auto === 'performance' ? 1 : 2);
    vi.restoreAllMocks();
  });
});
