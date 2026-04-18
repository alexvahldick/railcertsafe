"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type Props = {
  isAdmin: boolean;
};

export function DashboardActions({ isAdmin }: Props) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <div className="button-row">
        <Link className="button-primary" href="/upload">
          Upload compliance record
        </Link>
        {isAdmin ? (
          <Link className="button-secondary" href="/admin/intake">
            Open intake queue
          </Link>
        ) : null}
      </div>

      <button className="button-ghost" onClick={handleLogout} type="button">
        Sign out
      </button>
    </>
  );
}
