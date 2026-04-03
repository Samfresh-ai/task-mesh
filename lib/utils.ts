import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCompactNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value: Date | string | null | undefined, now = Date.now()) {
  if (!value) {
    return "No recent sync";
  }

  const date = new Date(value).getTime();
  const deltaSeconds = Math.round((date - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(deltaSeconds) < 60) {
    return formatter.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter.format(deltaDays, "day");
}

export function hoursUntil(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function hashKey(parts: string[]) {
  return parts.join("::").toLowerCase().replace(/\s+/g, " ").trim();
}
