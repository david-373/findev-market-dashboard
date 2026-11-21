export type ProducerSettings = Readonly<{
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
}>;

export const DEFAULT_PRODUCER_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};