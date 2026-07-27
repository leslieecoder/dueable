export const ExtensionMessage = {
  PingCanvas: "DUEABLE_PING_CANVAS",
  ScrapeCurrentAssignment: "DUEABLE_SCRAPE_CURRENT_ASSIGNMENT",
  OpenDashboard: "DUEABLE_OPEN_DASHBOARD",
} as const;

export type ExtensionMessageType = (typeof ExtensionMessage)[keyof typeof ExtensionMessage];