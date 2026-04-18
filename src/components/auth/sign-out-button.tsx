"use client";

import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="button-ghost" onClick={() => void handleLogout()} type="button">
      Sign out
    </button>
  );
}
