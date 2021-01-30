import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { BehaviorSubject, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  games = new BehaviorSubject([]);
  gameState = new BehaviorSubject({});

  constructor(public firestore: AngularFirestore) {
    this.firestore
      .collection('games')
      .valueChanges()
      .pipe(tap((games) => this.games.next(games)))
      .subscribe();
  }

  createGame(gameId: string) {
    return this.firestore
      .collection(`games`)
      .doc(gameId)
      .set({
        createdAt: Date.now(),
        currentRound: 0,
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
    return this.firestore.collection('group').doc(gameId);
  }
}
