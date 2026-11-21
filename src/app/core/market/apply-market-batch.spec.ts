import { describe, expect, it } from 'vitest';

import type { MarketUpdate } from '../models/market-update.model';
import type { InstrumentAccumulator } from '../models/instrument-accumulator.model';

import { applyMarketBatch } from './apply-market-batch';

describe('applyMarketBatch', () => {
    it('keeps metrics isolated between instruments', () => {
        // ARRANGE

        const previous = new Map<string, InstrumentAccumulator>();

        const updates: MarketUpdate[] = [
            {
                instrument: 'ALFA',
                priceCents: 10000,
                tradeQuantity: 10,
                bidCents: 9998,
                askCents: 10000,
                bidQuantity: 600,
                askQuantity: 400,
            },
            {
                instrument: 'BETA',
                priceCents: 25000,
                tradeQuantity: 5,
                bidCents: 24990,
                askCents: 25000,
                bidQuantity: 300,
                askQuantity: 200,
            },
            {
                instrument: 'ALFA',
                priceCents: 10200,
                tradeQuantity: 30,
                bidCents: 10196,
                askCents: 10200,
                bidQuantity: 600,
                askQuantity: 400,
            },
            {
                instrument: 'GAMMA',
                priceCents: 7500,
                tradeQuantity: 20,
                bidCents: 7498,
                askCents: 7500,
                bidQuantity: 100,
                askQuantity: 100,
            },
        ];

        // ACT

        const result = applyMarketBatch(previous, updates);

        // ASSERT

        expect(result.size).toBe(3);

        const alfa = result.get('ALFA');
        const beta = result.get('BETA');
        const gamma = result.get('GAMMA');

        expect(alfa?.metrics.volume).toBe(40);
        expect(alfa?.metrics.vwapCents).toBe(10150);

        expect(beta?.metrics.volume).toBe(5);
        expect(beta?.metrics.vwapCents).toBe(25000);

        expect(gamma?.metrics.volume).toBe(20);
        expect(gamma?.metrics.vwapCents).toBe(7500);

        expect(previous.size).toBe(0);
    });

    it('preserves accumulated metrics across multiple batches', () => {
        // ARRANGE
        const initial = new Map<string, InstrumentAccumulator>();

        const firstBatch: MarketUpdate[] = [
            {
                instrument: 'ALFA',
                priceCents: 10000,
                tradeQuantity: 10,
                bidCents: 9998,
                askCents: 10000,
                bidQuantity: 600,
                askQuantity: 400,
            },
            {
                instrument: 'BETA',
                priceCents: 25000,
                tradeQuantity: 5,
                bidCents: 24990,
                askCents: 25000,
                bidQuantity: 300,
                askQuantity: 200,
            },
        ];

        const secondBatch: MarketUpdate[] = [
            {
                instrument: 'ALFA',
                priceCents: 10200,
                tradeQuantity: 30,
                bidCents: 10196,
                askCents: 10200,
                bidQuantity: 600,
                askQuantity: 400,
            },
        ];

        // ACT
        const afterFirst = applyMarketBatch(initial, firstBatch);
        const afterSecond = applyMarketBatch(afterFirst, secondBatch);

        // ASSERT
        expect(afterSecond.get('ALFA')?.metrics.volume).toBe(40);
        expect(afterSecond.get('ALFA')?.metrics.vwapCents).toBe(10150);

        expect(afterSecond.get('BETA')?.metrics.volume).toBe(5);
        expect(afterSecond.get('BETA')?.metrics.vwapCents).toBe(25000);

        expect(afterFirst.get('ALFA')?.metrics.volume).toBe(10);
        expect(afterFirst.get('ALFA')?.metrics.vwapCents).toBe(10000);

        expect(initial.size).toBe(0);
    });
});