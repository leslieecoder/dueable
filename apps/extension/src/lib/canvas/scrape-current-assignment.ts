import { canvasSelectorStrategies } from "./selectors";

export interface ScrapedAssignmentPayload {
  courseTitle: string;
  assignmentTitle: string;
  assignmentDescription: string;
  dueDate: string | null;
  sourceUrl: string;
}

export function isCanvasAssignmentPage(locationLike: Location) {
  return isCanvasPage(locationLike) && /\/assignments\/\d+/.test(locationLike.pathname);
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function readElementText(element: Element) {
  const clone = element.cloneNode(true);

  if (clone instanceof Element) {
    clone.querySelectorAll("button, input, select, textarea, svg, script, style, [aria-hidden='true']").forEach((child) => {
      child.remove();
    });

    return normalizeText(clone.textContent);
  }

  return normalizeText(element.textContent);
}

function readCanvasOverviewDate(element: Element) {
  const overview = element.closest(".student-assignment-overview");
  if (!overview) {
    return null;
  }

  const dateText = normalizeText(overview.querySelector(".display_date")?.textContent);
  const timeText = normalizeText(overview.querySelector(".display_time")?.textContent);
  const combinedText = normalizeText(overview.querySelector(".date_text")?.textContent);

  if (dateText && timeText) {
    return `${dateText} by ${timeText}`;
  }

  if (combinedText) {
    return combinedText;
  }

  if (dateText) {
    return dateText;
  }

  return null;
}

function readFirstText(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const text = element ? readElementText(element) : null;

    if (text) {
      return text;
    }
  }

  return null;
}

function readFirstDate(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (!element) {
      continue;
    }

    const canvasOverviewDate = readCanvasOverviewDate(element);
    if (canvasOverviewDate) {
      return canvasOverviewDate;
    }

    if (element instanceof HTMLTimeElement && element.dateTime) {
      return element.dateTime;
    }

    const text = readElementText(element);
    if (!text) {
      continue;
    }

    return text;
  }

  return null;
}

export function isCanvasPage(locationLike: Location) {
  return (
    locationLike.hostname.includes("canvas") ||
    locationLike.hostname.endsWith(".instructure.com") ||
    /\/courses\/\d+/.test(locationLike.pathname)
  );
}

export function scrapeCurrentAssignment(documentLike: Document, sourceUrl: string): ScrapedAssignmentPayload {
  for (const strategy of canvasSelectorStrategies) {
    const assignmentTitle = readFirstText(documentLike, strategy.assignmentTitle);
    const assignmentDescription = readFirstText(documentLike, strategy.assignmentDescription);
    const courseTitle = readFirstText(documentLike, strategy.courseTitle);

    if (!assignmentTitle || !courseTitle) {
      continue;
    }

    return {
      courseTitle,
      assignmentTitle,
      assignmentDescription: assignmentDescription ?? "",
      dueDate: readFirstDate(documentLike, strategy.dueDate),
      sourceUrl,
    };
  }

  throw new Error("No Canvas selector strategy matched the current assignment page.");
}