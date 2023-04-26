import { AfterInsert, AfterRemove, AfterUpdate, BeforeRemove, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { getRedisClient } from "../clients/redis";
import { Account } from "./Account";
import { UserResource } from "./UserResource";

@Entity()
export class Flow extends UserResource {
    @Column({
        length: 100,
    })
    description: string;

    @Column('float', {default: 0})
    amount: number;

    @Column({
        default: false,
    })
    paid: boolean;

    @Column({
        default: false,
    })
    scheduled: boolean;

    @ManyToOne(() => Account, (account) => account.outflows, {
        cascade: true,
    })
    @JoinColumn()
    fromAccount: Account;

    @ManyToOne(() => Account, (account) => account.inflows, {
        cascade: true,
    })
    @JoinColumn()
    toAccount: Account;

    @Column('date', { default: new Date() })
    dateDue: Date;

    @Column('date', { nullable: true })
    dateCancelled: Date;

    @ManyToOne(() => Flow, (flow) => flow.payments)
    parentFlow: Flow;
    
    @OneToMany(() => Flow, (flow) => flow.parentFlow)
    payments: Flow[];

    invalidateCache = async () => {
        const redis = await getRedisClient();

        if (!this.toAccount || !this.fromAccount) {
            return;
        }

        const inflowKeysIterator = redis.scanIterator({
            MATCH: `account:${this.toAccount.id || this.toAccount}:*`,
        });
        const outflowKeysIterator = redis.scanIterator({
            MATCH: `account:${this.fromAccount.id || this.fromAccount}:*`
        });
        const keysToDelete = [];
        for await (const key of inflowKeysIterator) {
            keysToDelete.push(key);
        }
        for await (const key of outflowKeysIterator) {
            keysToDelete.push(key);
        }

        if (keysToDelete.length > 0) {
            await redis.del(keysToDelete);
        }
    }

    @AfterInsert()
    @AfterUpdate()
    sendEvent = async () => {
        const redis = await getRedisClient();

        await this.invalidateCache();
        
        await redis.publish(`${this.ownerId}:flow:save`, this.id);
        // for (const contract of this.shareContracts) {
        //     await redis.publish(`${contract.accessorId}:flow:save`, this.id);
        // }
    }

    @BeforeRemove()
    sendDeleteEvent = async () => {
        const redis = await getRedisClient();

        await this.invalidateCache();

        await redis.publish(`${this.ownerId}:flow:delete`, this.id);
        // for (const contract of this.shareContracts) {
        //     await redis.publish(`${contract.accessorId}:flow:delete`, this.id);
        // }
    }
}