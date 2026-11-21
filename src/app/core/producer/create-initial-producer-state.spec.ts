import { describe, expect, it } from 'vitest';

import { createInitialProducerState } from './create-initial-producer-state';
import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';

describe('createInitialProducerState', () => {
    it('creates the default idle producer state', () => {
        const state = createInitialProducerState();

        expect(state.runId).toBe(0);

        expect(state.status).toBe('idle');

        expect(state.settings).toEqual(DEFAULT_PRODUCER_SETTINGS);

        expect(state.instruments.size).toBe(0);

        expect(state.error).toBeNull();
    });
});