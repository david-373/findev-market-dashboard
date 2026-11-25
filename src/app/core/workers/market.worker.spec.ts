import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProducerWorkerCommand } from '../models/producer-worker-command.model';

// Track calls to the simulated Wasm generator.
const wasm = vi.hoisted(() => ({
    constructed: vi.fn(),
    generated: vi.fn(() =>
        new BigInt64Array([
            0n,      // Instrument index
            10000n,  // Trade price
            1n,      // Trade quantity
            10000n,  // Bid
            10002n,  // Ask
            10n,     // Bid quantity
            10n,     // Ask quantity
        ]),
    ),
    freed: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
    '../../../../wasm/market-generator/pkg/market_generator.js',
    () => ({
        default: wasm.initialize,

        MarketGenerator: class {
            constructor() {
                wasm.constructed();
            }

            generate_batch_flat() {
                return wasm.generated();
            }

            free() {
                wasm.freed();
            }
        },
    }),
);

class FakeWorkerScope extends EventTarget {
    readonly location = {
        href: 'http://localhost/dashboard-app/worker.js',
    };

    setInterval(callback: () => void, delay: number): number {
        return globalThis.setInterval(callback, delay) as unknown as number;
    }
}

describe('Market Worker lifecycle', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('releases the previous generator and timer on a new start', async () => {
        vi.useFakeTimers();

        const scope = new FakeWorkerScope();

        vi.stubGlobal('self', scope);
        vi.stubGlobal('postMessage', vi.fn());

        // Import after installing the simulated Worker environment.
        await import('./market.worker');

        const start = (runId: number): void => {
            const command: ProducerWorkerCommand = {
                type: 'start',
                runId,
                settings: {
                    instrumentCount: 5,
                    updatesPerBatch: 100,
                    batchIntervalMs: 500,
                },
            };

            scope.dispatchEvent(
                new MessageEvent('message', { data: command }),
            );
        };

        // First run.
        start(1);

        await vi.advanceTimersByTimeAsync(0);

        expect(wasm.constructed).toHaveBeenCalledTimes(1);
        expect(wasm.initialize).toHaveBeenCalledWith({
            module_or_path: new URL('http://localhost/dashboard-app/wasm/market_generator_bg.wasm'),
        });
        expect(vi.getTimerCount()).toBe(1);

        // Apply starts a new run.
        start(2);

        await vi.advanceTimersByTimeAsync(0);

        // Previous Rust generator must be released.
        expect(wasm.freed).toHaveBeenCalledTimes(1);

        // A fresh generator must be created.
        expect(wasm.constructed).toHaveBeenCalledTimes(2);

        // Only one interval must remain scheduled.
        expect(vi.getTimerCount()).toBe(1);
    });

    it('ignores an outdated start during Wasm initialization', async () => {
        vi.useFakeTimers();

        const scope = new FakeWorkerScope();
        const send = vi.fn();

        vi.stubGlobal('self', scope);
        vi.stubGlobal('postMessage', send);

        let resolveInitialization!: () => void;

        const pendingInitialization = new Promise<void>((resolve) => {
            resolveInitialization = resolve;
        });

        wasm.initialize.mockReturnValueOnce(pendingInitialization);

        await import('./market.worker');

        const start = (runId: number): void => {
            const command: ProducerWorkerCommand = {
                type: 'start',
                runId,
                settings: {
                    instrumentCount: 5,
                    updatesPerBatch: 100,
                    batchIntervalMs: 500,
                },
            };

            scope.dispatchEvent(
                new MessageEvent('message', { data: command }),
            );
        };

        // First run starts loading Wasm.
        start(1);

        // A second run is requested before initialization finishes.
        start(2);

        expect(wasm.constructed).not.toHaveBeenCalled();

        // Complete Wasm initialization.
        resolveInitialization();

        await vi.advanceTimersByTimeAsync(0);

        // Only Run #2 may create a generator.
        expect(wasm.constructed).toHaveBeenCalledTimes(1);

        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'ready',
                runId: 2,
            }),
        );

        expect(send).not.toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'ready',
                runId: 1,
            }),
        );

        expect(vi.getTimerCount()).toBe(1);
    });

    it('releases resources when the first batch fails', async () => {
        vi.useFakeTimers();

        const scope = new FakeWorkerScope();
        const send = vi.fn();

        vi.stubGlobal('self', scope);
        vi.stubGlobal('postMessage', send);

        // Simulate an exception during the first batch generation.
        wasm.generated.mockImplementationOnce(() => {
            throw new Error('Simulated batch failure');
        });

        await import('./market.worker');

        const command: ProducerWorkerCommand = {
            type: 'start',
            runId: 1,
            settings: {
                instrumentCount: 5,
                updatesPerBatch: 100,
                batchIntervalMs: 500,
            },
        };

        scope.dispatchEvent(
            new MessageEvent('message', { data: command }),
        );

        // Allow asynchronous Wasm initialization to complete.
        await vi.advanceTimersByTimeAsync(0);

        // The generator was successfully constructed.
        expect(wasm.constructed).toHaveBeenCalledTimes(1);

        // The failed run must release its Wasm resources.
        expect(wasm.freed).toHaveBeenCalledTimes(1);

        // No periodic timer should remain active.
        expect(vi.getTimerCount()).toBe(0);

        // Angular must receive the error.
        expect(send).toHaveBeenLastCalledWith({
            type: 'error',
            runId: 1,
            message: 'Simulated batch failure',
        });
    });

    it('accumulates batches between publications and flushes metrics on pause', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });

        const scope = new FakeWorkerScope();
        const send = vi.fn();
        vi.stubGlobal('self', scope);
        vi.stubGlobal('postMessage', send);

        await import('./market.worker');

        const start: ProducerWorkerCommand = {
            type: 'start',
            runId: 1,
            settings: {
                instrumentCount: 1,
                updatesPerBatch: 1,
                batchIntervalMs: 50,
            },
        };
        scope.dispatchEvent(new MessageEvent('message', { data: start }));
        await vi.advanceTimersByTimeAsync(0);

        expect(wasm.generated).toHaveBeenCalledTimes(1);
        send.mockClear();

        await vi.advanceTimersByTimeAsync(50);
        expect(wasm.generated).toHaveBeenCalledTimes(2);
        expect(send).not.toHaveBeenCalled();

        const pause: ProducerWorkerCommand = { type: 'pause', runId: 1 };
        scope.dispatchEvent(new MessageEvent('message', { data: pause }));

        expect(send).toHaveBeenNthCalledWith(1, {
            type: 'metrics',
            runId: 1,
            metrics: [expect.objectContaining({ instrument: 'ASSET_001', volume: 2 })],
        });
        expect(send).toHaveBeenNthCalledWith(2, { type: 'paused', runId: 1 });
        expect(vi.getTimerCount()).toBe(0);
    });
});
