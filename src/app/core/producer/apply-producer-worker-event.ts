import type { ProducerState } from '../models/producer-state.model';
import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';

import { markProducerPaused } from './mark-producer-paused';
import { markProducerResumed } from './mark-producer-resumed';

export function applyProducerWorkerEvent(
    previous: ProducerState,
    event: ProducerWorkerEvent,
): ProducerState {
    // Ignore messages from previous runs.
    if (event.runId !== previous.runId) {
        return previous;
    }

    switch (event.type) {
        case 'ready':
            if (previous.status !== 'initializing') {
                return previous;
            }

            return {
                ...previous,
                status: 'running',
                instruments: new Map(
                    event.metrics.map((metric) => [metric.instrument, metric] as const),
                ),
            };

        case 'paused':
            return previous.status === 'running'
                ? markProducerPaused(previous)
                : previous;

        case 'resumed':
            return previous.status === 'paused'
                ? markProducerResumed(previous)
                : previous;

        case 'metrics':
            if (previous.status !== 'running') {
                return previous;
            }

            return {
                ...previous,
                instruments: new Map(
                    event.metrics.map((metric) => [metric.instrument, metric] as const),
                ),
            };

        case 'error':
            if (previous.status === 'idle') {
                return previous;
            }

            return {
                ...previous,
                status: 'error',
                error: event.message,
            };

        default: {
            const exhaustiveCheck: never = event;
            throw new Error(
                `Unhandled worker event: ${JSON.stringify(exhaustiveCheck)}`,
            );
        }
    }
}