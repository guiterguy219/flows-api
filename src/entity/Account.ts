import { AfterInsert, AfterLoad, AfterRemove, AfterUpdate, Column, Entity, OneToMany } from "typeorm";
import { Flow } from "./Flow";
import { UserResource } from "./UserResource";
import { getPublisher, getRedisClient } from "../clients/redis";
import { roundAmount, isDue } from "./entity-utils";

export enum AccountType {
    CHECKING = 'checking',
    VIRTUAL = 'virtual',
    SAVINGS = 'savings',
    CREDIT = 'credit',
    EXTERNAL = 'external',
}

@Entity()
export class Account extends UserResource {
    @Column({
        length: 50,
    })
    name: string;

    @Column({
        type: "enum",
        enum: AccountType,
        default: AccountType.EXTERNAL,
    })
    type: AccountType;

    @Column("bool", {
        default: false,
    })
    isPrincipal: boolean;
    
    @Column("float", { default: 0 })
    actualBalance: number;

    @Column("float", { nullable: true })
    goalBalance: number;

    @OneToMany(() => Flow, (flow) => flow.fromAccount)
    outflows: Flow[];

    @OneToMany(() => Flow, (flow) => flow.toAccount)
    inflows: Flow[];

    accruedBalance: number | null;
    plannedBalance: number | null;

    @AfterLoad()
    enrich = async (): Promise<Account> => {
        const redis = await getRedisClient();

        if (this.type === AccountType.VIRTUAL) {
            // ACTUAL BALANCE
            const ACTUAL_KEY = `account:${this.id}:actual-balance`;
            const actualBalanceVal = await redis.get(ACTUAL_KEY);
            if (actualBalanceVal !== null) {
                this.actualBalance = +actualBalanceVal;
            } else {
                this.actualBalance = roundAmount((this.inflows || [])
                    .filter((f) => isDue(f.dateDue))
                    .reduce((acc, f) => acc + f.amount, 0)
                    - (this.outflows || [])
                        .filter((f) => isDue(f.dateDue))
                        .reduce((acc, f) => acc + f.amount, 0));
                redis.set(ACTUAL_KEY, this.actualBalance);
            }

            // ACCRUED BALANCE
            const ACCRUED_KEY = `account:${this.id}:accrued-balance`;
            const accruedBalanceVal = await redis.get(ACCRUED_KEY);
            if (accruedBalanceVal !== null) {
                this.accruedBalance = +accruedBalanceVal;
            } else {
                this.accruedBalance = roundAmount((this.inflows || [])
                    .filter((f) => isDue(f.dateDue))
                    .reduce((acc, f) => acc + f.amount, 0));
                redis.set(ACCRUED_KEY, this.accruedBalance);
            }

            // PLANNED BALANCE
            const PLANNED_KEY = `account:${this.id}:planned-balance`;
            const plannedBalanceVal = await redis.get(PLANNED_KEY);
            if (plannedBalanceVal !== null) {
                this.plannedBalance = +plannedBalanceVal;
            } else {
                this.plannedBalance = roundAmount((this.inflows || [])
                    .reduce((acc, f) => acc + f.amount, 0));
                redis.set(PLANNED_KEY, this.plannedBalance);
            }
        } else {
            // EFFECTIVE/ACCRUED BALANCE OF REAL ACCOUNTS
            const ACCRUED_KEY = `account:${this.id}:accrued-balance`;
            const accruedBalanceVal = await redis.get(ACCRUED_KEY);
            if (accruedBalanceVal !== null) {
                this.accruedBalance = +accruedBalanceVal;
            } else {
                this.accruedBalance = roundAmount(this.actualBalance
                    + [
                        ...(this.inflows || []),
                        ...(this.outflows || []).map(f => ({...f, amount: -f.amount}))
                    ]
                        .filter((f) => isDue(f.dateDue) && !f.paid)
                        .reduce((acc, f) => acc + f.amount, 0))
                redis.set(ACCRUED_KEY, this.accruedBalance);
            }
        }

        return this;
    }

    invalidateCache = async () => {
        const redis = await getRedisClient();

        const accountCacheIterator = redis.scanIterator({
            MATCH: `account:${this.id}:*`,
        });
        const keysToDelete = [];
        for await (const key of accountCacheIterator) {
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
        
        await redis.publish(`${this.userId}:account:save`, this.id);
    }

    @AfterRemove()
    sendRemoveEvent = async () => {
        const redis = await getRedisClient();

        await this.invalidateCache();
        
        await redis.publish(`${this.userId}:account:delete`, this.id);
    }
}