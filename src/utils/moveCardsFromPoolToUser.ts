import { Pool } from "../entites/Pool";
import { UserCards } from "../entites/UserCards";

export const moveCardsFromPoolToUser = async (
  roomId: number,
  userId: number
) => {
  let userCards: UserCards[] = [];
  const pileOfCards = await Pool.find({ where: { roomId } });
  pileOfCards.forEach((cardFromPile) => {
    const userCard = new UserCards();
    userCard.cardId = cardFromPile.id;
    userCard.userId = userId;
    userCard.type = "hand";
    userCards.push(userCard);
  });

  Pool.remove(pileOfCards);

  await UserCards.save(userCards);
  return userCards;
};
