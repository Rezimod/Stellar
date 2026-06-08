import CelestialIcon from './CelestialIcon';
import { prime } from './data';

export default function PrimeCard() {
  return (
    <article className="prime">
      <div className="prime__head">
        <span className="prime__kicker">
          <span className="prime__pulse" aria-hidden="true" />
          {prime.kicker}
        </span>
        <span className="prime__alt">{prime.alt}</span>
      </div>

      <div className="prime__hero">
        <CelestialIcon kind="saturn" size={76} className="prime__pic" />
        <div className="prime__title">
          <h2 className="prime__name">{prime.name}</h2>
          <p className="prime__tagline">{prime.tagline}</p>
        </div>
      </div>

      <div className="prime__stats">
        {prime.stats.map((s) => (
          <div key={s.label} className="prime__stat">
            <span className="prime__stat-label">{s.label}</span>
            <span className="prime__stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="prime__events">
        {prime.events.map((e) => (
          <span key={e.label} className="prime__event">
            <span className="prime__event-label">{e.label}</span>
            <span className="prime__event-value">{e.value}</span>
          </span>
        ))}
      </div>

      <button type="button" className="prime__cta">
        Observe {prime.name}
        <span className="prime__reward">{prime.reward}</span>
      </button>
    </article>
  );
}
