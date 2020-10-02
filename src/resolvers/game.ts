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
  Publisher,
  PubSub,
} from "type-graphql";

import { UserCards } from "../entites/UserCards";
import { Cards } from "../entites/Cards";
import { Room } from "../entites/Room";
import { getConnection } from "typeorm";
import { MyContext } from "../types";
import { User } from "../entites/User";
import { Pool } from "../entites/Pool";
import { fetchPlayableRank } from "../utils/fetchPlayableRank";
import { pushCardsIntoPool } from "../utils/pushCardsIntoPool";
import { moveCardsFromPoolToUser } from "../utils/moveCardsFromPoolToUser";

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

@ObjectType()
class UserCardsPoolResponse {
  @Field(() => [UserCards])
  userCards?: UserCards[];

  @Field(() => [Pool])
  pool?: Pool[];

  @Field(() => [Cards])
  roomCards: Cards[];
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
    @Ctx() { req }: MyContext,
    @PubSub("CARDS PUT DOWN") cardsPutDown: Publisher<TurnSubscriptionPayload>,
    @PubSub("FACE UP CARDS PUT DOWN") faceUpCardsPutDown: Publisher<UserCards[]>
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

    let faceUpUserCards = [];
    for (let k = 0; k < userCards.length; k++) {
      if (userCards[k].type === "face up") {
        faceUpUserCards.push(userCards[k]);
      }
    }

    await faceUpCardsPutDown(faceUpUserCards);
    if (allPlayersReady) {
      room!.turn = 1;
      room!.status = "ready";
      Room.save(room);
      cardsPutDown({ poolCards: [], roomId });
      return { userCards, status: "ready" };
    }

    return { userCards, status: "waiting" };
  }

  @Mutation(() => [UserCards])
  async playCards(
    @Arg("roomId") roomId: number,
    @Arg("cardIds", () => [Int]) cardIds: [number],
    @Ctx() { req }: MyContext,
    @PubSub("NEW CARDS PLAYED")
    newCardsPlayed: Publisher<TurnSubscriptionPayload>,
    @PubSub("FACE UP CARD PLAYED") faceUpCardPlayed: Publisher<UserCards[]>
  ): Promise<UserCards[] | string> {
    const userId = req.session.userId;

    console.log("ci", cardIds);

    const poolCards = await pushCardsIntoPool(cardIds, roomId, userId);

    await Pool.save(poolCards);

    const userCardsInHand = await UserCards.find({
      where: { userId, type: "hand" },
    });

    const numOfUserCards = userCardsInHand.length;
    const room = await Room.findOne({
      where: { id: roomId },
      relations: ["cards", "users"],
    });

    if (numOfUserCards < 3) {
      const numOfCardsToPickUp = 3 - numOfUserCards;

      const cardsToPickUp = room?.cards.splice(0, numOfCardsToPickUp);
      await Room.save(room!);

      const newUserCards: UserCards[] = [];

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

    if (!userCards.length) {
      const currUser = await User.findOne(userId);
      currUser!.turn = 0;
      await User.save(currUser!);
      return "You're done.";
    }

    await newCardsPlayed({ poolCards, roomId });
    const cards = await UserCards.find({ where: { cardId: cardIds } });
    let faceUpCards = [];
    for (let j = 0; j < cards.length; j++) {
      if (cards[j].type === "face up") {
        faceUpCards.push(cards[j]);
      }
    }

    if (faceUpCards.length) {
      faceUpCardPlayed(faceUpCards);
    }

    return userCards;
  }

  @Subscription(() => UserCardsPoolResponse, {
    topics: ["NEW CARDS PLAYED", "GAME STARTED", "CARDS PUT DOWN"],
  })
  async newCardsPlayed(
    @Root() turnSubscriptionPayload: TurnSubscriptionPayload
  ): Promise<UserCardsPoolResponse | string> {
    let playableRank;
    const { poolCards, roomId } = turnSubscriptionPayload;
    let userCards: UserCards[] = [];

    const room = await Room.findOne({
      where: { id: roomId },
      relations: ["users", "cards"],
    });

    if (room!.users.length === 1) {
      return "Game Over";
    }

    let turn = room!.turn;

    if (turn === null || !turn) turn = 0;

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

    room!.turn = (turn! + 1) % room!.users.length;
    const nextUser = await User.findOne({
      where: { turn: (turn! + 1) % room!.users.length, roomId },
    });

    userCards = await UserCards.find({
      where: { userId: nextUser?.id, type: "hand" },
    });

    if (poolCards && userCards.length) {
      userCards.filter(async (userCard) => {
        playableRank = fetchPlayableRank(roomId!);

        const cardID = userCard.cardId;
        const card = await Cards.findOne(cardID);
        if (card!.rank in playableRank) {
          return true;
        }
        return false;
      });
    } else if (userCards.length === 0 && poolCards) {
      userCards = await UserCards.find({
        where: { userId: nextUser?.id, type: "face up" },
      });
      if (!userCards.length) {
        return "Pick up a face down card";
      }

      userCards.filter(async (userCard) => {
        const cardID = userCard.cardId;
        const card = await Cards.findOne(cardID);
        playableRank = fetchPlayableRank(roomId!);
        if (card!.rank in playableRank) {
          return true;
        }
        return false;
      });
    } else if (userCards.length === 0 && !poolCards) {
      userCards = await UserCards.find({
        where: { userId: nextUser?.id, type: "face up" },
      });
      if (!userCards.length) {
        return "Pick up a face down card";
      }
    }

    const pileOfCards = await Pool.find({ where: { roomId } });

    console.log({ userCards, pool: pileOfCards });
    return { userCards, pool: pileOfCards, roomCards: room!.cards };
  }

  @Mutation(() => [UserCards])
  async playFaceDownCards(
    @Arg("roomId") roomId: number,
    @Arg("cardId", () => Int) cardId: number,
    @Ctx() { req }: MyContext,
    @PubSub("NEW CARDS PLAYED")
    newCardsPlayed: Publisher<TurnSubscriptionPayload>,
    @PubSub("FACE DOWN CARD PLAYED") faceDownCardPlayed: Publisher<UserCards[]>
  ): Promise<UserCards[] | string> {
    const playableRank = await fetchPlayableRank(roomId);
    const card = await Cards.findOne(cardId);
    const userId = req.session.userId;
    const faceDownCards = [];
    if (playableRank.indexOf(card!.rank) > -1) {
      const poolCards = await pushCardsIntoPool([cardId], roomId, userId);
      Pool.save(poolCards);
      const userCards = await UserCards.find({ where: { userId } });

      for (let l = 0; l < userCards.length; l++) {
        if (userCards[l].type === "face down") {
          faceDownCards.push(userCards[l]);
        }
      }
      faceDownCardPlayed(faceDownCards);
      newCardsPlayed({ poolCards, roomId });
      return userCards;
    }

    const userCards = await moveCardsFromPoolToUser(roomId, userId);
    for (let l = 0; l < userCards.length; l++) {
      if (userCards[l].type === "face down") {
        faceDownCards.push(userCards[l]);
      }
    }
    faceDownCardPlayed(faceDownCards);
    newCardsPlayed({ poolCards: [], roomId });
    return userCards;
  }

  @Mutation(() => [UserCards])
  async pickUpFromPile(
    @Arg("roomId", () => Int) roomId: number,
    @Ctx() { req }: MyContext,
    @PubSub("CARDS PICKED UP")
    cardsPickedUp: Publisher<TurnSubscriptionPayload>
  ): Promise<UserCards[] | string> {
    const userId = req.session.userId;
    const userCards = await moveCardsFromPoolToUser(roomId, userId);
    await cardsPickedUp({ poolCards: [], roomId });
    return userCards;
  }

  @Subscription(() => [UserCards], {
    topics: [
      "FACE DOWN CARD PLAYED",
      "FACE UP CARD PLAYED",
      "FACE UP CARDS PUT DOWN",
    ],
  })
  async updateUserCardsDown(@Root() DownUserUserCards: [UserCards]) {
    return DownUserUserCards;
  }
}
