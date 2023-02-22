import { DataSource } from "typeorm";
import { Account } from "./entity/Account";
import { Flow } from "./entity/Flow";
import config from 'config';
import { PlaidItem } from "./entity/PlaidItem";

export const AppDataSource = new DataSource({
    ...config.get('database'),
    entities: [Flow, Account, PlaidItem],
    subscribers: [],
    migrations: [],
})