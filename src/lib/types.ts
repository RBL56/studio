export type Strategy = {
    name: string;
    description: string;
    details: string;
};

export type Trade = {
    id: string;
    description: string;
    marketId: string;
    stake: number;
    payout: number;
    isWin: boolean;
    exitTick?: number;
    exitDigit?: number;
};
