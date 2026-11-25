import { Injectable, signal } from '@angular/core';

import type { ProducerState } from '../models/producer-state.model';
import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';
import { createInitialProducerState } from './create-initial-producer-state';
import type { ProducerWorkerCommand } from '../models/producer-worker-command.model';
import { createNextProducerState } from './create-next-producer-state';
import type { ProducerSettings } from '../models/producer-settings.model';
import { applyProducerWorkerEvent } from './apply-producer-worker-event';

@Injectable({
    providedIn: 'root',
})
export class MarketProducerService {
    private readonly _state = signal<ProducerState>(
        createInitialProducerState(),
    );

    readonly state = this._state.asReadonly();

    private worker: Worker | null = null;

    start(settings: ProducerSettings): void {
        const next = createNextProducerState(
            this._state().runId,
            settings,
        );

        const command: ProducerWorkerCommand = {
            type: 'start',
            runId: next.runId,
            settings: next.settings,
        };

        this._state.set(next);

        try {
            this.getOrCreateWorker().postMessage(command);
        } catch (error) {
            this.worker?.terminate();
            this.worker = null;
            this._state.set(applyProducerWorkerEvent(next, {
                type: 'error',
                runId: next.runId,
                message: error instanceof Error ? error.message : String(error),
            }));
        }
    }

    pause(): void {
        const current = this._state();

        // Pause is only allowed while the producer is running.
        if (current.status !== 'running' || this.worker === null) {
            return;
        }

        const command: ProducerWorkerCommand = {
            type: 'pause',
            runId: current.runId,
        };

        this.worker.postMessage(command);
    }

    resume(): void {
        const current = this._state();

        // Resume is only allowed when the producer is paused.
        if (current.status !== 'paused' || this.worker === null) {
            return;
        }

        const command: ProducerWorkerCommand = {
            type: 'resume',
            runId: current.runId,
        };

        this.worker.postMessage(command);
    }

    private getOrCreateWorker(): Worker {
        // Reuse the existing worker instance.
        if (this.worker) {
            return this.worker;
        }

        // Check browser support.
        if (typeof Worker === 'undefined') {
            throw new Error('Web Workers are not supported');
        }

        // Create the worker only once.
        this.worker = new Worker(
            new URL('../workers/market.worker', import.meta.url),
            { type: 'module' },
        );

        this.worker.addEventListener(
            'message',
            (message: MessageEvent<ProducerWorkerEvent>) => {
                this._state.update((previous) =>
                    applyProducerWorkerEvent(previous, message.data),
                );
            },
        );

        const worker = this.worker;

        worker.addEventListener('error', (error: ErrorEvent) => {
            // Ignore errors from a worker that is no longer active.
            if (this.worker !== worker) {
                return;
            }

            // Stop the failed worker and release its reference.
            worker.terminate();
            this.worker = null;

            // Update Angular state using our existing reducer.
            this._state.update((previous) =>
                applyProducerWorkerEvent(previous, {
                    type: 'error',
                    runId: previous.runId,
                    message: error.message || 'Web Worker failed unexpectedly',
                }),
            );
        });

        return worker;
    }
}
