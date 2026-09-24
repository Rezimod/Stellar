export default function ProfileLoading() {
  const card = {
    background: 'var(--stl-bg-surface)',
    border: '1px solid var(--stl-border-regular)',
    borderRadius: 'var(--stl-r-md)',
  } as const;
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 py-4">
        <div style={{ ...card, width: 80, height: 80, borderRadius: '50%' }} className="animate-pulse" />
        <div style={{ ...card, width: 120, height: 22 }} className="animate-pulse" />
        <div style={{ ...card, width: 160, height: 28, borderRadius: 999 }} className="animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 80 }} className="animate-pulse" />
        ))}
      </div>
      <div style={{ ...card, height: 56 }} className="animate-pulse" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 52 }} className="animate-pulse" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ ...card, height: 56 }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
