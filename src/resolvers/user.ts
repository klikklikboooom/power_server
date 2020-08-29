import {
  Resolver,
  Arg,
  InputType,
  Field,
  Ctx,
  Query,
  Mutation,
  ObjectType,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entites/User";
import argon2 from "argon2";

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    //no one is logged in
    if (req.session!.userId) {
      return null;
    }
    const user = await em.findOne(User, { id: req.session!.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length < 6) {
      return {
        errors: [
          {
            field: "username",
            message: "Username should contain at least 6 characters",
          },
        ],
      };
    }

    if (options.password.length < 8) {
      return {
        errors: [
          {
            field: "password",
            message: "Password should contain at least 8 characters",
          },
        ],
      };
    }
    const password_hash = await argon2.hash(options.password);
    const user = em.create(User, { name: options.username, password_hash });
    try {
      await em.persistAndFlush(user);
    } catch (err) {
      console.log(err.message);
      if (err.code === "23505" || err.detail.includes("already exists")) {
        return {
          errors: [
            {
              field: "username",
              message: "Username taken",
            },
          ],
        };
      }
    }

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { name: options.username });
    // await em.persistAndFlush(user);
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "That username doesn't exist",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password_hash, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "Incorrect Password",
          },
        ],
      };
    }

    req.session!.userId = user.id;
    return { user };
  }
}
