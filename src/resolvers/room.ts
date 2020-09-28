import {
  Resolver,
  Query,
  Int,
  Arg,
  Mutation,
  Ctx,
  UseMiddleware,
  ObjectType,
  Field,
} from "type-graphql";
import { Room } from "../entites/Room";
import { User } from "../entites/User";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { FieldError } from "../types";

@ObjectType()
class RoomResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Room, { nullable: true })
  room?: Room;
}

@Resolver()
export class RoomResolver {
  @Query(() => [Room])
  rooms(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Int, { nullable: true }) cursor: number | null
  ): Promise<Room[]> {
    const realLimit = Math.min(50, limit);
    const qb = getConnection()
      .getRepository(Room)
      .createQueryBuilder("room")
      .orderBy('"createdAt"', "DESC")
      .take(realLimit);
    if (cursor) {
      qb.where("id < :cursor", { cursor });
    }
    return qb.getMany();
  }

  @Query(() => Room, { nullable: true })
  room(@Arg("id", () => Int) id: number): Promise<Room | undefined> {
    return Room.findOne(id);
  }

  @Mutation(() => Room)
  @UseMiddleware(isAuth)
  async createRoom(
    @Arg("name", () => String) name: string,
    @Ctx() { req }: MyContext
  ): Promise<Room> {
    let code = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    if (name === "") {
      const user = await User.findOne(req.session.userId);
      name = user?.name + "'s game";
    }
    const room = Room.create({ name, code }).save();
    (await room).name = name;
    console.log(await room);
    User.update(
      { id: req.session.userId },
      { roomId: (await room).id, turn: 1, playerStatus: "waiting" }
    );
    return room;
  }

  @Mutation(() => RoomResponse)
  async updateRoom(
    @Arg("id", () => Int, { nullable: true }) id: number,
    @Arg("name", () => String, { nullable: true }) name: string,
    @Arg("newJoinee", () => Boolean, { nullable: true }) newJoinee: boolean,
    @Arg("code", () => String, { nullable: true }) code: string,
    @Ctx() { req }: MyContext
  ): Promise<RoomResponse> {
    console.log(typeof id, id);
    if (id !== -1) {
      console.log("1");
      const room = await Room.findOne(id);
      room!.name = name;
      await Room.update({ id }, { name });
    }

    const room = await getConnection()
      .getRepository(Room)
      .findOne({ relations: ["users"], where: { code } });
    console.log(code);
    if (!room) {
      return {
        errors: [
          {
            field: "code",
            message: "Invalid Code",
          },
        ],
      };
    } else if (newJoinee) {
      console.log("Maybe");
      if (room.users.length < 4) {
        await User.update(
          { id: req.session.userId },
          {
            roomId: room.id,
            turn: room.users.length + 1,
            playerStatus: "waiting",
          }
        );
      } else {
        return {
          errors: [
            {
              field: "code",
              message: "Room is already full",
            },
          ],
        };
      }
    }
    console.log("meh");
    return { room };
  }

  @Mutation(() => Boolean)
  async deleteRoomById(@Arg("id", () => Int) id: number): Promise<boolean> {
    try {
      await Room.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  @Mutation(() => Boolean)
  async leaveRoom(@Ctx() { req }: MyContext): Promise<boolean> {
    try {
      await User.update({ id: req.session.userId }, { roomId: undefined });
      return true;
    } catch {
      return false;
    }
  }
}
