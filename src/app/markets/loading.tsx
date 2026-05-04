export default function MarketsLoading() {
  const card = {
    background: 'var(--stl-bg-surface)',
    border: '1px solid var(--stl-border-regular)',
    borderRadius: 'var(--stl-r-md)',
  } as const;
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div style={{ ...card, height: 36, width: 220 }} className="animate-pulse" />
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 30, width: 80, borderRadius: 999 }} className="animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 168 }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
