export type Strategy = {
    name: string;
    description: string;
    details: string;
};

export type Trade = {
    id: number;
    description: string;
    marketId: string;
    stake: number;
    payout: number;
    isWin: boolean;
    entryDigit?: number;
    exitTick?: number;
    exitDigit?: number;
};
