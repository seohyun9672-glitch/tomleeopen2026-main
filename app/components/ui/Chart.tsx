"use client";

import { createContext, useContext, useId, useMemo, type ComponentProps, type ReactNode } from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

/**
 * Chart color/label config, keyed by data series id. `color` should be a CSS
 * color value (e.g. `var(--pastel-sky-fg)`) — this app has no `--chart-N`
 * tokens, so series colors come from the existing pastel palette in globals.css.
 */
export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

type ChartContextValue = { config: ChartConfig };

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error("Chart components must be used within a <ChartContainer>");
  return ctx;
}

// ─── Label measurement (shared, locale-agnostic) ───────────────────────────────
//
// Recharts wraps a category axis's tick text onto multiple lines whenever the
// rendered text exceeds the axis's reserved `width` — this is a real pixel
// measurement, not a character count, so a fixed "chars × constant" guess
// reliably under-reserves space for wider scripts (e.g. Korean glyphs render
// ~2x the width of Latin ones at the same font size) and wraps regardless of
// locale. Measuring with an actual canvas context sidesteps guessing entirely
// and is correct for any language. Any chart with a category axis should use
// `widestLabelWidth` for its axis `width` instead of estimating.

let measureCanvas: HTMLCanvasElement | null = null;

/** Pixel width of `text` rendered at `font` (canvas font shorthand, e.g. "12px sans-serif"). */
export function measureTextWidth(text: string, font = "12px sans-serif"): number {
  if (typeof document === "undefined") return text.length * 10; // SSR fallback estimate
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 10;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Width (px) that fits the widest of `labels` without wrapping, plus `padding`. */
export function widestLabelWidth(labels: string[], font = "12px sans-serif", padding = 16): number {
  const widest = Math.max(0, ...labels.map((l) => measureTextWidth(l, font)));
  return Math.ceil(widest + padding);
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ComponentProps<"div"> & {
  config: ChartConfig;
  children: ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  const colorVars = useMemo(
    () =>
      Object.entries(config)
        .filter(([, cfg]) => cfg.color)
        .map(([key, cfg]) => `--color-${key}: ${cfg.color};`)
        .join(" "),
    [config],
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--color-text-tertiary)] [&_.recharts-cartesian-grid_line]:stroke-[var(--color-border-ui)] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--color-border-ui-strong)] [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-radial-bar-background-sector]:fill-[var(--color-surface-muted)] [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--color-surface-muted)] [&_.recharts-reference-line_[stroke='#ccc']]:stroke-[var(--color-border-ui)] [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <style dangerouslySetInnerHTML={{ __html: `[data-chart="${chartId}"] { ${colorVars} }` }} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = "dot",
  hideLabel = false,
  labelFormatter,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: ReactNode;
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  labelFormatter?: (label: ReactNode, payload: TooltipPayloadItem[]) => ReactNode;
  formatter?: (value: number | string, name: string, item: TooltipPayloadItem, index: number) => ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border border-[color:var(--outline-blue-default)] bg-[var(--color-surface-card)] px-2.5 py-1.5 text-xs shadow-lg",
        className,
      )}
    >
      {!hideLabel && (
        <div className="font-medium text-[var(--color-text-primary)]">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const itemConfig = config[key];
          const indicatorColor = item.color;
          return (
            <div key={item.dataKey ?? i} className="flex w-full items-center gap-2">
              {formatter && item.value !== undefined && item.name ? (
                formatter(item.value, String(item.name), item, i)
              ) : (
                <>
                  {indicator === "dot" && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: indicatorColor }}
                    />
                  )}
                  <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                    <span className="text-[var(--color-text-secondary)]">
                      {itemConfig?.label ?? item.name}
                    </span>
                    {item.value !== undefined && (
                      <span className="font-mono font-medium tabular-nums text-[var(--color-text-primary)]">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

type LegendPayloadItem = {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
};

export function ChartLegendContent({
  className,
  payload,
}: {
  className?: string;
  payload?: LegendPayloadItem[];
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  // Default is a single horizontal row. Once there are enough entries that a
  // single row would wrap raggedly (e.g. every club shown on a chart), lay
  // it out as an even 2-row grid instead. Below `sm` (the xs breakpoint
  // only), every legend uses a fixed 2-column grid regardless of item
  // count — narrow viewports don't have room for a wide single row.
  const many = payload.length > 6;

  return (
    <div className={cn(
      "grid grid-cols-2 items-center justify-center gap-x-4 gap-y-1",
      many
        ? "sm:grid sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-none"
        : "sm:flex sm:flex-wrap sm:gap-4",
      className,
    )}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "value");
        const itemConfig = config[key];
        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--color-text-secondary)]">{itemConfig?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
