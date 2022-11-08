import { Flow } from "./Flow";

export interface BalanceByDate {
    date: Date,
    balance: number,
    outflowsDue: Flow[],
    inflowsDue: Flow[],
}