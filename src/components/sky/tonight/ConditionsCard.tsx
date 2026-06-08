import { conditions } from './data';

export default function ConditionsCard() {
  const { cells, bortle } = conditions;
  return (
    <article className="card cond">
      <div className="cond__grid">
        {cells.map((c) => (
          <div key={c.label} className={`cond__cell cond__cell--${c.tone}`}>
            <span className="cond__label">{c.label}</span>
            <span className="cond__value">
              {c.value}
              <span className="cond__unit">{c.unit}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="cond__bortle">
        <span className="cond__bortle-label">BORTLE</span>
        <span className="cond__scale" aria-hidden="true">
          {Array.from({ length: bortle.total }, (_, i) => (
            <span key={i} className={`cond__seg${i < bortle.lit ? ' cond__seg--lit' : ''}`} />
          ))}
        </span>
        <span className="cond__bortle-num">{bortle.lit} / {bortle.total}</span>
      </div>
    </article>
  );
}
