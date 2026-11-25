import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProducerStatus } from './producer-status';

describe('ProducerStatus', () => {
  let component: ProducerStatus;
  let fixture: ComponentFixture<ProducerStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProducerStatus],
    }).compileComponents();

    fixture = TestBed.createComponent(ProducerStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
