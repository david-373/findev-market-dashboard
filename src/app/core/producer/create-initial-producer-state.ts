import type { ProducerState } from '../models/producer-state.model';

import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';
import { createInitialProducerMetrics } from './create-initial-producer-metrics';

export function createInitialProducerState(): ProducerState {
    return {
        runId: 0,
        status: 'idle',
        settings: DEFAULT_PRODUCER_SETTINGS,
        instruments: createInitialProducerMetrics(
            DEFAULT_PRODUCER_SETTINGS.instrumentCount,
        ),
        error: null,
    };
}