import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@dueable/types";
import { getRequiredPublicSupabaseAnonKey, getRequiredPublicSupabaseUrl } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getRequiredPublicSupabaseUrl(),
    getRequiredPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
      cookieOptions: {
        sameSite: "none",
        secure: true,
        path: "/",
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const next = request.nextUrl.searchParams.get("next");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/assignments") || pathname.startsWith("/onboarding") || pathname.startsWith("/extension");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/") ? next : "/extension";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}