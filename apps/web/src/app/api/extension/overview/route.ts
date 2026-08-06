import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCorsHeaders, getExtensionOverview, jsonWithCors } from "../shared";

function readExtensionUserName(authUser: { email?: string; user_metadata: Record<string, unknown> }) {
  const fullName = authUser.user_metadata.full_name;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const displayName = authUser.user_metadata.name;

  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim();
  }

  return authUser.email?.split("@")[0] ?? "Student";
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, "GET, OPTIONS"),
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return jsonWithCors({ error: "You must be signed in to Dueable in the web app first." }, { status: 401 }, request, "GET, OPTIONS");
    }

    const overview = await getExtensionOverview();
    const userName = readExtensionUserName(user);

    return jsonWithCors(
      {
        ...overview,
        userName,
      },
      { status: 200 },
      request,
      "GET, OPTIONS",
    );
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Unable to load Dueable extension overview.",
      },
      { status: 500 },
      request,
      "GET, OPTIONS",
    );
  }
}
