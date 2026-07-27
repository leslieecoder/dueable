import type { AssignmentStatus } from "@dueable/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface AssignmentProgressSummary {
  completedSteps: number;
  totalSteps: number;
}

function deriveAssignmentStatus(completedSteps: number, totalSteps: number): AssignmentStatus {
  if (totalSteps === 0) {
    return "not_started";
  }

  if (completedSteps === totalSteps) {
    return "completed";
  }

  if (completedSteps > 0) {
    return "in_progress";
  }

  return "not_started";
}

export async function syncAssignmentStatusForSupabase(
  supabase: SupabaseServerClient,
  assignmentId: string,
): Promise<AssignmentProgressSummary> {
  const result = await supabase.from("tasks").select("completed").eq("assignment_id", assignmentId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const tasks = result.data ?? [];
  const completedSteps = tasks.filter((task) => task.completed).length;
  const totalSteps = tasks.length;

  if (totalSteps > 0) {
    const updateResult = await supabase
      .from("assignments")
      .update({ status: deriveAssignmentStatus(completedSteps, totalSteps) })
      .eq("id", assignmentId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  }

  return {
    completedSteps,
    totalSteps,
  };
}