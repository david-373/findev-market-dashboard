import type { ProducerSettings } from './producer-settings.model';

export type ProducerWorkerCommand =
    | Readonly<{
        type: 'start';
        runId: number;
        settings: ProducerSettings;
    }>
    | Readonly<{
        type: 'pause';
        runId: number;
    }>
    | Readonly<{
        type: 'resume';
        runId: number;
    }>;