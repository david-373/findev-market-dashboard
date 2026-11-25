import type { MarketUpdate } from '../models/market-update.model';

const FIELDS_PER_UPDATE = 7;

function toSafeNumber(value: bigint, field: string): number {
    const result = Number(value);

    if (!Number.isSafeInteger(result)) {
        throw new RangeError(`Unsafe numeric value for ${field}`);
    }

    return result;
}

export function decodeMarketBatch(
    batch: BigInt64Array,
    symbols: readonly string[],
): readonly MarketUpdate[] {
    if (batch.length % FIELDS_PER_UPDATE !== 0) {
        throw new RangeError('Invalid market batch length');
    }

    const updates: MarketUpdate[] = [];

    for (let offset = 0; offset < batch.length; offset += FIELDS_PER_UPDATE) {
        const instrumentIndex = toSafeNumber(
            batch[offset]!,
            'instrumentIndex',
        );

        const instrument = symbols[instrumentIndex];

        if (instrument === undefined) {
            throw new RangeError(`Unknown instrument index: ${instrumentIndex}`);
        }

        updates.push({
            instrument,
            priceCents: toSafeNumber(batch[offset + 1]!, 'priceCents'),
            tradeQuantity: toSafeNumber(batch[offset + 2]!, 'tradeQuantity'),
            bidCents: toSafeNumber(batch[offset + 3]!, 'bidCents'),
            askCents: toSafeNumber(batch[offset + 4]!, 'askCents'),
            bidQuantity: toSafeNumber(batch[offset + 5]!, 'bidQuantity'),
            askQuantity: toSafeNumber(batch[offset + 6]!, 'askQuantity'),
        });
    }

    return updates;
}