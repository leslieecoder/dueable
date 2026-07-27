import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAssignmentStatusForSupabase } from "@/features/assignments/task-status";
import { buildCorsHeaders, jsonWithCors } from "../shared";

interface ToggleTaskRequest {
  taskId?: string;
  completed?: boolean;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, "POST, OPTIONS"),
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return jsonWithCors({ error: "You must be signed in to Dueable in the web app first." }, { status: 401 }, request, "POST, OPTIONS");
    }

    const body = (await request.json()) as ToggleTaskRequest;
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";

    if (!taskId || typeof body.completed !== "boolean") {
      return jsonWithCors({ error: "A task ID and completed state are required." }, { status: 422 }, request, "POST, OPTIONS");
    }

    const taskResult = await supabase
      .from("tasks")
      .select('id, assignment_id, title, description, completed, estimated_minutes, "order"')
      .eq("id", taskId)
      .maybeSingle();

    if (taskResult.error) {
      throw new Error(taskResult.error.message);
    }

    if (!taskResult.data) {
      return jsonWithCors({ error: "Task not found." }, { status: 404 }, request, "POST, OPTIONS");
    }

    const updateResult = await supabase
      .from("tasks")
      .update({
        completed: body.completed,
        completed_at: body.completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .select('id, assignment_id, title, description, completed, estimated_minutes, "order"')
      .single();

    if (updateResult.error || !updateResult.data) {
      throw new Error(updateResult.error?.message ?? "Unable to update the task.");
    }

    const progress = await syncAssignmentStatusForSupabase(supabase, updateResult.data.assignment_id);

    return jsonWithCors(
      {
        success: true,
        task: {
          id: updateResult.data.id,
          title: updateResult.data.title,
          description: updateResult.data.description,
          estimatedMinutes: updateResult.data.estimated_minutes,
          completed: updateResult.data.completed,
          order: updateResult.data.order,
        },
        progress,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to update task progress from the extension.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}