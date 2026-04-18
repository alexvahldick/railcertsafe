import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell" style={{ display: "grid", placeItems: "center", padding: "1rem" }}>
      <div className="container" style={{ maxWidth: "980px" }}>
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "stretch" }}>
          <section className="panel" style={{ padding: "2rem" }}>
            <div className="eyebrow">RailCertSafe</div>
            <h1 className="title-lg" style={{ marginTop: "0.65rem" }}>Operational access for controlled compliance workflows</h1>
            <p className="text-muted" style={{ marginTop: "0.9rem" }}>
              This rebuild keeps authentication simple: one Supabase client in the browser, one validated access-token cookie for server route protection, and explicit admin gating.
            </p>
          </section>

          <section className="panel" style={{ padding: "2rem" }}>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
