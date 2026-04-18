import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { accessToken?: string } | null;

  if (!payload?.accessToken) {
    return NextResponse.json({ error: "Missing access token." }, { status: 400 });
  }

  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
