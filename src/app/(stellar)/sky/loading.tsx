export default function SkyLoading() {
  // Mirrors the live dashboard shape (title → sky map → summary strip → rails),
  // not the retired forecast/planet-grid layout, so there's no wrong-shaped
  // flash before the page's own skeleton takes over. Tailwind utilities only —
  // the page's sky.css isn't loaded yet while this route-level fallback shows.
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Title */}
      <div className="h-7 w-40 bg-[var(--surface)] rounded-xl animate-pulse" />
      {/* Sky map */}
      <div className="w-full aspect-square max-w-[420px] mx-auto bg-[var(--surface)] rounded-2xl animate-pulse" />
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--surface)] rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Visible-now rail */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-28 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
