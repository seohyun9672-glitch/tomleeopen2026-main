export type ChipProps = {
  label: string;
  className?: string;
  title?: string;
};

export function Chip({ label, className = "", title }: ChipProps) {
  return (
    <div className={className} title={title}>
      {label}
    </div>
  );
}
