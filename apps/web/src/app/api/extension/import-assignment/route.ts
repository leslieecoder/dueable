import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ImportAssignmentRequest {
  courseTitle: string;
  assignmentTitle: string;
  assignmentDescription: string;
  dueDate: string | null;
  sourceUrl: string;
}

const monthIndexes: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const weekdayIndexes: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

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

function parseCanvasSourceUrl(sourceUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("The Canvas page URL was not a valid URL.");
  }

  const match = sourceUrl.match(/\/courses\/([^/]+)\/assignments\/([^/?#]+)/i);

  if (!match) {
    throw new Error("The Canvas page URL did not include a course ID and assignment ID.");
  }

  return {
    canvasBaseUrl: parsed.origin,
    canvasCourseId: match[1],
    canvasAssignmentId: match[2],
  };
}

function parseDueDate(rawDueDate: string | null) {
  const visibleDueDate = normalizeText(rawDueDate);

  if (!visibleDueDate) {
    throw new Error("This Canvas assignment does not show a visible due date, so it cannot be imported yet.");
  }

  const directDate = new Date(visibleDueDate);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const normalized = visibleDueDate
    .replace(/^due\s+/i, "")
    .replace(/\s+by\s+/i, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const weekdayOnlyMatch = normalized.match(/^(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?)(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?$/i);

  if (weekdayOnlyMatch) {
    const [, weekdayToken, hourToken, minuteToken, meridiemToken] = weekdayOnlyMatch;
    const weekdayIndex = weekdayIndexes[weekdayToken.toLowerCase()];

    if (weekdayIndex === undefined) {
      throw new Error(`Unable to parse the Canvas due weekday: ${visibleDueDate}`);
    }

    const now = new Date();
    const parsed = new Date(now);
    const currentWeekday = parsed.getDay();
    let dayOffset = (weekdayIndex - currentWeekday + 7) % 7;

    if (dayOffset === 0) {
      dayOffset = 7;
    }

    parsed.setDate(parsed.getDate() + dayOffset);

    let hours = 23;
    let minutes = 59;

    if (hourToken && meridiemToken) {
      const rawHours = Number(hourToken) % 12;
      hours = rawHours + (meridiemToken.toLowerCase() === "pm" ? 12 : 0);
      minutes = minuteToken ? Number(minuteToken) : 0;
    }

    parsed.setHours(hours, minutes, 0, 0);
    return parsed.toISOString();
  }

  const match = normalized.match(
    /^(?:(mon|tue|wed|thu|fri|sat|sun)\s+)?([a-z]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?$/i,
  );

  if (!match) {
    throw new Error(`Unable to parse the Canvas due date: ${visibleDueDate}`);
  }

  const [, , monthToken, dayToken, yearToken, hourToken, minuteToken, meridiemToken] = match;
  const monthIndex = monthIndexes[monthToken.slice(0, 3).toLowerCase()];

  if (monthIndex === undefined) {
    throw new Error(`Unable to parse the Canvas due month: ${visibleDueDate}`);
  }

  const now = new Date();
  const year = yearToken ? Number(yearToken) : now.getFullYear();
  const day = Number(dayToken);
  let hours = 23;
  let minutes = 59;

  if (hourToken && meridiemToken) {
    const rawHours = Number(hourToken) % 12;
    hours = rawHours + (meridiemToken.toLowerCase() === "pm" ? 12 : 0);
    minutes = minuteToken ? Number(minuteToken) : 0;
  }

  const parsed = new Date(year, monthIndex, day, hours, minutes, 0, 0);

  if (!yearToken) {
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    if (parsed < sixMonthsAgo) {
      parsed.setFullYear(parsed.getFullYear() + 1);
    }
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

    const body = (await request.json()) as Partial<ImportAssignmentRequest>;
    const courseTitle = normalizeText(body.courseTitle);
    const assignmentTitle = normalizeText(body.assignmentTitle);
    const assignmentDescription = normalizeText(body.assignmentDescription);
    const sourceUrl = normalizeText(body.sourceUrl);

    if (!courseTitle || !assignmentTitle || !sourceUrl) {
      return jsonWithCors(
        { error: "Course title, assignment title, and source URL are required to import a Canvas assignment." },
        { status: 422 },
        request,
      );
    }

    const dueDate = parseDueDate(body.dueDate ?? null);
    const { canvasBaseUrl, canvasCourseId, canvasAssignmentId } = parseCanvasSourceUrl(sourceUrl);
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

    const course = await supabase
      .from("courses")
      .upsert(
        {
          user_id: authUser.id,
          canvas_base_url: canvasBaseUrl,
          canvas_course_id: canvasCourseId,
          title: courseTitle,
        },
        { onConflict: "user_id,canvas_base_url,canvas_course_id" },
      )
      .select("id, title")
      .single();

    if (course.error || !course.data) {
      throw new Error(course.error?.message ?? "Unable to save the Canvas course.");
    }

    const assignment = await supabase
      .from("assignments")
      .upsert(
        {
          course_id: course.data.id,
          canvas_assignment_id: canvasAssignmentId,
          title: assignmentTitle,
          description: assignmentDescription,
          due_date: dueDate,
        },
        { onConflict: "course_id,canvas_assignment_id" },
      )
      .select("id, title, due_date, status")
      .single();

    if (assignment.error || !assignment.data) {
      throw new Error(assignment.error?.message ?? "Unable to save the Canvas assignment.");
    }

    return jsonWithCors(
      {
        ok: true,
        assignment: {
          id: assignment.data.id,
          title: assignment.data.title,
          dueDate: assignment.data.due_date,
          status: assignment.data.status,
          courseTitle: course.data.title,
        },
      },
      { status: 200 },
      request,
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to import this Canvas assignment into Dueable.",
      },
      { status: 500 },
      request,
    );
  }
}