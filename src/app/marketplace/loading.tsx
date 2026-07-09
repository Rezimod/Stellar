export default function MarketplaceLoading() {
  const card = {
    background: 'var(--stl-bg-surface)',
    border: '1px solid var(--stl-border-regular)',
    borderRadius: 'var(--stl-r-md)',
  } as const;
  // Mirrors the real page order (hero → category circles → featured rail →
  // catalog grid) so content doesn't jump when it streams in.
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div style={{ ...card, borderRadius: 16 }} className="animate-pulse h-[112px] sm:h-[160px]" />
      <div className="flex justify-between sm:justify-center gap-2 sm:gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div style={{ ...card, width: 52, height: 52, borderRadius: 999 }} className="animate-pulse" />
            <div style={{ ...card, width: 44, height: 8 }} className="animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...card, aspectRatio: '4 / 5' }} className="animate-pulse w-[72%] sm:w-[42%] lg:w-[calc(25%-12px)] shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...card, aspectRatio: '3 / 4' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
