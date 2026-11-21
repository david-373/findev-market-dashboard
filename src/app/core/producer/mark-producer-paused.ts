import type { ProducerState } from '../models/producer-state.model';

export function markProducerPaused(
    previous: ProducerState,
): ProducerState {
    if (previous.status !== 'running') {
        throw new Error(
            `Cannot pause producer from status: ${previous.status}`,
        );
    }

    return {
        ...previous,
        status: 'paused',
    };
}