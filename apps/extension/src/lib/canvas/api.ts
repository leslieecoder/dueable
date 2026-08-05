interface CanvasApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  bodyText: string;
  linkHeader: string | null;
}

export interface CanvasEnrollment {
  enrollment_state?: string;
  type?: string;
  role?: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  color?: string | null;
  workflow_state?: string;
  start_at?: string;
  end_at?: string;
  access_restricted_by_date?: boolean;
  enrollments?: CanvasEnrollment[];
}

interface CanvasColorsResponse {
  custom_colors?: Record<string, unknown>;
}

export function isLikelyCanvasUrl(tabUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(tabUrl);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (hostname.includes("canvas") || hostname.endsWith(".instructure.com")) {
    return true;
  }

  return /\/(courses|assignments|calendar|dashboard|grades|groups|profile)(\/|$)/.test(pathname);
}

export function getCanvasBaseUrl(tabUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(tabUrl);
  } catch {
    throw new Error("The active tab is not a valid Canvas URL.");
  }

  return parsed.origin;
}

function isCanvasCourse(value: unknown): value is CanvasCourse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.id === "number" && typeof candidate.name === "string";
}

function normalizeEnrollments(value: unknown): CanvasEnrollment[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const enrollments = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      enrollment_state: typeof entry.enrollment_state === "string" ? entry.enrollment_state : undefined,
      type: typeof entry.type === "string" ? entry.type : undefined,
      role: typeof entry.role === "string" ? entry.role : undefined,
    }));

  return enrollments.length > 0 ? enrollments : undefined;
}

function normalizeCourse(candidate: Record<string, unknown>): CanvasCourse {

  return {
    id: candidate.id as number,
    name: candidate.name as string,
    course_code: typeof candidate.course_code === "string" ? candidate.course_code : undefined,
    color: typeof candidate.course_color === "string" ? candidate.course_color : null,
    workflow_state: typeof candidate.workflow_state === "string" ? candidate.workflow_state : undefined,
    start_at: typeof candidate.start_at === "string" ? candidate.start_at : undefined,
    end_at: typeof candidate.end_at === "string" ? candidate.end_at : undefined,
    access_restricted_by_date:
      typeof candidate.access_restricted_by_date === "boolean" ? candidate.access_restricted_by_date : undefined,
    enrollments: normalizeEnrollments(candidate.enrollments),
  };
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

async function getCanvasCourseColors(tabId: number, canvasBaseUrl: string) {
  const { bodyText } = await requestCanvasApi(tabId, `${canvasBaseUrl}/api/v1/users/self/colors`, "Canvas course colors request");

  let payload: unknown;

  try {
    payload = JSON.parse(bodyText) as CanvasColorsResponse;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Canvas course colors response was not valid JSON: ${error.message}`
        : "Canvas course colors response was not valid JSON.",
      { cause: error },
    );
  }

  const customColors = (payload as CanvasColorsResponse)?.custom_colors;

  if (!customColors || typeof customColors !== "object") {
    return new Map<number, string>();
  }

  const colorEntries = Object.entries(customColors)
    .map(([key, value]) => {
      const match = key.match(/^course_(\d+)$/);

      if (!match || !isHexColor(value)) {
        return null;
      }

      return [Number(match[1]), value] as const;
    })
    .filter((entry): entry is readonly [number, string] => entry !== null);

  return new Map<number, string>(colorEntries);
}

async function runCanvasRequestInTab(tabId: number, url: string): Promise<CanvasApiResponse> {
  let results: chrome.scripting.InjectionResult<CanvasApiResponse | { networkError: string }>[];

  try {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [url],
      func: async (requestUrl: string) => {
        try {
          const response = await fetch(requestUrl, {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });

          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            bodyText: await response.text(),
            linkHeader: response.headers.get("link"),
          };
        } catch (error) {
          return {
            networkError: error instanceof Error ? error.message : "Unable to reach the Canvas API.",
          };
        }
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Unable to run the Canvas request in the active tab: ${error.message}`
        : "Unable to run the Canvas request in the active tab.",
      { cause: error },
    );
  }

  const payload = results[0]?.result;

  if (!payload) {
    throw new Error("Canvas did not return a response from the active tab.");
  }

  if ("networkError" in payload) {
    throw new Error(`Unable to reach the Canvas API: ${payload.networkError}`);
  }

  return payload;
}

export async function requestCanvasApi(tabId: number, url: string, errorPrefix: string): Promise<{ bodyText: string; linkHeader: string | null }> {
  const response = await runCanvasRequestInTab(tabId, url);

  if (!response.ok) {
    const bodySummary = response.bodyText.trim();
    throw new Error(
      bodySummary
        ? `${errorPrefix} failed with ${response.status} ${response.statusText}: ${bodySummary}`
        : `${errorPrefix} failed with ${response.status} ${response.statusText}.`,
    );
  }

  return {
    bodyText: response.bodyText,
    linkHeader: response.linkHeader,
  };
}

export async function getCanvasCourses(tabId: number, canvasBaseUrl: string): Promise<CanvasCourse[]> {
  console.log("[Dueable][Canvas API] Starting course request.");

  const [{ bodyText }, courseColors] = await Promise.all([
    requestCanvasApi(tabId, `${canvasBaseUrl}/api/v1/courses`, "Canvas courses request"),
    getCanvasCourseColors(tabId, canvasBaseUrl).catch((error) => {
      console.warn("[Dueable][Canvas API] Unable to load course colors:", error);
      return new Map<number, string>();
    }),
  ]);

  let payload: unknown;

  try {
    payload = JSON.parse(bodyText) as unknown;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Canvas courses response was not valid JSON: ${error.message}`
        : "Canvas courses response was not valid JSON.",
      { cause: error },
    );
  }

  if (!Array.isArray(payload)) {
    throw new Error("Canvas courses response did not return an array.");
  }

  const courses = payload
    .filter(isCanvasCourse)
    .map((course) => normalizeCourse(course as unknown as Record<string, unknown>))
    .map((course) => ({
      ...course,
      color: courseColors.get(course.id) ?? course.color ?? null,
    }));
  const activeCourses = courses.filter((course) => course.workflow_state === "available");

  console.log(`[Dueable][Canvas API] Retrieved ${activeCourses.length} active courses.`);
  console.log("[Dueable][Canvas API] Active course names:", activeCourses.map((course) => course.name));

  return activeCourses;
}