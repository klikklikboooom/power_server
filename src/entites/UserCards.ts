import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
} from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { User } from "./User";
import { Cards } from "./Cards";

@ObjectType()
@Entity()
export class UserCards extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => Int)
  @Column()
  userId!: number;

  @Field(() => Int)
  @Column()
  cardId!: number;

  @Field(() => String)
  @Column()
  type!: string;

  @ManyToOne(() => User, (user) => user.userCards)
  user!: User;

  @ManyToOne(() => Cards, (cards) => cards.userCards)
  cards!: Cards;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt = new Date();
}
