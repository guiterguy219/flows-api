import { getRedisClient, getSubscriber } from "../clients/redis";
import { getUserId } from "../controllers/controller-utils";
import { Server, Socket } from "socket.io";

const flowSocketEvents = [
    'save',
    'delete',
]

export const registerFlowHandler = async (io: Server, socket: Socket) => {
    const userId = getUserId(socket)!;

    const subscriber = await getSubscriber();

    flowSocketEvents.forEach((eventName) => {
        subscriber.subscribe(`${userId}:flow:${eventName}`, (message) => {
            io.to(userId).emit(`flow:${eventName}`, message);
        });
    });
}
