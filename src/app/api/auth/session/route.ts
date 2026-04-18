import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

const responseHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { accessToken?: string } | null;

  if (!payload?.accessToken) {
    return NextResponse.json({ error: "Missing access token." }, { status: 400, headers: responseHeaders });
  }

  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, payload.accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
    priority: "high",
  });

  return NextResponse.json({ ok: true }, { headers: responseHeaders });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ ok: true }, { headers: responseHeaders });
}
