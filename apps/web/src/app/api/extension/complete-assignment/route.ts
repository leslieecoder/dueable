import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCorsHeaders, getExtensionOverview, jsonWithCors } from "../shared";

interface CompleteAssignmentRequest {
  assignmentId?: string;
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

    const body = (await request.json()) as CompleteAssignmentRequest;
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId.trim() : "";

    if (!assignmentId) {
      return jsonWithCors({ error: "An assignment ID is required." }, { status: 422 }, request, "POST, OPTIONS");
    }

    const assignmentResult = await supabase
      .from("assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId)
      .select("id")
      .maybeSingle();

    if (assignmentResult.error) {
      throw new Error(assignmentResult.error.message);
    }

    if (!assignmentResult.data) {
      return jsonWithCors({ error: "Assignment not found." }, { status: 404 }, request, "POST, OPTIONS");
    }

    const taskResult = await supabase
      .from("tasks")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("assignment_id", assignmentId)
      .eq("completed", false);

    if (taskResult.error) {
      throw new Error(taskResult.error.message);
    }

    const overview = await getExtensionOverview();

    return jsonWithCors(
      {
        success: true,
        overview,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to complete the assignment from the extension.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}