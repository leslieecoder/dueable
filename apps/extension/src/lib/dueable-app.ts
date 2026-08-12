function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isLocalOrigin(value: string) {
  try {
    const url = new URL(value);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export const EXTENSION_AUTH_COMPLETE_PATH = "/auth/extension-complete?source=extension";
export const EXTENSION_AUTH_HANDOFF_STORAGE_KEY = "dueableExtensionAuthHandoff";
const DEFAULT_DUEABLE_WEB_ORIGIN = "https://dueable-web.vercel.app";
const ALLOW_LOCALHOST_ORIGIN = import.meta.env.VITE_DUEABLE_ALLOW_LOCALHOST_ORIGIN === "true";

function readConfiguredOrigin() {
  const configuredOrigin = import.meta.env.VITE_DUEABLE_WEB_ORIGIN
    ?? import.meta.env.VITE_DUEABLE_DASHBOARD_URL
    ?? DEFAULT_DUEABLE_WEB_ORIGIN;

  if (import.meta.env.PROD && !ALLOW_LOCALHOST_ORIGIN && isLocalOrigin(configuredOrigin)) {
    return DEFAULT_DUEABLE_WEB_ORIGIN;
  }

  return configuredOrigin;
}

export const DUEABLE_WEB_ORIGIN = normalizeOrigin(
  readConfiguredOrigin(),
);

export function getDueableUrl(path: string) {
  return `${DUEABLE_WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isExtensionAuthCompleteUrl(value: string) {
  try {
    const url = new URL(value);

    return normalizeOrigin(url.origin) === DUEABLE_WEB_ORIGIN && url.pathname === "/auth/extension-complete";
  } catch {
    return false;
  }
}