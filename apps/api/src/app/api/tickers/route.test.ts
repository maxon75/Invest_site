import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUser, findMany, createTicker } = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  createTicker: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getAuthenticatedUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { ticker: { findMany, create: createTicker } } }));
vi.mock("@prisma/client", () => ({
  Impact: { SUPPORTIVE: "SUPPORTIVE", NEUTRAL: "NEUTRAL", NEGATIVE: "NEGATIVE" },
  Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error { code = ""; } },
}));

import { GET, POST } from "./route";

describe("/api/tickers ownership and DTO", () => {
  beforeEach(() => {
    getAuthenticatedUser.mockResolvedValue({ id: "user-a", login: "alice" });
    findMany.mockReset();
    createTicker.mockReset();
  });

  it("requires authentication for listing and creation", async () => {
    getAuthenticatedUser.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const getResponse = await GET();
    const postResponse = await POST(new Request("http://localhost/api/tickers", { method: "POST", body: "{}" }));
    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
    expect(createTicker).not.toHaveBeenCalled();
  });

  it("scopes list query to the authenticated owner and maps metrics/impact/colors", async () => {
    findMany.mockResolvedValue([{
      id: "ticker-a", userId: "user-a", symbol: "NVDA", companyName: "NVIDIA", thesis: "growth thesis",
      colorStatus: "RED", latestPrice: "123.450000", priceUpdatedAt: new Date("2026-10-03T08:00:00Z"),
      events: [{ impact: "NEGATIVE", analyzedAt: new Date("2026-10-03T07:00:00Z") }],
      metricSnapshots: [{ periodLabel: "Q2 2026", metrics: [
        { group: "VALUATION", key: "pe", label: "P/E", value: "22", change: "1", changeDirection: "up" },
        { group: "RISK_MARKET", key: "beta", label: "Beta", value: "1.2" },
      ] }],
    }]);
    const response = await GET();
    const body = await response.json();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a" } }));
    expect(body.tickers[0]).toMatchObject({
      id: "ticker-a", thesisImpact: "negative", colorStatus: "negative", currentPrice: "123.450000", earningsPeriod: "Q2 2026",
      metrics: { valuation: [{ key: "pe", value: "22", period: "Q2 2026" }], riskMarket: [{ key: "beta", label: "Beta" }] },
    });
  });

  it("creates a ticker for the current user with neutral initial UI state", async () => {
    createTicker.mockResolvedValue({ id: "ticker-b", symbol: "AAPL", companyName: "AAPL", thesis: null, colorStatus: "GRAY" });
    const response = await POST(new Request("http://localhost/api/tickers", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: " aapl " }),
    }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(createTicker).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: "user-a", symbol: "AAPL", companyName: "AAPL" } }));
    expect(body.ticker).toMatchObject({ thesisImpact: "neutral", colorStatus: "neutral", currentPrice: null, metrics: { valuation: [] } });
  });

  it("rejects invalid ticker symbols before writing", async () => {
    const response = await POST(new Request("http://localhost/api/tickers", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "bad ticker" }),
    }));
    expect(response.status).toBe(400);
    expect(createTicker).not.toHaveBeenCalled();
  });
});
