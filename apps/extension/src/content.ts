import { isCanvasAssignmentPage, isCanvasPage, scrapeCurrentAssignment } from "./lib/canvas/scrape-current-assignment";

const ExtensionMessage = {
	PingCanvas: "DUEABLE_PING_CANVAS",
	ScrapeCurrentAssignment: "DUEABLE_SCRAPE_CURRENT_ASSIGNMENT",
} as const;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === ExtensionMessage.PingCanvas) {
		sendResponse({
			isCanvas: isCanvasPage(window.location),
			isAssignmentPage: isCanvasAssignmentPage(window.location),
			pageTitle: document.title || null,
			url: window.location.href,
		});
		return false;
	}

	if (message.type === ExtensionMessage.ScrapeCurrentAssignment) {
		try {
			const data = scrapeCurrentAssignment(document, window.location.href);
			sendResponse({ ok: true, data });
		} catch (error) {
			sendResponse({
				ok: false,
				error: error instanceof Error ? error.message : "Unknown scrape error.",
			});
		}

		return false;
	}

	return false;
});