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
import { Room } from "./Room";

@ObjectType()
@Entity()
export class Pool extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => Int)
  @Column()
  userId!: number;

  @Field(() => Int)
  @Column()
  cardId!: number;

  @Field(() => Int)
  @Column()
  roomId!: number;

  @ManyToOne(() => User, (user) => user.pool)
  user!: User;

  @ManyToOne(() => Cards, (cards) => cards.pool)
  cards!: Cards;

  @ManyToOne(() => Room, (room) => room.pool)
  room!: Room;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt = new Date();
}
