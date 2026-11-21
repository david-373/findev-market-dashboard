import { describe, expect, it } from 'vitest';

import { createInitialMarketState } from './create-initial-market-state';

describe('createInitialMarketState', () => {
    it('creates initial state with unavailable metrics and zero volume', () => {
        // ARRANGE
        const instruments = ['ALFA', 'BETA', 'GAMMA'];

        // ACT
        const state = createInitialMarketState(instruments);

        // ASSERT
        expect(state.size).toBe(3);

        for (const instrument of instruments) {
            const accumulator = state.get(instrument);

            expect(accumulator?.metrics).toEqual({
                instrument,
                lastPriceCents: null,
                spreadCents: null,
                volume: 0,
                vwapCents: null,
                imbalance: null,
            });

            expect(accumulator?.totalPriceQuantityCents).toBe(0);
        }
    });
});