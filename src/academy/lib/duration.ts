// Mirrors the backend's utils/academy/duration.js: a course's free-text duration ("3 months",
// "12 weeks", "90 days", "1 year") turned into a batch's last day, so the form shows exactly the
// end date the server will save.
type Unit = "day" | "week" | "month" | "year";

const UNITS: Record<string, Unit> = {
  d: "day", day: "day", days: "day", w: "week", wk: "week", week: "week", weeks: "week",
  m: "month", mo: "month", month: "month", months: "month", y: "year", yr: "year", year: "year", years: "year",
};
const MAX: Record<Unit, number> = { day: 3650, week: 520, month: 120, year: 10 };

export function parseDuration(text?: string | null): { count: number; unit: Unit } | null {
  const match = /^\s*(\d{1,4})\s*([a-z]+)\.?\s*$/i.exec(text || "");
  if (!match) return null;
  const count = Number(match[1]);
  const unit = UNITS[match[2].toLowerCase()];
  if (!unit || count < 1 || count > MAX[unit]) return null;
  return { count, unit };
}

const pad = (n: number) => String(n).padStart(2, "0");
const format = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function endDateFor(startDate: string, durationText?: string | null): string | null {
  const duration = parseDuration(durationText);
  if (!duration || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  let next: Date;
  if (duration.unit === "day" || duration.unit === "week") {
    next = new Date(Date.UTC(y, m - 1, d + duration.count * (duration.unit === "week" ? 7 : 1)));
  } else {
    const months = duration.count * (duration.unit === "year" ? 12 : 1);
    const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    if (d > lastDay) return format(new Date(Date.UTC(y, m - 1 + months, lastDay)));
    next = new Date(Date.UTC(y, m - 1 + months, d));
  }
  next.setUTCDate(next.getUTCDate() - 1);
  return format(next);
}

export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
