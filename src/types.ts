import { Request, Response } from "express";
import { Redis } from "ioredis";
import { Field, ObjectType } from "type-graphql";

export type MyContext = {
  req: Request & { session: Express.Session };
  res: Response;
  redis: Redis;
};

@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}
