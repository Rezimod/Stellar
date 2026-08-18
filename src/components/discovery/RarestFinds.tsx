import Link from 'next/link';
import { RAREST_FINDS, shortWallet } from '@/lib/discovery/mockLeaderboard';
import { passIdFor } from '@/lib/discovery/passId';
import { TIER_BY_ID, rewardLine } from '@/lib/discovery/tiers';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The rarest objects found so far, rarest first, ties broken by who got there
 * first. `View` opens the find's public page — the same URL a holder shares.
 * These rows are mock, so the page derives its own object from the wallet and
 * pass number rather than showing the name listed here; the real indexer will
 * put the two in agreement.
 */
export default function RarestFinds() {
  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {RAREST_FINDS.map((find, i) => {
        const tier = TIER_BY_ID[find.tier];
        const legendary = find.tier === 'legendary';

        return (
          <li
            key={`${find.objectId}-${find.passNumber}`}
            className={legendary ? 'dsc-lb-row dsc-lb-row--legendary' : 'dsc-lb-row'}
            style={{ '--dsc-tier': tier.color } as React.CSSProperties}
          >
            <span className="dsc-lb-rank">{pad(i + 1)}</span>

            <div className="dsc-lb-body">
              <span className="dsc-lb-name">{find.name}</span>

              <div className="dsc-lb-meta">
                <span className="dsc-lb-badge-col">
                  <span
                    className={
                      legendary
                        ? 'dsc-badge dsc-badge--rarity dsc-badge--legendary'
                        : 'dsc-badge dsc-badge--rarity'
                    }
                  >
                    {tier.name}
                  </span>
                </span>

                <span className="dsc-lb-wallet" title={find.wallet}>
                  {shortWallet(find.wallet)}
                </span>

                <span className="dsc-lb-reward">{rewardLine(find.tier)}</span>
              </div>
            </div>

            <Link
              href={`/discovery/${passIdFor(find.wallet, find.passNumber)}`}
              className="dsc-lb-view"
              aria-label={`View ${find.name}`}
            >
              View
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
