export default function SkyLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="h-7 w-32 bg-[var(--surface)]] rounded-xl animate-pulse" />
        {/* TonightHighlights */}
        <div className="h-20 bg-[var(--surface)]] rounded-xl animate-pulse" />
        {/* SunMoonBar */}
        <div className="h-10 bg-[var(--surface)]] rounded-xl animate-pulse" />
        {/* ForecastGrid */}
        <div className="flex flex-col gap-4">
          <div className="h-36 bg-[var(--surface)]] rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-[var(--surface)]] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      {/* Planets */}
      <div>
        <div className="h-6 w-40 bg-[var(--surface)]] rounded-xl animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--surface)]] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
