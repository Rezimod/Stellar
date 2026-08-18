import { MOCK_TICKER, shortWallet } from '@/lib/discovery/mockLeaderboard';

/**
 * Pre-reveal activity rail. MOCK — these are not real mints; the feed is here
 * so the surface exists before the indexer does.
 *
 * The list is rendered twice so the CSS translate can loop seamlessly. The
 * whole rail is aria-hidden: a duplicated, endlessly scrolling list is noise to
 * a screen reader, and the same counts are stated in the stats above it.
 */
export default function PassTicker() {
  const items = [...MOCK_TICKER, ...MOCK_TICKER];

  return (
    <div className="dsc-ticker" aria-hidden="true">
      <div className="dsc-ticker-track">
        {items.map((item, i) => (
          <span key={i} className="dsc-ticker-item">
            <b>{shortWallet(item.wallet)}</b> secured pass #{item.passNumber.toLocaleString('en-US')}
          </span>
        ))}
      </div>
    </div>
  );
}
