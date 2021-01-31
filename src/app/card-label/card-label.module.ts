import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { CardLabelComponent } from './card-label.component';

@NgModule({
  declarations: [CardLabelComponent],
  exports: [CardLabelComponent],
  imports: [CommonModule, FlexLayoutModule],
})
export class CardLabelModule {}
