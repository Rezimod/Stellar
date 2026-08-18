'use client';

import { useState } from 'react';
import type { DiscoveryFind } from '@/lib/discovery/mockLeaderboard';

/**
 * Downloads the legendary holders as CSV, for the telescope shipping list.
 *
 * Built in the browser from rows the server already sent — there is no export
 * endpoint yet, and inventing one would mean inventing the indexer behind it.
 */

const HEADERS = ['wallet', 'pass_number', 'object', 'reward'] as const;

/** RFC 4180: quote every field, double any embedded quote. */
function toCsv(rows: DiscoveryFind[], reward: string): string {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    HEADERS.join(','),
    ...rows.map((r) => [r.wallet, r.passNumber, r.name, reward].map(cell).join(',')),
  ];
  return lines.join('\r\n');
}

export default function LegendaryExport({
  holders,
  reward,
}: {
  holders: DiscoveryFind[];
  reward: string;
}) {
  const [done, setDone] = useState(false);

  function exportCsv() {
    const blob = new Blob([toCsv(holders, reward)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stellarr-legendary-holders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDone(true);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="dsc-cta"
        style={{ maxWidth: 340 }}
        onClick={exportCsv}
        disabled={holders.length === 0}
      >
        Export Legendary Holder Addresses
      </button>
      <p
        role="status"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11.5,
          color: 'var(--dsc-ghost-dim)',
          margin: 0,
        }}
      >
        {holders.length === 0
          ? 'No legendary holders yet — the draw happens at reveal.'
          : done
            ? `Exported ${holders.length} addresses.`
            : `${holders.length} addresses, CSV.`}
      </p>
    </div>
  );
}
