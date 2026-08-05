function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function readConfiguredOrigin() {
  return import.meta.env.VITE_DUEABLE_WEB_ORIGIN ?? import.meta.env.VITE_DUEABLE_DASHBOARD_URL ?? "http://localhost:3000";
}

export const DUEABLE_WEB_ORIGIN = normalizeOrigin(
  readConfiguredOrigin(),
);

export function getDueableUrl(path: string) {
  return `${DUEABLE_WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}