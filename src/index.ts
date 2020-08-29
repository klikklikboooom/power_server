import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
// import { Room } from "./entites/Room";
import microConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { RoomResolver } from "./resolvers/room";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  const app = express();
  app.listen(4000, () => {
    console.log("Server running on port 4000");
  });

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, RoomResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
  });

  apolloServer.applyMiddleware({ app });
};

main().catch((err) => {
  console.error(err);
});

//   //   const post = orm.em.create(Room, { name: "First Room" });
//   //   await orm.em.persistAndFlush(post);
//   const rooms = await orm.em.find(Room, {});
//   console.log(rooms);
