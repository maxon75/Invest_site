export type Impact = 'positive' | 'neutral' | 'negative';
export type MetricSection = 'valuation' | 'profitability' | 'stability' | 'riskMarket';

export interface Metric {
  key: string;
  label: string;
  value: string | number | null;
  change?: string | number | null;
  changeDirection?: 'up' | 'down';
  period?: string;
}

export interface Ticker {
  id: string;
  symbol: string;
  companyName: string;
  thesis?: string | null;
  thesisImpact: Impact;
  colorStatus: Impact;
  currentPrice: string | null;
  priceUpdatedAt: string | null;
  metrics: Record<MetricSection, Metric[]>;
  earningsPeriod?: string;
}

export interface TickersResponse { tickers: Ticker[] }
