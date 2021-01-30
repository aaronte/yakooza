import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { ActivatedRoute } from '@angular/router';

import { Card, cards, joker, numbers } from '../libs/cards';
import { permutations } from '../libs/permutations.libs';

import chunk from 'lodash-es/chunk';
import times from 'lodash-es/times';
import findIndex from 'lodash-es/findIndex';
import flatten from 'lodash-es/flatten';
import shuffle from 'lodash-es/shuffle';
import sortBy from 'lodash-es/sortBy';
import groupBy from 'lodash-es/groupBy';
import uniqBy from 'lodash-es/uniqBy';
import remove from 'lodash-es/remove';
import { DatabaseService } from '../service/database.service';
import { filter, take, tap } from 'rxjs/operators';

/*
 * TODO:
 * - [x] Calling Yaniv
 * - [x] Keeping scores
 * - [x] Reset rounds
 * - [x] Add player names
 * - [] Use jokers for straights
 * */
@Component({
  selector: 'app-game',
  styleUrls: ['./game.component.scss'],
  templateUrl: './game.component.html',
})
export class GameComponent implements OnInit {
  @ViewChild('scoreDrawerTemplate', { static: false })
  scoreDrawerTemplate?: TemplateRef<{
    $implicit: { gameState: any };
    drawerRef: NzDrawerRef<string>;
  }>;
  deck: Card[] = [];
  playerCards: BehaviorSubject<Card[][]> = new BehaviorSubject([]);
  gameState = new BehaviorSubject({
    currentPlayer: 0,
    currentRound: 0,
    deck: [],
    discard: [],
    gameName: '',
    players: [],
    rounds: [],
    log: [],
    dropZone: [],
    isDropZoneConfirmed: false,
    currentPlayerTurn: {
      mode: 'discard',
    },
    scoreboard: [{ handValues: [], scores: [], isLowestInRound: [], total: 0 }],
  });
  playerCardChunks: BehaviorSubject<Card[][][]> = new BehaviorSubject([]);
  winningThreshold = 11;
  devMode = true;
  viewingPlayer = 0;
  gameState$ = new BehaviorSubject(null);
  _gameState$ = this.databaseService
    .getGameReference(this.route.snapshot.paramMap.get('gameId'))
    .valueChanges()
    .subscribe(this.gameState$);
  you: number;

  constructor(
    public databaseService: DatabaseService,
    public drawerService: NzDrawerService,
    public route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.gameState$
      .pipe(
        filter((state) => !!state),
        take(1),
        tap((game: any) => {
          this.gameState.next(game);
          this.you = findIndex(
            this.gameState.getValue().players,
            (i) => i === this.route.snapshot.queryParamMap.get('name'),
          );
          console.log({
            players: this.gameState.getValue().players,
            name: this.route.snapshot.queryParamMap.get('name'),
            you: this.you,
          });
          this.renewGame();
          console.log('hello');
        }),
      )
      .subscribe();
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
    remove(hand, (card) =>
      discardCards.map(({ id }) => id).some((id) => id === card.id),
    );
    this.gameState.next({
      ...this.gameState.getValue(),
      dropZone: [],
      discard: [discardCards, ...this.gameState.getValue().discard],
    });
  }

  lockDropZone() {
    this.gameState.next({
      ...this.gameState.getValue(),
      isDropZoneConfirmed: true,
      currentPlayerTurn: {
        ...this.gameState.getValue().currentPlayerTurn,
        mode: 'draw',
      },
    });
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
      if ('draw' === this.gameState.getValue().currentPlayerTurn.mode) {
        this.processNextTurn();

        // if (0 === this.gameState.getValue().deck.length) {
        //   const oldDiscard = this.gameState.getValue().discard;
        //   const newDiscard = [oldDiscard[0]];
        //   this.deck = shuffle(flatten(oldDiscard));
        //   this.gameState.next({
        //     ...this.gameState.getValue(),
        //     deck: this.deck,
        //     discard: newDiscard,
        //   });
        // }
      }
    }
  }

  isDiscardValid(cardsToDiscard: Card[], hand: Card[]) {
    if (0 === cardsToDiscard.length) {
      return false;
    }
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
    const isStraight =
      cardsToDiscard.length > 2 &&
      areSameSuit &&
      this.isStraight(cardsToDiscard);

    return areSameCardId || isStraight;
  }

  callGame() {
    const scoreboard = this.gameState.getValue().scoreboard;
    const playerHandValues = this.playerCards
      .getValue()
      .map((hand) => this.calculateHandValue(hand));
    const newScoreboard = scoreboard.map((scoreboardItem, index) => {
      const currentHandValue = playerHandValues[index];
      const newScores = [...scoreboardItem.scores, currentHandValue];
      const intermediateTotal = scoreboardItem.total + currentHandValue;
      const total =
        50 === intermediateTotal
          ? 25
          : 100 === intermediateTotal
          ? 50
          : intermediateTotal;
      return {
        handValues: [...scoreboardItem.handValues, currentHandValue],
        scores: newScores,
        isLowestInRound: [
          ...scoreboardItem.isLowestInRound,
          Math.min(...playerHandValues) === currentHandValue,
        ],
        total:
          Math.min(...playerHandValues) === currentHandValue
            ? scoreboardItem.total
            : total,
      };
    });
    this.gameState.next({
      ...this.gameState.getValue(),
      scoreboard: newScoreboard,
    });
  }

  isStraight(hand: Card[]) {
    /*need to handle jokers*/
    return hand
      .map((card, handIndex) => {
        if (hand.length - 1 === handIndex) {
          return 1;
        }
        const currentPositionIndex = findIndex(
          numbers,
          ({ id }) => id === card.cardName,
        );
        const nextPositionIndex = findIndex(
          numbers,
          ({ id }) => id === hand[handIndex + 1].cardName,
        );
        return Math.abs(currentPositionIndex - nextPositionIndex);
      })
      .every((index) => 1 === index);
  }

  goNextPlayer() {
    this.databaseService.updateGameState(
      this.gameState.getValue().gameName,
      {
        currentPlayer: this.getNextPlayer(
          this.gameState.getValue().currentPlayer,
          this.gameState.getValue().players.length,
        ),
      },
      this.route.snapshot.queryParamMap.get('name'),
    );
  }

  isPhase(phase: string) {
    return () => {
      return phase === this.gameState.getValue().currentPlayerTurn.mode;
    };
  }

  processNextTurn() {
    const currentValue = this.gameState.getValue();
    this.gameState.next({
      ...currentValue,
      discard: [currentValue.dropZone, ...currentValue.discard],
      isDropZoneConfirmed: false,
      currentPlayerTurn: {
        ...currentValue.currentPlayerTurn,
        mode: 'discard',
      },
      dropZone: [],
    });
    this.goNextPlayer();
  }

  getNextPlayer(playerTurn: number, numberOfPlayers: number) {
    return (playerTurn + 1) % numberOfPlayers;
  }

  openTemplate(): void {
    const drawerRef = this.drawerService.create({
      nzTitle: 'Scoreboard',
      nzContent: this.scoreDrawerTemplate,
      nzWidth: '600px',
      nzContentParams: {
        gameState: this.gameState.getValue(),
      },
    });

    drawerRef.afterOpen.subscribe(() => {
      console.log('Drawer(Template) open');
    });

    drawerRef.afterClose.subscribe(() => {
      console.log('Drawer(Template) close');
    });
  }

  startNewRound() {
    this.resetCardDistribution();
  }

  renewGame() {
    this.gameState.next({
      ...this.gameState.getValue(),
      scoreboard: this.gameState.getValue().players.map((player) => ({
        handValues: [],
        isLowestInRound: [],
        scores: [],
        total: 0,
      })),
    });
    this.resetCardDistribution();
  }

  resetCardDistribution() {
    this.deck = this.calculateInitialDeck(
      this.gameState.getValue().players.length,
    );
    this.dealCards(this.gameState.getValue().players.length);
    const { newDeck, drawnCard } = this.drawFromDeck(this.deck);
    this.deck = newDeck;
    this.gameState.next({
      ...this.gameState.getValue(),
      discard: [[drawnCard]],
      dropZone: [],
    });
    this.playerCards.subscribe((playerCards) => {
      this.playerCardChunks.next(chunk(playerCards, 5));
    });
  }
}
