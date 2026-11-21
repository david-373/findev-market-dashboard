import type { MarketUpdate } from '../models/market-update.model';
import type { InstrumentAccumulator } from '../models/instrument-accumulator.model';

import { applyMarketUpdate } from './apply-market-update';

export function applyMarketBatch(
  previous: ReadonlyMap<string, InstrumentAccumulator>,
  updates: readonly MarketUpdate[],
): ReadonlyMap<string, InstrumentAccumulator> {

  const next = new Map(previous);

  for (const update of updates) {
    const instrumentState = next.get(update.instrument);

    const updatedState = applyMarketUpdate(
      instrumentState,
      update
    );

    next.set(update.instrument, updatedState);
  }

  return next;
}