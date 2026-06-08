import { observingWindow as w } from './data';

export default function ObservingWindow() {
  return (
    <article className="card owin">
      <span className="card__kicker owin__kicker">{w.kicker}</span>
      <span className="owin__status">{w.status}</span>
      <div className="owin__range">{w.range}</div>
      <p className="owin__verdict">
        {w.verdict[0]}<em>{w.verdict[1]}</em>{w.verdict[2]}
      </p>
      <div className="owin__chips">
        <button type="button" className="owin__chip owin__chip--primary">Start</button>
        <button type="button" className="owin__chip">Capture</button>
        <button type="button" className="owin__chip">Remind</button>
      </div>
    </article>
  );
}
