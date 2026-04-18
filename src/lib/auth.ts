import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/env";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";

export const AUTH_COOKIE_NAME = "railcertsafe-access-token";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

async function readUserFromToken(token: string | null): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }

  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function getOptionalUser() {
  const store = await cookies();
  return readUserFromToken(store.get(AUTH_COOKIE_NAME)?.value ?? null);
}

export async function requireUser() {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return user;
}
