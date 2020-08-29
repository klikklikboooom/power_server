import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity()
export class Room {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => Date)
  @Property({ type: "date", default: "now" })
  createdAt = new Date();

  @Field(() => Date)
  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field(() => String)
  @Property({ type: "text" })
  name!: string;

  @Field(() => String)
  @Property({ type: "text" })
  code!: string;

  @Field(() => String)
  @Property({ type: "text" })
  status!: string;

  @Field(() => Int)
  turn!: number;
}
