import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BaseEntity,
  OneToMany,
} from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { UserCards } from "./UserCards";
import { Pool } from "./Pool";

@ObjectType()
@Entity()
export class Cards extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: "text" })
  value!: string;

  @Field(() => String)
  @Column({ type: "text" })
  suit!: string;

  @Field(() => Int)
  @Column({ type: "int" })
  rank!: number;

  @OneToMany(() => UserCards, (userCards) => userCards.cards)
  userCards!: UserCards[];

  @OneToMany(() => Pool, (pool) => pool.user)
  pool: Pool[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt = new Date();
}
