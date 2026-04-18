import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "").toLowerCase();
}

function getExpectedOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();

  if (forwardedHost) {
    return normalizeOrigin(`${forwardedProto || "https"}://${forwardedHost}`);
  }

  return normalizeOrigin(new URL(request.url).origin);
}

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim() ?? "";
  const referer = request.headers.get("referer")?.trim() ?? "";
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  const requestOrigin = getExpectedOrigin(request);

  if (origin) {
    if (normalizeOrigin(origin) !== requestOrigin) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return null;
  }

  if (referer) {
    try {
      if (normalizeOrigin(new URL(referer).origin) !== requestOrigin) {
        return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403, headers: NO_STORE_HEADERS });
      }
      return null;
    } catch {
      return NextResponse.json({ error: "Invalid referer." }, { status: 400, headers: NO_STORE_HEADERS });
    }
  }

  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") {
    return null;
  }

  return NextResponse.json({ error: "Missing request origin." }, { status: 403, headers: NO_STORE_HEADERS });
}
