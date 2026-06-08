import { astra } from './data';

export default function AstraCard() {
  return (
    <article className="card astra">
      <span className="card__kicker astra__kicker">{astra.kicker}</span>
      <p className="astra__tip">{astra.tip}</p>
      <form className="astra__form" onSubmit={(e) => e.preventDefault()}>
        <input className="astra__input" placeholder={astra.placeholder} aria-label="Ask ASTRA" />
        <button type="submit" className="astra__send" aria-label="Send">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </article>
  );
}
