
import express, { Request, Response } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import bodyParser from 'body-parser';
import cors from 'cors';
import "reflect-metadata";
import { AppDataSource } from './data-source';
import routes from './routes';
import { createServer } from 'http';
import { registerAccountHandler } from './io-handlers/account-handler';
import { registerFlowHandler } from './io-handlers/flow-handler';
import { getUserId } from './controllers/controller-utils';
import { Server, Socket } from 'socket.io';
import { getSubscriber } from './clients/redis';
import node_path from 'path';

let app: express.Application;
const port = 3030;

const corsOptions = {
  origin: [
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || []),
    'http://localhost:3000'
  ],
};

const initialize = () => {
  // server setup
  app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: corsOptions,
    path: node_path.join(process.env.BASE_PATH ?? '/', '/socket-io'),
  });

  // MIDDLEWARES
  app.use(cors<Request>(corsOptions)); // must be first
  app.use(auth());
  io.use((socket, next) => {
    (socket.request as any).is = (type: string) => socket.request.headers['content-type'] === type;
    socket.request.headers.authorization = 'Bearer ' + socket.handshake.auth.token;

    auth()(socket.request as Request, {} as Response, (e) => {
      next(e);
    });
  });

  routes.forEach(({ method, path, action, middlewares }) => {
    path = node_path.join(process.env.BASE_PATH ?? '/', path);

    return app[method](path, bodyParser.json(), ...middlewares, (req: Request, res: Response, next: Function) => {
      action(req, res).then(() => next).catch(err => next(err));
    })
  });

  io
    .on('connection', async (socket: Socket) => {
      const userId = getUserId(socket)!;
      socket.join(userId);
      
      registerAccountHandler(io, socket);
      registerFlowHandler(io, socket);

      socket.on('disconnect', () => {
        getSubscriber().then((sub) => {
          sub.unsubscribe();
        });
      });
    });
  
  httpServer.listen(port, () => {
    console.log(`flows-api listening on port ${port}`)
  })    
}

AppDataSource.initialize()
  .then(() => {
      initialize();
  })
  .catch((e) => console.error(e));
