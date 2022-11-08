import { Request, Response } from "express";
import { Socket } from "socket.io";

export const getUserId = (req: Request | Socket) => {
    if (req instanceof Socket) {
        req = req.request as Request;
    }
    return (req as Request).auth?.payload.sub;
}

export const badRequest = (res: Response): void => {
    res.status(400).send('Bad request.');
}
