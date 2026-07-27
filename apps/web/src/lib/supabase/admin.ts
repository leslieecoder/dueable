import { createClient } from "@supabase/supabase-js";
import { getRequiredPublicSupabaseUrl, getRequiredSupabaseServiceRoleKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(getRequiredPublicSupabaseUrl(), getRequiredSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}