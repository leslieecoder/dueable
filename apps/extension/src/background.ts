import { EXTENSION_AUTH_HANDOFF_STORAGE_KEY, isExtensionAuthCompleteUrl } from "./lib/dueable-app";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dueableExtensionReady: true });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || !isExtensionAuthCompleteUrl(tab.url)) {
    return;
  }

  try {
    const stored = await chrome.storage.local.get(EXTENSION_AUTH_HANDOFF_STORAGE_KEY);
    const handoff = stored[EXTENSION_AUTH_HANDOFF_STORAGE_KEY] as
      | {
          returnTabId?: number;
          returnWindowId?: number;
          authTabId?: number;
        }
      | undefined;

    if (!handoff) {
      return;
    }

    if (typeof handoff.returnWindowId === "number") {
      await chrome.windows.update(handoff.returnWindowId, { focused: true });
    }

    if (typeof handoff.returnTabId === "number") {
      await chrome.tabs.update(handoff.returnTabId, { active: true });
    }

    const authTabId = typeof handoff.authTabId === "number" ? handoff.authTabId : tabId;

    if (authTabId) {
      await chrome.tabs.remove(authTabId).catch(() => undefined);
    }
  } finally {
    await chrome.storage.local.remove(EXTENSION_AUTH_HANDOFF_STORAGE_KEY);
  }
});