import { requestCanvasApi } from "./api";

export interface CanvasAssignment {
  id: number;
  courseId: number;
  name: string;
  description?: string;
  dueAt?: string;
  availableUntil?: string;
  pointsPossible?: number;
  htmlUrl?: string;
  submitted: boolean;
}

interface CanvasAssignmentApiResponse {
  id?: unknown;
  course_id?: unknown;
  name?: unknown;
  description?: unknown;
  due_at?: unknown;
  lock_at?: unknown;
  points_possible?: unknown;
  html_url?: unknown;
  submission?: unknown;
}

interface CanvasSubmissionApiResponse {
  workflow_state?: unknown;
  submitted_at?: unknown;
  graded_at?: unknown;
  score?: unknown;
  grade?: unknown;
}

function getNextPageUrl(linkHeader: string | null) {
  if (!linkHeader) {
    return null;
  }

  const links = linkHeader.split(",");

  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/i);

    if (match?.[2] === "next") {
      return match[1];
    }
  }

  return null;
}

function normalizeAssignment(rawAssignment: CanvasAssignmentApiResponse, courseId: number): CanvasAssignment | null {
  if (typeof rawAssignment.id !== "number" || typeof rawAssignment.name !== "string") {
    return null;
  }

  const normalizedCourseId = typeof rawAssignment.course_id === "number" ? rawAssignment.course_id : courseId;
  const submission = rawAssignment.submission as CanvasSubmissionApiResponse | null | undefined;
  const submissionWorkflowState = typeof submission?.workflow_state === "string" ? submission.workflow_state.toLowerCase() : null;
  const hasSubmittedAt = typeof submission?.submitted_at === "string";
  const hasCurrentUserSubmission = submission !== null && typeof submission === "object";
  const isSubmitted =
    hasCurrentUserSubmission &&
    (hasSubmittedAt ||
      submissionWorkflowState === "submitted" ||
      submissionWorkflowState === "pending_review" ||
      submissionWorkflowState === "complete");

  return {
    id: rawAssignment.id,
    courseId: normalizedCourseId,
    name: rawAssignment.name,
    description: typeof rawAssignment.description === "string" ? rawAssignment.description : undefined,
    dueAt: typeof rawAssignment.due_at === "string" ? rawAssignment.due_at : undefined,
    availableUntil: typeof rawAssignment.lock_at === "string" ? rawAssignment.lock_at : undefined,
    pointsPossible: typeof rawAssignment.points_possible === "number" ? rawAssignment.points_possible : undefined,
    htmlUrl: typeof rawAssignment.html_url === "string" ? rawAssignment.html_url : undefined,
    submitted: isSubmitted,
  };
}

async function fetchAssignmentsPage(tabId: number, url: string) {
  const { bodyText, linkHeader } = await requestCanvasApi(tabId, url, "Canvas assignments request");

  let payload: unknown;

  try {
    payload = JSON.parse(bodyText) as unknown;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Canvas assignments response was not valid JSON: ${error.message}`
        : "Canvas assignments response was not valid JSON.",
      { cause: error },
    );
  }

  if (!Array.isArray(payload)) {
    throw new Error("Canvas assignments response did not return an array.");
  }

  return {
    items: payload as CanvasAssignmentApiResponse[],
    nextPageUrl: getNextPageUrl(linkHeader),
  };
}

export async function getCanvasAssignments(tabId: number, canvasBaseUrl: string, courseId: number): Promise<CanvasAssignment[]> {
  console.log("[Dueable][Canvas API] Fetching assignments for course:", courseId);

  const assignments: CanvasAssignment[] = [];
  let nextPageUrl: string | null = `${canvasBaseUrl}/api/v1/courses/${courseId}/assignments?per_page=100&include[]=submission`;

  while (nextPageUrl) {
    const page = await fetchAssignmentsPage(tabId, nextPageUrl);

    assignments.push(
      ...page.items
        .map((item) => normalizeAssignment(item, courseId))
        .filter((item): item is CanvasAssignment => item !== null),
    );

    nextPageUrl = page.nextPageUrl;
  }

  console.log(`[Dueable][Canvas API] Retrieved ${assignments.length} assignments.`);

  return assignments;
}