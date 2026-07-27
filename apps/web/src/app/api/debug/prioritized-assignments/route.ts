import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAssignmentList } from "@/features/assignments/data";
import { getPrioritizedAssignments } from "@/services/priority/PrioritizedAssignmentsService";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "You must be signed in to preview prioritized assignments." }, { status: 401 });
    }

    const [prioritizedAssignments, assignmentList] = await Promise.all([getPrioritizedAssignments(), getAssignmentList()]);
    const courseTitlesByAssignmentId = new Map(assignmentList.map((assignment) => [assignment.id, assignment.courseTitle]));

    console.log(`[Dueable][Priority Debug] Total assignments analyzed: ${prioritizedAssignments.length}`);

    const topAssignments = prioritizedAssignments.slice(0, 10).map((entry) => ({
      title: entry.assignment.title,
      course: courseTitlesByAssignmentId.get(entry.assignment.id) ?? "Unknown course",
      dueDate: entry.assignment.dueDate,
      priorityScore: entry.priorityScore,
      priorityLevel: entry.priorityLevel,
      reasons: entry.reasons,
    }));

    console.log("[Dueable][Priority Debug] Top 10 priority assignments:", topAssignments);

    return NextResponse.json({ assignments: topAssignments });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to preview prioritized assignments.",
      },
      { status: 500 },
    );
  }
}