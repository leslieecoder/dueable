import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCorsHeaders, jsonWithCors } from "../shared";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, "POST, OPTIONS"),
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseSession = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseSession.auth.getUser();

    if (!user?.email) {
      return jsonWithCors({ error: "You must be signed in to clear Canvas imports." }, { status: 401 }, request, "POST, OPTIONS");
    }

    const supabase = createSupabaseAdminClient();

    const coursesResult = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", user.id);

    if (coursesResult.error) {
      throw new Error(coursesResult.error.message);
    }

    const courses = coursesResult.data ?? [];
    const courseIds = courses.map((course) => course.id);

    const assignmentsResult = courseIds.length
      ? await supabase.from("assignments").select("id").in("course_id", courseIds)
      : { data: [], error: null };

    if (assignmentsResult.error) {
      throw new Error(assignmentsResult.error.message);
    }

    if (courseIds.length === 0) {
      return jsonWithCors(
        {
          success: true,
          deletedCourses: 0,
          deletedAssignments: 0,
          message: "No Canvas-imported data found for this user.",
        },
        { status: 200 },
        request,
        "POST, OPTIONS",
      );
    }

    const deleteCoursesResult = await supabase.from("courses").delete().eq("user_id", user.id);

    if (deleteCoursesResult.error) {
      throw new Error(deleteCoursesResult.error.message);
    }

    return jsonWithCors(
      {
        success: true,
        deletedCourses: courses.length,
        deletedAssignments: (assignmentsResult.data ?? []).length,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to clear Canvas-imported data.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}