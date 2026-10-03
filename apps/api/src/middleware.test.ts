import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

describe("API CORS middleware", () => {
  beforeEach(() => { process.env.WEB_ORIGIN = "http://localhost:5173"; });

  it("allows credentialed requests and preflight from the configured origin", () => {
    const normal = middleware(new NextRequest("http://localhost:3000/api/tickers", { headers: { origin: process.env.WEB_ORIGIN! } }));
    expect(normal.headers.get("Access-Control-Allow-Origin")).toBe(process.env.WEB_ORIGIN);
    expect(normal.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(normal.headers.get("Vary")).toContain("Origin");

    const preflight = middleware(new NextRequest("http://localhost:3000/api/tickers", { method: "OPTIONS", headers: { origin: process.env.WEB_ORIGIN! } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    expect(preflight.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("does not grant credentials to other origins", () => {
    const response = middleware(new NextRequest("http://localhost:3000/api/tickers", { headers: { origin: "https://attacker.example" } }));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});
