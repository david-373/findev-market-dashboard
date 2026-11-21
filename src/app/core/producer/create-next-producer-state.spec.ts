import { describe, expect, it } from 'vitest';

import { createNextProducerState } from './create-next-producer-state';
import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';

describe('createNextProducerState', () => {
    it('creates a new initializing run with applied settings', () => {
        const previousRunId = 7;

        const settings = {
            ...DEFAULT_PRODUCER_SETTINGS,
            instrumentCount: 3,
        };

        const next = createNextProducerState(previousRunId, settings);

        expect(next.runId).toBe(8);
        expect(next.status).toBe('initializing');
        expect(next.settings).toEqual(settings);
        expect(next.settings).not.toBe(settings);
        expect(next.instruments.size).toBe(0);
        expect(next.error).toBeNull();
    });

    it.each([
        {
            name: 'instrumentCount below minimum',
            settings: {
                ...DEFAULT_PRODUCER_SETTINGS,
                instrumentCount: 0,
            },
        },
        {
            name: 'updatesPerBatch above maximum',
            settings: {
                ...DEFAULT_PRODUCER_SETTINGS,
                updatesPerBatch: 1001,
            },
        },
        {
            name: 'batchIntervalMs below minimum',
            settings: {
                ...DEFAULT_PRODUCER_SETTINGS,
                batchIntervalMs: 49,
            },
        },
    ])(
        'rejects invalid settings: $name',
        ({ settings }) => {
            const previousRunId = 7;

            expect(() => createNextProducerState(previousRunId, settings))
                .toThrow(RangeError);
        },
    );
});