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
  HourglassOutline,
  SyncOutline,
} from '@ant-design/icons-angular/icons';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { CardModule } from '../card/card.module';
import { CardLabelModule } from '../card-label/card-label.module';

import { GameComponent } from './game.component';

@NgModule({
  declarations: [GameComponent],
  imports: [
    CardModule,
    CommonModule,
    CardLabelModule,
    DragDropModule,
    FlexLayoutModule,
    NzButtonModule,
    NzAlertModule,
    NzCardModule,
    NzIconModule.forChild([CheckCircleOutline, HourglassOutline, SyncOutline]),
    NzPageHeaderModule,
    NzRadioModule,
    FormsModule,
    NzDrawerModule,
    NzMessageModule,
    NzSpinModule,
    NzTableModule,
    NzTypographyModule,
    NzTimelineModule,
    NzCollapseModule,
    NzPopoverModule,
    RouterModule.forChild([
      {
        path: '',
        component: GameComponent,
      },
    ]),
  ],
})
export class GameModule {}
