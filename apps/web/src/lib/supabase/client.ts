import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@dueable/types";
import { getRequiredPublicSupabaseAnonKey, getRequiredPublicSupabaseUrl } from "@/lib/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    getRequiredPublicSupabaseUrl(),
    getRequiredPublicSupabaseAnonKey(),
    {
      cookieOptions: {
        sameSite: "none",
        secure: true,
        path: "/",
      },
    },
  );
}