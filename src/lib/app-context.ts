import "server-only";

import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type ClientMembership = {
  clientId: string;
  clientName: string;
  role: "manager" | "client_administrator";
};

export type AppContext =
  | {
      schemaReady: false;
      needsBootstrap: false;
      isMasterAdmin: boolean;
      user: Awaited<ReturnType<typeof requireUser>>;
    }
  | {
      schemaReady: true;
      needsBootstrap: boolean;
      isMasterAdmin: boolean;
      user: Awaited<ReturnType<typeof requireUser>>;
      memberships: ClientMembership[];
      activeClient: ClientMembership | null;
    };

export async function loadAppContext(): Promise<AppContext> {
  const user = await requireUser();
  const isMasterAdmin = isAdminEmail(user.email);
  const supabase = getSupabaseServiceClient();

  const { error: schemaError } = await supabase.from("clients").select("id").limit(1);

  if (schemaError && schemaError.code === "42P01") {
    return {
      schemaReady: false,
      needsBootstrap: false,
      isMasterAdmin,
      user,
    };
  }

  const { data, error } = await supabase
    .from("user_client_roles")
    .select("client_id, role, clients(name)")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  const memberships: ClientMembership[] = (data ?? []).map((row) => ({
    clientId: String((row as { client_id: string }).client_id),
    clientName: String(((row as { clients: { name: string } | null }).clients?.name ?? "Client")),
    role: String((row as { role: string }).role) as "manager" | "client_administrator",
  }));

  if (memberships.length === 0) {
    return {
      schemaReady: true,
      needsBootstrap: isMasterAdmin,
      isMasterAdmin,
      user,
      memberships,
      activeClient: null,
    };
  }

  const activeClient =
    memberships.find((membership) => membership.role === "client_administrator") ??
    memberships[0];

  return {
    schemaReady: true,
    needsBootstrap: false,
    isMasterAdmin,
    user,
    memberships,
    activeClient,
  };
}
