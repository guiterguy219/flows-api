import dayjs from "dayjs";
import { Request, Response } from "express";
import { Between } from "typeorm";
import { AppDataSource } from "../data-source";
import { Account, AccountType } from "../entity/Account";
import { Flow } from "../entity/Flow";
import { BalanceByDate } from "../entity/interfaces";
import { badRequest, getUserId } from "./controller-utils";

const accountRepository = AppDataSource.getRepository(Account);

export const getAccounts = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const accounts = await accountRepository.find({
        where: {
            userId
        },
        relations: {
            inflows: true,
            outflows: true
        }
    });

    let error = false;
    await Promise.all(accounts.map((a) => a.enrich())).catch((e) => {
        console.error(e);
        error = true;
    });

    if (error) {
        res.status(500).send();
        return;
    }

    res.send(accounts);
}

export const createAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const newAccount = accountRepository.create({ ...req.body, userId } as Account);
    const savedAccount = await accountRepository.save(newAccount);
    await savedAccount.enrich();
    res.send(savedAccount);
}

export const getAccountById = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const accountId = req.params['accountId'];
    const account = await accountRepository.findOneBy({ id: accountId, userId });
    res.send(await account?.enrich());
}

export const getInflowsForAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const account = await accountRepository.findOne({
        where: {
            id: req.params['accountId'],
            userId
        },
        relations: {
            inflows: true,
        }
    });
    res.send(account?.inflows);
}

export const getOutlowsForAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const account = await accountRepository.findOne({
        where: {
            id: req.params['accountId'],
            userId
        },
        relations: {
            outflows: {
                toAccount: true,
                fromAccount: true,
            }
        }
    });

    res.send(account?.outflows);
}

export const getBalances = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const startDate = dayjs();
    const endDate = dayjs(req.query['endDate'] as (string | undefined));

    const account = await accountRepository.findOne({
        where: {
            id: req.params['accountId'],
            userId,
        },

    });

    if (!account) { return badRequest(res); }

    const inflows = await AppDataSource
        .getRepository(Flow).find({
            where:
            {
                toAccount: {
                    id: account.id,
                },
                dateDue: Between(startDate.toDate(), endDate.toDate()),
            }
        });
    const outflows = await AppDataSource
        .getRepository(Flow).find({
            where: [
                {
                    fromAccount: {
                        id: account.id,
                    },
                    dateDue: Between(startDate.toDate(), endDate.toDate()),
                },
                {
                    fromAccount: {
                        id: account.id,
                    },
                    toAccount: {
                        type: AccountType.VIRTUAL
                    }
                }
            ]
        });



    const balancesByDate: Map<string, BalanceByDate> = new Map();

    balancesByDate.set(startDate.format('YYYY-MM-DD'), {
        date: startDate.toDate(),
        balance: account.actualBalance,
        outflowsDue: [],
        inflowsDue: [],
    });

    [...inflows, ...outflows]
        .filter((flow) => !dayjs(flow.dateDue).isBefore(dayjs(startDate)))
        .forEach((flow) => {
            const d = dayjs(flow.dateDue).format('YYYY-MM-DD');
            balancesByDate.set(d, {
                date: dayjs(d).toDate(),
                balance: account.actualBalance,
                outflowsDue: [],
                inflowsDue: [],
            })
        });

    for (const [date, balanceData] of balancesByDate) {
        const accrualFilter = (f: Flow) => !dayjs(date).isBefore(dayjs(f.dateDue), 'day');
        const sameDayFilter = (f: Flow) => dayjs(date).isSame(dayjs(f.dateDue), 'day');
        const totalReducer = (t: number, f: Flow) => t += f.amount;
        const balance = account.actualBalance
            + inflows.filter(accrualFilter).reduce(totalReducer, 0)
            - outflows.filter(accrualFilter).reduce(totalReducer, 0);

        balanceData.balance = balance;
        balanceData.outflowsDue = outflows.filter(sameDayFilter);
        balanceData.inflowsDue = inflows.filter(sameDayFilter);
    }

    res.send(Object.fromEntries(balancesByDate));
}
