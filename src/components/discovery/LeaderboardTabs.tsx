'use client';

import { useState } from 'react';
import RarestFinds from '@/components/discovery/RarestFinds';
import TopCollectors from '@/components/discovery/TopCollectors';
import { LEGENDARY_FOUND } from '@/lib/discovery/mockLeaderboard';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

type Tab = 'finds' | 'collectors';

const TABS: { id: Tab; label: string }[] = [
  { id: 'finds', label: 'Rarest Finds' },
  { id: 'collectors', label: 'Top Collectors' },
];

export default function LeaderboardTabs() {
  const [active, setActive] = useState<Tab>('finds');

  return (
    <div className="flex flex-col gap-5">
      <div className="dsc-lb-tabs" role="tablist" aria-label="Leaderboard views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`dsc-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`dsc-panel-${tab.id}`}
            className="dsc-lb-tab"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'finds' ? (
        <div role="tabpanel" id="dsc-panel-finds" aria-labelledby="dsc-tab-finds">
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--dsc-ghost)',
              margin: '0 0 14px',
            }}
          >
            {TIER_BY_ID.legendary.count} Legendary objects exist in the universe.{' '}
            <span style={{ color: 'var(--dsc-text)', fontWeight: 600 }}>
              {LEGENDARY_FOUND} have been found.
            </span>
          </p>
          <RarestFinds />
        </div>
      ) : (
        <div role="tabpanel" id="dsc-panel-collectors" aria-labelledby="dsc-tab-collectors">
          <TopCollectors />
        </div>
      )}
    </div>
  );
}
