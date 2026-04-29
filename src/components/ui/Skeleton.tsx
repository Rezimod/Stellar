export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-[var(--surface)]] border border-white/[0.06] rounded-xl ${className}`}
      {...props}
    />
  );
}
