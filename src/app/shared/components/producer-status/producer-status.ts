import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { MarketProducerService } from '../../../core/producer/market-producer.service';

@Component({
  selector: 'app-producer-status',
  templateUrl: './producer-status.html',
  styleUrl: './producer-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducerStatus {
  private readonly producer = inject(MarketProducerService);

  readonly status = computed(() => this.producer.state().status);

  readonly runId = computed(() => this.producer.state().runId);

  readonly error = computed(() => this.producer.state().error);
}