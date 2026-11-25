import type { MarketMetrics } from './market-metrics.model';

export type ProducerWorkerEvent =
    | Readonly<{
        type: 'ready';
        runId: number;
        metrics: readonly MarketMetrics[];
    }>
    | Readonly<{
        type: 'paused';
        runId: number;
    }>
    | Readonly<{
        type: 'resumed';
        runId: number;
    }>
    | Readonly<{
        type: 'metrics';
        runId: number;
        metrics: readonly MarketMetrics[];
    }>
    | Readonly<{
        type: 'error';
        runId: number;
        message: string;
    }>;