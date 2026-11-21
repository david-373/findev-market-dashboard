import { describe, expect, it } from 'vitest';

import type { MarketUpdate } from '../models/market-update.model';
import { applyMarketUpdate } from './apply-market-update';

describe('applyMarketUpdate', () => {
    it('calculates metrics from two trades', () => {

        // ARRANGE — подготавливаем две сделки.

        const firstUpdate: MarketUpdate = {
            instrument: 'ALFA',
            priceCents: 10000,
            tradeQuantity: 10,
            bidCents: 9998,
            askCents: 10000,
            bidQuantity: 600,
            askQuantity: 400,
        };

        const secondUpdate: MarketUpdate = {
            instrument: 'ALFA',
            priceCents: 10200,
            tradeQuantity: 30,
            bidCents: 10196,
            askCents: 10200,
            bidQuantity: 600,
            askQuantity: 400,
        };

        // ACT — применяем сделки последовательно.

        const first = applyMarketUpdate(undefined, firstUpdate);

        const second = applyMarketUpdate(first, secondUpdate);

        // ASSERT — проверяем вычисленные показатели.

        expect(second.metrics.instrument).toBe('ALFA');

        expect(second.metrics.lastPriceCents).toBe(10200);

        expect(second.metrics.spreadCents).toBe(4);

        expect(second.metrics.volume).toBe(40);

        expect(second.metrics.vwapCents).toBe(10150);

        expect(second.metrics.imbalance).toBeCloseTo(0.2);

        expect(second.totalPriceQuantityCents).toBe(406000);
    });

    it('returns null imbalance when both book quantities are zero', () => {
        // ARRANGE
        const update: MarketUpdate = {
            instrument: 'ALFA',
            priceCents: 10000,
            tradeQuantity: 10,
            bidCents: 9998,
            askCents: 10000,
            bidQuantity: 0,
            askQuantity: 0,
        };

        // ACT
        const result = applyMarketUpdate(undefined, update);

        // ASSERT
        expect(result.metrics.imbalance).toBeNull();
        expect(result.metrics.volume).toBe(10);
        expect(result.metrics.vwapCents).toBe(10000);
    });
});