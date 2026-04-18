import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";

let serviceClient: ReturnType<typeof createClient> | null = null;
let anonClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAnonServerClient() {
  if (anonClient) {
    return anonClient;
  }

  const env = getPublicSupabaseEnv();
  anonClient = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return anonClient;
}

export function getSupabaseServiceClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const env = getPublicSupabaseEnv();
  serviceClient = createClient(env.url, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return serviceClient;
}
