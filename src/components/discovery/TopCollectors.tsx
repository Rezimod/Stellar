import { Crown, Medal } from 'lucide-react';
import { TOP_COLLECTORS, shortWallet } from '@/lib/discovery/mockLeaderboard';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (n: number) => n.toLocaleString('en-US');

/** Gold, silver, bronze. Beyond third place the rank digit says it better. */
const MEDALS = ['#FFDA6B', '#C8CEDA', '#C98A4B'];

export default function TopCollectors() {
  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {TOP_COLLECTORS.map((collector, i) => {
        const tier = TIER_BY_ID[collector.highestTier];
        const medal = MEDALS[i];
        const Icon = i === 0 ? Crown : Medal;

        return (
          <li
            key={collector.wallet}
            className="dsc-lb-row"
            style={{ '--dsc-tier': tier.color } as React.CSSProperties}
          >
            {medal ? (
              <span className="dsc-lb-medal" title={`Rank ${i + 1}`}>
                <Icon size={16} strokeWidth={1.75} color={medal} aria-hidden="true" />
                <span className="sr-only">{`Rank ${i + 1}`}</span>
              </span>
            ) : (
              <span className="dsc-lb-rank">{pad(i + 1)}</span>
            )}

            <div className="dsc-lb-body">
              <span className="dsc-lb-name dsc-lb-name--mono" title={collector.wallet}>
                {shortWallet(collector.wallet)}
              </span>

              <div className="dsc-lb-meta">
                <span className="dsc-lb-badge-col">
                  <span
                    className={
                      collector.highestTier === 'legendary'
                        ? 'dsc-badge dsc-badge--rarity dsc-badge--legendary'
                        : 'dsc-badge dsc-badge--rarity'
                    }
                  >
                    {tier.name}
                  </span>
                </span>

                <span className="dsc-lb-wallet">
                  {collector.passes} {collector.passes === 1 ? 'pass' : 'passes'}
                </span>

                <span className="dsc-lb-reward">{fmt(collector.strllr)} STRLLR</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
