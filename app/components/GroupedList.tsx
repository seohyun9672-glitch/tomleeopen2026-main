import { Fragment, type ReactNode } from "react";

type Group = {
  key: string;
  label: ReactNode;
  children: ReactNode;
};

type Props = {
  groups: Group[];
  /** "h2" uses content-gap + primary text style; "h3" (default) uses element-gap + section style. */
  headingLevel?: "h2" | "h3";
  /** Render a divider line between groups. */
  separator?: boolean;
};

const headingMeta = {
  h2: {
    gap: "gap-[var(--content-gap)]",
    cls: "text-h2 m-0 text-[var(--color-text-primary)]",
  },
  h3: {
    gap: "gap-[var(--element-gap)]",
    cls: "text-base font-semibold text-[var(--section-text)]",
  },
};

export function GroupedList({ groups, headingLevel = "h3", separator = false }: Props) {
  const { gap, cls } = headingMeta[headingLevel];
  const H = headingLevel;

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {groups.map(({ key, label, children }, index) => (
        <Fragment key={key}>
          {separator && index > 0 && (
            <hr className="m-0 border-t border-[color:var(--color-border-ui)]" />
          )}
          <div className={`flex flex-col ${gap}`}>
            <H className={cls}>{label}</H>
            {children}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
