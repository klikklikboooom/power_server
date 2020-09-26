import "reflect-metadata";
import { __prod__, COOKIE_NAME } from "./constants";
// import { Room } from "./entites/Room";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { RoomResolver } from "./resolvers/room";
import { UserResolver } from "./resolvers/user";
import cors from "cors";
import { createConnection } from "typeorm";

import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { Cards } from "./entites/Cards";
import { Room } from "./entites/Room";
import { User } from "./entites/User";
import path from "path";
import { UserCards } from "./entites/UserCards";
import { Pool } from "./entites/Pool";

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    database: "power",
    username: "nikhil",
    password: "password",
    logging: true,
    synchronize: true,
    entities: [Cards, Room, User, UserCards, Pool],
    migrations: [path.join(__dirname, "./migrations/*")],
    cli: {
      migrationsDir: path.join(__dirname, "./migrations"),
    },
  });

  await connection.runMigrations();
  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 5, //5 years
        httpOnly: true,
        sameSite: "lax",
        secure: !__prod__, //cookie only works in http
      },
      saveUninitialized: false,
      secret: "sdsfasdkgfljsgjfslgf",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    playground: {
      settings: {
        "request.credentials": "include",
      },
    },
    schema: await buildSchema({
      resolvers: [HelloResolver, RoomResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log("Server running on port 4000");
  });
};

main().catch((err) => {
  console.error(err);
});

//   //   const post = orm.em.create(Room, { name: "First Room" });
//   //   await orm.em.persistAndFlush(post);
//   const rooms = await orm.em.find(Room, {});
//   console.log(rooms);
