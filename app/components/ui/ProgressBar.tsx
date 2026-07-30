export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-primary-blue-50)]">
      <div
        className="h-full rounded-full bg-[var(--color-primary-blue-600)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
