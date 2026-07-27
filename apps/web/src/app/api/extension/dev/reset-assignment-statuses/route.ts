import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCorsHeaders, jsonWithCors } from "../../shared";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, "POST, OPTIONS"),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return jsonWithCors({ error: "This route is only available in development." }, { status: 404 }, request, "POST, OPTIONS");
    }

    const supabaseSession = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseSession.auth.getUser();

    if (!user?.id) {
      return jsonWithCors({ error: "You must be signed in to reset assignment statuses." }, { status: 401 }, request, "POST, OPTIONS");
    }

    const supabase = createSupabaseAdminClient();
    const coursesResult = await supabase.from("courses").select("id").eq("user_id", user.id);

    if (coursesResult.error) {
      throw new Error(coursesResult.error.message);
    }

    const courseIds = (coursesResult.data ?? []).map((course) => course.id);

    if (courseIds.length === 0) {
      return jsonWithCors(
        {
          success: true,
          resetAssignments: 0,
          resetTasks: 0,
          message: "No imported Canvas courses found for this user.",
        },
        { status: 200 },
        request,
        "POST, OPTIONS",
      );
    }

    const assignmentsResult = await supabase.from("assignments").select("id").in("course_id", courseIds);

    if (assignmentsResult.error) {
      throw new Error(assignmentsResult.error.message);
    }

    const assignmentIds = (assignmentsResult.data ?? []).map((assignment) => assignment.id);

    const resetAssignmentsResult = await supabase
      .from("assignments")
      .update({ status: "not_started" })
      .in("course_id", courseIds)
      .select("id");

    if (resetAssignmentsResult.error) {
      throw new Error(resetAssignmentsResult.error.message);
    }

    const resetTasksResult = assignmentIds.length
      ? await supabase
          .from("tasks")
          .update({
            completed: false,
            completed_at: null,
          })
          .in("assignment_id", assignmentIds)
          .select("id")
      : { data: [], error: null };

    if (resetTasksResult.error) {
      throw new Error(resetTasksResult.error.message);
    }

    return jsonWithCors(
      {
        success: true,
        resetAssignments: resetAssignmentsResult.data?.length ?? 0,
        resetTasks: resetTasksResult.data?.length ?? 0,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to reset imported assignment statuses.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}