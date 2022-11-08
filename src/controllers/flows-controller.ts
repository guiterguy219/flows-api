import { Request, Response } from "express";
import { getRedisClient } from "../clients/redis";
import { AppDataSource } from "../data-source";
import { Flow } from "../entity/Flow";
import { badRequest, getUserId } from "./controller-utils";

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