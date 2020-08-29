import { Resolver, Query, Ctx, Int, Arg, Mutation } from "type-graphql";
import { Room } from "../entites/Room";
import { MyContext } from "src/types";
import { title } from "process";

@Resolver()
export class RoomResolver {
  @Query(() => [Room])
  rooms(@Ctx() { em }: MyContext): Promise<Room[]> {
    return em.find(Room, {});
  }

  @Query(() => Room, { nullable: true })
  room(
    @Arg("id", () => Int) id: number,
    @Ctx() { em }: MyContext
  ): Promise<Room | null> {
    return em.findOne(Room, { id });
  }

  @Mutation(() => Room)
  async createRoom(
    @Arg("name", () => String) name: string,
    @Ctx() { em }: MyContext
  ): Promise<Room> {
    const room = em.create(Room, { name });
    await em.persistAndFlush(room);
    return room;
  }

  @Mutation(() => Room, { nullable: true })
  async updateRoom(
    @Arg("id", () => Int) id: number,
    @Arg("name", () => String) name: string,
    @Ctx() { em }: MyContext
  ): Promise<Room | null> {
    const room = await em.findOne(Room, { id });
    if (!room) {
      return null;
    }

    if (typeof title !== undefined) {
      room.name = name;
      await em.persistAndFlush(room);
    }
    return room;
  }

  @Mutation(() => Boolean)
  async deleteRoomById(
    @Arg("id", () => Int) id: number,
    @Ctx() { em }: MyContext
  ): Promise<boolean> {
    try {
      await em.nativeDelete(Room, { id });
      return true;
    } catch {
      return false;
    }
  }
}
