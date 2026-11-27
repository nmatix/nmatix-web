// Display formatting for the dashboard. Amounts are always INR (PRD v0.5, CFG-07).
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export function formatINR(amount) {
  return typeof amount === "number" ? inr.format(amount) : "";
}

export function formatDate(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? date.format(d) : "";
}

export function formatDateTime(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${date.format(d)} · ${time.format(d)}` : "";
}

export function withinDays(iso, days, now = Date.now()) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return !Number.isNaN(t) && now - t <= days * 24 * 60 * 60 * 1000;
}
