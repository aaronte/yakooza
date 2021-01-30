import { Component, OnInit } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import { DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
})
export class LobbyComponent implements OnInit {
  gameId: string;
  name: string;

  constructor(
    public databaseService: DatabaseService,
    public route: ActivatedRoute,
    public router: Router,
  ) {}

  ngOnInit(): void {}

  createGame(gameId: string) {
    const transformedGameId = gameId.toUpperCase();
    this.databaseService
      .getGame(transformedGameId)
      .pipe(
        tap((game) => {
          if (!game.data()) {
            this.databaseService
              .createGame(transformedGameId)
              .then((result) => console.log({ result }));
          }
        }),
      )
      .subscribe();
  }

  setName(name: string) {
    return this.router.navigate(['.'], {
      queryParams: { name: name.toLowerCase() },
      queryParamsHandling: 'merge',
    });
  }

  addPlayerToGame(gameId: string, name: string) {
    this.databaseService
      .addPlayerToGame(gameId, name)
      .pipe(
        tap(() =>
          this.router.navigate(['/games', gameId], {
            queryParams: { name: name.toLowerCase() },
            queryParamsHandling: 'merge',
          }),
        ),
      )
      .subscribe();
  }
}
