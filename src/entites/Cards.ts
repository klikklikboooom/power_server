import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity()
export class Cards {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({ type: "date" })
  createdAt = new Date();

  @Field(() => Date)
  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field(() => String)
  @Property({ type: "text" })
  value!: string;

  @Field(() => String)
  @Property({ type: "text" })
  suit!: string;

  @Field(() => String)
  @Property({ type: "int" })
  rank!: number;
}
