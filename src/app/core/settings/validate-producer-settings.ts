import type { ProducerSettings } from '../models/producer-settings.model';

export function isValidProducerSettings(
    settings: ProducerSettings,
): boolean {
    const {
        instrumentCount,
        updatesPerBatch,
        batchIntervalMs,
    } = settings;

    return (
        Number.isInteger(instrumentCount) &&
        instrumentCount >= 1 &&
        instrumentCount <= 50 &&

        Number.isInteger(updatesPerBatch) &&
        updatesPerBatch >= 1 &&
        updatesPerBatch <= 1000 &&

        Number.isInteger(batchIntervalMs) &&
        batchIntervalMs >= 50 &&
        batchIntervalMs <= 2000
    );
}