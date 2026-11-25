import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  apply,
  form,
  FormField,
  FormRoot,
  max,
  min,
  required,
  schema,
  validate,
} from '@angular/forms/signals';

import type { ProducerSettings } from '../../core/models/producer-settings.model';

import { MarketProducerService } from '../../core/producer/market-producer.service';

// Reusable validation for integer-only settings.
const integerSchema = schema<number>((field) => {
  required(field, {
    message: 'This field is required.',
  });

  validate(field, ({ value }) =>
    Number.isInteger(value())
      ? null
      : {
        kind: 'integer',
        message: 'Enter a whole number.',
      },
  );
});

@Component({
  selector: 'app-settings',
  imports: [FormField, FormRoot],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly producer = inject(MarketProducerService);

  // Editable copy. Changes do not affect the active producer.
  readonly draft = signal<ProducerSettings>({
    ...this.producer.state().settings,
  });

  readonly settingsForm = form(
    this.draft,
    (fields) => {
      // Instrument count: 1–50
      apply(fields.instrumentCount, integerSchema);
      min(fields.instrumentCount, 1);
      max(fields.instrumentCount, 50);

      // Updates per batch: 1–1000
      apply(fields.updatesPerBatch, integerSchema);
      min(fields.updatesPerBatch, 1);
      max(fields.updatesPerBatch, 1000);

      // Batch interval: 50–2000 ms
      apply(fields.batchIntervalMs, integerSchema);
      min(fields.batchIntervalMs, 50);
      max(fields.batchIntervalMs, 2000);
    },
    {
      submission: {
        action: async (field) => {
          // Applying settings always starts a fresh run.
          this.producer.start({
            ...field().value(),
          });
        },
      },
    },
  );

  // Static, strongly typed UI configuration.
  readonly numericFields = [
    {
      id: 'instrument-count',
      label: 'Instrument Count (1–50)',
      field: this.settingsForm.instrumentCount,
    },
    {
      id: 'updates-per-batch',
      label: 'Updates per Batch (1–1000)',
      field: this.settingsForm.updatesPerBatch,
    },
    {
      id: 'batch-interval',
      label: 'Batch Interval (50–2000 ms)',
      field: this.settingsForm.batchIntervalMs,
    },
  ] as const;

  readonly hasChanges = computed(() => {
    const draft = this.draft();
    const applied = this.producer.state().settings;

    return (
      draft.instrumentCount !== applied.instrumentCount ||
      draft.updatesPerBatch !== applied.updatesPerBatch ||
      draft.batchIntervalMs !== applied.batchIntervalMs
    );
  });
}