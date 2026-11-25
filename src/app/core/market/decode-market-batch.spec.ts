import { describe, expect, it } from 'vitest';

import { decodeMarketBatch } from './decode-market-batch';

describe('decodeMarketBatch', () => {
    it('decodes a Wasm BigInt64Array into MarketUpdate objects', () => {
        // ARRANGE
        const symbols = ['ASSET_001', 'ASSET_002'];

        const batch = new BigInt64Array([
            0n,
            10002n,
            24n,
            10002n,
            10007n,
            318n,
            405n,
        ]);

        // ACT
        const updates = decodeMarketBatch(batch, symbols);

        // ASSERT
        expect(updates).toHaveLength(1);

        expect(updates).toEqual([
            {
                instrument: 'ASSET_001',
                priceCents: 10002,
                tradeQuantity: 24,
                bidCents: 10002,
                askCents: 10007,
                bidQuantity: 318,
                askQuantity: 405,
            },
        ]);
    });

    it('rejects a batch with an incomplete market update', () => {
        // ARRANGE
        const symbols = ['ASSET_001'];

        const invalidBatch = new BigInt64Array([
            0n,
            10002n,
            24n,
        ]);

        // ACT & ASSERT
        expect(() => decodeMarketBatch(invalidBatch, symbols))
            .toThrow(RangeError);
    });

    it('rejects an unknown instrument index', () => {
        // ARRANGE
        const symbols = ['ASSET_001', 'ASSET_002'];

        const batch = new BigInt64Array([
            2n,      // Invalid instrument index
            10002n,  // Trade price
            24n,     // Trade quantity
            10002n,  // Bid
            10007n,  // Ask
            318n,    // Bid quantity
            405n,    // Ask quantity
        ]);

        // ACT & ASSERT
        expect(() => decodeMarketBatch(batch, symbols))
            .toThrow('Unknown instrument index: 2');
    });

    it('rejects a price exceeding the safe integer range', () => {
        // ARRANGE
        const symbols = ['ASSET_001'];

        const batch = new BigInt64Array([
            0n,                       // Instrument index
            9_007_199_254_740_992n,   // Unsafe price
            24n,                      // Trade quantity
            10002n,                   // Bid
            10007n,                   // Ask
            318n,                     // Bid quantity
            405n,                     // Ask quantity
        ]);

        // ACT & ASSERT
        expect(() => decodeMarketBatch(batch, symbols))
            .toThrow('Unsafe numeric value for priceCents');
    });
});