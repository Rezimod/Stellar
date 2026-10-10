import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';

// The account chip needs a Privy session and the feed a canvas; this test is about what the console says it is.
vi.mock('@/components/stellar/StellarAccount', () => ({ default: () => null }));
vi.mock('@/components/observatory/LiveView', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/node' }));
import ObservatoryConsole from '@/components/stellar/observatory/ObservatoryConsole';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it('marks the observatory console as a demo until first light', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(ObservatoryConsole, { tonight: null, nodeCloud: null })));
  const text = host.textContent ?? '';
  expect(host.querySelector('.sdo-demo__tag')?.textContent).toBe('Demo');
  expect(text).toContain('Simulated frames until first light, November 2026');
  expect(host.querySelector('a[href="/node"]')?.getAttribute('aria-current')).toBe('page');
  expect(text).not.toMatch(/is live|operational/i);
  await act(async () => root.unmount());
  host.remove();
});

it('opens one telescope and lists the rest as coming soon', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(ObservatoryConsole, { tonight: null, nodeCloud: null })));
  const open = [...host.querySelectorAll('button.sdo-stn')].map((b) => b.textContent);
  expect(open).toHaveLength(1);
  expect(open[0]).toContain('Live Telescope V1');
  const soon = host.querySelectorAll('.sdo-stn.is-soon');
  expect(soon).toHaveLength(4);
  for (const row of soon) expect(row.textContent).toContain('Coming soon');
  await act(async () => root.unmount());
  host.remove();
});
