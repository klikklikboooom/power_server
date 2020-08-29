import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity()
export class Cards {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => Date)
  @Property({ type: "date", default: "now" })
  createdAt = new Date();

  @Field(() => Date)
  @Property({ type: "date", default: "now", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field(() => String)
  @Property({ type: "text" })
  value!: string;

  @Field(() => String)
  @Property({ type: "text" })
  suit!: string;

  @Field(() => Int)
  @Property()
  rank!: number;
}
