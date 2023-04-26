import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ShareContract } from "./ShareContract";

@Entity()
export class UserResource {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    ownerId: string;

    @ManyToMany(() => ShareContract, (contract) => contract.resources)
    @JoinTable()
    shareContracts: ShareContract[];

    @CreateDateColumn()
    createdOn: Date;

    @UpdateDateColumn()
    updatedOn: Date;
}