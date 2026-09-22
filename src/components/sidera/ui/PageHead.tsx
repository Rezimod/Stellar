import type { ReactNode } from 'react';

/**
 * The head of every Sidera page, laid out like the top of a catalogue plate:
 * an index rail, the title set large, one line beneath it, the figures, and —
 * when the page has one — its object on the right.
 */
export default function PageHead({
  index,
  section,
  meta,
  eyebrow,
  title,
  sub,
  object,
  children,
}: {
  index: string;
  section: ReactNode;
  meta?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  object?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="sd-poster">
      <div className="sd-sky" aria-hidden="true" />
      <div className="sd-container">
        <div className="sd-rail">
          <span>
            Nº {index} · {section}
          </span>
          {meta && <span>{meta}</span>}
        </div>
        <div className={object ? 'sd-poster__grid' : undefined}>
          <div className="sd-poster__copy">
            {eyebrow && <p className="sd-eyebrow">{eyebrow}</p>}
            <h1 className="sd-mega">{title}</h1>
            {sub && <p className="sd-poster__sub">{sub}</p>}
            {children}
          </div>
          {object}
        </div>
      </div>
    </section>
  );
}
