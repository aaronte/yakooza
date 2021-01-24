import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Card, cards } from '../libs/cards';

import chunk from 'lodash-es/chunk';
import times from 'lodash-es/times';
import flatten from 'lodash-es/flatten';
import shuffle from 'lodash-es/shuffle';
import sortBy from 'lodash-es/sortBy';
import groupBy from 'lodash-es/groupBy';
import uniqBy from 'lodash-es/uniqBy';
import remove from 'lodash-es/remove';

import { permutations } from '../libs/permutations.libs';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-game',
  styleUrls: ['./game.component.scss'],
  templateUrl: './game.component.html',
})
export class GameComponent implements OnInit {
  deck: Card[] = [];
  playerCards: BehaviorSubject<Card[][]> = new BehaviorSubject([]);
  gameState = new BehaviorSubject({
    deck: [],
    discard: [],
    players: [],
    rounds: [],
    log: [],
    dropZone: [],
    currentPlayerTurn: {
      mode: 'discard',
    },
  });
  playerCardChunks: BehaviorSubject<Card[][][]> = new BehaviorSubject([]);
  discardPile: BehaviorSubject<Card[]> = new BehaviorSubject([]);
  winningThreshold = 11;
  devMode = true;
  currentPlayer = 0;
  viewingPlayer = 0;

  constructor() {}

  ngOnInit(): void {
    const numberOfPlayers = 8;
    this.deck = this.calculateInitialDeck(numberOfPlayers);
    this.dealCards(numberOfPlayers);

    this.playerCards.subscribe((playerCards) => {
      this.playerCardChunks.next(chunk(playerCards, 5));
    });
  }

  dealCards(numberOfPlayers: number) {
    const playerCards: Card[][] = [];
    for (let i = 0; i < numberOfPlayers; i++) {
      playerCards.push([]);
      for (let y = 0; y < 5; y++) {
        const { drawnCard, newDeck } = this.drawFromDeck(this.deck);
        playerCards[i].push(drawnCard);
        this.deck = newDeck;
      }
    }
    this.playerCards.next(playerCards);
  }

  drawFromPile(deck: Card[], hand: Card[]) {
    const { drawnCard, newDeck } = this.drawFromDeck(deck);
    this.deck = newDeck;
    hand.push(drawnCard);
  }

  discard(hand: Card[], discardCards: Card[]) {
    console.log({ hand, discardCards });

    remove(hand, (card) =>
      discardCards.map(({ id }) => id).some((id) => id === card.id),
    );

    this.gameState.next({
      ...this.gameState.getValue(),
      dropZone: [],
      discard: [discardCards, ...this.gameState.getValue().discard],
    });
  }

  actions() {
    /*Call yaniv*/
    /*Pickup discard*/
    /*Draw from deck*/
  }

  calculateHandValue(hand: Card[]) {
    return hand.reduce((result, { value }) => result + value, 0);
  }

  drawFromDeck(deck: Card[]) {
    const [drawnCard, ...restOfDeck] = deck;
    return { drawnCard: drawnCard, newDeck: restOfDeck };
  }

  calculateInitialDeck(numberOfPlayers: number) {
    const deckCount = Math.ceil(numberOfPlayers / 4);
    const decks = times(deckCount, () => shuffle(cards));
    return shuffle(flatten(decks));
  }

  getPermutationsToDrop(hand: Card[]): Card[][] {
    const singles = this.sortCards(hand).map((card) => [card]);
    const pairs = uniqBy(
      flatten(
        permutations(this.sortCards(hand), 2)
          .map((permutedHand) => this.getSames(permutedHand))
          .filter((permutedHand) => !!permutedHand.length),
      ),
      (permutedHand) =>
        permutedHand
          .map(({ id }) => id)
          .sort()
          .join(''),
    );
    const triples = uniqBy(
      flatten(
        permutations(this.sortCards(hand), 3)
          .map((permutedHand) => this.getSames(permutedHand, 2))
          .filter((permutedHand) => !!permutedHand.length),
      ),
      (permutedHand) =>
        permutedHand
          .map(({ id }) => id)
          .sort()
          .join(''),
    );
    const fours = uniqBy(
      flatten(
        permutations(this.sortCards(hand), 4)
          .map((permutedHand) => this.getSames(permutedHand, 3))
          .filter((permutedHand) => !!permutedHand.length),
      ),
      (permutedHand) =>
        permutedHand
          .map(({ id }) => id)
          .sort()
          .join(''),
    );
    return [...singles, ...pairs, ...triples, ...fours];
  }

  sortCards(cardsToSort: Card[]) {
    return sortBy(
      sortBy(cardsToSort, (card) => card.suit),
      (card) => card.value,
    );
  }

  getSames(hand: Card[], threshold = 1) {
    return Object.values(groupBy(hand, (card) => card.cardName)).filter(
      (value) => value.length > threshold,
    );
  }

  drop(event: CdkDragDrop<Card[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  isDiscardValid(cardsToDiscard: Card[], hand: Card[]) {
    if (1 === cardsToDiscard.length) {
      return true;
    }
    const allPairs = flatten(
      permutations([...cardsToDiscard, ...hand], cardsToDiscard.length)
        .map((permutedHand) => this.getSames(permutedHand))
        .filter((permutedHand) => !!permutedHand.length),
    );
    const areSameCardId =
      [2, 3, 4].includes(cardsToDiscard.length) &&
      allPairs.some(
        (pair) =>
          pair
            .map((card) => card.id)
            .sort()
            .join('-') ===
          cardsToDiscard
            .map((card) => card.id)
            .sort()
            .join('-'),
      );
    const areSameSuit =
      1 === Object.keys(groupBy(cardsToDiscard, (card) => card.suit)).length;
    const isStraight = cardsToDiscard.length > 2 && areSameSuit;

    return areSameCardId || isStraight;
  }

  goNextPlayer() {
    this.currentPlayer = this.currentPlayer + 1;
  }
}
