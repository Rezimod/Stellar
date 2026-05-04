export default function MyPositionsLoading() {
  const card = {
    background: 'var(--stl-bg-surface)',
    border: '1px solid var(--stl-border-regular)',
    borderRadius: 'var(--stl-r-md)',
  } as const;
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-3">
      <div style={{ ...card, height: 30, width: 180 }} className="animate-pulse" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 60 }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
