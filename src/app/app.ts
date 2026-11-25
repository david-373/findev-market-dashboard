import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ProducerStatus } from './shared/components/producer-status/producer-status';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ProducerStatus],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Findev market dashboard');
}
