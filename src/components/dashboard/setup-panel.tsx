"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupPanel() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/setup/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientName }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setBusy(false);
      setMessage(payload?.error ?? "Could not initialize the client workspace.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
      <div>
        <div className="eyebrow">Setup</div>
        <h1 className="title-lg">Initialize the operations testing workspace</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "48rem" }}>
          Create the first client workspace, seed the default testing catalog and lookup values, and attach your account as the initial client administrator.
        </p>
      </div>

      <form className="field-grid" onSubmit={handleSubmit}>
        <label className="field-label">
          Client railroad name
          <input
            className="field-input"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="ABC Short Line Railroad"
            required
          />
        </label>

        <button className="button-primary" disabled={busy} type="submit">
          {busy ? "Initializing..." : "Create client workspace"}
        </button>
      </form>

      {message ? <div className="message message-error">{message}</div> : null}
    </section>
  );
}
