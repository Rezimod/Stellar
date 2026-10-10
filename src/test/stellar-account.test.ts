import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock('@/components/stellar/usePrivySafe', () => ({ usePrivySafe: () => ({ login: () => {}, logout: async () => {} }) }));
vi.mock('@/components/stellar/useStellarHolder', () => ({
  useStellarHolder: () => ({ ready: true, authenticated: true, address: 'So1anaWa11etAddre55xxxxxxxxxxxxxxxxxxxxxxx' }),
}));
import StellarAccount from '@/components/stellar/StellarAccount';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.unstubAllGlobals());

it('keeps balances out of the header and shows USDC in the profile, behind a helmet', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).startsWith('/api/stellar/holder') ? { cards: 24 } : { result: { value: [{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: 12.5 } } } } } }] } }),
  })));
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(StellarAccount)));
  await act(async () => {});
  expect(host.querySelector('.sd-acct')?.textContent).toContain('24');
  expect(host.querySelector('.sd-acct')?.textContent).not.toMatch(/SOL|USDC/);
  expect(host.querySelector('.sd-avatar .sd-helmet')).not.toBeNull();
  await act(async () => (host.querySelector('.sd-avatar') as HTMLButtonElement).click());
  expect(host.querySelector('.sd-menu__usdc')?.textContent).toContain('12.50');
  expect(host.querySelector('.sd-menu__usdc')?.textContent).toContain('USDC');
  await act(async () => root.unmount());
  host.remove();
});
