export type ChipProps = {
  label: string;
  className?: string;
  title?: string;
};

export function Chip({ label, className = "", title }: ChipProps) {
  return (
    <div className={`inline-block rounded-2xl px-2 py-0.5 text-sm ${className}`} title={title}>
      {label}
    </div>
  );
}
