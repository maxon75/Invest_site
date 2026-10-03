import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { jsonError } from "@/lib/http";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return jsonError("Authentication required.", 401);
  return NextResponse.json({ user });
}
