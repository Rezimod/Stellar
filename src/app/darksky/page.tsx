import Link from 'next/link';

const LOCATIONS = [
  { name: 'Tbilisi', bortle: 8, cx: 516, cy: 213 },
  { name: 'Kazbegi', bortle: 2, cx: 518, cy: 207 },
  { name: 'Mestia', bortle: 3, cx: 511, cy: 210 },
  { name: 'Kutaisi', bortle: 6, cx: 512, cy: 213 },
  { name: 'Batumi', bortle: 7, cx: 509, cy: 215 },
  { name: 'Borjomi', bortle: 4, cx: 514, cy: 214 },
];

function bortleColor(b: number): string {
  if (b <= 2) return '#34d399';
  if (b <= 4) return '#FFD166';
  if (b <= 6) return '#f97316';
  return '#ef4444';
}

function bortleLabel(b: number): string {
  if (b <= 2) return 'Pristine';
  if (b <= 4) return 'Rural';
  if (b <= 6) return 'Suburban';
  return 'City';
}

const STATS = [
  { label: 'Total Readings', value: '6' },
  { label: 'Dark Sites (Bortle ≤3)', value: '2' },
  { label: 'Countries', value: '1' },
];

export default function DarkSkyPage() {
  return (
    <div
      className="min-h-screen px-4 py-8 sm:py-12"
      style={{ background: '#070B14', fontFamily: 'Georgia, serif' }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Dark Sky Network
          </h1>
          <p className="text-slate-500 text-sm">
            Community light pollution map — powered by Stellar observers
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(s => (
            <div
              key={s.label}
              className="rounded-2xl px-4 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-xl sm:text-2xl font-bold text-[#38F0FF]">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Georgia — Light Pollution Readings</span>
            <span className="text-[11px] text-slate-600">6 observer reports</span>
          </div>

          {/* SVG world map — simplified continent outlines */}
          <div className="relative w-full" style={{ paddingBottom: '50%' }}>
            <svg
              viewBox="0 0 1000 500"
              className="absolute inset-0 w-full h-full"
              style={{ background: 'rgba(7,11,20,0.8)' }}
              aria-label="World map with dark sky readings"
            >
              {/* Grid lines */}
              {[100, 200, 300, 400].map(y => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(x => (
                <line key={x} x1={x} y1="0" x2={x} y2="500" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}

              {/* North America */}
              <path
                d="M80,60 L160,55 L200,70 L220,100 L230,140 L210,180 L190,220 L170,260 L150,280 L130,270 L110,240 L100,200 L90,160 L70,130 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Central America */}
              <path
                d="M170,260 L190,270 L185,295 L170,300 L160,280 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* South America */}
              <path
                d="M185,295 L210,290 L240,310 L260,360 L250,420 L220,450 L190,440 L170,400 L165,350 L170,310 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Europe */}
              <path
                d="M440,60 L490,55 L510,70 L520,90 L510,110 L500,130 L480,140 L460,135 L445,120 L435,100 L435,80 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Scandinavia */}
              <path
                d="M460,40 L480,35 L490,55 L470,60 L455,55 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Africa */}
              <path
                d="M445,140 L490,135 L530,150 L550,190 L555,240 L545,290 L520,330 L490,350 L460,340 L435,310 L420,270 L415,220 L420,170 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Asia */}
              <path
                d="M510,60 L600,50 L700,55 L780,70 L820,100 L840,140 L820,180 L780,200 L720,210 L660,220 L600,210 L560,200 L530,180 L510,150 L505,120 L505,90 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Indian subcontinent */}
              <path
                d="M620,180 L650,175 L670,200 L665,240 L645,260 L625,245 L610,210 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Southeast Asia */}
              <path
                d="M720,180 L760,175 L790,190 L800,210 L780,225 L750,220 L720,210 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Australia */}
              <path
                d="M750,300 L820,290 L870,310 L890,360 L870,400 L820,420 L760,415 L720,390 L710,350 L720,320 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />
              {/* Middle East */}
              <path
                d="M530,130 L580,125 L600,145 L590,170 L560,175 L535,160 Z"
                fill="rgba(56,240,255,0.06)"
                stroke="rgba(56,240,255,0.15)"
                strokeWidth="1"
              />

              {/* Georgia highlight region */}
              <circle cx="514" cy="211" r="18" fill="rgba(56,240,255,0.04)" stroke="rgba(56,240,255,0.2)" strokeWidth="1" />

              {/* Location dots */}
              {LOCATIONS.map(loc => {
                const color = bortleColor(loc.bortle);
                return (
                  <g key={loc.name}>
                    <circle
                      cx={loc.cx}
                      cy={loc.cy}
                      r="5"
                      fill={color}
                      fillOpacity="0.25"
                      stroke={color}
                      strokeWidth="1"
                    />
                    <circle cx={loc.cx} cy={loc.cy} r="2.5" fill={color} />
                    <text
                      x={loc.cx + 7}
                      y={loc.cy + 4}
                      fontSize="6"
                      fill="rgba(255,255,255,0.7)"
                      style={{ fontFamily: 'sans-serif' }}
                    >
                      {loc.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="px-5 pb-5 pt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[
              { range: '1–2', color: '#34d399', label: 'Pristine' },
              { range: '3–4', color: '#FFD166', label: 'Rural' },
              { range: '5–6', color: '#f97316', label: 'Suburban' },
              { range: '7–9', color: '#ef4444', label: 'City' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-slate-400">
                  Bortle {item.range} — {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Location list */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
            Observer Reports
          </h2>
          {LOCATIONS.map(loc => {
            const color = bortleColor(loc.bortle);
            const label = bortleLabel(loc.bortle);
            return (
              <div
                key={loc.name}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1">
                  <span className="text-white text-sm font-semibold">{loc.name}</span>
                  <span className="text-slate-600 text-xs ml-2">Georgia</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold" style={{ color }}>
                    Bortle {loc.bortle}
                  </span>
                  <span className="text-slate-600 text-xs ml-1.5">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.4))',
            border: '1px solid rgba(56,240,255,0.1)',
          }}
        >
          <p className="text-white font-semibold mb-1.5">Contribute to the map</p>
          <p className="text-slate-500 text-sm mb-5">
            Add your reading by completing a sky mission
          </p>
          <Link
            href="/missions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #38F0FF, #0ea5e9)', color: '#070B14' }}
          >
            Start a Mission →
          </Link>
        </div>

      </div>
    </div>
  );
}
