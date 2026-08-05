chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dueableExtensionReady: true });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});