import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "stock_session";
const ttlDays = Math.max(1, Number(process.env.SESSION_TTL_DAYS) || 30);

export function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: digestToken(token), expiresAt } });
  return token;
}

export async function getAuthenticatedUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: digestToken(token) },
    select: { user: { select: { id: true, login: true } }, expiresAt: true },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.deleteMany({ where: { tokenHash: digestToken(token) } });
    return null;
  }
  return session.user;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  };
}
