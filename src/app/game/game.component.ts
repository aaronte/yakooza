import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { ActivatedRoute } from '@angular/router';
import { filter, map, pairwise, tap } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DatabaseService } from '../service/database.service';

import { Card, cards, numbers } from '../libs/cards';
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
  playerCardChunks: BehaviorSubject<Card[][][]> = new BehaviorSubject([]);
  winningThreshold = 11;
  gameState = new BehaviorSubject({
    currentPlayer: 0,
    currentRound: 0,
    deck: [],
    discard: [],
    gameName: '',
    hasStarted: false,
    players: [],
    rounds: [],
    logs: [],
    dropZone: [],
    playerCards: [],
    isDropZoneConfirmed: false,
    currentPlayerTurn: { mode: 'discard' },
    scoreboard: [{ handValues: [], scores: [], isLowestInRound: [], total: 0 }],
    recognizeGameCalled: [],
  });
  gameState$ = new BehaviorSubject(null);
  _gameState$ = this.databaseService
    .getGameReference(this.route.snapshot.paramMap.get('gameId'))
    .valueChanges()
    .pipe(
      filter((state) => !!state),
      map((game: any) => ({
        ...game,
        discard: Object.values(game.discard),
        playerCards: Object.values(game.playerCards),
      })),
    )
    .subscribe(this.gameState$);
  you: number;

  constructor(
    public databaseService: DatabaseService,
    public drawerService: NzDrawerService,
    public message: NzMessageService,
    public route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.gameState$
      .pipe(
        filter((state) => !!state),
        tap((game: any) => {
          this.gameState.next(game);
          this.you = findIndex(
            this.gameState.getValue().players,
            (i) => i === this.route.snapshot.queryParamMap.get('name'),
          );
        }),
      )
      .subscribe();
    this.gameState$
      .pipe(
        filter((state) => !!state),
        pairwise(),
        tap(([oldGameState, newGameState]) => {
          if (
            oldGameState.scoreboard[0].scores.length <
            newGameState.scoreboard[0].scores.length
          ) {
            this.openTemplate();
          }
        }),
      )
      .subscribe();

    this.gameState.subscribe((game) => {
      this.playerCardChunks.next(chunk(game.playerCards, 5));
    });
  }

  dealCards(initialDeck, numberOfPlayers: number) {
    const playerCards: Card[][] = [];
    let deck = initialDeck;
    for (let i = 0; i < numberOfPlayers; i++) {
      playerCards.push([]);
      for (let y = 0; y < 5; y++) {
        const { drawnCard, newDeck } = this.drawFromDeck(deck);
        playerCards[i].push(drawnCard);
        deck = newDeck;
      }
    }
    return { deck, playerCards };
  }

  drawFromPile(deck: Card[], hand: Card[]) {
    const { drawnCard, newDeck } = this.drawFromDeck(deck);
    this.updateGameState({ deck: newDeck });
    hand.push(drawnCard);
  }

  discard(hand: Card[], discardCards: Card[]) {
    remove(hand, (card) =>
      discardCards.map(({ id }) => id).some((id) => id === card.id),
    );
    this.updateGameState({
      ...this.gameState.getValue(),
      dropZone: [],
      discard: [discardCards, ...this.gameState.getValue().discard],
    });
  }

  updateGameState(update: any) {
    return this.databaseService.updateGameState(
      this.gameState.getValue().gameName,
      {
        ...this.gameState.getValue(),
        ...update,
      },
      this.gameState.getValue().players[this.you],
    );
  }

  lockDropZone() {
    this.updateGameState({
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
    if (this.you !== this.gameState.getValue().currentPlayer) {
      return this.createMessage('error', `Please wait for your turn.`);
    }
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
        this.processNextTurn({
          card: event.container.data[event.currentIndex],
          origin: event.previousContainer.element.nativeElement.id,
        });
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

  async callGame() {
    const scoreboard = this.gameState.getValue().scoreboard;
    const playerHandValues = this.gameState
      .getValue()
      .playerCards.map((hand) => this.calculateHandValue(hand));
    const newScoreboard = scoreboard.map((scoreboardItem, index) => {
      const roundMinimum = Math.min(...playerHandValues);
      const currentHandValue = playerHandValues[index];
      const isRealWinner =
        this.you === index && roundMinimum === currentHandValue;
      const penalty = this.you !== index ? 0 : !isRealWinner ? 30 : 0;
      const realScore = currentHandValue + penalty;
      const newScores = [...scoreboardItem.scores, realScore];
      const intermediateTotal = scoreboardItem.total + realScore;
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
          roundMinimum === realScore,
        ],
        total: roundMinimum === realScore ? scoreboardItem.total : total,
      };
    });
    await this.updateGameState({
      ...this.gameState.getValue(),
      ...this.getResetCardDistributionUpdate(),
      currentPlayer: this.getNextPlayer(
        this.gameState.getValue().currentPlayer,
        this.gameState.getValue().players.length,
      ),
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

  isPhase(phase: string) {
    return () => {
      return phase === this.gameState.getValue().currentPlayerTurn.mode;
    };
  }

  async processNextTurn(pickup: { origin: string; card: Card }) {
    const currentValue = this.gameState.getValue();
    const goNextPlayerUpdate = {
      currentPlayer: this.getNextPlayer(
        this.gameState.getValue().currentPlayer,
        this.gameState.getValue().players.length,
      ),
    };
    let newDeckUpdate = {};
    if (0 === currentValue.deck.length) {
      const oldDiscard = currentValue.discard;
      const newDiscard = [oldDiscard[0]];
      const deck = shuffle(flatten(oldDiscard));
      newDeckUpdate = {
        deck,
        discard: newDiscard,
      };
    }
    await this.updateGameState({
      ...currentValue,
      ...goNextPlayerUpdate,
      discard: [currentValue.dropZone, ...currentValue.discard],
      isDropZoneConfirmed: false,
      currentPlayerTurn: { ...currentValue.currentPlayerTurn, mode: 'discard' },
      dropZone: [],
      logs: [
        {
          pickup,
          discard: currentValue.dropZone,
        },
        ...(currentValue.logs || []),
      ],
      ...newDeckUpdate,
    });
  }

  getNextPlayer(playerTurn: number, numberOfPlayers: number) {
    return (playerTurn + 1) % numberOfPlayers;
  }

  getPreviousPlayerIndex(playerTurn: number, numberOfPlayers: number) {
    return 0 === playerTurn ? numberOfPlayers - 1 : playerTurn - 1;
  }

  openTemplate(): void {
    const transformedScoreboard = this.gameState
      .getValue()
      .players.map((playerName, index) => ({
        name: playerName,
        scoreboard: this.gameState.getValue().scoreboard[index],
      }));
    const drawerRef = this.drawerService.create({
      nzTitle: 'Scoreboard',
      nzContent: this.scoreDrawerTemplate,
      nzWidth: '700px',
      nzContentParams: {
        scoreboard: transformedScoreboard,
      },
    });
  }

  async renewGame() {
    console.log('Starting game...');
    await this.resetCardDistribution();
    await this.updateGameState({
      ...this.gameState.getValue(),
      currentPlayer: 0,
      currentRound: 0,
      hasStarted: true,
      logs: [],
      scoreboard: this.gameState.getValue().players.map(() => ({
        handValues: [],
        isLowestInRound: [],
        scores: [],
        total: 0,
      })),
      recognizeGameCalled: this.gameState.getValue().players.map(() => false),
    });
  }

  setGameAsNotStarted() {
    return this.updateGameState({
      ...this.gameState.getValue(),
      hasStarted: false,
    });
  }

  resetCardDistribution() {
    return this.updateGameState({
      ...this.getResetCardDistributionUpdate(),
    });
  }

  getResetCardDistributionUpdate() {
    const initialDeck = this.calculateInitialDeck(
      this.gameState.getValue().players.length,
    );
    const { deck, playerCards } = this.dealCards(
      initialDeck,
      this.gameState.getValue().players.length,
    );
    const { newDeck, drawnCard } = this.drawFromDeck(deck);
    return {
      ...this.gameState.getValue(),
      deck: newDeck,
      discard: [[drawnCard]],
      dropZone: [],
      playerCards: playerCards,
    };
  }

  createMessage(type: string, message: string): void {
    this.message.create(type, message);
  }

  sortBy(
    item1: { scoreboard: { total: number } },
    item2: { scoreboard: { total: number } },
  ) {
    return item1.scoreboard.total - item2.scoreboard.total;
  }
}
