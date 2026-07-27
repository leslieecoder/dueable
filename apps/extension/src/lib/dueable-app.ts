function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

export const DUEABLE_WEB_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_DUEABLE_WEB_ORIGIN ?? "http://localhost:3000",
);

export function getDueableUrl(path: string) {
  return `${DUEABLE_WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}