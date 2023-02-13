import { Request, Response } from "express";
import { requiredScopes } from "express-oauth2-jwt-bearer";
import { createAccount, deleteAccount, getAccountById, getAccounts, getBalances } from "./controllers/accounts-controller";
import { createFlow, deleteFlow, getFlows, getFlowsForAccount, getInflowsForAccount, getOutlowsForAccount } from "./controllers/flows-controller";
import { createLinkToken, getPlaidAccounts, setAccessToken } from "./controllers/plaid-controller";

export interface Route {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    action: (req: Request, res: Response) => Promise<void>;
    middlewares: any[];
}

const checkRead = requiredScopes('read:accounts');
const checkWrite = requiredScopes('read:accounts');

const routes: Route[] = [
    {
        method: 'get',
        path: '/flows',
        action: getFlows,
        middlewares: [checkRead]
    },
    {
        method: 'post',
        path: '/flows',
        action: createFlow,
        middlewares: [checkWrite]
    },
    {
        method: 'delete',
        path: '/flows/:id',
        action: deleteFlow,
        middlewares: [checkWrite]
    },
    {
        method: 'get',
        path: '/accounts',
        action: getAccounts,
        middlewares: []
    },
    {
        method: 'post',
        path: '/accounts',
        action: createAccount,
        middlewares: [checkWrite]
    },
    {
        method: 'get',
        path: '/accounts/:accountId',
        action: getAccountById,
        middlewares: [checkRead]
    },
    {
        method: 'delete',
        path: '/accounts/:accountId',
        action: deleteAccount,
        middlewares: [checkWrite]
    },
    {
        method: 'get',
        path: '/accounts/:accountId/inflows',
        action: getInflowsForAccount,
        middlewares: [checkRead]
    },
    {
        method: 'get',
        path: '/accounts/:accountId/outflows',
        action: getOutlowsForAccount,
        middlewares: [checkRead]
    },
    {
        method: 'get',
        path: '/accounts/:accountId/flows',
        action: getFlowsForAccount,
        middlewares: [checkRead]
    },
    {
        method: 'get',
        path: '/accounts/:accountId/balances',
        action: getBalances,
        middlewares: [checkRead]
    },

    // --- PLAID ---
    {
        method: 'post',
        path: '/create-link-token',
        action: createLinkToken,
        middlewares: [checkWrite]
    },
    {
        method: 'post',
        path: '/set-access-token',
        action: setAccessToken,
        middlewares: [checkWrite]
    },
    {
        method: 'get',
        path: '/item/accounts',
        action: getPlaidAccounts,
        middlewares: [checkRead]
    }
]

export default routes;