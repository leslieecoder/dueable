declare const __DUEABLE_WEB_ORIGIN__: string;

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

export const EXTENSION_AUTH_COMPLETE_PATH = "/auth/extension-complete?source=extension";
export const EXTENSION_AUTH_HANDOFF_STORAGE_KEY = "dueableExtensionAuthHandoff";
export const DUEABLE_WEB_ORIGIN = normalizeOrigin(__DUEABLE_WEB_ORIGIN__);

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