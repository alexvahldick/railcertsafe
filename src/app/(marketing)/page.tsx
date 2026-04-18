import Link from "next/link";
import { getOptionalUser } from "@/lib/auth";

const highlights = [
  "FRA-style certificate intake for Parts 240, 242, and 217.9 workflows",
  "Private document upload with trackable review status",
  "Admin intake queue built for calm, operational review",
];

export default async function LandingPage() {
  const user = await getOptionalUser();

  return (
    <main className="page-shell">
      <section style={{ padding: "2rem 0 5rem" }}>
        <div className="container">
          <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <div style={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>RailCertSafe</div>
            <div className="button-row">
              <Link className="button-ghost" href={user ? "/dashboard" : "/login"}>
                {user ? "Dashboard" : "Sign in"}
              </Link>
              <Link className="button-primary" href={user ? "/upload" : "/signup"}>
                {user ? "Upload record" : "Create account"}
              </Link>
            </div>
          </header>

          <div style={{ display: "grid", gap: "1.5rem", marginTop: "4.5rem" }}>
            <div className="eyebrow">Rail Compliance Operations</div>
            <h1 className="title-xl">A stable intake foundation for certification, training, and audit readiness.</h1>
            <p className="text-muted" style={{ maxWidth: "46rem", margin: 0, fontSize: "1.1rem", lineHeight: 1.6 }}>
              RailCertSafe is being rebuilt around practical intake and review workflows. This first production-oriented slice covers account access, secure document upload, metadata tracking, and an admin queue with controlled status movement.
            </p>
            <div className="button-row">
              <Link className="button-primary" href={user ? "/dashboard" : "/signup"}>
                Open working system
              </Link>
              <Link className="button-secondary" href={user ? "/admin/intake" : "/login"}>
                Review intake queue
              </Link>
            </div>
          </div>

          <section style={{ marginTop: "3rem", display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {highlights.map((highlight) => (
              <article className="panel" key={highlight} style={{ padding: "1.25rem" }}>
                <div className="eyebrow">Current slice</div>
                <p style={{ margin: "0.7rem 0 0", fontSize: "1.02rem", lineHeight: 1.5 }}>{highlight}</p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
