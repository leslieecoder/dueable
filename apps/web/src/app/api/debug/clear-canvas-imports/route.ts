import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabaseSession = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseSession.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "You must be signed in to clear Canvas imports." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const coursesResult = await supabase
      .from("courses")
      .select("id, canvas_course_id, title")
      .eq("user_id", user.id);

    if (coursesResult.error) {
      throw new Error(coursesResult.error.message);
    }

    const courses = coursesResult.data ?? [];
    const courseIds = courses.map((course) => course.id);

    const assignmentsResult = courseIds.length
      ? await supabase
          .from("assignments")
          .select("id, title, course_id")
          .in("course_id", courseIds)
      : { data: [], error: null };

    if (assignmentsResult.error) {
      throw new Error(assignmentsResult.error.message);
    }

    const assignments = assignmentsResult.data ?? [];

    console.log(`[Dueable][Debug Cleanup] Preparing to clear Canvas imports for user ${user.id}`);
    console.log(`[Dueable][Debug Cleanup] Found ${courses.length} Canvas courses and ${assignments.length} linked assignments`);

    if (courseIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          deletedCourses: 0,
          deletedAssignments: 0,
          message: "No Canvas-imported data found for this user.",
        },
        { status: 200 },
      );
    }

    const deleteCoursesResult = await supabase.from("courses").delete().eq("user_id", user.id);

    if (deleteCoursesResult.error) {
      throw new Error(deleteCoursesResult.error.message);
    }

    console.log(`[Dueable][Debug Cleanup] Deleted ${courses.length} Canvas courses and ${assignments.length} linked assignments`);

    return NextResponse.json(
      {
        success: true,
        deletedCourses: courses.length,
        deletedAssignments: assignments.length,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to clear Canvas-imported data.",
      },
      { status: 500 },
    );
  }
}