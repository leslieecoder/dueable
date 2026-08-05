import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCanvasAssignmentDescription } from "@/lib/canvas/assignment-description";

interface ImportSemesterAssignmentRequest {
  id: number;
  courseId: number;
  courseName: string;
  courseColor?: string | null;
  name: string;
  description?: string;
  dueAt?: string;
  availableUntil?: string;
  pointsPossible?: number;
  htmlUrl?: string;
}

interface ImportSemesterRequest {
  canvasBaseUrl?: string;
  coursesImported?: number;
  assignmentsImported?: number;
  assignments?: ImportSemesterAssignmentRequest[];
}

function buildCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin?.startsWith("chrome-extension://")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    } satisfies Record<string, string>;
  }

  return {} as Record<string, string>;
}

function jsonWithCors(body: unknown, init: ResponseInit, request: NextRequest) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...buildCorsHeaders(request),
      ...(init.headers ?? {}),
    },
  });
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeCanvasBaseUrl(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("The Canvas domain for this import was not a valid URL.");
  }

  return parsed.origin;
}

function parseCanvasDueDate(rawDueAt: string | undefined) {
  const dueAt = normalizeText(rawDueAt);

  if (!dueAt) {
    return null;
  }

  const parsed = new Date(dueAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseCanvasAvailableUntil(rawAvailableUntil: string | undefined) {
  const availableUntil = normalizeText(rawAvailableUntil);

  if (!availableUntil) {
    return null;
  }

  const parsed = new Date(availableUntil);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseSession = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabaseSession.auth.getUser();

    if (!authUser?.email) {
      return jsonWithCors({ error: "Sign in to Dueable in the web app before importing assignments." }, { status: 401 }, request);
    }

    const body = (await request.json()) as Partial<ImportSemesterRequest>;

    if (!Array.isArray(body.assignments)) {
      return jsonWithCors({ error: "A semester assignments array is required." }, { status: 422 }, request);
    }

    const canvasBaseUrl =
      normalizeCanvasBaseUrl(body.canvasBaseUrl) ||
      normalizeCanvasBaseUrl(
        body.assignments.find((assignment) => typeof assignment?.htmlUrl === "string" && assignment.htmlUrl.trim().length > 0)?.htmlUrl,
      );

    if (!canvasBaseUrl) {
      return jsonWithCors({ error: "A Canvas domain is required for semester imports." }, { status: 422 }, request);
    }

    const profileName =
      typeof authUser.user_metadata.name === "string" && authUser.user_metadata.name.trim().length > 0
        ? authUser.user_metadata.name.trim()
        : authUser.email.split("@")[0] ?? "Student";

    const supabase = createSupabaseAdminClient();
    const profile = await supabase
      .from("users")
      .upsert(
        {
          id: authUser.id,
          email: authUser.email,
          name: profileName,
        },
        { onConflict: "id" },
      )
      .select("id")
      .single();

    if (profile.error || !profile.data) {
      throw new Error(profile.error?.message ?? "Unable to load the current Dueable user profile.");
    }

    const courseMap = new Map<string, { canvasBaseUrl: string; canvasCourseId: string; title: string; courseColor: string | null }>();

    for (const assignment of body.assignments) {
      if (typeof assignment?.courseId !== "number") {
        continue;
      }

      const courseTitle = normalizeText(assignment.courseName);

      if (!courseTitle) {
        continue;
      }

      const canvasCourseId = String(assignment.courseId);

      const courseKey = `${canvasBaseUrl}:${canvasCourseId}`;

      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, {
          canvasBaseUrl,
          canvasCourseId,
          title: courseTitle,
          courseColor: normalizeText(assignment.courseColor) || null,
        });
      }
    }

    const coursesToUpsert = Array.from(courseMap.values()).map((course) => ({
      user_id: authUser.id,
      canvas_base_url: course.canvasBaseUrl,
      canvas_course_id: course.canvasCourseId,
      title: course.title,
      course_color: course.courseColor,
    }));

    const coursesResult = coursesToUpsert.length
      ? await supabase
          .from("courses")
          .upsert(coursesToUpsert, { onConflict: "user_id,canvas_base_url,canvas_course_id" })
          .select("id, title, canvas_base_url, canvas_course_id, course_color")
      : { data: [], error: null };

    if (coursesResult.error) {
      throw new Error(coursesResult.error.message ?? "Unable to save Canvas courses.");
    }

    const persistedCourseMap = new Map((coursesResult.data ?? []).map((course) => [`${course.canvas_base_url}:${course.canvas_course_id}`, course]));
    const assignmentMap = new Map<string, {
      course_id: string;
      canvas_assignment_id: string;
      title: string;
      description: string;
      due_date: string;
      available_until: string | null;
      points_possible: number | null;
    }>();

    for (const assignment of body.assignments) {
      if (typeof assignment?.id !== "number" || typeof assignment.courseId !== "number") {
        continue;
      }

      const title = normalizeText(assignment.name);
      const description = formatCanvasAssignmentDescription(assignment.description, {
        baseUrl: canvasBaseUrl,
        pageUrl: assignment.htmlUrl,
      });
      const dueDate = parseCanvasDueDate(assignment.dueAt);
      const availableUntil = parseCanvasAvailableUntil(assignment.availableUntil);
      const course = persistedCourseMap.get(`${canvasBaseUrl}:${String(assignment.courseId)}`);

      if (!title || !dueDate || !course) {
        continue;
      }

      const canvasAssignmentId = String(assignment.id);
      const dedupeKey = `${course.id}:${canvasAssignmentId}`;

      assignmentMap.set(dedupeKey, {
        course_id: course.id,
        canvas_assignment_id: canvasAssignmentId,
        title,
        description,
        due_date: dueDate,
        available_until: availableUntil,
        points_possible: Number.isFinite(assignment.pointsPossible) ? assignment.pointsPossible ?? null : null,
      });
    }

    const assignmentsToUpsert = Array.from(assignmentMap.values());
    const assignmentsResult = assignmentsToUpsert.length
      ? await supabase
          .from("assignments")
          .upsert(assignmentsToUpsert, { onConflict: "course_id,canvas_assignment_id" })
          .select("id")
      : { data: [], error: null };

    if (assignmentsResult.error) {
      throw new Error(assignmentsResult.error.message ?? "Unable to save Canvas assignments.");
    }

    return jsonWithCors(
      {
        success: true,
        coursesImported: coursesToUpsert.length,
        assignmentsImported: assignmentsToUpsert.length,
        assignmentIds: (assignmentsResult.data ?? []).map((assignment) => assignment.id),
      },
      { status: 200 },
      request,
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to import this Canvas semester into Dueable.",
      },
      { status: 500 },
      request,
    );
  }
}