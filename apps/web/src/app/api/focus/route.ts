import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentFocus } from "@/services/focus/StudentFocusService";
import { getPrioritizedAssignments } from "@/services/priority/PrioritizedAssignmentsService";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "You must be signed in to view your current focus." }, { status: 401 });
    }

    console.log("[Dueable][Focus API] Generating student focus");

    const focus = await getStudentFocus();

    if (!focus) {
      const prioritizedAssignments = await getPrioritizedAssignments();

      if (prioritizedAssignments.length === 0) {
        return NextResponse.json({ focus: null, message: "We couldn’t find assignments yet. Finish importing from Canvas, then check again." }, { status: 200 });
      }

      const hasIncompleteAssignments = prioritizedAssignments.some((entry) => entry.assignment.status !== "completed");

      if (!hasIncompleteAssignments) {
        return NextResponse.json({ focus: null, message: "You’re caught up right now. When something new appears, import again from Canvas." }, { status: 200 });
      }

      return NextResponse.json({ focus: null, message: "Your assignments are here. Open one and add the first checklist step so Dueable can guide today’s focus." }, { status: 200 });
    }

    console.log(`[Dueable][Focus API] Focus assignment: ${focus.assignment.title}`);

    return NextResponse.json({ focus }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate student focus.",
      },
      { status: 500 },
    );
  }
}