import type { MarketMetrics } from './market-metrics.model';

export type InstrumentAccumulator = Readonly<{
  metrics: MarketMetrics;
  totalPriceQuantityCents: number;
}>;