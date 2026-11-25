import type { ProducerState } from '../models/producer-state.model';
import type { ProducerSettings } from '../models/producer-settings.model';

import { isValidProducerSettings } from '../settings/validate-producer-settings';
import { createInitialProducerMetrics } from './create-initial-producer-metrics';

export function createNextProducerState(
    previousRunId: number,
    settings: ProducerSettings,
): ProducerState {
    if (!isValidProducerSettings(settings)) {
        throw new RangeError('Invalid producer settings');
    }

    return {
        runId: previousRunId + 1,
        status: 'initializing',
        settings: { ...settings },
        instruments: createInitialProducerMetrics(settings.instrumentCount),
        error: null,
    };
}