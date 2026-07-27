"use server";

import { revalidatePath } from "next/cache";
import type { Assignment, AssignmentStatus, Json } from "@dueable/types";
import type { PlannerActionState } from "@/features/planner/planner-state";
import { createPlannerService } from "@/services/planner/PlannerService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAssignmentStatusForSupabase } from "./task-status";

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function requireSupabaseAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to change assignment progress.");
  }

  return supabase;
}

async function syncAssignmentStatus(assignmentId: string) {
  const supabase = await requireSupabaseAuth();
  await syncAssignmentStatusForSupabase(supabase, assignmentId);
}

function refreshAssignmentViews(assignmentId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignmentId}`);
}

function mapAssignmentRowToDomain(assignment: {
  id: string;
  course_id: string;
  canvas_assignment_id: string;
  title: string;
  description: string;
  due_date: string;
  estimated_hours: number;
  status: AssignmentStatus;
}): Assignment {
  return {
    id: assignment.id,
    courseId: assignment.course_id,
    canvasAssignmentId: assignment.canvas_assignment_id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.due_date,
    estimatedHours: assignment.estimated_hours,
    status: assignment.status,
  };
}

export async function generateChecklistPlanAction(
  _previousState: PlannerActionState,
  formData: FormData,
): Promise<PlannerActionState> {
  const assignmentId = readField(formData, "assignmentId");
  const mode = readField(formData, "mode");

  if (!assignmentId) {
    return {
      status: "error",
      message: "Assignment ID is required to generate a checklist.",
    };
  }

  try {
    const supabase = await requireSupabaseAuth();
    const assignmentResult = await supabase
      .from("assignments")
      .select("id, course_id, canvas_assignment_id, title, description, due_date, estimated_hours, status")
      .eq("id", assignmentId)
      .single();

    if (assignmentResult.error || !assignmentResult.data) {
      throw new Error(assignmentResult.error?.message ?? "Unable to load the assignment for planning.");
    }

    const planner = createPlannerService();
    const planResult = await planner.generatePlan(mapAssignmentRowToDomain(assignmentResult.data));
    const plan = planResult.plan;

    if (plan.tasks.length === 0) {
      throw new Error("The planner returned no checklist tasks.");
    }

    if (mode === "replace") {
      const deleteResult = await supabase.from("tasks").delete().eq("assignment_id", assignmentId);

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message);
      }
    }

    const planInsertResult = await supabase
      .from("assignment_plans")
      .insert({
        assignment_id: assignmentId,
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
      throw new Error(planInsertResult.error?.message ?? "Unable to store the generated plan.");
    }

    const existingTasksResult = await supabase
      .from("tasks")
      .select("order")
      .eq("assignment_id", assignmentId)
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTasksResult.error) {
      throw new Error(existingTasksResult.error.message);
    }

    const nextOrderBase = (mode === "replace" ? -1 : existingTasksResult.data?.order ?? -1) + 1;
    const insertResult = await supabase.from("tasks").insert(
      plan.tasks.map((task, index) => ({
        assignment_id: assignmentId,
        title: task.title,
        description: task.description,
        estimated_minutes: task.estimatedMinutes,
        order: nextOrderBase + index,
        source_plan_id: planInsertResult.data.id,
      })),
    );

    if (insertResult.error) {
      await supabase.from("assignment_plans").delete().eq("id", planInsertResult.data.id);
      throw new Error(insertResult.error.message);
    }

    await syncAssignmentStatus(assignmentId);
    refreshAssignmentViews(assignmentId);

    return {
      status: "success",
      message: planResult.fallbackUsed
        ? `Personalized study plan generated with fallback provider ${planResult.provider}.`
        : `Personalized study plan generated with ${planResult.provider}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to generate a checklist draft.",
    };
  }
}

export async function addChecklistTaskAction(formData: FormData) {
  const assignmentId = readField(formData, "assignmentId");
  const title = readField(formData, "title");
  const estimatedMinutes = Number(readField(formData, "estimatedMinutes") || "30");

  if (!assignmentId || !title) {
    throw new Error("Assignment and task title are required.");
  }

  const supabase = await requireSupabaseAuth();
  const lastTaskResult = await supabase
    .from("tasks")
    .select("order")
    .eq("assignment_id", assignmentId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTaskResult.error) {
    throw new Error(lastTaskResult.error.message);
  }

  const nextOrder = (lastTaskResult.data?.order ?? -1) + 1;
  const insertResult = await supabase.from("tasks").insert({
    assignment_id: assignmentId,
    title,
    estimated_minutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : 30,
    order: nextOrder,
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  await syncAssignmentStatus(assignmentId);
  refreshAssignmentViews(assignmentId);
}

export async function updateChecklistTaskAction(formData: FormData) {
  const assignmentId = readField(formData, "assignmentId");
  const taskId = readField(formData, "taskId");
  const title = readField(formData, "title");
  const estimatedMinutes = Number(readField(formData, "estimatedMinutes") || "30");

  if (!assignmentId || !taskId || !title) {
    throw new Error("Task updates require an assignment, task, and title.");
  }

  const supabase = await requireSupabaseAuth();
  const result = await supabase
    .from("tasks")
    .update({
      title,
      estimated_minutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : 30,
      source_plan_id: null,
    })
    .eq("id", taskId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  refreshAssignmentViews(assignmentId);
}

export async function toggleChecklistTaskAction(formData: FormData) {
  const assignmentId = readField(formData, "assignmentId");
  const taskId = readField(formData, "taskId");
  const completed = readField(formData, "completed") === "true";

  if (!assignmentId || !taskId) {
    throw new Error("Task completion updates require an assignment and task.");
  }

  const supabase = await requireSupabaseAuth();
  const result = await supabase
    .from("tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  await syncAssignmentStatus(assignmentId);
  refreshAssignmentViews(assignmentId);
}

export async function deleteChecklistTaskAction(formData: FormData) {
  const assignmentId = readField(formData, "assignmentId");
  const taskId = readField(formData, "taskId");

  if (!assignmentId || !taskId) {
    throw new Error("Task deletion requires an assignment and task.");
  }

  const supabase = await requireSupabaseAuth();
  const result = await supabase.from("tasks").delete().eq("id", taskId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  await syncAssignmentStatus(assignmentId);
  refreshAssignmentViews(assignmentId);
}

export async function updateAssignmentStatusAction(formData: FormData) {
  const assignmentId = readField(formData, "assignmentId");
  const status = readField(formData, "status");

  if (!assignmentId || !["not_started", "in_progress", "completed"].includes(status)) {
    throw new Error("A valid assignment status update is required.");
  }

  const supabase = await requireSupabaseAuth();
  const result = await supabase.from("assignments").update({ status: status as AssignmentStatus }).eq("id", assignmentId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  refreshAssignmentViews(assignmentId);
}