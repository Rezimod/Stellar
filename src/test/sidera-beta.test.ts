// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, middleware } from '@/middleware';
import { GET as invite } from '@/app/invite/[code]/route';

const CODES = process.env.SIDERA_INVITE_CODES;
afterEach(() => {
  if (CODES === undefined) delete process.env.SIDERA_INVITE_CODES;
  else process.env.SIDERA_INVITE_CODES = CODES;
});

function request(path: string, cookie?: string) {
  return new NextRequest(`https://sidera.test${path}`, cookie ? { headers: { cookie } } : undefined);
}

/** Where a rewrite points, or null when the request passes through. */
function rewrittenTo(res: Response): string | null {
  const to = res.headers.get('x-middleware-rewrite');
  return to ? new URL(to).pathname : null;
}

describe('the invite gate', () => {
  it('is not there when no code is set', () => {
    delete process.env.SIDERA_INVITE_CODES;
    expect(rewrittenTo(middleware(request('/set/001')))).toBeNull();
  });

  it('turns a visitor without a code to the closed door', () => {
    process.env.SIDERA_INVITE_CODES = 'orion, lyra';
    expect(rewrittenTo(middleware(request('/set/001')))).toBe('/invite');
    expect(rewrittenTo(middleware(request('/', 'sidera_invite=wrong')))).toBe('/invite');
  });

  it('lets a visitor holding a code through', () => {
    process.env.SIDERA_INVITE_CODES = 'orion, lyra';
    expect(rewrittenTo(middleware(request('/collection', 'sidera_invite=lyra')))).toBeNull();
  });

  it('gates pages and nothing else', () => {
    for (const url of ['/', '/set/001', '/card/TYCHO', '/capsules', '/collection', '/tonight']) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    }
    for (const url of [
      '/api/track',
      '/_next/static/chunks/a.js',
      '/m/o',
      '/invite',
      '/invite/orion',
      '/cards/SATURN.webp',
      '/opengraph-image',
      '/_og/card',
      '/icon.svg',
      '/apple-icon.png',
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.ico',
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
    }
  });
});

describe('an invitation link', () => {
  const params = (code: string) => ({ params: Promise.resolve({ code }) });

  it('keeps a valid code and goes home', async () => {
    process.env.SIDERA_INVITE_CODES = 'orion';
    const res = await invite(request('/invite/orion'), params('orion'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toContain('sidera_invite=orion');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=31536000/);
  });

  it('sends an unknown code to the closed door', async () => {
    process.env.SIDERA_INVITE_CODES = 'orion';
    const res = await invite(request('/invite/nope'), params('nope'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/invite');
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});

describe('the retired card pages', () => {
  it('sends a card of the first Set 001 to First Light', () => {
    delete process.env.SIDERA_INVITE_CODES;
    for (const path of ['/card/MOON', '/card/M87', '/card/tranquility-base', '/card/WORMHOLE/']) {
      const res = middleware(request(path));
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get('location')!).pathname).toBe('/set/001');
    }
    expect(middleware(request('/card/HALLEY')).status).toBe(200);
  });
});
