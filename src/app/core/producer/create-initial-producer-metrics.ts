import type { MarketMetrics } from '../models/market-metrics.model';

import { createInstrumentSymbols } from '../market/create-instrument-symbols';
import { createInitialMarketState } from '../market/create-initial-market-state';

export function createInitialProducerMetrics(
    instrumentCount: number,
): ReadonlyMap<string, MarketMetrics> {
    const symbols = createInstrumentSymbols(instrumentCount);
    const initialState = createInitialMarketState(symbols);

    const metrics = new Map<string, MarketMetrics>();

    for (const [instrument, accumulator] of initialState) {
        metrics.set(instrument, accumulator.metrics);
    }

    return metrics;
}