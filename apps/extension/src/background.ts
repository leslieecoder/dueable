chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dueableExtensionReady: true });
});