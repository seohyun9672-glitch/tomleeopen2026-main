import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

type PresentationProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconRight?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = PresentationProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & {
    href: ComponentProps<typeof Link>["href"];
  };

type ButtonAsNative = PresentationProps &
  Omit<ComponentProps<"button">, "className" | "children"> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsLink | ButtonAsNative;

function linkPassThroughProps({
  href: _href,
  variant: _variant,
  size: _size,
  className: _className,
  children: _children,
  iconRight: _iconRight,
  ...rest
}: ButtonAsLink): Omit<ComponentProps<typeof Link>, "href" | "className" | "children"> {
  return rest;
}

function nativePassThroughProps({
  variant: _variant,
  size: _size,
  className: _className,
  children: _children,
  iconRight: _iconRight,
  ...rest
}: ButtonAsNative) {
  return rest;
}

function isLinkButton(props: ButtonProps): props is ButtonAsLink {
  const href = (props as ButtonAsLink).href;
  return href != null && href !== "";
}

// ─── shadcn/ui-style variants (geometry from app/globals.css --button-* tokens) ─

/**
 * shadcn/ui {@link https://ui.shadcn.com/docs/components/button Button} pattern (`cva`),
 * mapped to this app’s button design tokens.
 */
export const buttonVariants = cva(
  [
    "flex w-full items-center justify-center text-center font-medium no-underline whitespace-nowrap",
    "rounded-[var(--button-border-radius)]",
"min-w-[var(--button-min-width)]",
"w-auto",
    "max-w-none",
    "cursor-pointer disabled:cursor-not-allowed transition-[color,opacity,background-color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "border-2 border-transparent",
          "bg-[var(--primary)] text-[var(--button-on-accent-text)] shadow-none",
          "hover:brightness-[0.97] active:brightness-[0.92]",
          "focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[var(--color-background)]",
          "disabled:border-[var(--button-disabled-border)] disabled:bg-[var(--button-disabled-bg)]",
          "disabled:text-[var(--button-disabled-text)] disabled:shadow-none",
          "disabled:hover:brightness-100 disabled:active:brightness-100",
        ].join(" "),

        secondary: [
          "border-2 border-[var(--primary)]",
          "bg-[var(--button-secondary-fill)] !text-[var(--button-secondary-text)] visited:!text-[var(--button-secondary-text)]",
          "hover:bg-[var(--button-secondary-hover-bg)] active:bg-[var(--button-secondary-active-bg)]",
          "focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--color-background)]",
          "disabled:border-[var(--button-secondary-disabled-border)] disabled:bg-[var(--button-secondary-active-bg)]",
          "disabled:!text-[var(--button-disabled-text)]",
          "disabled:hover:border-[var(--button-secondary-disabled-border)] disabled:hover:bg-[var(--button-secondary-active-bg)]",
          "disabled:active:bg-[var(--button-secondary-active-bg)]",
        ].join(" "),

        transparent: [
          "border-2 border-transparent bg-transparent",
          "text-[var(--primary)]",
          "hover:opacity-85 active:opacity-70",
          "focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--color-background)]",
          "disabled:text-[var(--button-disabled-text)] disabled:hover:opacity-100 disabled:active:opacity-100",
        ].join(" "),

        destructiveOutline: [
          "border-2 border-[color:var(--destructive-outline-border)] bg-transparent",
          "text-[color:var(--destructive-outline-text)]",
          "hover:bg-[color:var(--destructive-outline-hover-bg)] active:opacity-90",
          "focus-visible:ring-[var(--color-status-error)] focus-visible:ring-offset-[var(--color-background)]",
          "disabled:border-[var(--destructive-outline-border)] disabled:text-[var(--button-disabled-text)]",
          "disabled:hover:bg-transparent disabled:active:opacity-100",
        ].join(" "),
      },
      size: {
        large:
          "h-[var(--button-height-large)] max-h-[var(--button-height-large)] px-[var(--button-px-large)] text-[var(--button-font-size)]",
        medium:
          "h-[var(--button-height-medium)] max-h-[var(--button-height-medium)] px-[var(--button-px-medium)] text-[var(--button-font-size)]",
        small:
          "h-[var(--button-height-small)] max-h-[var(--button-height-small)] px-[var(--button-px-small)] text-[var(--button-font-size)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  }
);

const ICON_BUTTON_CLASS = [
  "inline-flex h-10 max-h-10 w-10 cursor-pointer items-center justify-center",
  "rounded-[var(--icon-button-radius)] bg-transparent text-[var(--icon-button-text)]",
  "transition-colors hover:bg-[var(--icon-button-hover-bg)]",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
  "focus-visible:ring-offset-[var(--color-background)]",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "disabled:text-[var(--button-disabled-text)] disabled:hover:bg-transparent",
].join(" ");

/** Same classes as `<Button />` — use on `Link` or anchors that should match the button system. */
export function getButtonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "medium",
  extraClassName = ""
): string {
  return cn(buttonVariants({ variant, size }), extraClassName);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ButtonContent({ children, iconRight }: { children: ReactNode; iconRight?: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      {iconRight ? (
        <span className="ml-1 inline-flex items-center leading-none [&_svg]:size-[1em]" aria-hidden>
          {iconRight}
        </span>
      ) : null}
    </>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "medium", className = "", children, iconRight } = props;

  const styles = cn(buttonVariants({ variant, size }), className);
  const content = <ButtonContent iconRight={iconRight}>{children}</ButtonContent>;

  if (isLinkButton(props)) {
    const href = props.href;
    return (
      <Link {...linkPassThroughProps(props)} href={href} className={styles}>
        {content}
      </Link>
    );
  }

  const pass = nativePassThroughProps(props);
  const { type: buttonType = "button", ...buttonPass } = pass;

  return (
    <button type={buttonType} className={styles} {...buttonPass}>
      {content}
    </button>
  );
}

// ─── IconButton ─────────────────────────────────────────────────────────────--
// Intentionally `<button>` only (no `href` / Next `Link`). For icon-shaped navigation, use `<Button>` with
// `href` or wrap a `<Link>` with `getButtonClassName` / matching classes.

export type IconButtonProps = {
  "aria-label": string;
  title?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children" | "type">;

export function IconButton({ className = "", children, title, ...rest }: IconButtonProps) {
  return (
    <button type="button" title={title} className={cn(ICON_BUTTON_CLASS, className)} {...rest}>
      {children}
    </button>
  );
}
