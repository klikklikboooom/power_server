import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { Room } from "./Room";
import { UserCards } from "./UserCards";
import { Pool } from "./Pool";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ unique: true })
  name!: string;

  @Field(() => String)
  @Column({ unique: true })
  email!: string;

  @Column()
  password_hash!: string;

  @Field()
  @Column({ nullable: true })
  roomId: number;

  @Field(() => Room)
  @ManyToOne(() => Room, (room) => room.users)
  room: Room;

  @Field()
  @Column({ nullable: true })
  turn: number;

  @Field()
  @Column({ nullable: true })
  playerStatus: string;

  @OneToMany(() => UserCards, (userCards) => userCards.user)
  userCards: UserCards[];

  @OneToMany(() => Pool, (pool) => pool.user)
  pool: Pool[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt = new Date();
}
