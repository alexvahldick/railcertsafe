import type { ReactNode } from "react";
import Link from "next/link";
import { loadAppContext } from "@/lib/app-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await loadAppContext();
  const activeClient = context.schemaReady ? context.activeClient : null;
  const admin = context.isMasterAdmin || activeClient?.role === "client_administrator";
  const user = context.user;

  return (
    <main className="page-shell" style={{ padding: "1rem 0 2rem" }}>
      <div className="container" style={{ display: "grid", gap: "1rem" }}>
        <nav className="panel" style={{ padding: "1rem 1.2rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>RailCertSafe</div>
            <div className="text-muted" style={{ fontSize: "0.92rem" }}>
              {activeClient ? `${activeClient.clientName} | ` : ""}{user.email ?? user.id}
            </div>
          </div>

          <div className="button-row">
            <Link className="button-ghost" href="/dashboard">Dashboard</Link>
            <Link className="button-ghost" href="/testing">All Testing</Link>
            <Link className="button-ghost" href="/testing/new">Submit New Testing</Link>
            <Link className="button-ghost" href="/employees">Employees</Link>
            {admin ? <Link className="button-ghost" href="/admin/intake">Review Queue</Link> : null}
          </div>
        </nav>

        {children}
      </div>
    </main>
  );
}
