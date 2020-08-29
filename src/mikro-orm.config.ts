import { __prod__ } from "./constants";
import { Room } from "./entites/Room";
import { Cards } from "./entites/Cards";
import { User } from "./entites/User";
import { MikroORM } from "@mikro-orm/core";
import path from "path";

export default {
  entitiesDirs: ["/home/nikhil/Documents/power_server/dist/entites"],
  entitiesDirsTs: ["/home/nikhil/Documents/power_server/src/entites"],
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Room, Cards, User],
  dbName: "power",
  user: "nikhil",
  password: "password",
  type: "postgresql",
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
