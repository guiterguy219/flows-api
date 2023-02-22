import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Account } from "./Account";
import { UserResource } from "./UserResource";

@Entity()
export class PlaidItem extends UserResource {
    @Column()
    accessToken: string;

    @Column()
    itemId: string;

    @OneToMany(() => Account, (account) => account.plaidItem)
    accounts: Account[];
}