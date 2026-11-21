export type MarketMetrics = Readonly<{
    instrument: string;

    lastPriceCents: number | null;
    spreadCents: number | null;

    volume: number;
    vwapCents: number | null;

    imbalance: number | null;
}>;