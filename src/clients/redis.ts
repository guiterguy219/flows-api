import { RedisClientType } from "@redis/client";
import { createClient } from "redis";

let client: RedisClientType;
let subscriber: RedisClientType;

export const getRedisClient = async (): Promise<RedisClientType> => {
    if (!client) {
        client = createClient();
        await client.connect();
    }
    return client;
}

export const getPublisher = getRedisClient;
export const getSubscriber = async (): Promise<RedisClientType> => {
    if (!subscriber) {
        subscriber = (await getRedisClient()).duplicate();
        await subscriber.connect();
    }
    return subscriber;
}
