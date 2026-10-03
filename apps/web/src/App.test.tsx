import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, getTickers, addTicker } = vi.hoisted(() => ({ session: vi.fn(), getTickers: vi.fn(), addTicker: vi.fn() }));
vi.mock("./api/client", () => ({ api: { session, getTickers, logout: vi.fn(), addTicker } }));

import App from "./App";
import { useTickerStore } from "./store/useTickerStore";

const metrics = { valuation: [{ key: "price", label: "Current price", value: "$10" }], profitability: [], stability: [], riskMarket: [] };
const tickers = [
  { id: "a", symbol: "AAA", companyName: "Alpha Inc", thesisImpact: "positive", colorStatus: "positive", currentPrice: "10", priceUpdatedAt: null, metrics },
  { id: "b", symbol: "BBB", companyName: "Beta Inc", thesisImpact: "neutral", colorStatus: "neutral", currentPrice: null, priceUpdatedAt: null, metrics: { valuation: [], profitability: [], stability: [], riskMarket: [] } },
  { id: "c", symbol: "CCC", companyName: "Gamma Inc", thesisImpact: "negative", colorStatus: "negative", currentPrice: null, priceUpdatedAt: null, metrics: { valuation: [], profitability: [], stability: [], riskMarket: [] } },
] as const;

describe("App ticker navigation and metrics", () => {
  beforeEach(() => {
    session.mockReset().mockResolvedValue({ user: { id: "u1", login: "alice" } });
    getTickers.mockReset().mockResolvedValue([...tickers]);
    addTicker.mockReset().mockResolvedValue(undefined);
    useTickerStore.setState({ tickers: [], selectedId: null, loading: false, error: null });
  });

  it("shows ticker name/symbol buttons with signal colors, switches cards and expands metric groups", async () => {
    render(<App />);
    const alphaButton = await screen.findByRole("button", { name: /Alpha Inc AAA/ });
    const betaButton = screen.getByRole("button", { name: /Beta Inc BBB/ });
    const gammaButton = screen.getByRole("button", { name: /Gamma Inc CCC/ });
    expect(alphaButton.className).toContain("positive");
    expect(betaButton.className).toContain("neutral");
    expect(gammaButton.className).toContain("negative");

    fireEvent.click(betaButton);
    expect(await screen.findByRole("heading", { name: "Beta Inc" })).toBeInTheDocument();
    fireEvent.click(alphaButton);
    expect(await screen.findByRole("heading", { name: "Alpha Inc" })).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();

    const valuation = screen.getAllByRole("button").find((button) => button.getAttribute("aria-expanded") === "true")!;
    fireEvent.click(valuation);
    expect(valuation).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByText("$10.00")).not.toBeInTheDocument());
  });

  it("submits a normalized symbol from the add ticker dialog and reloads the list", async () => {
    const newTicker = { ...tickers[0], id: "d", symbol: "NVDA", companyName: "NVIDIA" };
    getTickers.mockReset().mockResolvedValueOnce([...tickers]).mockResolvedValueOnce([...tickers, newTicker]);
    render(<App />);
    await screen.findByRole("button", { name: /Alpha Inc AAA/ });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".add-company")!);
    fireEvent.change(screen.getByPlaceholderText("AAPL"), { target: { value: " nvda " } });
    fireEvent.submit(document.querySelector<HTMLFormElement>(".add-modal form")!);
    await waitFor(() => expect(addTicker).toHaveBeenCalledWith("NVDA"));
    await screen.findByRole("button", { name: /NVIDIA NVDA/ });
    expect(getTickers).toHaveBeenCalledTimes(2);
  });
});
