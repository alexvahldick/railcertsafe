"use client";

import { useEffect } from "react";
import { getOptionalBrowserSupabaseClient } from "@/lib/supabase/browser";

async function syncAccessToken(accessToken: string | null) {
  await fetch("/api/auth/session", {
    method: accessToken ? "POST" : "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: accessToken ? JSON.stringify({ accessToken }) : undefined,
  });
}

export function AuthSessionSync() {
  useEffect(() => {
    const supabase = getOptionalBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      void syncAccessToken(data.session?.access_token ?? null);
    }).catch(() => {
      // Avoid crashing the shell if the browser auth client cannot hydrate.
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAccessToken(session?.access_token ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
