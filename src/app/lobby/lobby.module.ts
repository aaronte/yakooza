import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { LobbyComponent } from './lobby.component';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageModule } from 'ng-zorro-antd/message';

@NgModule({
  declarations: [LobbyComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    RouterModule.forChild([{ path: '', component: LobbyComponent }]),
    NzPageHeaderModule,
    NzTypographyModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzCardModule,
    NzFormModule,
    NzMessageModule,
  ],
})
export class LobbyModule {}
