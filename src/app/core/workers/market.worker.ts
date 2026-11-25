/// <reference lib="webworker" />

import type { ProducerWorkerCommand } from '../models/producer-worker-command.model';
import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';
import init, { MarketGenerator } from '../../../../wasm/market-generator/pkg/market_generator.js';
import { createInstrumentSymbols } from '../market/create-instrument-symbols';
import { createInitialMarketState } from '../market/create-initial-market-state';
import { decodeMarketBatch } from '../market/decode-market-batch';
import { applyMarketBatch } from '../market/apply-market-batch';
import type { InstrumentAccumulator } from '../models/instrument-accumulator.model';
import type { ProducerSettings } from '../models/producer-settings.model';

type ActiveMarketRun = {
  runId: number;

  settings: ProducerSettings;

  generator: MarketGenerator;

  symbols: readonly string[];

  marketState: ReadonlyMap<string, InstrumentAccumulator>;

  timerId: number | null;

  lastPublishedAt: number | null;
};

let activeRun: ActiveMarketRun | null = null;

function disposeActiveRun(): void {
  const run = activeRun;

  if (run === null) {
    return;
  }

  if (run.timerId !== null) {
    clearInterval(run.timerId);
  }

  run.generator.free();
  activeRun = null;
}

let latestStartRunId = 0;

let wasmInitialization: Promise<void> | null = null;

function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialization === null) {
    const wasmUrl = new URL(
      'wasm/market_generator_bg.wasm',
      self.location.href,
    );

    wasmInitialization = init({
      module_or_path: wasmUrl,
    })
      .then(() => undefined)
      .catch((error: unknown) => {
        wasmInitialization = null;
        throw error;
      });
  }

  return wasmInitialization;
}

const UI_REFRESH_INTERVAL_MS = 100;

function publishMetrics(run: ActiveMarketRun): void {
  const metricsEvent: ProducerWorkerEvent = {
    type: 'metrics',
    runId: run.runId,
    metrics: Array.from(
      run.marketState.values(),
      (accumulator) => accumulator.metrics,
    ),
  };

  postMessage(metricsEvent);

  run.lastPublishedAt = performance.now();
}

function generateMarketBatch(run: ActiveMarketRun): void {
  // Ignore a run that is no longer active.
  if (activeRun !== run) {
    return;
  }

  const batch = run.generator.generate_batch_flat(
    run.settings.updatesPerBatch,
  );

  const updates = decodeMarketBatch(batch, run.symbols);

  // Accumulate every generated trade.
  run.marketState = applyMarketBatch(
    run.marketState,
    updates,
  );

  const now = performance.now();

  if (
    run.lastPublishedAt === null ||
    now - run.lastPublishedAt >= UI_REFRESH_INTERVAL_MS
  ) {
    publishMetrics(run);
  }
}

function startMarketTimer(run: ActiveMarketRun): void {
  // Do not start a timer for an outdated or already scheduled run.
  if (activeRun !== run || run.timerId !== null) {
    return;
  }

  run.timerId = self.setInterval(() => {
    if (activeRun !== run) {
      return;
    }

    try {
      generateMarketBatch(run);
    } catch (error) {
      disposeActiveRun();

      const response: ProducerWorkerEvent = {
        type: 'error',
        runId: run.runId,
        message:
          error instanceof Error ? error.message : String(error),
      };

      postMessage(response);
    }
  }, run.settings.batchIntervalMs);
}

self.addEventListener(
  'message',
  ({ data }: MessageEvent<ProducerWorkerCommand>) => {
    switch (data.type) {
      case 'start': {
        // Ignore duplicate or outdated start commands.
        if (data.runId <= latestStartRunId) {
          break;
        }

        latestStartRunId = data.runId;

        // Release resources belonging to the previous run.
        disposeActiveRun();

        void (async () => {
          try {
            await ensureWasmInitialized();

            // A newer start command may have arrived during initialization.
            if (data.runId !== latestStartRunId) {
              return;
            }

            const symbols = createInstrumentSymbols(
              data.settings.instrumentCount,
            );

            const marketState = createInitialMarketState(symbols);

            // Generate a fresh seed for each market run.
            const seedBuffer = new Uint32Array(1);

            crypto.getRandomValues(seedBuffer);

            const seed = seedBuffer[0]!;

            const generator = new MarketGenerator(
              seed,
              data.settings.instrumentCount,
            );

            // Keep the generator and market state for future batches.
            activeRun = {
              runId: data.runId,
              settings: { ...data.settings },
              generator,
              symbols,
              marketState,
              timerId: null,
              lastPublishedAt: null,
            };

            // Notify Angular that the producer is initialized.
            const readyEvent: ProducerWorkerEvent = {
              type: 'ready',
              runId: activeRun.runId,
              metrics: Array.from(
                activeRun.marketState.values(),
                (accumulator) => accumulator.metrics,
              ),
            };
            postMessage(readyEvent);

            generateMarketBatch(activeRun);

            startMarketTimer(activeRun);

          } catch (error) {
            // Do not report an error from an outdated initialization.
            if (data.runId !== latestStartRunId) {
              return;
            }

            // Release resources if initialization or the first batch failed.
            disposeActiveRun();

            const response: ProducerWorkerEvent = {
              type: 'error',
              runId: data.runId,
              message:
                error instanceof Error ? error.message : String(error),
            };

            postMessage(response);
          }
        })();

        break;
      }

      case 'pause': {
        const run = activeRun;

        // Ignore pause commands for missing or outdated runs.
        if (
          run === null ||
          run.runId !== data.runId ||
          run.timerId === null
        ) {
          break;
        }

        // Stop the timer without destroying the generator.
        clearInterval(run.timerId);
        run.timerId = null;

        // Flush the latest metrics before confirming Pause.
        publishMetrics(run);

        // Notify Angular that generation is paused.
        const response: ProducerWorkerEvent = {
          type: 'paused',
          runId: run.runId,
        };

        postMessage(response);

        break;
      }

      case 'resume': {
        const run = activeRun;

        // Resume only the current paused run.
        if (
          run === null ||
          run.runId !== data.runId ||
          run.timerId !== null
        ) {
          break;
        }

        // Restart the timer without recreating the generator.
        startMarketTimer(run);

        const response: ProducerWorkerEvent = {
          type: 'resumed',
          runId: run.runId,
        };

        postMessage(response);

        break;
      }
    }
  },
);
