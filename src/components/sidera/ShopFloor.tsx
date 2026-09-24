import ShopCard, { type ShopCardProps } from './ShopCard';

/** The set laid out to browse, scarcest first. */
export default function ShopFloor({ cards }: { cards: ShopCardProps[] }) {
  return (
    <div className="sd-floor">
      <ul className="sd-floor__grid">
        {cards.map((c) => (
          <li key={c.designation}>
            <ShopCard {...c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
