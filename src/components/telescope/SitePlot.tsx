/**
 * Where the instrument stands, on a graticule. There is no world map in the
 * bundle and a stylised one would be a lie about coastlines; a grid with the
 * site marked on it says the same thing in the instrument's own voice.
 */
export default function SitePlot({ lat, lon }: { lat: number; lon: number }) {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return (
    <svg viewBox="0 0 100 50" className="tel-plot" aria-hidden="true" preserveAspectRatio="none">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map((d) => (
        <line key={`m${d}`} x1={(d / 360) * 100} y1="0" x2={(d / 360) * 100} y2="50" className="tel-plot__line" />
      ))}
      {[0, 30, 60, 90, 120, 150, 180].map((d) => (
        <line key={`p${d}`} x1="0" y1={(d / 180) * 50} x2="100" y2={(d / 180) * 50} className={`tel-plot__line${d === 90 ? ' tel-plot__line--equator' : ''}`} />
      ))}
      <circle cx={x} cy={y / 2} r="2.6" className="tel-plot__halo" />
      <circle cx={x} cy={y / 2} r="1.1" className="tel-plot__dot" />
    </svg>
  );
}
