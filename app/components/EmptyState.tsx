export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
      {text}
    </div>
  );
}
