import { NextResponse, type NextRequest } from "next/server";
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
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    return jsonWithCors(
      {
        success: true,
      },
      { status: 200 },
      request,
      "POST, OPTIONS",
    );
  } catch {
    return jsonWithCors(
      {
        error: "We couldn't log you out right now. Try again in a moment.",
      },
      { status: 500 },
      request,
      "POST, OPTIONS",
    );
  }
}