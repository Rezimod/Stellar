export default function MarketplaceLoading() {
  const card = {
    background: 'var(--stl-bg-surface)',
    border: '1px solid var(--stl-border-regular)',
    borderRadius: 'var(--stl-r-md)',
  } as const;
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div style={{ ...card, height: 32, width: 200 }} className="animate-pulse" />
        <div style={{ ...card, height: 32, width: 120, borderRadius: 999 }} className="animate-pulse" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 30, width: 90, borderRadius: 999 }} className="animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...card, aspectRatio: '3 / 4' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
