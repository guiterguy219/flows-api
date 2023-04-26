import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Flow } from "../entity/Flow";
import { asArray, badRequest, getUserId, notFound } from "./controller-utils";

const flowsRepository = AppDataSource.getRepository(Flow);

export const getFlows = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const flows = await flowsRepository.find({
        where: { ownerId: userId },
        relations: {
            fromAccount: true,
            toAccount: true,
        }
    });
    res.send(flows);
}

export const createFlow = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const newFlow = flowsRepository.create({...req.body, ownerId: userId} as Flow);
    const savedFlow = await flowsRepository.save(newFlow);

    res.send(savedFlow);
}

export const deleteFlow = async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { id } = req.params;
    if (!id || !userId ) { return badRequest(res); }

    const flow = await flowsRepository
        .createQueryBuilder('flow')
        .addSelect('flow.ownerId')
        .leftJoinAndSelect('flow.fromAccount', 'fromAccount')
        .leftJoinAndSelect('flow.toAccount', 'toAccount')
        .where('flow.id = :id', { id })
        .andWhere('flow.ownerId = :userId', { userId })
        .getOne();

    if (!flow) { return notFound(res); }

    await flowsRepository.remove(flow);
    res.sendStatus(204);
}

export const getInflowsForAccount = async (req: Request, res: Response) => {
    return doGetFlowsForAccount(req, res, true, false);
}

export const getOutlowsForAccount = async (req: Request, res: Response) => {
    return doGetFlowsForAccount(req, res, false, true);
}

export const getFlowsForAccount = async (req: Request, res: Response) => {
    return doGetFlowsForAccount(req, res, true, true);
}

const doGetFlowsForAccount = async (req: Request, res: Response, inflows = true, outflows = true) => {
    const userId = getUserId(req);
    const accountId = req.params.accountId;
    if (!userId || !accountId) { return badRequest(res); }
    
    const sorts: Record<string, string> = (asArray(req.query.sort) || []).reduce((acc, sort) => {
        const [field, direction] = sort.split(':');
        return {
            ...acc,
            [field]: direction,
        };
    }, {});

    const whereBase = {
        ownerId: userId,
        // dateDue: MoreThan(dayjs(getFirstQParam(req, 'startDate')).subtract(1, "days").toDate()),
    }

    const whereClause = []

    if (inflows) {
        whereClause.push({
            ...whereBase,
            toAccount: {
                id: accountId,
            },
        })
    }

    if (outflows) {
        whereClause.push({
            ...whereBase,
            fromAccount: {
                id: accountId,
            },
        })
    }

    const flows = await flowsRepository.find({
        where: whereClause,
        relations: {
            toAccount: true,
            fromAccount: true,
        },
        order: sorts,
    });

    res.send(flows);
}