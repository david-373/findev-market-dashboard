import type { MarketUpdate } from '../models/market-update.model';
import type { InstrumentAccumulator } from '../models/instrument-accumulator.model';

export function applyMarketUpdate(
    previous: InstrumentAccumulator | undefined,
    update: MarketUpdate,
): InstrumentAccumulator {
    if (previous && previous.metrics.instrument !== update.instrument) {
        throw new Error('Cannot combine updates from different instruments');
    }

    const previousVolume = previous?.metrics.volume ?? 0;
    const previousTotal = previous?.totalPriceQuantityCents ?? 0;

    const volume = previousVolume + update.tradeQuantity;

    const totalPriceQuantityCents =
        previousTotal + update.priceCents * update.tradeQuantity;

    const totalBookQuantity = update.bidQuantity + update.askQuantity;

    return {
        metrics: {
            instrument: update.instrument,
            lastPriceCents: update.priceCents,
            spreadCents: update.askCents - update.bidCents,
            volume,
            vwapCents: volume === 0 ? null : totalPriceQuantityCents / volume,
            imbalance:
                totalBookQuantity === 0
                    ? null
                    : (update.bidQuantity - update.askQuantity) / totalBookQuantity,
        },
        totalPriceQuantityCents,
    };
}