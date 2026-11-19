/**
 * Utilities for handling ISO 8601 UTC timestamps and converting to IST (Asia/Kolkata)
 */

export function formatIST(
  isoDateStr: string | null | undefined,
  includeDate: boolean = true
): string {
  if (!isoDateStr) return 'N/A';
  try {
    const date = new Date(isoDateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: includeDate ? 'numeric' : undefined,
      month: includeDate ? 'short' : undefined,
    }).format(date);
  } catch {
    return isoDateStr;
  }
}

export function formatISTTime(isoDateStr: string | null | undefined): string {
  return formatIST(isoDateStr, false);
}

/**
 * Converts a standard input string (YYYY-MM-DDTHH:mm) from the browser to UTC ISO string with 'Z' suffix
 */
export function localInputToUtcIso(localInputVal: string): string {
  if (!localInputVal) return new Date().toISOString();
  const date = new Date(localInputVal);
  return date.toISOString();
}

/**
 * Converts UTC ISO string to browser's datetime-local format (YYYY-MM-DDTHH:mm)
 */
export function utcToLocalInput(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calculates remaining or elapsed time
 */
export function getTimeDifference(targetIso: string): {
  isPast: boolean;
  totalSeconds: number;
  minutes: number;
  hours: number;
  display: string;
} {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const isPast = diffMs < 0;
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const display =
    hours > 0
      ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${minutes}m ${pad(seconds)}s`;

  return {
    isPast,
    totalSeconds: absSeconds,
    minutes,
    hours,
    display,
  };
}
