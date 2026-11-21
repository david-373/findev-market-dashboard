import { describe, expect, it } from 'vitest';

import { createInstrumentSymbols } from './create-instrument-symbols';

describe('createInstrumentSymbols', () => {
    it.each([
        { count: 1, lastSymbol: 'ASSET_001' },
        { count: 5, lastSymbol: 'ASSET_005' },
        { count: 20, lastSymbol: 'ASSET_020' },
        { count: 50, lastSymbol: 'ASSET_050' },
    ])(
        'creates $count unique instrument symbols',
        ({ count, lastSymbol }) => {
            // ARRANGE & ACT
            const symbols = createInstrumentSymbols(count);

            // ASSERT
            expect(symbols).toHaveLength(count);

            expect(new Set(symbols).size).toBe(count);

            expect(symbols[0]).toBe('ASSET_001');

            expect(symbols.at(-1)).toBe(lastSymbol);
        },
    );

    it.each([0, 51, 2.5, NaN, Infinity, -Infinity])(
        'throws RangeError for instrumentCount = %s',
        (instrumentCount) => {
            // Arrange & Act & Assert
            expect(() => createInstrumentSymbols(instrumentCount))
                .toThrow(RangeError);
        },
    );
});