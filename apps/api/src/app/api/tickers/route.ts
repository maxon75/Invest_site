import { Impact, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/session";
import { jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const impactDto: Record<Impact, "positive" | "neutral" | "negative"> = {
  SUPPORTIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
};

const colorStatusDto = {
  GREEN: "positive",
  GRAY: "neutral",
  RED: "negative",
} as const;

const metricGroupDto = {
  VALUATION: "valuation",
  PROFITABILITY: "profitability",
  STABILITY: "stability",
  RISK_MARKET: "riskMarket",
} as const;

const createTickerSchema = z.object({
  symbol: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9.^-]+$/),
  companyName: z.string().trim().min(1).max(160).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return jsonError("Authentication required.", 401);

  const parsed = createTickerSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid ticker details.", 400);

  const symbol = parsed.data.symbol.toUpperCase();
  try {
    const ticker = await prisma.ticker.create({
      data: {
        userId: user.id,
        symbol,
        companyName: parsed.data.companyName ?? symbol,
      },
      select: { id: true, symbol: true, companyName: true, thesis: true, colorStatus: true },
    });
    return NextResponse.json(
      {
        ticker: {
          ...ticker,
          thesisImpact: "neutral",
          colorStatus: colorStatusDto[ticker.colorStatus],
          currentPrice: null,
          priceUpdatedAt: null,
          metrics: { valuation: [], profitability: [], stability: [], riskMarket: [] },
          earningsPeriod: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Ticker is already in this user's list.", 409);
    }
    throw error;
  }
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return jsonError("Authentication required.", 401);

  const tickers = await prisma.ticker.findMany({
    where: { userId: user.id },
    orderBy: [{ list: "asc" }, { symbol: "asc" }],
    include: {
      events: {
        where: { impact: { not: null }, analyzedAt: { not: null } },
        orderBy: { analyzedAt: "desc" },
        take: 1,
      },
      metricSnapshots: { orderBy: { publishedAt: "desc" }, take: 1, include: { metrics: true } },
    },
  });

  return NextResponse.json({
    tickers: tickers.map((ticker) => {
      const latestEvent = ticker.events[0];
      const metrics = { valuation: [], profitability: [], stability: [], riskMarket: [] } as Record<
        "valuation" | "profitability" | "stability" | "riskMarket",
        Array<{ key: string; label: string; value: string; change?: string; changeDirection?: string; period?: string }>
      >;
      const snapshot = ticker.metricSnapshots[0];
      for (const metric of snapshot?.metrics ?? []) {
        metrics[metricGroupDto[metric.group]].push({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          ...(metric.change ? { change: metric.change } : {}),
          ...(metric.changeDirection ? { changeDirection: metric.changeDirection } : {}),
          ...(snapshot?.periodLabel ? { period: snapshot.periodLabel } : {}),
        });
      }
      return {
        id: ticker.id,
        symbol: ticker.symbol,
        companyName: ticker.companyName,
        thesis: ticker.thesis,
        thesisImpact: latestEvent?.impact ? impactDto[latestEvent.impact] : "neutral",
        colorStatus: colorStatusDto[ticker.colorStatus],
        currentPrice: ticker.latestPrice?.toString() ?? null,
        priceUpdatedAt: ticker.priceUpdatedAt,
        metrics,
        earningsPeriod: snapshot?.periodLabel ?? null,
      };
    }),
  });
}
