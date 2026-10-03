import { NextRequest, NextResponse } from "next/server";

const allowedMethods = "GET, POST, PATCH, DELETE, OPTIONS";
const allowedHeaders = "Content-Type";

function varyByOrigin(response: NextResponse) {
  const vary = response.headers.get("Vary")?.split(",").map((value) => value.trim()) ?? [];
  if (!vary.some((value) => value.toLowerCase() === "origin")) vary.push("Origin");
  response.headers.set("Vary", vary.join(", "));
}

function configuredWebOrigin(): string | null {
  const configured = process.env.WEB_ORIGIN;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = Boolean(origin && origin === configuredWebOrigin());

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    varyByOrigin(response);
    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin!);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", allowedMethods);
      response.headers.set("Access-Control-Allow-Headers", allowedHeaders);
      response.headers.set("Access-Control-Max-Age", "600");
    }
    return response;
  }

  const response = NextResponse.next();
  varyByOrigin(response);
  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
