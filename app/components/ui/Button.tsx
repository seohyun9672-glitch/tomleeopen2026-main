import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export type ButtonSize = NonNullable<
  VariantProps<typeof buttonVariants>["size"]
>;

type BaseButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconRight?: ReactNode;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = BaseButtonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & {
    href: ComponentProps<typeof Link>["href"];
  };

type NativeButtonProps = BaseButtonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & {
    href?: undefined;
  };

export type ButtonProps = LinkButtonProps | NativeButtonProps;

export type IconButtonProps = {
  "aria-label": string;
  title?: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children" | "type">;

const BUTTON_BASE_CLASS = [
  "inline-flex items-center justify-center text-center font-medium no-underline whitespace-nowrap",
  "rounded-[var(--button-border-radius)]",
  "transition-[color,opacity,background-color,box-shadow,transform] duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed",
].join(" ");

export const buttonVariants = cva(BUTTON_BASE_CLASS, {
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
      ].join(" "),
      transparent: [
        "border-2 border-transparent bg-transparent",
        // text + icon use same foreground
        "text-[var(  --icon-button-text)] [&_svg]:text-current",
        // interaction
        "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)]",
        // focus (match primary)
        "focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[var(--color-background)]",
        // disabled
        "disabled:text-[var(--button-disabled-text)] disabled:[&_svg]:text-[var(--button-disabled-text)]",
        "disabled:hover:bg-transparent disabled:active:bg-transparent",
      ].join(" "),
      destructiveOutline: [
        "border-2 border-[color:var(--destructive-outline-border)] bg-transparent",
        "text-[color:var(--destructive-outline-text)]",
        "hover:bg-[color:var(--destructive-outline-hover-bg)] active:opacity-90",
        "focus-visible:ring-[var(--color-status-error)] focus-visible:ring-offset-[var(--color-background)]",
        "disabled:text-[var(--button-disabled-text)]",
      ].join(" "),
    },
    size: {
      large:
        "min-w-[var(--button-min-width)] h-[var(--button-height-large)] px-[var(--button-px-large)]",
      medium:
        "min-w-[var(--button-min-width)] h-[var(--button-height-medium)] px-[var(--button-px-medium)]",
      small:
        "min-w-[var(--button-min-width)] h-[var(--button-height-small)] px-[var(--button-px-small)]",
      icon: "h-10 w-10 p-0",
    },
  },
});

function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return "href" in props && props.href != null && props.href !== "";
}

function ButtonContent({
  children,
  iconRight,
}: {
  children: ReactNode;
  iconRight?: ReactNode;
}) {
  return (
    <>
      <span>{children}</span>
      {iconRight && (
        <span
          className="ml-1 inline-flex items-center [&_svg]:size-[1em]"
          aria-hidden
        >
          {iconRight}
        </span>
      )}
    </>
  );
}

function resolveButtonClasses(
  variant?: ButtonVariant,
  size?: ButtonSize,
  className?: string,
) {
  return cn(
    buttonVariants({
      variant: variant ?? "primary",
      size: size ?? "medium",
    }),
    className,
  );
}

export function Button(props: ButtonProps) {
  const { variant, size, className, children, iconRight } = props;

  const resolvedClassName = resolveButtonClasses(variant, size, className);

  if (isLinkButton(props)) {
    const {
      href,
      variant: _v,
      size: _s,
      className: _c,
      children: _ch,
      iconRight: _i,
      ...linkProps
    } = props;

    return (
      <Link href={href} className={resolvedClassName} {...linkProps}>
        <ButtonContent iconRight={iconRight}>{children}</ButtonContent>
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    iconRight: _i,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button type={type} className={resolvedClassName} {...buttonProps}>
      <ButtonContent iconRight={iconRight}>{children}</ButtonContent>
    </button>
  );
}

export function IconButton({
  variant,
  className,
  children,
  title,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className={resolveButtonClasses(
        variant ?? "transparent",
        "icon",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
