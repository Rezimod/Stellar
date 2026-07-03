/* ─── Cosmic backdrop ────────────────────────────────────────────────
   Shared starfield + gradient behind every section. `tint` adds a soft
   accent glow (a CSS gradient string) so panels vary subtly while
   staying one consistent style. The vertical centre is kept dark so
   headlines and buttons always read. */

export default function CosmicBackdrop({ tint }: { tint?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 cosmic-base" />
      <div className="absolute inset-0 cosmic-stars" />
      {tint && <div className="absolute inset-0" style={{ background: tint }} />}
      {/* Centre shade — guarantees contrast under the text block */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 55% at 50% 52%, rgba(5,7,15,0.55) 0%, transparent 72%)',
        }}
      />
      {/* Seam fades — blend each section into the next */}
      <div
        className="absolute inset-x-0 top-0 h-[18%]"
        style={{ background: 'linear-gradient(180deg, #05070F 0%, transparent 100%)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[20%]"
        style={{ background: 'linear-gradient(180deg, transparent 0%, #05070F 100%)' }}
      />
    </div>
  );
}
