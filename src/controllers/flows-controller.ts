import dayjs from "dayjs";
import { Request, Response } from "express";
import { MoreThan } from "typeorm";
import { getRedisClient } from "../clients/redis";
import { AppDataSource } from "../data-source";
import { Flow } from "../entity/Flow";
import { badRequest, getFirstQParam, getUserId, notFound } from "./controller-utils";

const flowsRepository = AppDataSource.getRepository(Flow);

export const getFlows = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const flows = await flowsRepository.find({
        where: { userId },
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

    const newFlow = flowsRepository.create({...req.body, userId} as Flow);
    const savedFlow = await flowsRepository.save(newFlow);

    res.send(savedFlow);
}

export const deleteFlow = async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { id } = req.params;
    if (!id || !userId ) { return badRequest(res); }

    const flow = await flowsRepository
        .createQueryBuilder('flow')
        .addSelect('flow.userId')
        .leftJoinAndSelect('flow.fromAccount', 'fromAccount')
        .leftJoinAndSelect('flow.toAccount', 'toAccount')
        .where('flow.id = :id', { id })
        .andWhere('flow.userId = :userId', { userId })
        .getOne();

    if (!flow) { return notFound(res); }

    await flowsRepository.remove(flow);
    res.sendStatus(204);
}

export const getInflowsForAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }

    const inflows = await flowsRepository.find({
        where: {
            toAccount: {
                id: req.params['accountId'],
            },
            userId,
            // dateDue: MoreThan(dayjs(getFirstQParam(req, 'startDate')).subtract(1, "days").toDate()),
        },
        relations: {
            toAccount: true,
            fromAccount: true,
        }
    });
    res.send(inflows);
}

export const getOutlowsForAccount = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { return badRequest(res); }   

    const outflows = await flowsRepository.find({
        where: {
            fromAccount: {
                id: req.params['accountId'],
            },
            userId,
            // dateDue: MoreThan(dayjs(getFirstQParam(req, 'startDate')).subtract(1, "days").toDate()),
        },
        relations: {
            toAccount: true,
            fromAccount: true,
        }
    });

    res.send(outflows);
}