import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { MarketProducerService } from './market-producer.service';

import type { ProducerWorkerCommand } from '../models/producer-worker-command.model';
import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';

// Fake Worker used only for testing Angular ↔ Worker communication.
class FakeWorker extends EventTarget {
    static instance: FakeWorker | null = null;

    readonly commands: ProducerWorkerCommand[] = [];

    constructor() {
        super();
        FakeWorker.instance = this;
    }

    postMessage(command: ProducerWorkerCommand): void {
        this.commands.push(command);
    }

    terminate(): void { }

    emit(event: ProducerWorkerEvent): void {
        this.dispatchEvent(
            new MessageEvent('message', { data: event }),
        );
    }
}

describe('MarketProducerService Worker contract', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        FakeWorker.instance = null;
    });

    it('waits for Worker confirmation before changing to paused', () => {
        vi.stubGlobal('Worker', FakeWorker);

        const producer = new MarketProducerService();

        producer.start({
            instrumentCount: 5,
            updatesPerBatch: 100,
            batchIntervalMs: 500,
        });

        const worker = FakeWorker.instance;

        if (worker === null) {
            throw new Error('Worker was not created');
        }

        // Worker confirms successful initialization.
        worker.emit({
            type: 'ready',
            runId: 1,
            metrics: [],
        });

        expect(producer.state().status).toBe('running');

        // User requests Pause.
        producer.pause();

        expect(worker.commands.at(-1)).toEqual({
            type: 'pause',
            runId: 1,
        });

        // Sending a command does not mean it has been executed.
        expect(producer.state().status).toBe('running');

        // Worker confirms that the timer was stopped.
        worker.emit({
            type: 'paused',
            runId: 1,
        });

        expect(producer.state().status).toBe('paused');
    });

    it('ignores metrics from a previous run', () => {
        vi.stubGlobal('Worker', FakeWorker);

        const producer = new MarketProducerService();

        const settings = {
            instrumentCount: 5,
            updatesPerBatch: 100,
            batchIntervalMs: 500,
        };

        // Start Run #1.
        producer.start(settings);

        const worker = FakeWorker.instance;

        if (worker === null) {
            throw new Error('Worker was not created');
        }

        worker.emit({
            type: 'ready',
            runId: 1,
            metrics: [],
        });

        // Applying new settings starts Run #2.
        producer.start({
            ...settings,
            instrumentCount: 10,
        });

        expect(producer.state().runId).toBe(2);

        // Worker initializes Run #2.
        worker.emit({
            type: 'ready',
            runId: 2,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10_000,
                    spreadCents: 2,
                    volume: 100,
                    vwapCents: 10_000,
                    imbalance: 0.25,
                },
            ],
        });

        const currentMetrics = producer.state().instruments;

        // A delayed message from Run #1 arrives.
        worker.emit({
            type: 'metrics',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 99_999,
                    spreadCents: 5,
                    volume: 999_999,
                    vwapCents: 99_999,
                    imbalance: -0.8,
                },
            ],
        });

        // Run #2 must remain completely unchanged.
        expect(producer.state().runId).toBe(2);
        expect(producer.state().status).toBe('running');
        expect(producer.state().instruments).toBe(currentMetrics);

        expect(
            producer.state().instruments.get('ASSET_001')?.volume,
        ).toBe(100);
    });

    it('reuses the Worker and resets state when settings are applied', () => {
        vi.stubGlobal('Worker', FakeWorker);

        const producer = new MarketProducerService();

        const settings = {
            instrumentCount: 5,
            updatesPerBatch: 100,
            batchIntervalMs: 500,
        };

        // Start the first run.
        producer.start(settings);

        const worker = FakeWorker.instance;

        if (worker === null) {
            throw new Error('Worker was not created');
        }

        worker.emit({
            type: 'ready',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: 10_000,
                    spreadCents: 2,
                    volume: 500,
                    vwapCents: 10_000,
                    imbalance: 0.25,
                },
            ],
        });

        expect(producer.state().instruments.size).toBe(1);

        // Apply different settings.
        const newSettings = {
            ...settings,
            instrumentCount: 10,
        };

        producer.start(newSettings);

        // The same Worker instance must be reused.
        expect(FakeWorker.instance).toBe(worker);

        expect(producer.state().runId).toBe(2);
        expect(producer.state().status).toBe('initializing');
        expect(producer.state().instruments.size).toBe(10);
        expect(producer.state().instruments.get('ASSET_001')).toMatchObject({
            lastPriceCents: null,
            volume: 0,
        });

        // Both runs were sent to the same Worker.
        expect(worker.commands).toEqual([
            {
                type: 'start',
                runId: 1,
                settings,
            },
            {
                type: 'start',
                runId: 2,
                settings: newSettings,
            },
        ]);
    });
});