import {
  Resolver,
  Mutation,
  Arg,
  Int,
  Ctx,
  Field,
  ObjectType,
  Subscription,
  Root,
  PubSub,
  PubSubEngine,
  Publisher,
} from "type-graphql";
import { UserCards } from "../entites/UserCards";
import { Cards } from "../entites/Cards";
import { Room } from "../entites/Room";
import { getConnection } from "typeorm";
import { MyContext } from "../types";
import { User } from "../entites/User";
import { Pool } from "../entites/Pool";

@ObjectType()
class PutCardsDownResponse {
  @Field(() => [UserCards])
  userCards?: UserCards[];

  @Field()
  status?: string;
}

@ObjectType()
class TurnSubscriptionPayload {
  @Field(() => [Pool])
  poolCards?: Pool[];

  @Field()
  roomId?: number;
}

@Resolver()
export class GameResolver {
  @Mutation(() => [UserCards])
  async startGame(
    @Arg("id", () => Int) id: number
  ): Promise<UserCards[] | string> {
    const cards = await getConnection()
      .getRepository(Cards)
      .createQueryBuilder("cards")
      .getMany();

    const userCards: UserCards[] = [];
    const room = await getConnection()
      .getRepository(Room)
      .findOne({ relations: ["users", "cards"], where: { id } });
    if (!room) {
      return "No room found";
    }
    room.cards = cards;
    Room.save(room);

    //Shuffle cards
    for (let i = 0; i < room.cards.length; i++) {
      let newPosition = Math.floor(Math.random() * room.cards.length);
      [room.cards[i], room.cards[newPosition]] = [
        room.cards[newPosition],
        room.cards[i],
      ];
    }

    //Deal face down cards
    for (let j = 0; j < room.users.length * 3; j++) {
      const userCard = new UserCards();
      const topCard = room.cards.pop();
      if (!topCard) {
        return "no more cards";
      }

      userCard.userId = room.users[j % room.users.length].id;
      userCard.cardId = topCard.id;
      userCard.type = "face down";
      userCards.push(userCard);
    }

    //Deal next 6 cards
    for (let j = 0; j < room.users.length * 6; j++) {
      const userCard = new UserCards();

      const topCard = room.cards.pop();
      if (!topCard) {
        return "no more cards";
      }
      userCard.userId = room.users[j % room.users.length].id;
      userCard.cardId = topCard.id;
      userCard.type = "hand";
      userCards.push(userCard);
    }

    //Update deck
    Room.save(room);

    //Update user's cards
    const savedUserCards = await UserCards.save(userCards);
    return savedUserCards;
  }

  @Mutation(() => PutCardsDownResponse)
  async putCardsDown(
    @Arg("roomId", () => Int) roomId: number,
    @Arg("cardIds", () => [Int]) cardIds: [number],
    @Ctx() { req }: MyContext
  ): Promise<PutCardsDownResponse | string> {
    // await getConnection().createQueryBuilder().update(UserCards).set{}
    if (cardIds.length < 3) {
      return "Insufficient Cards Provided";
    }
    const userId = req.session.userId;
    cardIds.forEach((cardId) => {
      UserCards.update({ userId, cardId: cardId }, { type: "face up" });
    });

    await User.update({ id: userId }, { playerStatus: "ready" });

    const room = await Room.findOne({
      relations: ["users"],
      where: { id: roomId },
    });

    if (!room) {
      return "No room found";
    }

    const userCards = await UserCards.find({
      where: { userId },
      relations: ["cards"],
    });

    const allPlayersReady = room?.users.every(
      (user) => user.playerStatus === "ready"
    );

    if (allPlayersReady) {
      room!.turn = 1;
      room!.status = "ready";
      Room.save(room);
      return { userCards, status: "ready" };
    }

    return { userCards, status: "waiting" };
  }

  @Mutation(() => [UserCards])
  async playCards(
    @Arg("roomId") roomId: number,
    @Arg("cardIds", () => [Int]) cardIds: [number],
    @Ctx() { req }: MyContext,
    @PubSub("NEW CARDS PLAYED") publish: Publisher<TurnSubscriptionPayload>
  ): Promise<UserCards[] | string> {
    const userId = req.session.userId;

    console.log("ci", cardIds);
    const poolCards = await pushCardsIntoPool(cardIds, roomId, userId);

    await Pool.save(poolCards);

    const userCardsInHand = await UserCards.find({
      where: { userId, type: "hand" },
    });

    const numOfUserCards = userCardsInHand.length;

    if (numOfUserCards < 3) {
      const numOfCardsToPickUp = 3 - numOfUserCards;
      const room = await Room.findOne({
        where: { id: roomId },
        relations: ["cards"],
      });

      const cardsToPickUp = room?.cards.splice(0, numOfCardsToPickUp);
      await Room.save(room!);

      const newUserCards: UserCards[] = [];
      await publish({ poolCards, roomId });

      cardsToPickUp?.forEach((card) => {
        const userCard = new UserCards();
        userCard.userId = userId;
        userCard.cardId = card.id;
        userCard.type = "hand";
        newUserCards.push(userCard);
      });

      await UserCards.save(newUserCards);
    }

    const userCards = await getConnection()
      .getRepository(UserCards)
      .createQueryBuilder("userCards")
      .where('"userId" = :userId ', { userId })
      .getMany();

    return userCards;
  }

  @Subscription(() => [UserCards], {
    topics: ["NEW CARDS PLAYED", "GAME STARTED", "CARDS PICKED UP"],
  })
  async newCardsPlayed(
    @Root() turnSubscriptionPayload: TurnSubscriptionPayload
  ): Promise<UserCards[] | string> {
    console.log("here");
    const { poolCards, roomId } = turnSubscriptionPayload;
    let userCards: UserCards[] = [];

    const room = await Room.findOne({
      where: { id: roomId },
      relations: ["users"],
    });

    const turn = room?.turn;

    const currUser = await User.findOne({
      where: { turn, roomId },
    });

    const currUserCards = await UserCards.find({
      where: { userId: currUser?.id },
    });

    if (!currUserCards!.length) {
      currUser!.turn = 0;
      User.save(currUser!);
    }

    if (room!.users.length === 1) {
      return "Game Over";
    }

    room!.turn = (turn! + 1) % room!.users.length;
    const nextUser = await User.findOne({
      where: { turn: (turn! + 1) % room!.users.length, roomId },
    });

    userCards = await UserCards.find({
      where: { userId: nextUser?.id, type: "hand" },
    });

    if (poolCards) {
      userCards.filter(async (userCard) => {
        const poolCardId = poolCards[0].cardId;
        const poolCard = await Cards.findOne(poolCardId);
        const poolCardRank = poolCard?.rank;
        const cardID = userCard.cardId;
        const card = await Cards.findOne(cardID);
        if (card!.rank >= poolCardRank!) {
          return true;
        }
        return false;
      });
    }

    return userCards;
  }
}

async function pushCardsIntoPool(
  cardIds: [number],
  roomId: number,
  userId: number
): Promise<Pool[]> {
  const poolCards: Pool[] = [];
  console.log("ci", cardIds);

  for (let i = 0; i < cardIds.length; i++) {
    const cardId = cardIds[i];
    const userCard = await UserCards.findOne({
      where: { cardId: cardId, userId },
    });

    UserCards.remove(userCard!);
    const poolCard = new Pool();
    poolCard.userId = userId;
    poolCard.roomId = roomId;
    poolCard.cardId = cardId;
    poolCards.push(poolCard);
  }

  return poolCards;
}
