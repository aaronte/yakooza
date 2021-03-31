import {
  Component,
  Inject,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
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
import { DOCUMENT } from '@angular/common';

import { DatabaseService } from '../service/database.service';

import { Card, cards, joker, numbers } from '../libs/cards';
import { permutations } from '../libs/permutations.libs';
import { jokerCombinations } from '../libs/joker-combinations';

import chunk from 'lodash-es/chunk';
import times from 'lodash-es/times';
import findIndex from 'lodash-es/findIndex';
import flatten from 'lodash-es/flatten';
import includes from 'lodash-es/includes';
import isEqual from 'lodash-es/isEqual';
import shuffle from 'lodash-es/shuffle';
import set from 'lodash-es/set';
import sortBy from 'lodash-es/sortBy';
import groupBy from 'lodash-es/groupBy';
import uniqBy from 'lodash-es/uniqBy';
import remove from 'lodash-es/remove';

const audio = new Audio();
audio.src = '../../../assets/audio/insight-578.mp3';
audio.volume = 0.3;

/*
 * TODO:
 * - [x] Calling Yaniv
 * - [x] Keeping scores
 * - [x] Reset rounds
 * - [x] Add player names
 * - [x] Double click cards
 * - [x] Sound for turn
 * - [x] Reorder own cards
 * - [x] Use jokers for straights
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
  winningThreshold = 7;
  gameState = new BehaviorSubject({
    currentPlayer: 0,
    currentRound: 0,
    deck: [],
    discard: [],
    gameName: '',
    gameScores: {},
    hasStarted: false,
    players: [],
    isDropZoneConfirmed: false,
    rounds: [],
    logs: [],
    dropZone: [],
    playerCards: [],
    previousPlayerCards: [],
    currentPlayerTurn: { mode: 'discard' },
    scoreboard: [
      {
        handValues: [],
        scores: [],
        isLowestInRound: [],
        specialAdditions: [],
        total: 0,
      },
    ],
    calledGame: [],
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
        previousPlayerCards: Object.values(game.previousPlayerCards),
      })),
    )
    .subscribe(this.gameState$);
  you: number;
  myHand = new BehaviorSubject<Card[]>([]);

  constructor(
    @Inject(DOCUMENT) public document: Document,
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
          this.reconcileHandDifference(
            this.gameState.getValue().playerCards[this.you] || [],
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
            this.openTemplate(
              newGameState.calledGame[newGameState.calledGame.length - 1],
            );
          }

          if (
            oldGameState.currentPlayer !== this.you &&
            newGameState.currentPlayer === this.you
          ) {
            this.playTurnAudio();
          }
        }),
      )
      .subscribe();

    this.gameState.subscribe((game) => {
      this.playerCardChunks.next(chunk(game.playerCards, 5));
    });
  }

  reconcileHandDifference(gameStateHand: Card[]) {
    const gameStateHandIds = gameStateHand.map((card) => card.id).sort();
    const localHandIds = this.myHand
      .getValue()
      .map((card) => card.id)
      .sort();
    if (isEqual(gameStateHandIds, localHandIds)) {
      return;
    }
    this.myHand.next(gameStateHand);
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
    const currentValue = this.gameState.getValue();
    this.updateGameState({
      ...currentValue,
      isDropZoneConfirmed: true,
      currentPlayerTurn: {
        ...currentValue.currentPlayerTurn,
        mode: 'draw',
      },
      playerCards: set(
        currentValue.playerCards,
        [this.you],
        this.myHand.getValue(),
      ),
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

  drop(event: CdkDragDrop<Card[]> | any) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      if (this.you !== this.gameState.getValue().currentPlayer) {
        return this.createMessage('error', `Please wait for your turn.`);
      }
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
    const cardsToDiscardWithoutJoker = cardsToDiscard.filter(
      ({ id }) => id !== joker.id,
    );
    const areSameSuit =
      1 ===
      Object.keys(groupBy(cardsToDiscardWithoutJoker, (card) => card.suit))
        .length;
    const areAllDifferentCards = Object.values(
      cardsToDiscardWithoutJoker.reduce((result, current) => {
        const currentSum = result[current.id] || 0;
        return {
          ...result,
          [current.id]: currentSum + 1,
        };
      }, {}),
    ).every((value) => 1 === value);
    const isStraight =
      cardsToDiscard.length > 2 &&
      areSameSuit &&
      this.isStraight(cardsToDiscard) &&
      areAllDifferentCards;
    return areSameCardId || isStraight;
  }

  async callGame() {
    const scoreboard = this.gameState.getValue().scoreboard;
    const playerHandValues = this.gameState
      .getValue()
      .playerCards.map((hand) => this.calculateHandValue(hand));
    const playerCards = this.gameState.getValue().playerCards;
    const newScoreboard = scoreboard.map((scoreboardItem, index) => {
      const roundMinimum = Math.min(...playerHandValues);
      const currentHandValue = playerHandValues[index];
      const isRealWinner =
        this.you === index && roundMinimum === currentHandValue;
      const penalty = this.you !== index ? 0 : !isRealWinner ? 30 : 0;
      const realScore = currentHandValue + penalty;
      const jokersAvailable = playerCards[index].filter(
        (card: Card) => card.id === joker.id,
      );
      const maxJokerValue = jokersAvailable.length * 10;
      const currentTotal = scoreboardItem.total + realScore;
      const gapToFifty = 50 - currentTotal;
      const gapToOneHundred = 100 - currentTotal;
      const jokerValue =
        maxJokerValue === 0
          ? 0
          : gapToFifty > 0 && gapToFifty <= maxJokerValue
          ? gapToFifty
          : gapToOneHundred > 0 && gapToOneHundred <= maxJokerValue
          ? gapToOneHundred
          : 0;
      const newScores = [...scoreboardItem.scores, realScore + jokerValue];
      const intermediateTotal = currentTotal + jokerValue;
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
        specialAdditions: [
          ...scoreboardItem.specialAdditions,
          { jokerValue, penalty },
        ],
        total: roundMinimum === realScore ? scoreboardItem.total : total,
      };
    });
    await this.updateGameState({
      ...this.gameState.getValue(),
      ...this.getResetCardDistributionUpdate(),
      currentPlayer: this.gameState.getValue().currentPlayer,
      scoreboard: newScoreboard,
      calledGame: [
        ...this.gameState.getValue().calledGame,
        this.gameState.getValue().players[this.you],
      ],
    });
  }

  isStraight(hand: Card[]) {
    const hasJoker = hand.some((card) => card.id === joker.id);
    if (!hasJoker) {
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
    const handIdString = hand.map(({ cardName }) => cardName).join('***');
    const combinations = jokerCombinations.map((combo) => combo.join('***'));
    return combinations.some(
      (combo) =>
        includes(combo, handIdString) ||
        includes(combo.split('***').reverse().join('***'), handIdString),
    );
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
      playerCards: set(
        currentValue.playerCards,
        [this.you],
        this.myHand.getValue(),
      ),
      ...newDeckUpdate,
    });
  }

  getNextPlayer(playerTurn: number, numberOfPlayers: number) {
    return (playerTurn + 1) % numberOfPlayers;
  }

  getPreviousPlayerIndex(playerTurn: number, numberOfPlayers: number) {
    return 0 === playerTurn ? numberOfPlayers - 1 : playerTurn - 1;
  }

  openTemplate(calledGame: string = ''): void {
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
        calledGame: calledGame,
        gameState: this.gameState.getValue(),
        scoreboard: transformedScoreboard,
      },
    });
  }

  async renewGame(gameState = {}) {
    console.log('Starting game...');
    const totalScores = this.gameState
      .getValue()
      .scoreboard.map(({ total }) => total);
    const currentGameState = this.gameState.getValue();
    await this.updateGameState({
      ...currentGameState,
      ...this.getResetCardDistributionUpdate(),
      calledGame: [],
      currentRound: 0,
      hasStarted: true,
      logs: [],
      scoreboard: this.gameState.getValue().players.map(() => ({
        handValues: [],
        isLowestInRound: [],
        scores: [],
        specialAdditions: [],
        total: 0,
      })),
      gameScores: totalScores.reduce((result, next, index) => {
        const playerName = currentGameState.players[index];
        const currentGameScore = currentGameState.gameScores[playerName] || 0;
        const scoreToAdd = Math.min(...totalScores) === next ? 1 : 0;
        return {
          ...result,
          [playerName]: currentGameScore + scoreToAdd,
        };
      }, {}),
      ...gameState,
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

  validateDrop(event: CdkDragDrop<Card[]> | any) {
    if (this.you !== this.gameState.getValue().currentPlayer) {
      return this.createMessage('error', `Please wait for your turn.`);
    }
    this.drop(event);
  }

  pickUpFromPile(event: CdkDragDrop<Card[]> | any, isDisabled = true) {
    if (isDisabled) {
      return;
    }
    this.validateDrop(event);
  }

  trackCardByFn(index: number, card: Card) {
    return card.id;
  }

  trackIndexByFn(index: number) {
    return index;
  }

  playTurnAudio() {
    try {
      audio.load();
      audio.play();
    } catch (error) {
      console.error(`Can't play audio.`);
    }
  }
}
