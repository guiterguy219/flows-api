import { Request } from "express";
import { getRedisClient, getSubscriber } from "../clients/redis";
import { getUserId } from "../controllers/controller-utils";
import { WebSocket } from "ws";
import { RedisClientType } from "@redis/client";
import { Server, Socket } from "socket.io";

const accountSocketEvents = [
    'save',
]

export const registerAccountHandler = async (io: Server, socket: Socket) => {
    const userId = getUserId(socket)!;

    const subscriber = await getSubscriber();

    accountSocketEvents.forEach((eventName) =>
        subscriber.subscribe(`${userId}:account:${eventName}`, (message) => {
            io.to(userId).emit(`account:${eventName}`, message);
        })
    );
}
