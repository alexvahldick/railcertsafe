import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const payload = (await request.json().catch(() => null)) as { accessToken?: string } | null;

  if (!payload?.accessToken) {
    return NextResponse.json({ error: "Missing access token." }, { status: 400, headers: NO_STORE_HEADERS });
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

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
