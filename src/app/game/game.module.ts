import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule } from '@angular/forms';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

import { CardModule } from '../card/card.module';

import { GameComponent } from './game.component';

@NgModule({
  declarations: [GameComponent],
  imports: [
    CardModule,
    CommonModule,
    DragDropModule,
    FlexLayoutModule,
    NzButtonModule,
    NzPageHeaderModule,
    NzRadioModule,
    FormsModule,
    NzTimelineModule,
    RouterModule.forChild([
      {
        path: '',
        component: GameComponent,
      },
    ]),
  ],
})
export class GameModule {}
