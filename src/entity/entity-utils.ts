import dayjs from 'dayjs';
import { Account } from './Account';
import { Flow } from './Flow';

export const isDue = (dateDue: string | Date): boolean => !dayjs(dateDue).isAfter(dayjs());

export const isInflow = (flow: Flow, account: Account): boolean => flow.toAccount?.id === account.id;

export const signAmount = (flow: Flow, account: Account): number => isInflow(flow, account) ? 1 : -1 * flow.amount;

export const roundAmount = (amount: number) => Math.round(amount * 100) / 100;
