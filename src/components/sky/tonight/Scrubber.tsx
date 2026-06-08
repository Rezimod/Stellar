import { scrubber } from './data';

// Maps a 24h-relative hour onto the footer track. The night band can wrap past
// midnight, so values are normalised against a 24h window starting at 12:00.
function pct(hour: number) {
  const start = 12;
  return ((hour - start + 24) % 24 / 24) * 100;
}

export default function Scrubber() {
  const nowPct = pct(scrubber.now);
  const bandStart = pct(scrubber.nightStart);
  const bandEnd = pct(scrubber.nightEnd);
  const bandWidth = (bandEnd - bandStart + 100) % 100;

  return (
    <footer className="scrubber">
      <span className="scrubber__cap">12 PM</span>
      <div className="scrubber__track">
        <span className="scrubber__night" style={{ left: `${bandStart}%`, width: `${bandWidth}%` }} />
        {scrubber.marks.map((m, i) => (
          <span key={i} className="scrubber__tick" style={{ left: `${(i / (scrubber.marks.length - 1)) * 100}%` }}>
            <span className="scrubber__tick-label">{m}</span>
          </span>
        ))}
        <span className="scrubber__now" style={{ left: `${nowPct}%` }}>
          <span className="scrubber__now-dot" />
        </span>
      </div>
      <span className="scrubber__cap">12 PM</span>
    </footer>
  );
}
