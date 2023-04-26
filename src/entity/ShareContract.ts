import { Column, CreateDateColumn, Entity, JoinColumn, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserResource } from "./UserResource";

@Entity()
export class ShareContract {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    ownerId: string;

    @Column()
    accessorId: string;

    @ManyToMany(() => UserResource, (resource) => resource.shareContracts)
    resources: UserResource[];

    @CreateDateColumn()
    createdOn: Date;

    @UpdateDateColumn()
    updatedOn: Date;
}