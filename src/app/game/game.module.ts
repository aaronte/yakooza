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
import {
  CheckCircleOutline,
  SyncOutline,
} from '@ant-design/icons-angular/icons';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTableModule } from 'ng-zorro-antd/table';

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
    NzIconModule.forChild([CheckCircleOutline, SyncOutline]),
    NzPageHeaderModule,
    NzRadioModule,
    FormsModule,
    NzDrawerModule,
    NzTableModule,
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
