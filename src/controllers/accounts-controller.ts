import dayjs from "dayjs";
import { Request, Response } from "express";
import { Between } from "typeorm";
import { AppDataSource } from "../data-source";
import { Account, AccountType } from "../entity/Account";
import { Flow } from "../entity/Flow";
import { BalanceByDate } from "../entity/interfaces";
import { badRequest, getUserId, notFound } from "./controller-utils";
import { doSyncPlaidAccount } from './plaid-controller';

const accountRepository = AppDataSource.getRepository(Account);

export const getAccounts = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const accounts = await accountRepository.find({
        where: {
            ownerId: userId
        },
        relations: {
            inflows: {
                fromAccount: true
            },
            outflows: {
                toAccount: true
            }
        },
        order: {
            createdOn: 'ASC'
        }
    });

    res.send(accounts);
}

export const createAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    let accountData = { ...req.body, userId } as Account;

    const isCreated = req.body.id === undefined;
    const isPlaidAccount = req.body.plaidItem !== undefined;

    if (isCreated && isPlaidAccount) {
        accountData = await doSyncPlaidAccount(userId, accountData);
    }

    const newAccount = accountRepository.create(accountData as Account);
    const savedAccount = await accountRepository.save(newAccount);

    res.send(savedAccount);
}

export const syncAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const { id } = req.params;
    let  account = await accountRepository.findOneBy({ id, ownerId: userId });
    if (!account) { return notFound(res); }

    if (dayjs(account.updatedOn).diff(dayjs(), 'second') <= 5) {
        return res.status(304).send(account);
    }

    account = await accountRepository.save(account);

    res.send(await doSyncPlaidAccount(userId, account));
}

export const deleteAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }
    
    const { id } = req.params;

    const account = await accountRepository
        .createQueryBuilder('account')
        .addSelect('account.ownerId')
        .where('account.id = :accountId', { id })
        .andWhere('account.ownerId = :userId', { userId })
        .getOne();

    if (!account) { return notFound(res); }

    await accountRepository.remove(account);
    res.sendStatus(204);
}

export const getAccountById = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const { id } = req.params;
    const account = await accountRepository.findOne({
        where: { id, ownerId: userId },
        relations: {
            inflows: {
                fromAccount: true
            },
            outflows: {
                toAccount: true
            }
        }
    });
    res.send(account);
}

export const getBalances = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const startDate = dayjs();
    const endDate = dayjs(req.query['endDate'] as (string | undefined));

    const account = await accountRepository.findOne({
        where: {
            id: req.params['accountId'],
            ownerId: userId,
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
