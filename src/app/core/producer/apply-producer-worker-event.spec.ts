import { describe, expect, it } from 'vitest';

import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';
import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';

import { createNextProducerState } from './create-next-producer-state';
import { applyProducerWorkerEvent } from './apply-producer-worker-event';

describe('applyProducerWorkerEvent', () => {
    it('ignores events from previous runs', () => {
        const previous = createNextProducerState(
            1,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const event: ProducerWorkerEvent = {
            type: 'ready',
            runId: 1,
            metrics: [],
        };

        const next = applyProducerWorkerEvent(previous, event);

        expect(previous.runId).toBe(2);
        expect(next).toBe(previous);
        expect(next.status).toBe('initializing');
    });

    it('transitions to running when the current worker reports ready', () => {
        const previous = createNextProducerState(0, {
            ...DEFAULT_PRODUCER_SETTINGS,
            instrumentCount: 1,
        });

        const metrics = {
            instrument: 'ASSET_001',
            lastPriceCents: null,
            spreadCents: null,
            volume: 0,
            vwapCents: null,
            imbalance: null,
        };

        const event: ProducerWorkerEvent = {
            type: 'ready',
            runId: 1,
            metrics: [metrics],
        };

        const next = applyProducerWorkerEvent(previous, event);

        expect(next.runId).toBe(1);
        expect(next.status).toBe('running');

        expect(next.instruments.size).toBe(1);
        expect(next.instruments.get('ASSET_001')).toEqual(metrics);

        expect(next).not.toBe(previous);
        expect(previous.status).toBe('initializing');
        expect(previous.instruments.get('ASSET_001')).toEqual(metrics);
    });

    it('ignores duplicate ready events after initialization', () => {

        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const running = applyProducerWorkerEvent(initializing, {
            type: 'ready',
            runId: 1,
            metrics: [],
        });

        const withMetrics = applyProducerWorkerEvent(running, {
            type: 'metrics',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10200,
                    spreadCents: 4,
                    volume: 40,
                    vwapCents: 10150,
                    imbalance: 0.2,
                },
            ],
        });

        const duplicateReady: ProducerWorkerEvent = {
            type: 'ready',
            runId: 1,
            metrics: [],
        };

        const next = applyProducerWorkerEvent(
            withMetrics,
            duplicateReady,
        );

        expect(next).toBe(withMetrics);
        expect(next.status).toBe('running');
        expect(next.instruments.get('ASSET_001')?.volume).toBe(40);
    });

    it('pauses the current run when worker confirms pause', () => {

        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const running = applyProducerWorkerEvent(initializing, {
            type: 'ready',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10200,
                    spreadCents: 4,
                    volume: 40,
                    vwapCents: 10150,
                    imbalance: 0.2,
                },
            ],
        });

        const event: ProducerWorkerEvent = {
            type: 'paused',
            runId: 1,
        };

        const paused = applyProducerWorkerEvent(running, event);

        expect(paused.status).toBe('paused');
        expect(paused.runId).toBe(running.runId);
        expect(paused.settings).toBe(running.settings);
        expect(paused.instruments).toBe(running.instruments);

        expect(paused.instruments.get('ASSET_001')?.volume).toBe(40);

        expect(paused).not.toBe(running);
        expect(running.status).toBe('running');
    });

    it('resumes the current run without resetting metrics', () => {
        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const running = applyProducerWorkerEvent(initializing, {
            type: 'ready',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10200,
                    spreadCents: 4,
                    volume: 40,
                    vwapCents: 10150,
                    imbalance: 0.2,
                },
            ],
        });

        const paused = applyProducerWorkerEvent(running, {
            type: 'paused',
            runId: 1,
        });

        const resumedEvent: ProducerWorkerEvent = {
            type: 'resumed',
            runId: 1,
        };

        const resumed = applyProducerWorkerEvent(
            paused,
            resumedEvent,
        );

        expect(resumed.status).toBe('running');

        expect(resumed.runId).toBe(paused.runId);
        expect(resumed.settings).toBe(paused.settings);
        expect(resumed.instruments).toBe(paused.instruments);

        expect(resumed.instruments.get('ASSET_001')?.volume).toBe(40);
        expect(resumed.instruments.get('ASSET_001')?.vwapCents).toBe(10150);

        expect(resumed).not.toBe(paused);
        expect(paused.status).toBe('paused');
    });

    it('updates market metrics for the current running producer', () => {

        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const initialMetric = {
            instrument: 'ASSET_001',
            lastPriceCents: null,
            spreadCents: null,
            volume: 0,
            vwapCents: null,
            imbalance: null,
        };

        const running = applyProducerWorkerEvent(initializing, {
            type: 'ready',
            runId: 1,
            metrics: [initialMetric],
        });

        const updatedMetric = {
            instrument: 'ASSET_001',
            lastPriceCents: 10200,
            spreadCents: 4,
            volume: 40,
            vwapCents: 10150,
            imbalance: 0.2,
        };

        const next = applyProducerWorkerEvent(running, {
            type: 'metrics',
            runId: 1,
            metrics: [updatedMetric],
        });

        expect(next.status).toBe('running');
        expect(next.runId).toBe(running.runId);

        expect(next.instruments.get('ASSET_001')).toEqual(updatedMetric);

        expect(next.instruments).not.toBe(running.instruments);

        expect(running.instruments.get('ASSET_001')).toEqual(initialMetric);
    });

    it('ignores market metrics while producer is paused', () => {

        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const running = applyProducerWorkerEvent(initializing, {
            type: 'ready',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10200,
                    spreadCents: 4,
                    volume: 40,
                    vwapCents: 10150,
                    imbalance: 0.2,
                },
            ],
        });

        const paused = applyProducerWorkerEvent(running, {
            type: 'paused',
            runId: 1,
        });

        // Simulate a late metrics event from the same run.
        const lateEvent: ProducerWorkerEvent = {
            type: 'metrics',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10500,
                    spreadCents: 6,
                    volume: 100,
                    vwapCents: 10300,
                    imbalance: -0.1,
                },
            ],
        };

        const next = applyProducerWorkerEvent(paused, lateEvent);

        expect(next).toBe(paused);
        expect(next.status).toBe('paused');

        expect(next.instruments.get('ASSET_001')?.volume).toBe(40);
        expect(next.instruments.get('ASSET_001')?.vwapCents).toBe(10150);
    });

    it('transitions to error when worker reports a failure', () => {

        const initializing = createNextProducerState(
            0,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const event: ProducerWorkerEvent = {
            type: 'error',
            runId: 1,
            message: 'Failed to initialize WebAssembly module',
        };

        const next = applyProducerWorkerEvent(initializing, event);

        expect(next.status).toBe('error');

        expect(next.error).toBe(
            'Failed to initialize WebAssembly module',
        );

        expect(next.runId).toBe(initializing.runId);
        expect(next.settings).toBe(initializing.settings);
        expect(next.instruments).toBe(initializing.instruments);

        expect(next).not.toBe(initializing);
        expect(initializing.status).toBe('initializing');
        expect(initializing.error).toBeNull();
    });

    it('ignores errors from previous runs', () => {
        // ARRANGE
        const initializing = createNextProducerState(
            1,
            DEFAULT_PRODUCER_SETTINGS,
        );

        const oldError: ProducerWorkerEvent = {
            type: 'error',
            runId: 1,
            message: 'Previous worker failed',
        };

        // ACT
        const next = applyProducerWorkerEvent(
            initializing,
            oldError,
        );

        // ASSERT
        expect(next).toBe(initializing);
        expect(next.runId).toBe(2);
        expect(next.status).toBe('initializing');
        expect(next.error).toBeNull();
    });
});