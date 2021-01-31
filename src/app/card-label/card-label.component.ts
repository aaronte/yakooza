import { Component, Input, OnInit } from '@angular/core';

import { Card } from '../libs/cards';

@Component({
  selector: 'app-card-label',
  templateUrl: './card-label.component.html',
})
export class CardLabelComponent implements OnInit {
  @Input() cards: Card[];

  constructor() {}

  ngOnInit(): void {}
}
