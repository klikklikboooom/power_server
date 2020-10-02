import { UserCards } from "../entites/UserCards";
import { Pool } from "../entites/Pool";
export async function pushCardsIntoPool(
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
