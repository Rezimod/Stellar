import { describe, expect, it } from 'vitest';
import {
  CAPTURE_FUTURE_SLACK_MS,
  CAPTURE_MAX_AGE_MS,
  LIVE_CAPTURE_WINDOW_MS,
  classifyCaptureTime,
  normalizeUploadSource,
} from '@/lib/capture-time';

const NOW = Date.UTC(2026, 8, 5, 20, 0, 0);
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe('classifyCaptureTime', () => {
  it('accepts a capture taken just now as live', () => {
    expect(classifyCaptureTime(at(-5_000), NOW)).toMatchObject({ ok: true, live: true });
  });

  it('accepts a capture inside the live window even with slight clock skew ahead', () => {
    expect(classifyCaptureTime(at(60_000), NOW)).toMatchObject({ ok: true, live: true });
  });

  it('accepts an upload from earlier today as not live', () => {
    expect(classifyCaptureTime(at(-LIVE_CAPTURE_WINDOW_MS - 1), NOW)).toMatchObject({ ok: true, live: false });
    expect(classifyCaptureTime(at(-CAPTURE_MAX_AGE_MS), NOW)).toMatchObject({ ok: true, live: false });
  });

  it('rejects the future beyond clock skew', () => {
    expect(classifyCaptureTime(at(CAPTURE_FUTURE_SLACK_MS + 1), NOW)).toEqual({ ok: false, reason: 'future' });
  });

  it('rejects anything older than a gallery upload may be', () => {
    expect(classifyCaptureTime(at(-CAPTURE_MAX_AGE_MS - 1), NOW)).toEqual({ ok: false, reason: 'too_old' });
  });

  it('rejects garbage', () => {
    expect(classifyCaptureTime('yesterday-ish', NOW)).toEqual({ ok: false, reason: 'unparseable' });
    expect(classifyCaptureTime('', NOW)).toEqual({ ok: false, reason: 'unparseable' });
  });
});

describe('normalizeUploadSource', () => {
  it('honours a camera claim only for a live capture', () => {
    expect(normalizeUploadSource('camera', classifyCaptureTime(at(-1_000), NOW))).toBe('camera');
    expect(normalizeUploadSource('camera', classifyCaptureTime(at(-3_600_000), NOW))).toBe('upload');
    expect(normalizeUploadSource('camera', classifyCaptureTime('bad', NOW))).toBe('upload');
  });

  it('treats every other label as an upload', () => {
    expect(normalizeUploadSource('upload', classifyCaptureTime(at(-1_000), NOW))).toBe('upload');
    expect(normalizeUploadSource('CAMERA', classifyCaptureTime(at(-1_000), NOW))).toBe('upload');
  });
});
