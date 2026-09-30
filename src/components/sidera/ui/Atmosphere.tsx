/**
 * The air of the room every Sidera page sits in: the engraved atlas turning
 * behind the sky, a warm light leak, dust in it, film grain over all of it and
 * a vignette at the edges (src/styles/sidera-vintage.css). Nothing here takes a
 * pointer or a tab stop, and everything that moves is a transform.
 */
export default function Atmosphere() {
  return (
    <>
      <div className="sd-air" aria-hidden="true">
        <div className="sd-air__atlas" />
        <div className="sd-air__leak" />
        <div className="sd-air__dust">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="sd-air sd-air--over" aria-hidden="true">
        <div className="sd-air__vignette" />
        <div className="sd-air__grain" />
      </div>
    </>
  );
}
