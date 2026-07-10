"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex flex-nowrap overflow-x-auto overflow-y-hidden gap-1 border-b [border-color:var(--color-border-ui)]",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
        "px-4 py-2.5 text-sm font-[family-name:var(--font-body)]",
        "border-b-2 border-transparent -mb-px",
        "transition-colors outline-none",
        // inactive
        "font-normal [color:var(--color-text-secondary)]",
        "hover:[color:var(--color-text-primary)] hover:[background-color:var(--color-surface-hover)]",
        // active
        "data-[state=active]:font-semibold",
        "data-[state=active]:[color:var(--color-primary-blue-500)]",
        "data-[state=active]:[background-color:var(--color-surface-muted)]",
        "data-[state=active]:[border-color:var(--color-primary-blue-500)]",
        // disabled
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
