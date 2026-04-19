import type { ReactNode } from "react";
import Link from "next/link";
import { loadAppContext } from "@/lib/app-context";
import { SignOutButton } from "@/components/auth/sign-out-button";

function NavLink({ href, label, priority }: { href: string; label: string; priority?: "primary" | "secondary" }) {
  return (
    <Link className={`shell-nav-link${priority === "primary" ? " shell-nav-link-primary" : ""}`} href={href}>
      {label}
    </Link>
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await loadAppContext();
  const activeClient = context.schemaReady ? context.activeClient : null;
  const isAdmin = context.isMasterAdmin || activeClient?.role === "client_administrator";
  const user = context.user;
  const modeLabel = context.isMasterAdmin ? "Master Administrator" : activeClient?.role === "client_administrator" ? "Client Administrator" : "Manager";

  return (
    <main className="page-shell authenticated-shell">
      <div className="container authenticated-shell-grid">
        <aside className="panel shell-rail">
          <div className="shell-brand-block">
            <div className="shell-brand-mark">RCS</div>
            <div>
              <div className="shell-brand-title">RailCertSafe</div>
              <div className="shell-brand-subtitle">Rail safety and compliance operations</div>
            </div>
          </div>

          <div className="shell-context-card">
            <div className="shell-context-client">{activeClient ? activeClient.clientName : "Workspace Pending"}</div>
            <div className="shell-context-user">{user.email ?? user.id}</div>
            <div className="shell-context-tags">
              <span className="status-pill status-received">{modeLabel}</span>
              {isAdmin ? <span className="status-pill status-needs_review">Compliance Review</span> : <span className="status-pill status-validated">Execution Mode</span>}
            </div>
          </div>

          <div className="shell-nav-group">
            <div className="shell-nav-group-title">Manager Execution</div>
            <div className="shell-nav-list">
              <NavLink href="/dashboard" label="Dashboard" priority="primary" />
              <NavLink href="/testing/new" label="Submit New Testing" priority="primary" />
              <NavLink href="/testing" label="Testing Records" />
              <NavLink href="/employees" label="Employees" />
            </div>
          </div>

          {isAdmin ? (
            <div className="shell-nav-group">
              <div className="shell-nav-group-title">Administrator Review</div>
              <div className="shell-nav-list">
                <NavLink href="/admin/intake" label="Review Queue" priority="primary" />
                <NavLink href="/testing" label="Audit Trail & Amendments" />
              </div>
            </div>
          ) : null}

          <div className="shell-signout">
            <SignOutButton />
          </div>
        </aside>

        <div className="authenticated-content">{children}</div>
      </div>
    </main>
  );
}
