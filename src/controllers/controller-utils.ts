import { Request, Response } from "express";
import { Socket } from "socket.io";

export const getUserId = (req: Request | Socket) => {
    if (req instanceof Socket) {
        req = req.request as Request;
    }
    return (req as Request).auth?.payload.sub;
}

export const badRequest = (res: Response): void => {
    res.sendStatus(400);
}

export const notFound = (res: Response): void => {
    res.sendStatus(404);
}

export const getFirstQParam = (req: Request, key: string): string | undefined => {
    const val = req.query[key];
    if (val instanceof Array && val.length > 0) {
        return val[0].toString();
    }
    return val?.toString();
}

export const asArray = (val: any): any[] => {
    if (val instanceof Array) {
        return val;
    }
    return [val];
}
