import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getOptionalUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getOptionalUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <div className="eyebrow">Sign Up</div>
        <h2 style={{ margin: "0.45rem 0 0", fontSize: "1.8rem" }}>Create a RailCertSafe account</h2>
      </div>
      <SignupForm />
    </div>
  );
}
