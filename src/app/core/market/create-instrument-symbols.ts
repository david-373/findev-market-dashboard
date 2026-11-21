export function createInstrumentSymbols(
    instrumentCount: number,
): readonly string[] {
    if (
        !Number.isInteger(instrumentCount) ||
        instrumentCount < 1 ||
        instrumentCount > 50
    ) {
        throw new RangeError(
            'Instrument count must be an integer between 1 and 50'
        );
    }

    return Array.from(
        { length: instrumentCount },
        (_, index) => `ASSET_${String(index + 1).padStart(3, '0')}`,
    );
}