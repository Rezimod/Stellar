// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ db: vi.fn(), holderView: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/sidera/repo', () => ({ holderView: mocks.holderView }));
import CollectionPage from '@/app/collection/page';

async function render(wallet?: string): Promise<string> {
  const element = await CollectionPage({ searchParams: Promise.resolve(wallet ? { wallet } : {}) });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue({});
});

it('renders an edition that has not been observed yet', async () => {
  mocks.holderView.mockResolvedValue([
    {
      editionId: 'e1',
      designation: 'TYCHO',
      name: 'Tycho',
      editionNumber: 1,
      editionSize: 10,
      rarity: 'rare',
      observationStatus: 'eligible',
      latest: null,
      history: [],
    },
  ]);

  const html = await render('holder-1');
  expect(mocks.holderView).toHaveBeenCalledWith({}, 'holder-1');
  expect(html).toContain('TYCHO');
  expect(html).toContain('Edition 001 of 10');
  expect(html).toContain('No observation yet');
  expect(html).not.toContain('Observation history');
});

it('lists the history of an observed card', async () => {
  const capture = { id: 'c1', targetName: 'The Moon', capturedAt: '2026-09-20T16:17:07.790Z', provenance: 'simulated', nodeId: 'tbilisi-01' };
  mocks.holderView.mockResolvedValue([
    {
      editionId: 'e1', designation: 'TYCHO', name: 'Tycho', editionNumber: 1, editionSize: 10, rarity: 'rare',
      observationStatus: 'eligible', latest: capture, history: [{ ...capture, nightDate: '2026-09-20' }],
    },
  ]);

  const html = await render('holder-1');
  expect(html).toContain('Night of 2026-09-20');
  expect(html).toContain('provenance simulated');
});

it('says the Collection cannot be read when there is no database', async () => {
  mocks.db.mockReturnValue(null);
  const html = await render('holder-1');
  expect(html).toContain('cannot be read');
  expect(mocks.holderView).not.toHaveBeenCalled();
});

it('asks for a wallet rather than querying for nothing', async () => {
  const html = await render();
  expect(html).toContain('?wallet=');
  expect(mocks.holderView).not.toHaveBeenCalled();
});
