import type { InstrumentAccumulator } from '../models/instrument-accumulator.model';

export function createInitialMarketState(
  instruments: readonly string[],
): ReadonlyMap<string, InstrumentAccumulator> {

  const state = new Map<string, InstrumentAccumulator>();

  for (const instrument of instruments) {
    state.set(instrument, {
      metrics: {
        instrument,
        lastPriceCents: null,
        spreadCents: null,
        volume: 0,
        vwapCents: null,
        imbalance: null,
      },
      totalPriceQuantityCents: 0,
    });
  }

  return state;
}