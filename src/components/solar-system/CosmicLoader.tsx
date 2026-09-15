interface CosmicLoaderProps {
  label: string;
  detail?: string;
  className?: string;
}

/** Deterministic pseudo-random stars, so the server and the client draw the same sky. */
function starShadows(count: number, seed: number, size: number): string {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rnd() * 100);
    const y = Math.round(rnd() * 100);
    const a = (0.25 + rnd() * 0.65).toFixed(2);
    out.push(`${x}vw ${y}vh 0 ${size}px rgba(236, 240, 255, ${a})`);
  }
  return out.join(',');
}
const NEAR = starShadows(90, 7, 0);
const FAR = starShadows(160, 131, 0);

/** The wait before a 3D scene: a small orrery turning over a starfield. */
export function CosmicLoader({ label, detail, className }: CosmicLoaderProps) {
  return (
    <div className={className ? `cosmic-loader ${className}` : 'cosmic-loader'} role="status" aria-live="polite">
      <span className="cosmic-loader__stars" style={{ boxShadow: FAR }} aria-hidden />
      <span className="cosmic-loader__stars cosmic-loader__stars--near" style={{ boxShadow: NEAR }} aria-hidden />
      <div className="cosmic-loader__system" aria-hidden>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--1"><i /></span>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--2"><i /></span>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--3"><i /></span>
        <span className="cosmic-loader__sun" />
      </div>
      <p className="cosmic-loader__label">{label}</p>
      {detail && <p className="cosmic-loader__detail">{detail}</p>}
      <span className="cosmic-loader__bar" aria-hidden><i /></span>
    </div>
  );
}
