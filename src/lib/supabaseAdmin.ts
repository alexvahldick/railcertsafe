import { createClient } from "@supabase/supabase-js";

let cachedAdmin:
  | { supabaseAdmin: ReturnType<typeof createClient>; error?: undefined }
  | { supabaseAdmin?: undefined; error: string }
  | null = null;

export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    cachedAdmin = { error: "Missing NEXT_PUBLIC_SUPABASE_URL" };
    return cachedAdmin;
  }

  if (!serviceRoleKey) {
    cachedAdmin = { error: "Missing SUPABASE_SERVICE_ROLE_KEY" };
    return cachedAdmin;
  }

  cachedAdmin = {
    supabaseAdmin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };

  return cachedAdmin;
}
