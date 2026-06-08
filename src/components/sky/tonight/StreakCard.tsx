import { streak } from './data';

export default function StreakCard() {
  return (
    <article className="card streak">
      <div className="streak__head">
        <h4 className="streak__title">Observing streak</h4>
        <span className="streak__count">{streak.count}</span>
      </div>
      <div className="streak__grid">
        {streak.days.map((d, i) => (
          <span key={i} className={`streak__cell streak__cell--${d.state}`}>
            {d.state === 'today' ? '●' : d.state === 'lit' ? '✦' : ''}
          </span>
        ))}
      </div>
      <div className="streak__labels">
        {streak.days.map((d, i) => (
          <span key={i} className="streak__label">{d.label}</span>
        ))}
      </div>
    </article>
  );
}
