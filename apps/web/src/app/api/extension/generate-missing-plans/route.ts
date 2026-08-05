import { NextResponse, type NextRequest } from "next/server";
import type { Assignment, AssignmentStatus, Json } from "@dueable/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCorsHeaders, jsonWithCors } from "../shared";
import { createPlannerService } from "@/services/planner/PlannerService";

interface PersistedAssignmentRow {
  id: string;
  course_id: string;
  canvas_assignment_id: string;
  title: string;
  description: string;
  due_date: string;
  estimated_hours: number;
  status: AssignmentStatus;
}

interface GenerateMissingPlansRequest {
  limit?: number;
  assignmentIds?: string[];
  replaceExisting?: boolean;
}

function mapAssignmentRowToDomain(assignment: PersistedAssignmentRow): Assignment {
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

    if (!user?.id) {
      return jsonWithCors({ error: "You must be signed in to Dueable in the web app first." }, { status: 401 }, request, "POST, OPTIONS");
    }

    const body = (await request.json().catch(() => ({}))) as Partial<GenerateMissingPlansRequest>;
    const requestLimit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.round(body.limit) : 0;
    const limit = requestLimit > 0 ? Math.min(requestLimit, 50) : 25;
    const replaceExisting = body.replaceExisting === true;
    const requestedAssignmentIds = Array.isArray(body.assignmentIds)
      ? Array.from(new Set(body.assignmentIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)))
      : [];

    const supabase = createSupabaseAdminClient();
    const courseResult = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", user.id);

    if (courseResult.error) {
      throw new Error(courseResult.error.message ?? "Unable to load the current user's courses.");
    }

    const courseIds = (courseResult.data ?? []).map((course) => course.id);

    if (courseIds.length === 0) {
      return jsonWithCors({ success: true, generatedCount: 0, skippedCount: 0, failedCount: 0 }, { status: 200 }, request, "POST, OPTIONS");
    }

    let assignmentQuery = supabase
      .from("assignments")
      .select("id, course_id, canvas_assignment_id, title, description, due_date, estimated_hours, status")
      .in("course_id", courseIds)
      .neq("status", "completed")
      .order("due_date", { ascending: true });

    if (requestedAssignmentIds.length > 0) {
      assignmentQuery = assignmentQuery.in("id", requestedAssignmentIds);
    } else {
      assignmentQuery = assignmentQuery.limit(limit);
    }

    const assignmentResult = await assignmentQuery;

    if (assignmentResult.error) {
      throw new Error(assignmentResult.error.message ?? "Unable to load assignments for plan generation.");
    }

    const assignments = (assignmentResult.data ?? []) as PersistedAssignmentRow[];

    if (assignments.length === 0) {
      return jsonWithCors({ success: true, generatedCount: 0, skippedCount: 0, failedCount: 0 }, { status: 200 }, request, "POST, OPTIONS");
    }

    const existingTasksResult = await supabase
      .from("tasks")
      .select("assignment_id")
      .in("assignment_id", assignments.map((assignment) => assignment.id));

    if (existingTasksResult.error) {
      throw new Error(existingTasksResult.error.message ?? "Unable to inspect existing assignment tasks.");
    }

    const assignmentsWithTasks = new Set((existingTasksResult.data ?? []).map((task) => task.assignment_id));
    const planner = createPlannerService();
    let generatedCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let fallbackCount = 0;
    let primaryProvider: string | null = null;
    let primaryError: string | null = null;

    for (const assignment of assignments) {
      const hasExistingTasks = assignmentsWithTasks.has(assignment.id);

      if (hasExistingTasks && !replaceExisting) {
        skippedCount += 1;
        continue;
      }

      try {
        const planResult = await planner.generatePlan(mapAssignmentRowToDomain(assignment));
        const plan = planResult.plan;

        primaryProvider ??= planResult.primaryProvider;

        if (planResult.fallbackUsed) {
          fallbackCount += 1;
          primaryError ??= planResult.primaryError;

          if (replaceExisting && hasExistingTasks) {
            failedCount += 1;
            continue;
          }
        }

        if (plan.tasks.length === 0) {
          skippedCount += 1;
          continue;
        }

        if (replaceExisting && hasExistingTasks) {
          const deleteTasksResult = await supabase.from("tasks").delete().eq("assignment_id", assignment.id);

          if (deleteTasksResult.error) {
            throw new Error(deleteTasksResult.error.message ?? `Unable to replace the existing tasks for ${assignment.title}.`);
          }
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

        if (hasExistingTasks) {
          replacedCount += 1;
        } else {
          generatedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return jsonWithCors(
      {
        success: true,
        generatedCount,
        replacedCount,
        skippedCount,
        failedCount,
        fallbackCount,
        primaryProvider,
        primaryError,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to generate missing assignment plans.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}