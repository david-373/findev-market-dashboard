import { describe, expect, it } from 'vitest';

import type { ProducerState } from '../models/producer-state.model';
import { createInitialProducerState } from './create-initial-producer-state';
import { markProducerPaused } from './mark-producer-paused';

describe('markProducerPaused', () => {
    it('pauses a running producer without losing its state', () => {

        const running: ProducerState = {
            ...createInitialProducerState(),
            runId: 3,
            status: 'running',
            instruments: new Map([
                [
                    'ASSET_001',
                    {
                        instrument: 'ASSET_001',
                        lastPriceCents: 10000,
                        spreadCents: 2,
                        volume: 10,
                        vwapCents: 10000,
                        imbalance: 0.2,
                    },
                ],
            ]),
        };

        const paused = markProducerPaused(running);

        expect(paused.status).toBe('paused');

        expect(paused.runId).toBe(running.runId);
        expect(paused.settings).toBe(running.settings);
        expect(paused.instruments).toBe(running.instruments);
        expect(paused.error).toBe(running.error);

        expect(paused).not.toBe(running);
        expect(running.status).toBe('running');
    });

    it.each([
        'idle',
        'initializing',
        'paused',
        'error',
    ] as const)(
        'rejects pause from status: %s',
        (status) => {

            const previous: ProducerState = {
                ...createInitialProducerState(),
                status,
            };

            expect(() => markProducerPaused(previous))
                .toThrow(`Cannot pause producer from status: ${status}`);
        },
    );
});