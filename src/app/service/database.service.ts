import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { BehaviorSubject, throwError } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  games = new BehaviorSubject([]);
  gameStates = new BehaviorSubject({});

  constructor(public firestore: AngularFirestore) {
    this.firestore.collection('games').valueChanges().subscribe(this.games);
  }

  createGame(gameId: string) {
    return this.firestore
      .collection(`games`)
      .doc(gameId)
      .set({
        createdAt: Date.now(),
        currentRound: 0,
        currentPlayer: 0,
        isDropZoneConfirmed: false,
        gameName: gameId,
        deck: [],
        discard: [],
        players: [],
        rounds: [],
        log: [],
        dropZone: [],
        currentPlayerTurn: { mode: 'discard' },
        scoreboard: [
          { handValues: [], scores: [], isLowestInRound: [], total: 0 },
        ],
        recognizeGameCalled: [],
      });
  }

  getGame(gameId: string) {
    return this.firestore.doc(`games/${gameId}`).get();
  }

  getGameReference(gameId: string) {
    return this.firestore.doc(`games/${gameId}`);
  }

  addPlayerToGame(gameId: string, name: string) {
    return this.firestore
      .collection(`games`)
      .doc(gameId)
      .get()
      .pipe(
        concatMap((game) => {
          const gameSnapshot: any = game.data();
          if (gameSnapshot.hasStarted) {
            return throwError(`Sorry. Can't join a game that has started.`);
          }
          return this.firestore
            .collection('games')
            .doc(gameId)
            .update({
              players: Array.from(
                new Set(
                  [...gameSnapshot.players, name].filter((item) => !!item),
                ),
              ),
            });
        }),
      );
  }

  updateGameState(gameId: string, update: any, name: string) {
    const transformedUpdate = {
      ...update,
      discard: update.discard.reduce(
        (result, item, index) => ({ ...result, [index]: item }),
        {},
      ),
      playerCards: (update.playerCards || []).reduce(
        (result, item, index) => ({ ...result, [index]: item }),
        {},
      ),
    };
    return this.firestore
      .collection('games')
      .doc(gameId)
      .update(transformedUpdate);
  }
}
