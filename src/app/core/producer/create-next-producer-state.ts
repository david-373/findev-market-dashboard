import type { ProducerState } from '../models/producer-state.model';
import type { ProducerSettings } from '../models/producer-settings.model';

import { isValidProducerSettings } from '../settings/validate-producer-settings';

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
        instruments: new Map(),
        error: null,
    };
}