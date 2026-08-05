import { NextResponse, type NextRequest } from "next/server";
import type { Assignment, AssignmentStatus, Json } from "@dueable/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPlannerService } from "@/services/planner/PlannerService";
import { formatCanvasAssignmentDescription } from "@/lib/canvas/assignment-description";

interface ImportAssignmentRequest {
  courseTitle: string;
  courseColor?: string | null;
  assignmentTitle: string;
  assignmentDescription: string;
  dueDate: string | null;
  availableUntil?: string | null;
  sourceUrl: string;
}

interface PersistedAssignmentRow {
  id: string;
  course_id: string;
  canvas_assignment_id: string;
  title: string;
  description: string;
  due_date: string;
  available_until: string | null;
  estimated_hours: number;
  status: AssignmentStatus;
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

function parseCanvasVisibleDate(rawValue: string | null | undefined, options: { required: boolean; missingMessage?: string }) {
  const visibleDate = normalizeText(rawValue);

  if (!visibleDate) {
    if (options.required) {
      throw new Error(options.missingMessage ?? "This Canvas assignment does not show a visible date.");
    }

    return null;
  }

  const directDate = new Date(visibleDate);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const normalized = visibleDate
    .replace(/^due\s+/i, "")
    .replace(/^available\s+until\s+/i, "")
    .replace(/\s+by\s+/i, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const weekdayOnlyMatch = normalized.match(/^(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?)(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?$/i);

  if (weekdayOnlyMatch) {
    const [, weekdayToken, hourToken, minuteToken, meridiemToken] = weekdayOnlyMatch;
    const weekdayIndex = weekdayIndexes[weekdayToken.toLowerCase()];

    if (weekdayIndex === undefined) {
      throw new Error(`Unable to parse the Canvas date weekday: ${visibleDate}`);
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
    throw new Error(`Unable to parse the Canvas date: ${visibleDate}`);
  }

  const [, , monthToken, dayToken, yearToken, hourToken, minuteToken, meridiemToken] = match;
  const monthIndex = monthIndexes[monthToken.slice(0, 3).toLowerCase()];

  if (monthIndex === undefined) {
    throw new Error(`Unable to parse the Canvas date month: ${visibleDate}`);
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

function parseDueDate(rawDueDate: string | null) {
  return parseCanvasVisibleDate(rawDueDate, {
    required: true,
    missingMessage: "This Canvas assignment does not show a visible due date, so it cannot be imported yet.",
  });
}

function parseAvailableUntil(rawAvailableUntil: string | null | undefined) {
  return parseCanvasVisibleDate(rawAvailableUntil, { required: false });
}

function mapAssignmentRowToDomain(assignment: PersistedAssignmentRow): Assignment {
  return {
    id: assignment.id,
    courseId: assignment.course_id,
    canvasAssignmentId: assignment.canvas_assignment_id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.due_date,
    availableUntil: assignment.available_until,
    estimatedHours: assignment.estimated_hours,
    status: assignment.status,
  };
}

async function generateChecklistForAssignment(supabase: ReturnType<typeof createSupabaseAdminClient>, assignment: PersistedAssignmentRow) {
  const existingTasksResult = await supabase
    .from("tasks")
    .select("id")
    .eq("assignment_id", assignment.id)
    .limit(1)
    .maybeSingle();

  if (existingTasksResult.error) {
    throw new Error(existingTasksResult.error.message ?? "Unable to inspect existing assignment tasks.");
  }

  if (existingTasksResult.data) {
    return false;
  }

  const planner = createPlannerService();
  const planResult = await planner.generatePlan(mapAssignmentRowToDomain(assignment));
  const plan = planResult.plan;

  if (plan.tasks.length === 0) {
    return false;
  }

  const planInsertResult = await supabase
    .from("assignment_plans")
    .insert({
      assignment_id: assignment.id,
      provider_used: planResult.provider,
      plan_type: plan.type,
      title: plan.title,
      difficulty: plan.difficulty,
      estimated_hours: plan.estimatedHours,
      estimated_days: plan.estimatedDays,
      plan_snapshot: plan as unknown as Json,
    })
    .select("id")
    .single();

  if (planInsertResult.error || !planInsertResult.data) {
    throw new Error(planInsertResult.error?.message ?? `Unable to store a generated plan for ${assignment.title}.`);
  }

  const taskInsertResult = await supabase.from("tasks").insert(
    plan.tasks.map((task, index) => ({
      assignment_id: assignment.id,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimatedMinutes,
      order: index,
      source_plan_id: planInsertResult.data.id,
    })),
  );

  if (taskInsertResult.error) {
    await supabase.from("assignment_plans").delete().eq("id", planInsertResult.data.id);
    throw new Error(taskInsertResult.error.message ?? `Unable to store generated tasks for ${assignment.title}.`);
  }

  const assignmentUpdateResult = await supabase
    .from("assignments")
    .update({ estimated_hours: plan.estimatedHours })
    .eq("id", assignment.id);

  if (assignmentUpdateResult.error) {
    throw new Error(assignmentUpdateResult.error.message ?? `Unable to update the estimated hours for ${assignment.title}.`);
  }

  return true;
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
    const courseColor = normalizeText(body.courseColor) || null;
    const assignmentTitle = normalizeText(body.assignmentTitle);
    const sourceUrl = normalizeText(body.sourceUrl);
    const assignmentDescription = formatCanvasAssignmentDescription(body.assignmentDescription, {
      pageUrl: sourceUrl,
    });

    if (!courseTitle || !assignmentTitle || !sourceUrl) {
      return jsonWithCors(
        { error: "Course title, assignment title, and source URL are required to import a Canvas assignment." },
        { status: 422 },
        request,
      );
    }

    const dueDate = parseDueDate(body.dueDate ?? null);
    const availableUntil = parseAvailableUntil(body.availableUntil);
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
          course_color: courseColor,
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
          available_until: availableUntil,
        },
        { onConflict: "course_id,canvas_assignment_id" },
      )
      .select("id, course_id, canvas_assignment_id, title, description, due_date, available_until, estimated_hours, status")
      .single();

    if (assignment.error || !assignment.data) {
      throw new Error(assignment.error?.message ?? "Unable to save the Canvas assignment.");
    }

    const planGenerated = await generateChecklistForAssignment(supabase, assignment.data as PersistedAssignmentRow);

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
        planGenerated,
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