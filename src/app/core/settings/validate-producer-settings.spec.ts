import { describe, expect, it } from "vitest";

import { DEFAULT_PRODUCER_SETTINGS } from '../models/producer-settings.model';

import {
    isValidProducerSettings
} from './validate-producer-settings';

describe('isValidProducerSettings', () => {

    it('accepts default settings', () => {
        const result = isValidProducerSettings(
            DEFAULT_PRODUCER_SETTINGS
        );

        expect(result).toBe(true);
    });

    it('accepts minimum allowed values', () => {
        const result = isValidProducerSettings({
            instrumentCount: 1,
            updatesPerBatch: 1,
            batchIntervalMs: 50,
        });

        expect(result).toBe(true);
    });


    it('accepts maximum allowed values', () => {
        const result = isValidProducerSettings({
            instrumentCount: 50,
            updatesPerBatch: 1000,
            batchIntervalMs: 2000,
        });

        expect(result).toBe(true);
    });


    it.each([0, 51, 2.5])(
        'rejects instrumentCount = %s',
        (instrumentCount) => {
            const settings = {
                ...DEFAULT_PRODUCER_SETTINGS,
                instrumentCount,
            };

            const result = isValidProducerSettings(settings);

            expect(result).toBe(false);
        }
    )

    it.each([0, 1001, 2.5])(
        'rejects updatesPerBatch = %s',
        (updatesPerBatch) => {
            const settings = {
                ...DEFAULT_PRODUCER_SETTINGS,
                updatesPerBatch,
            };

            const result = isValidProducerSettings(settings);

            expect(result).toBe(false);
        },
    );

    it.each([49, 2001, 100.5])(
        'rejects batchIntervalMs = %s',
        (batchIntervalMs) => {
            const settings = {
                ...DEFAULT_PRODUCER_SETTINGS,
                batchIntervalMs
            }

            const result = isValidProducerSettings(settings);

            expect(result).toBe(false);
        }
    );

    /**
     * Number.isInteger() already rejects NaN, Infinity, and -Infinity.
     * These tests explicitly verify that behavior as additional edge-case
     * coverage, even though the existing validation logic already handles
     * these values without requiring any changes.
     */
    it.each([NaN, Infinity, -Infinity])(
        'rejects special numeric value %s',
        (value) => {
            // ARRANGE & ACT & ASSERT

            expect(
                isValidProducerSettings({
                    ...DEFAULT_PRODUCER_SETTINGS,
                    instrumentCount: value,
                })
            ).toBe(false);

            expect(
                isValidProducerSettings({
                    ...DEFAULT_PRODUCER_SETTINGS,
                    updatesPerBatch: value,
                })
            ).toBe(false);

            expect(
                isValidProducerSettings({
                    ...DEFAULT_PRODUCER_SETTINGS,
                    batchIntervalMs: value,
                })
            ).toBe(false);
        },
    );

})