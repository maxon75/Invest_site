import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookieOptions, createSession, SESSION_COOKIE } from "@/lib/session";
import { jsonError, readJson } from "@/lib/http";

const credentialsSchema = z.object({
  login: z.string().trim().min(3).max(64).regex(/^[\p{L}\p{N}_.-]+$/u),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Login or password does not meet requirements.", 400);

  const login = parsed.data.login.toLocaleLowerCase("en-US");
  try {
    const user = await prisma.user.create({
      data: { login, passwordHash: await bcrypt.hash(parsed.data.password, 12) },
      select: { id: true, login: true },
    });
    const token = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Login is already taken.", 409);
    }
    throw error;
  }
}
