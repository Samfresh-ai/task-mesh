"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LiveValueProps = {
  metricKey: string;
  value: number;
  format: "percent" | "count";
  emphasize?: boolean;
};

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function formatDisplayValue(value: number, format: LiveValueProps["format"]) {
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }

  return Math.round(value).toLocaleString();
}

export function LiveValue({ metricKey, value, format, emphasize = false }: LiveValueProps) {
  const storageKey = useMemo(() => `live-value:${metricKey}`, [metricKey]);
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const previousRaw = window.localStorage.getItem(storageKey);
    const previousValue = previousRaw == null ? value : Number(previousRaw);
    previousValueRef.current = Number.isFinite(previousValue) ? previousValue : value;
    let frameId = 0;

    if (Number.isFinite(previousValueRef.current)) {
      const duration = 900;
      frameId = window.requestAnimationFrame((start) => {
        const tick = (timestamp: number) => {
          const progress = Math.min((timestamp - start) / duration, 1);
          const nextValue =
            previousValueRef.current + (value - previousValueRef.current) * easeOutCubic(progress);
          setDisplayValue(nextValue);

          if (progress < 1) {
            frameId = window.requestAnimationFrame(tick);
          }
        };

        tick(start);
      });
    }

    window.localStorage.setItem(storageKey, String(value));

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [storageKey, value]);

  const trend: "up" | "down" | "flat" = displayValue < value ? "up" : displayValue > value ? "down" : "flat";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 transition duration-700",
        emphasize ? "text-2xl font-semibold" : "",
        trend === "up" ? "text-emerald-700" : "",
        trend === "down" ? "text-rose-700" : "",
        trend === "flat" ? "text-inherit" : "",
      ].join(" ")}
    >
      <span>{formatDisplayValue(displayValue, format)}</span>
      <span
        className={[
          "inline-flex text-xs uppercase tracking-[0.18em] transition duration-500",
          trend === "flat" ? "opacity-0" : "opacity-100",
          trend === "up" ? "translate-y-[-1px]" : "",
          trend === "down" ? "translate-y-[1px]" : "",
        ].join(" ")}
      >
        {trend === "up" ? "▲" : trend === "down" ? "▼" : "•"}
      </span>
    </span>
  );
}
