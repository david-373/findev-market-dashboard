import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { MarketProducerService } from '../../core/producer/market-producer.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  imports: [CurrencyPipe, DecimalPipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {

  readonly producer = inject(MarketProducerService);

  start(): void {
    this.producer.start(this.producer.state().settings);
  }

  pause(): void {
    this.producer.pause();
  }

  resume(): void {
    this.producer.resume();
  }
}
