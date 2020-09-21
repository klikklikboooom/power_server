import {
  Resolver,
  Arg,
  Field,
  Ctx,
  Query,
  Mutation,
  ObjectType,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entites/User";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateNewUserDetails } from "../utils/validateNewUserDetails";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
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
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Arg("retypePassword") retypePassword: string,
    @Ctx() { em, redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 8) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Password should contain at least 8 characters",
          },
        ],
      };
    }
    if (newPassword !== retypePassword) {
      return {
        errors: [
          {
            field: "retypePassword",
            message: "Both Passwords must match",
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token Expired",
          },
        ],
      };
    }
    const user = await em.findOne(User, { id: parseInt(userId) });

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    req.session.userId = user.id;
    user.password_hash = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    await redis.del(key);

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    console.log("Here");
    const user = await em.findOne(User, { email });
    if (!user) {
      return true;
    }
    const token = v4();

    redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24
    );
    sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">Reset password</a>`
    );
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    console.log(req.session);
    //no one is logged in
    if (!req.session!.userId) {
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
    const errors = validateNewUserDetails(options);

    if (errors) {
      return { errors };
    }

    const password_hash = await argon2.hash(options.password);
    let user;
    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          name: options.username,
          password_hash,
          email: options.email,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      user = result[0];
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
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { name: usernameOrEmail }
    );
    // await em.persistAndFlush(user);
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "That username doesn't exist",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password_hash, password);
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

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
