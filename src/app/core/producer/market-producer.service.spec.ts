import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';
import { MarketProducerService } from './market-producer.service';
import type { ProducerWorkerEvent } from '../models/producer-worker-event.model';

describe('MarketProducerService', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('starts a new run and sends a start command to the worker', () => {

        const postMessageSpy = vi.fn();

        class MockWorker {
            postMessage = postMessageSpy;
            addEventListener = vi.fn();
            terminate = vi.fn();
        }

        vi.stubGlobal('Worker', MockWorker);

        TestBed.configureTestingModule({});
        const service = TestBed.inject(MarketProducerService);

        service.start(DEFAULT_PRODUCER_SETTINGS);

        expect(service.state().runId).toBe(1);
        expect(service.state().status).toBe('initializing');

        expect(postMessageSpy).toHaveBeenCalledOnce();

        expect(postMessageSpy).toHaveBeenCalledWith({
            type: 'start',
            runId: 1,
            settings: DEFAULT_PRODUCER_SETTINGS,
        });
    });

    it('reports worker creation failure and allows a fresh start', () => {
        const createWorker = vi.fn().mockImplementationOnce(() => {
            throw new Error('Worker blocked');
        });

        class MockWorker {
            postMessage = vi.fn();
            addEventListener = vi.fn();

            constructor() {
                createWorker();
            }
        }

        vi.stubGlobal('Worker', MockWorker);
        const service = new MarketProducerService();

        service.start(DEFAULT_PRODUCER_SETTINGS);
        expect(service.state()).toMatchObject({
            runId: 1,
            status: 'error',
            error: 'Worker blocked',
        });

        service.start(DEFAULT_PRODUCER_SETTINGS);
        expect(service.state()).toMatchObject({
            runId: 2,
            status: 'initializing',
            error: null,
        });
    });

    it('updates the signal when worker reports ready', () => {

        const messageHandlers: Array<
            (event: MessageEvent<ProducerWorkerEvent>) => void
        > = [];

        class MockWorker {
            postMessage = vi.fn();
            terminate = vi.fn();

            addEventListener(
                type: string,
                handler: (event: MessageEvent<ProducerWorkerEvent>) => void,
            ): void {
                if (type === 'message') {
                    messageHandlers.push(handler);
                }
            }
        }

        vi.stubGlobal('Worker', MockWorker);

        TestBed.configureTestingModule({});

        const service = TestBed.inject(MarketProducerService);

        service.start(DEFAULT_PRODUCER_SETTINGS);

        const readyEvent: ProducerWorkerEvent = {
            type: 'ready',
            runId: 1,
            metrics: [
                {
                    instrument: 'ASSET_001',
                    lastPriceCents: null,
                    spreadCents: null,
                    volume: 0,
                    vwapCents: null,
                    imbalance: null,
                },
            ],
        };

        const handler = messageHandlers[0];

        expect(handler).toBeDefined();

        handler?.(
            new MessageEvent('message', {
                data: readyEvent,
            }),
        );

        expect(service.state().status).toBe('running');
        expect(service.state().runId).toBe(1);

        expect(service.state().instruments.size).toBe(1);

        expect(
            service.state().instruments.get('ASSET_001')?.volume,
        ).toBe(0);
    });

    it('terminates the worker and updates state on worker failure', () => {

        const errorHandlers: Array<(event: ErrorEvent) => void> = [];

        const terminateSpy = vi.fn();

        class MockWorker {
            postMessage = vi.fn();
            terminate = terminateSpy;

            addEventListener(
                type: string,
                handler: (event: ErrorEvent) => void,
            ): void {
                if (type === 'error') {
                    errorHandlers.push(handler);
                }
            }
        }

        vi.stubGlobal('Worker', MockWorker);

        TestBed.configureTestingModule({});

        const service = TestBed.inject(MarketProducerService);

        service.start(DEFAULT_PRODUCER_SETTINGS);

        expect(service.state().status).toBe('initializing');

        const errorHandler = errorHandlers[0];

        expect(errorHandler).toBeDefined();

        errorHandler?.(
            new ErrorEvent('error', {
                message: 'Unexpected worker failure',
            }),
        );

        expect(terminateSpy).toHaveBeenCalledOnce();

        expect(service.state().status).toBe('error');

        expect(service.state().error).toBe(
            'Unexpected worker failure',
        );

        expect(service.state().runId).toBe(1);
    });
});
