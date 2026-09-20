import type { Palette } from './cardArtPalette';

/**
 * The object itself, drawn the way it is recognised.
 *
 * Each card gets the one feature it is known by — Saturn's rings and the
 * Cassini division, Jupiter's spot, Mars's polar cap and Valles Marineris,
 * Pluto's heart, Europa's lineae, the Trapezium inside Orion. Nothing here is
 * a photograph and nothing pretends to be; it is a drawing made from the same
 * record the card carries.
 */

export type SceneProps = {
  designation: string;
  kind: 'lunar' | 'planet' | 'moon' | 'star' | 'deepsky';
  p: Palette;
  id: string;
  rand: () => number;
  /** Lunar cards only: where the gazetteer puts the feature. */
  lat?: number | null;
  lon?: number | null;
};

const CX = 100;
const CY = 176;

function Terminator({ r, cy = CY, tilt = 0 }: { r: number; cy?: number; tilt?: number }) {
  return (
    <path
      d={`M${CX} ${cy - r} A${r} ${r} 0 0 1 ${CX} ${cy + r} A${r * 0.62} ${r} 0 0 0 ${CX} ${cy - r}`}
      fill="#03050d"
      opacity="0.58"
      transform={tilt ? `rotate(${tilt} ${CX} ${cy})` : undefined}
    />
  );
}

function Limb({ r, color, cy = CY }: { r: number; color: string; cy?: number }) {
  return <circle cx={CX} cy={cy} r={r} fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" />;
}

function Spikes({ x, y, len, color, weight = 1 }: { x: number; y: number; len: number; color: string; weight?: number }) {
  return (
    <g stroke={color} strokeLinecap="round" opacity="0.85">
      <line x1={x - len} y1={y} x2={x + len} y2={y} strokeWidth={weight} />
      <line x1={x} y1={y - len} x2={x} y2={y + len} strokeWidth={weight} />
      <line x1={x - len * 0.5} y1={y - len * 0.5} x2={x + len * 0.5} y2={y + len * 0.5} strokeWidth={weight * 0.5} strokeOpacity="0.5" />
      <line x1={x + len * 0.5} y1={y - len * 0.5} x2={x - len * 0.5} y2={y + len * 0.5} strokeWidth={weight * 0.5} strokeOpacity="0.5" />
    </g>
  );
}

function spiral(turns: number, a: number, b: number, phase: number) {
  const pts: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = a * Math.exp(b * t);
    pts.push(`${(CX + Math.cos(t + phase) * r).toFixed(1)} ${(CY + Math.sin(t + phase) * r * 0.74).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

export default function CardScene({ designation, kind, p, id, rand, lat, lon }: SceneProps) {
  const body = `url(#${id}-body)`;

  if (kind === 'lunar') {
    const fx = CX + (lon ?? 0) * 0.78;
    const fy = CY - (lat ?? 0) * 0.78;
    const base = designation === 'TRANQUILITY-BASE';
    return (
      <g>
        <circle cx={CX} cy={CY} r="86" fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r="78" fill={body} />
        {/* The maria: the dark plains, seen from the angle this card takes. */}
        <g fill={p.shade} opacity="0.34" transform={`rotate(${-30 + rand() * 60} ${CX} ${CY})`}>
          <ellipse cx="128" cy="140" rx={26 + rand() * 10} ry={20 + rand() * 8} />
          <ellipse cx="86" cy="126" rx={18 + rand() * 8} ry={14 + rand() * 6} />
          <ellipse cx="66" cy="164" rx={15 + rand() * 7} ry={18 + rand() * 8} />
        </g>
        {Array.from({ length: 22 }, (_, i) => {
          const a = rand() * Math.PI * 2;
          const d = rand() * 70;
          const r = 2.5 + rand() * 9;
          return (
            <g key={i} opacity="0.55">
              <circle cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d} r={r} fill="#03050d" opacity="0.3" />
              <circle cx={CX + Math.cos(a) * d - r * 0.2} cy={CY + Math.sin(a) * d - r * 0.2} r={r * 0.82} fill={p.body} opacity="0.45" />
            </g>
          );
        })}
        {/* The card's own feature. Craters get their ray system; the base gets a lander. */}
        {base ? (
          <g>
            <ellipse cx={fx} cy={fy} rx="26" ry="18" fill={p.shade} opacity="0.5" />
            <g transform={`translate(${fx} ${fy}) scale(1.1)`}>
              <path d="M-5 -4 h10 l2 4 -3 3 h-8 l-3 -3 z" fill="#f2f6ff" opacity="0.95" />
              <path d="M-6 3 h12 v3 h-12 z" fill={p.shade} opacity="0.9" />
              <g stroke="#f2f6ff" strokeWidth="1" opacity="0.9">
                <line x1="-6" y1="6" x2="-9" y2="11" />
                <line x1="6" y1="6" x2="9" y2="11" />
              </g>
              <line x1="11" y1="10" x2="11" y2="-2" stroke="#f2f6ff" strokeWidth="0.8" opacity="0.8" />
              <path d="M11 -2 h7 v4 h-7 z" fill="#ffb347" opacity="0.9" />
            </g>
          </g>
        ) : (
          <g>
            <g stroke="#f5f8ff" strokeOpacity="0.32" strokeLinecap="round">
              {Array.from({ length: 18 }, (_, i) => {
                const a = (i / 18) * Math.PI * 2 + 0.3;
                const l = 26 + rand() * 54;
                return (
                  <line
                    key={i}
                    x1={fx + Math.cos(a) * 16}
                    y1={fy + Math.sin(a) * 16}
                    x2={fx + Math.cos(a) * l}
                    y2={fy + Math.sin(a) * l}
                    strokeWidth={0.6 + rand() * 1.6}
                  />
                );
              })}
            </g>
            <circle cx={fx} cy={fy} r="22" fill="#03050d" opacity="0.45" />
            <circle cx={fx - 2} cy={fy - 2} r="20" fill="#fbfdff" opacity="0.88" />
            <circle cx={fx} cy={fy} r="13" fill={p.shade} opacity="0.6" />
            <circle cx={fx + 2} cy={fy + 2} r="10" fill="#03050d" opacity="0.3" />
            <circle cx={fx} cy={fy} r="4" fill="#fbfdff" opacity="0.95" />
          </g>
        )}
        <Terminator r={78} />
        <Limb r={78} color={p.glow} />
      </g>
    );
  }

  if (designation === 'SATURN') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="82" fill={p.glow} opacity="0.08" />
        <g transform={`rotate(-17 ${CX} ${CY})`}>
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.glow} strokeOpacity="0.28" strokeWidth="16" />
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.body} strokeOpacity="0.55" strokeWidth="5" />
          <ellipse cx={CX} cy={CY} rx="98" ry="26" fill="none" stroke="#03050d" strokeOpacity="0.9" strokeWidth="2" />
          <ellipse cx={CX} cy={CY} rx="90" ry="24" fill="none" stroke={p.body} strokeOpacity="0.45" strokeWidth="6" />
        </g>
        <circle cx={CX} cy={CY} r="60" fill={body} />
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx={CX} cy={CY - 42 + i * 17} rx={58 - Math.abs(i - 2.5) * 7} ry={4.5} fill={p.shade} opacity={0.2 + rand() * 0.14} />
        ))}
        {/* The rings throw their own shadow across the southern bands. */}
        <path d={`M${CX - 58} ${CY + 12} q58 16 116 -4 v9 q-58 20 -116 4 z`} fill="#03050d" opacity="0.35" />
        <Terminator r={60} />
        <Limb r={60} color={p.glow} />
        <g transform={`rotate(-17 ${CX} ${CY})`}>
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.body} strokeOpacity="0.3" strokeWidth="1" />
        </g>
        <circle cx="168" cy="118" r="4" fill={p.body} opacity="0.7" />
        <circle cx="38" cy="238" r="2.4" fill={p.body} opacity="0.55" />
      </g>
    );
  }

  if (designation === 'JUPITER' || designation === 'GREAT-RED-SPOT') {
    const zoom = designation === 'GREAT-RED-SPOT';
    const r = zoom ? 92 : 66;
    return (
      <g>
        <circle cx={CX} cy={CY} r={r + 8} fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r={r} fill={body} />
        {Array.from({ length: 9 }, (_, i) => (
          <ellipse
            key={i}
            cx={CX}
            cy={CY - r * 0.82 + (i * r * 1.64) / 8}
            rx={Math.sqrt(Math.max(0, r * r - Math.pow(r * 0.82 - (i * r * 1.64) / 8, 2)))}
            ry={r * 0.075}
            fill={i % 2 ? p.shade : '#fdf1dd'}
            opacity={i % 2 ? 0.34 : 0.22}
          />
        ))}
        <g transform={`translate(${CX + (zoom ? 0 : 20)} ${CY + (zoom ? -6 : 16)}) rotate(-8)`}>
          <ellipse cx="0" cy="0" rx={zoom ? 54 : 17} ry={zoom ? 33 : 10} fill="#8e3a22" opacity="0.8" />
          <ellipse cx="0" cy="0" rx={zoom ? 46 : 14} ry={zoom ? 27 : 8} fill="#d4572f" opacity="0.85" />
          {zoom && (
            <g stroke="#ffb98a" fill="none" strokeLinecap="round" opacity="0.55">
              {Array.from({ length: 7 }, (_, i) => {
                const rx = 10 + i * 5.4;
                const ry = 6 + i * 3.3;
                return <ellipse key={i} cx={i * 1.4 - 4} cy={-i * 0.8} rx={rx} ry={ry} strokeWidth={1 + rand()} strokeOpacity={0.18 + rand() * 0.3} transform={`rotate(${-14 + i * 5})`} />;
              })}
            </g>
          )}
          <ellipse cx={zoom ? -4 : 0} cy={zoom ? -3 : 0} rx={zoom ? 16 : 6} ry={zoom ? 9 : 3.5} fill="#ffcfa6" opacity="0.5" />
        </g>
        <Terminator r={r} />
        <Limb r={r} color={p.glow} />
        {!zoom && (
          <g fill={p.body} opacity="0.75">
            <circle cx="172" cy="126" r="2.6" />
            <circle cx="184" cy="150" r="1.9" />
            <circle cx="24" cy="204" r="2.2" />
            <circle cx="14" cy="166" r="1.6" />
          </g>
        )}
      </g>
    );
  }

  if (designation === 'MARS') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="74" fill={p.glow} opacity="0.08" />
        <circle cx={CX} cy={CY} r="66" fill={body} />
        {/* The albedo markings: Syrtis Major high on one side, the southern
            highlands dark and broad beneath it. */}
        <g fill={p.shade}>
          <path d={`M${CX + 10} ${CY - 46} q30 6 26 34 q-20 12 -32 -4 q-8 -20 6 -30 z`} opacity="0.5" />
          <path d={`M${CX - 52} ${CY + 18} q34 -14 66 2 q-10 26 -40 26 q-24 -2 -26 -28 z`} opacity="0.34" />
          <ellipse cx={CX + 34} cy={CY + 34} rx="16" ry="9" opacity="0.26" transform={`rotate(-16 ${CX + 34} ${CY + 34})`} />
        </g>
        {/* Olympus Mons: the highest ground in the solar system, bright from here. */}
        <circle cx={CX - 30} cy={CY - 22} r="8" fill="#f6c39a" opacity="0.4" />
        <circle cx={CX - 30} cy={CY - 22} r="2.4" fill="#5d2314" opacity="0.45" />
        {/* Valles Marineris. */}
        <g transform={`rotate(-14 ${CX - 28} ${CY + 10})`} stroke="#5d2314" fill="none" strokeLinecap="round" opacity="0.55">
          <path d={`M${CX - 52} ${CY + 8} q18 -7 36 -3`} strokeWidth="2.4" />
          <path d={`M${CX - 26} ${CY + 6} q8 5 15 4`} strokeWidth="1.1" strokeOpacity="0.7" />
        </g>
        {/* The caps. */}
        <ellipse cx={CX - 2} cy={CY - 57} rx="18" ry="7" fill="#f4f8ff" opacity="0.7" />
        <ellipse cx={CX + 4} cy={CY + 61} rx="11" ry="4" fill="#f4f8ff" opacity="0.42" />
        <Terminator r={66} />
        <Limb r={66} color={p.glow} />
      </g>
    );
  }

  if (designation === 'VENUS') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="80" fill={p.glow} opacity="0.1" />
        <circle cx={CX} cy={CY} r="68" fill={body} />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={`M${CX - 60} ${CY - 40 + i * 20} q34 ${10 + i * 2} 60 ${-4 - i} q26 6 58 -6`}
            stroke={p.shade}
            strokeOpacity={0.22 + rand() * 0.16}
            strokeWidth={5 - i * 0.4}
            fill="none"
          />
        ))}
        {/* A crescent: Venus is only ever seen lit from the side. */}
        <path d={`M${CX} ${CY - 68} A68 68 0 0 1 ${CX} ${CY + 68} A30 68 0 0 0 ${CX} ${CY - 68}`} fill="#03050d" opacity="0.72" />
        <Limb r={68} color={p.glow} />
      </g>
    );
  }

  if (designation === 'PLUTO') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="62" fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r="54" fill={body} />
        <ellipse cx={CX - 24} cy={CY - 20} rx="18" ry="12" fill={p.shade} opacity="0.4" />
        <ellipse cx={CX - 8} cy={CY + 34} rx="26" ry="10" fill={p.shade} opacity="0.3" />
        {/* Sputnik Planitia — the heart. */}
        <path
          d={`M${CX + 6} ${CY + 30} c-22 -12 -30 -30 -18 -40 c8 -7 18 -3 20 6 c4 -9 15 -12 22 -4 c10 11 0 28 -24 38 z`}
          fill="#f7efe2"
          opacity="0.9"
        />
        <Terminator r={54} tilt={8} />
        <Limb r={54} color={p.glow} />
        {/* Charon, half the size and never far. */}
        <circle cx="166" cy="106" r="13" fill={p.shade} opacity="0.7" />
        <circle cx="163" cy="103" r="10" fill={p.body} opacity="0.4" />
      </g>
    );
  }

  if (designation === 'EUROPA') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="72" fill={p.glow} opacity="0.1" />
        <circle cx={CX} cy={CY} r="62" fill={body} />
        <g stroke="#a8603c" strokeLinecap="round" opacity="0.65">
          {Array.from({ length: 16 }, (_, i) => {
            const a = rand() * Math.PI * 2;
            const d = rand() * 50;
            const x = CX + Math.cos(a) * d;
            const y = CY + Math.sin(a) * d;
            const l = 20 + rand() * 46;
            const b = rand() * Math.PI;
            return (
              <path
                key={i}
                d={`M${x - Math.cos(b) * l * 0.5} ${y - Math.sin(b) * l * 0.5} q${Math.cos(b) * l * 0.5} ${Math.sin(b) * l * 0.5 + (rand() - 0.5) * 12} ${Math.cos(b) * l} ${Math.sin(b) * l}`}
                strokeWidth={0.6 + rand() * 1.4}
                strokeOpacity={0.35 + rand() * 0.45}
                fill="none"
              />
            );
          })}
        </g>
        <Terminator r={62} />
        <Limb r={62} color={p.glow} />
        {/* Jupiter, the thing it goes around, filling the corner. */}
        <path d="M200 96 a58 58 0 0 1 -58 -58 a58 58 0 0 0 58 -20 z" fill="#e9c99d" opacity="0.18" />
      </g>
    );
  }

  if (kind === 'star') {
    const double = designation === 'ALBIREO' || designation === 'MIZAR';
    const gap = designation === 'ALBIREO' ? 46 : 26;
    return (
      <g>
        <circle cx={CX} cy={CY} r="86" fill={`url(#${id}-wash)`} opacity="0.7" />
        {double ? (
          <g>
            <circle cx={CX - gap / 2} cy={CY + 8} r="26" fill={p.body} opacity="0.16" />
            <Spikes x={CX - gap / 2} y={CY + 8} len={62} color={p.body} weight={1.6} />
            <circle cx={CX - gap / 2} cy={CY + 8} r="9" fill="#ffffff" />
            <circle cx={CX - gap / 2} cy={CY + 8} r="15" fill={p.body} opacity="0.4" />
            <circle cx={CX + gap / 2} cy={CY - 12} r="18" fill={p.glow} opacity="0.16" />
            <Spikes x={CX + gap / 2} y={CY - 12} len={40} color={p.glow} weight={1.1} />
            <circle cx={CX + gap / 2} cy={CY - 12} r="6" fill="#ffffff" />
            <circle cx={CX + gap / 2} cy={CY - 12} r="10" fill={p.glow} opacity="0.45" />
            {designation === 'MIZAR' && (
              <g>
                <Spikes x={CX + 62} y={CY - 52} len={16} color={p.glow} weight={0.7} />
                <circle cx={CX + 62} cy={CY - 52} r="2.6" fill="#ffffff" opacity="0.9" />
              </g>
            )}
          </g>
        ) : (
          <g>
            <circle cx={CX} cy={CY} r="40" fill={p.glow} opacity="0.16" />
            <Spikes x={CX} y={CY} len={92} color={p.body} weight={2} />
            <circle cx={CX} cy={CY} r="24" fill={p.glow} opacity="0.3" />
            <circle cx={CX} cy={CY} r="12" fill="#ffffff" />
          </g>
        )}
      </g>
    );
  }

  if (designation === 'M42') {
    return (
      <g>
        <g opacity="0.9">
          <ellipse cx={CX} cy={CY} rx="86" ry="66" fill={`url(#${id}-wash)`} />
          <ellipse cx={CX - 26} cy={CY - 14} rx="46" ry="38" fill={`url(#${id}-wash)`} transform={`rotate(-28 ${CX - 26} ${CY - 14})`} />
          <ellipse cx={CX + 30} cy={CY + 18} rx="40" ry="30" fill={`url(#${id}-glow)`} opacity="0.5" transform={`rotate(18 ${CX + 30} ${CY + 18})`} />
        </g>
        {/* The dark lane that gives the nebula its fish-mouth. */}
        <path d={`M${CX - 8} ${CY - 60} q14 34 -4 58 q-18 20 6 44`} stroke="#03050d" strokeWidth="13" fill="none" opacity="0.5" strokeLinecap="round" />
        {/* The Trapezium: four young stars doing the lighting. */}
        <g>
          {[
            [-5, -4],
            [4, -6],
            [6, 3],
            [-3, 5],
          ].map(([dx, dy], i) => (
            <g key={i}>
              <Spikes x={CX + dx * 1.6} y={CY + dy * 1.6} len={16 - i * 2} color="#ffffff" weight={0.7} />
              <circle cx={CX + dx * 1.6} cy={CY + dy * 1.6} r={2.4 - i * 0.2} fill="#ffffff" />
            </g>
          ))}
        </g>
      </g>
    );
  }

  if (designation === 'M57') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="70" fill={`url(#${id}-wash)`} opacity="0.55" />
        <ellipse cx={CX} cy={CY} rx="52" ry="40" fill="none" stroke={p.glow} strokeOpacity="0.5" strokeWidth="16" transform={`rotate(-16 ${CX} ${CY})`} />
        <ellipse cx={CX} cy={CY} rx="52" ry="40" fill="none" stroke={p.body} strokeOpacity="0.75" strokeWidth="8" transform={`rotate(-16 ${CX} ${CY})`} />
        <ellipse cx={CX} cy={CY} rx="44" ry="33" fill="#03050d" opacity="0.55" transform={`rotate(-16 ${CX} ${CY})`} />
        <ellipse cx={CX} cy={CY} rx="44" ry="33" fill={p.body} opacity="0.12" transform={`rotate(-16 ${CX} ${CY})`} />
        <circle cx={CX} cy={CY} r="2.4" fill="#ffffff" />
        <Spikes x={CX} y={CY} len={14} color="#ffffff" weight={0.6} />
      </g>
    );
  }

  if (designation === 'M101') {
    return (
      <g>
        <ellipse cx={CX} cy={CY} rx="92" ry="70" fill={`url(#${id}-wash)`} opacity="0.7" />
        <g stroke={p.glow} fill="none" strokeLinecap="round">
          {[0, 2.1, 4.2].map((phase, i) => (
            <path key={i} d={spiral(0.62, 13, 0.42, phase)} strokeWidth={7 - i} strokeOpacity={0.4} />
          ))}
          {[0.7, 2.8, 4.9].map((phase, i) => (
            <path key={`b${i}`} d={spiral(0.5, 10, 0.5, phase)} strokeWidth="3" strokeOpacity="0.5" />
          ))}
        </g>
        {Array.from({ length: 26 }, (_, i) => {
          const a = rand() * Math.PI * 2;
          const d = 20 + rand() * 62;
          return <circle key={i} cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d * 0.74} r={0.8 + rand() * 1.6} fill="#ffffff" opacity={0.35 + rand() * 0.5} />;
        })}
        <circle cx={CX} cy={CY} r="20" fill={`url(#${id}-glow)`} />
        <circle cx={CX} cy={CY} r="7" fill="#fff6e2" opacity="0.9" />
      </g>
    );
  }

  /* The clusters, and anything else: a swarm, dense at the middle. */
  return (
    <g>
      <circle cx={CX} cy={CY} r="80" fill={`url(#${id}-wash)`} opacity="0.6" />
      {Array.from({ length: 180 }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const d = Math.pow(rand(), 2.1) * 74;
        return <circle key={i} cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d} r={d < 20 ? 0.7 : 0.6 + rand() * 1.3} fill={rand() < 0.3 ? p.glow : '#ffffff'} opacity={0.35 + rand() * 0.6} />;
      })}
      <circle cx={CX} cy={CY} r="16" fill={`url(#${id}-glow)`} />
    </g>
  );
}
