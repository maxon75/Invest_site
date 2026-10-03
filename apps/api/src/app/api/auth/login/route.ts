import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookieOptions, createSession, SESSION_COOKIE } from "@/lib/session";
import { jsonError, readJson } from "@/lib/http";

const credentialsSchema = z.object({
  login: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid login or password.", 400);

  const login = parsed.data.login.toLocaleLowerCase("en-US");
  const user = await prisma.user.findUnique({ where: { login } });
  const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordMatches) return jsonError("Invalid login or password.", 401);

  const token = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, login: user.login } });
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return response;
}
