import "reflect-metadata";
import { __prod__, COOKIE_NAME } from "./constants";
// import { Room } from "./entites/Room";
import express from "express";
import { ApolloServer, PubSub } from "apollo-server-express";
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
import { GameResolver } from "./resolvers/game";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";
import { createServer } from "http";
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
      resolvers: [HelloResolver, RoomResolver, UserResolver, GameResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
    subscriptions: { keepAlive: 100000000000000 },
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  const server = createServer(app);

  server.listen(4000, async () => {
    console.log("Server running on port 4000");
    new SubscriptionServer(
      {
        execute,
        subscribe,
        schema: await buildSchema({
          resolvers: [HelloResolver, RoomResolver, UserResolver, GameResolver],
          validate: false,
        }),
      },
      {
        server,
        path: "/graphql",
      }
    );
  });
};

main().catch((err) => {
  console.error(err);
});
