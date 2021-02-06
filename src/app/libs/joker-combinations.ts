import { joker, numbers } from './cards';

import set from 'lodash-es/set';

const cardIds = numbers.map(({ id }) => id);
const oneJokerCombinations = cardIds.map((cardId, index) =>
  set([...cardIds], [index], joker.cardName),
);
const twoJokersConsecutive = cardIds.map((cardId, index) => {
  const clonedIds = [...cardIds];
  set(clonedIds, [index], joker.cardName);
  set(clonedIds, [index + 1], joker.cardName);
  return clonedIds;
});
const twoJokersOneApart = cardIds.map((cardId, index) => {
  const clonedIds = [...cardIds];
  set(clonedIds, [index], joker.cardName);
  set(clonedIds, [index + 2], joker.cardName);
  return clonedIds;
});
const threeJokersConsecutive = cardIds.map((cardId, index) => {
  const clonedIds = [...cardIds];
  set(clonedIds, [index], joker.cardName);
  set(clonedIds, [index + 1], joker.cardName);
  set(clonedIds, [index + 2], joker.cardName);
  return clonedIds;
});

export const jokerCombinations = [
  ...oneJokerCombinations,
  ...twoJokersConsecutive,
  ...twoJokersOneApart,
  ...threeJokersConsecutive,
];
