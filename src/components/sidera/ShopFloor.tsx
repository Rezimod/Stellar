import type { CSSProperties } from 'react';
import ShopCard, { type ShopCardProps } from './ShopCard';

/** The set laid out to browse, scarcest first. */
export default function ShopFloor({ cards }: { cards: ShopCardProps[] }) {
  return (
    <div className="sd-floor">
      <ul className="sd-floor__grid">
        {cards.map((c, i) => (
          <li key={c.designation} className="sd-shelf__item is-in" style={{ '--i': i } as CSSProperties}>
            <ShopCard {...c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
