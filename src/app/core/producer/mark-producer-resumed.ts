import type { ProducerState } from '../models/producer-state.model';

export function markProducerResumed(
    previous: ProducerState,
): ProducerState {
    if (previous.status !== 'paused') {
        throw new Error(
            `Cannot resume producer from status: ${previous.status}`,
        );
    }

    return {
        ...previous,
        status: 'running',
    };
}