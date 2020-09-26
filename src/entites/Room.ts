import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BaseEntity,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { User } from "./User";
import { Cards } from "./Cards";
import { Pool } from "./Pool";

@ObjectType()
@Entity()
export class Room extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name!: string;

  @Field(() => String)
  @Column({ unique: true })
  code!: string;

  @Field(() => String)
  @Column({ default: "waiting" })
  status!: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: "int", nullable: true })
  turn!: number;

  @OneToMany(() => User, (user) => user.room)
  users: User[];

  @ManyToMany(() => Cards)
  @JoinTable()
  cards: Cards[];

  @OneToMany(() => Pool, (pool) => pool.room)
  pool: Pool[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt = new Date();
}
