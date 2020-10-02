import { getConnection } from "typeorm";
import { Pool } from "../entites/Pool";
import { Cards } from "../entites/Cards";

const fetchRankFor7 = (allRanks: number[], card: Cards) =>
  allRanks.filter((rank) => rank <= card!.rank || rank === 11);

const fetchNormalRank = (allRanks: number[], card: Cards) =>
  allRanks.filter((rank) => rank >= card!.rank);

export const fetchPlayableRank = async (roomId: number) => {
  const poolCards = await getConnection()
    .getRepository(Pool)
    .createQueryBuilder("pool")
    .where('"roomId" = :roomId ', { roomId })
    .getMany();

  let allRanks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let playableRank;
  if (poolCards[0]) {
    const card = await Cards.findOne(poolCards[0].id);
    switch (card!.value) {
      case "2":
        playableRank = allRanks;
        break;

      case "3":
        let non3Card: Cards | undefined;
        for (let i = 0; i < poolCards.length; i++) {
          const card = await Cards.findOne(poolCards[i].cardId);
          if (card?.value !== "3") {
            non3Card = card;
            break;
          }
        }

        if (non3Card!.value === "2" || !non3Card) {
          playableRank = allRanks;
        } else if (non3Card!.value === "7") {
          playableRank = fetchRankFor7(allRanks, non3Card!);
        } else {
          playableRank = fetchNormalRank(allRanks, non3Card);
        }
        break;

      case "7":
        playableRank = fetchRankFor7(allRanks, card!);
        break;

      default:
        playableRank = fetchNormalRank(allRanks, card!);
        break;
    }
  } else {
    playableRank = allRanks;
  }

  return playableRank;
};
