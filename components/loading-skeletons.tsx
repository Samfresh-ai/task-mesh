export function LoadingSkeletons() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)]"
        />
      ))}
    </div>
  );
}
