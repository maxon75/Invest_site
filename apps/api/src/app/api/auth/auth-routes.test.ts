import { beforeEach, describe, expect, it, vi } from "vitest";

const { userCreate, userFindUnique, sessionDeleteMany, createSession, cookies, hash, compare, PrismaKnownError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  }
  return {
    userCreate: vi.fn(),
    userFindUnique: vi.fn(),
    sessionDeleteMany: vi.fn(),
    createSession: vi.fn(),
    cookies: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
    PrismaKnownError,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: { user: { create: userCreate, findUnique: userFindUnique }, session: { deleteMany: sessionDeleteMany } } }));
vi.mock("@/lib/session", () => ({
  cookieOptions: () => ({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 1234 }),
  createSession,
  digestToken: (token: string) => `digest:${token}`,
  getAuthenticatedUser: vi.fn(),
  SESSION_COOKIE: "stock_session",
}));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("bcryptjs", () => ({ default: { hash, compare } }));
vi.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: PrismaKnownError,
  },
}));

import { POST as register } from "./register/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as session } from "./session/route";
import { getAuthenticatedUser } from "@/lib/session";

function request(body: unknown) {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("authentication routes", () => {
  beforeEach(() => {
    userCreate.mockReset(); userFindUnique.mockReset(); sessionDeleteMany.mockReset(); createSession.mockReset();
    cookies.mockReset(); hash.mockReset(); compare.mockReset();
    vi.mocked(getAuthenticatedUser).mockReset();
    hash.mockResolvedValue("password-hash");
    createSession.mockResolvedValue("raw-session-token");
    cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "raw-session-token" }) });
  });

  it("registers with a normalized login and password hash, returning only public user data", async () => {
    userCreate.mockResolvedValue({ id: "user-1", login: "alice" });
    const response = await register(request({ login: " Alice ", password: "long-password" }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(hash).toHaveBeenCalledWith("long-password", 12);
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { login: "alice", passwordHash: "password-hash" } }));
    expect(createSession).toHaveBeenCalledWith("user-1");
    expect(body).toEqual({ user: { id: "user-1", login: "alice" } });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects invalid registration and duplicate login", async () => {
    const invalid = await register(request({ login: "x", password: "short" }));
    expect(invalid.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();

    const uniqueError = new PrismaKnownError("P2002");
    userCreate.mockRejectedValue(uniqueError);
    const duplicate = await register(request({ login: "alice", password: "long-password" }));
    expect(duplicate.status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("authenticates a valid login and returns a session cookie", async () => {
    userFindUnique.mockResolvedValue({ id: "user-1", login: "alice", passwordHash: "stored-hash" });
    compare.mockResolvedValue(true);
    const response = await login(request({ login: "ALICE", password: "secret" }));
    expect(userFindUnique).toHaveBeenCalledWith({ where: { login: "alice" } });
    expect(compare).toHaveBeenCalledWith("secret", "stored-hash");
    expect(createSession).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: { id: "user-1", login: "alice" } });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("uses the same unauthorized response for unknown users and wrong passwords", async () => {
    userFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "user-1", login: "alice", passwordHash: "stored-hash" });
    compare.mockResolvedValue(false);
    const unknown = await login(request({ login: "missing", password: "secret" }));
    const wrong = await login(request({ login: "alice", password: "wrong" }));
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
    expect(createSession).not.toHaveBeenCalled();
  });

  it("returns current session user or 401 when no authenticated user exists", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({ id: "user-1", login: "alice" } as never).mockResolvedValueOnce(null);
    const authenticated = await session();
    const anonymous = await session();
    expect(authenticated.status).toBe(200);
    expect(await authenticated.json()).toEqual({ user: { id: "user-1", login: "alice" } });
    expect(anonymous.status).toBe(401);
  });

  it("revokes the session token and clears its cookie on logout", async () => {
    sessionDeleteMany.mockResolvedValue({ count: 1 });
    const response = await logout();
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { tokenHash: "digest:raw-session-token" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
