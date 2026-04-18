import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getOptionalUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <div className="eyebrow">Sign In</div>
        <h2 style={{ margin: "0.45rem 0 0", fontSize: "1.8rem" }}>Access your workspace</h2>
      </div>
      <LoginForm />
    </div>
  );
}
