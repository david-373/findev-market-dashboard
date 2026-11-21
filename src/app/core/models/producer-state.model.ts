import type { ProducerStatus } from './producer-status.model';
import type { ProducerSettings } from './producer-settings.model';
import type { MarketMetrics } from './market-metrics.model';

export type ProducerState = Readonly<{
  runId: number;
  status: ProducerStatus;
  settings: ProducerSettings;
  instruments: ReadonlyMap<string, MarketMetrics>;
  error: string | null;
}>;