import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  games = new BehaviorSubject([]);
  gameStates = new BehaviorSubject({});

  constructor(public firestore: AngularFirestore) {
    this.firestore
      .collection('games')
      .valueChanges()
      .pipe(
        tap((games) => this.games.next(games)),
        tap((games) => console.log({ games })),
      )
      .subscribe();
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
    return this.firestore.collection('games').doc(gameId).update(update);
  }
}
