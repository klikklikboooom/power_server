"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const Room_1 = require("./entites/Room");
const path_1 = __importDefault(require("path"));
exports.default = {
    entitiesDirs: ["/home/nikhil/Documents/power_server/dist/entites"],
    entitiesDirsTs: ["/home/nikhil/Documents/power_server/src/entites"],
    migrations: {
        path: path_1.default.join(__dirname, "./migrations"),
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
    entities: [Room_1.Room],
    dbName: "power",
    user: "nikhil",
    password: "password",
    type: "postgresql",
    debug: !constants_1.__prod__,
};
//# sourceMappingURL=mikro-orm.config.js.map