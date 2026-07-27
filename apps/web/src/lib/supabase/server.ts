import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@dueable/types";
import { getRequiredPublicSupabaseAnonKey, getRequiredPublicSupabaseUrl } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getRequiredPublicSupabaseUrl(),
    getRequiredPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      cookieOptions: {
        sameSite: "none",
        secure: true,
        path: "/",
      },
    },
  );
}