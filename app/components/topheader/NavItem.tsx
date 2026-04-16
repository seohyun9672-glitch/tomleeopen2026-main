import type { MouseEvent } from "react";

const base =
  "flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium";

const active =
  "bg-[var(--color-surface-card)]/20 text-[var(--color-text-on-brand)]";

const inactive =
  "text-[var(--color-text-on-brand)]/90 hover:bg-[var(--color-surface-card)]/10";

type Props =
  | {
      type: "dropdown";
      label: string;
      active: boolean;
      open: boolean;
      onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
      buttonRef: React.RefObject<HTMLButtonElement | null>;
      containerRef: React.RefObject<HTMLDivElement | null>;
    }
  | {
      type: "button";
      label: string;
      onClick: () => void;
    };

export function NavItem(props: Props) {
  if (props.type === "dropdown") {
    return (
      <div ref={props.containerRef}>
        <button
          ref={props.buttonRef}
          onMouseDown={props.onToggle}
          className={`${base} ${props.active ? active : inactive}`}
        >
          {props.label} ▾
        </button>
      </div>
    );
  }

  return (
    <button onClick={props.onClick} className={base}>
      {props.label}
    </button>
  );
}