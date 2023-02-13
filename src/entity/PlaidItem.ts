import { Column, Entity } from "typeorm";
import { UserResource } from "./UserResource";

export enum AccountType {
    CHECKING = 'checking',
    VIRTUAL = 'virtual',
    SAVINGS = 'savings',
    CREDIT = 'credit',
    EXTERNAL = 'external',
}

@Entity()
export class PlaidItem extends UserResource {
    @Column()
    accessToken: string;

    @Column()
    itemId: string;
}