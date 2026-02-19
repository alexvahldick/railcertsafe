const ADMIN_EMAILS_ENV = "NEXT_PUBLIC_ADMIN_EMAILS";

function parseAdminEmails(value?: string | null): Set<string> {
  if (!value) return new Set();

  const entries = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return new Set(entries);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  const envValue = process.env[ADMIN_EMAILS_ENV];
  const admins = parseAdminEmails(envValue);

  return admins.has(email.trim().toLowerCase());
}
