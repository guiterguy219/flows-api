import { DataSource } from "typeorm";
import { Account } from "./entity/Account";
import { Flow } from "./entity/Flow";
import config from 'config';
import { PlaidItem } from "./entity/PlaidItem";
import { ShareContract } from "./entity/ShareContract";
import { UserResource } from "./entity/UserResource";

export const AppDataSource = new DataSource({
    ...config.get('database'),
    entities: [Flow, Account, PlaidItem, ShareContract, UserResource],
    subscribers: [],
    migrations: [],
})