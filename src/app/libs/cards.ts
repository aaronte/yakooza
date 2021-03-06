import flatten from 'lodash-es/flatten';

const suits = ['heart', 'diamond', 'spade', 'club'];
export const numbers = [
  { id: 'A', value: 1 },
  { id: '2', value: 2 },
  { id: '3', value: 3 },
  { id: '4', value: 4 },
  { id: '5', value: 5 },
  { id: '6', value: 6 },
  { id: '7', value: 7 },
  { id: '8', value: 8 },
  { id: '9', value: 9 },
  { id: '10', value: 10 },
  { id: 'J', value: 10 },
  { id: 'Q', value: 10 },
  { id: 'K', value: 10 },
];
export const joker = { id: 'joker', cardName: 'Joker', value: 0, suit: '' };

export interface Card {
  cardName: string;
  id: string;
  suit: string;
  value: number;
}
export const cards: {
  cardName: string;
  id: string;
  value: number;
  suit: string;
}[] = [
  joker,
  joker,
  ...flatten(
    suits.map((suit) => {
      return numbers.map((value, key) => ({
        suit,
        value: value.value,
        id: `${suit}-${value.id}`,
        cardName: value.id,
      }));
    }),
  ),
];
