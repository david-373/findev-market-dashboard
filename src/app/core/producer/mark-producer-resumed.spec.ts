import { describe, expect, it } from 'vitest';

import type { ProducerState } from '../models/producer-state.model';
import { createInitialProducerState } from './create-initial-producer-state';
import { markProducerResumed } from './mark-producer-resumed';

describe('markProducerResumed', () => {
    it('resumes a paused producer without resetting its state', () => {

        const paused: ProducerState = {
            ...createInitialProducerState(),
            runId: 5,
            status: 'paused',
            instruments: new Map([
                [
                    'ASSET_001',
                    {
                        instrument: 'ASSET_001',
                        lastPriceCents: 10200,
                        spreadCents: 4,
                        volume: 40,
                        vwapCents: 10150,
                        imbalance: 0.2,
                    },
                ],
            ]),
        };

        const resumed = markProducerResumed(paused);

        expect(resumed.status).toBe('running');

        expect(resumed.runId).toBe(paused.runId);
        expect(resumed.settings).toBe(paused.settings);
        expect(resumed.instruments).toBe(paused.instruments);
        expect(resumed.error).toBe(paused.error);

        expect(resumed).not.toBe(paused);
        expect(paused.status).toBe('paused');
    });

    it.each([
        'idle',
        'initializing',
        'running',
        'error',
    ] as const)(
        'rejects resume from status: %s',
        (status) => {

            const previous: ProducerState = {
                ...createInitialProducerState(),
                status,
            };

            expect(() => markProducerResumed(previous))
                .toThrow(`Cannot resume producer from status: ${status}`);
        },
    );
});