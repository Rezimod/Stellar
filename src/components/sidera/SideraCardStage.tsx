'use client';

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from 'react';

/**
 * Holding a card. The pointer tilts it toward the viewer and moves the light:
 * the stage writes --px/--py (0–1) straight onto itself, and the card's CSS
 * reads them for the tilt, the layer parallax, the foil and the glare, so a
 * pointer move never re-renders React. Left alone, the card sways slowly.
 * With a back, a button turns it over. Reduced motion stills the sway.
 */
export default function SideraCardStage({ front, back, className = '' }: { front: ReactNode; back?: ReactNode; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [over, setOver] = useState(false);

  const set = (px: number, py: number) => {
    const el = stage.current;
    if (!el) return;
    el.style.setProperty('--px', px.toFixed(3));
    el.style.setProperty('--py', py.toFixed(3));
  };

  const move = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      const r = e.currentTarget.getBoundingClientRect();
      let px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      if (over) px = 1 - px;
      set(px, py);
      if (!live) setLive(true);
    },
    [live, over],
  );

  const leave = useCallback(() => {
    set(0.5, 0.5);
    setLive(false);
  }, []);

  return (
    <div ref={stage} className={`sd-stage ${className}`.trim()}>
      <div
        className={`sd-stage__hold ${live ? 'is-live' : 'is-idle'}`}
        onPointerMove={move}
        onPointerLeave={leave}
        onPointerCancel={leave}
      >
        <div className="sd-stage__tilt">
          <div className={`sd-stage__flip ${over ? 'is-over' : ''}`.trim()}>
            <div className="sd-stage__face" aria-hidden={over}>
              {front}
            </div>
            {back && (
              <div className="sd-stage__face sd-stage__face--back" aria-hidden={!over}>
                {back}
              </div>
            )}
          </div>
        </div>
      </div>
      <span className={`sd-stage__shadow ${live ? 'is-live' : ''}`.trim()} aria-hidden="true" />
      {back && (
        <button type="button" className="sd-btn sd-stage__turn" onClick={() => setOver((v) => !v)} aria-pressed={over}>
          {over ? 'Turn it back' : 'Turn it over'}
        </button>
      )}
    </div>
  );
}
