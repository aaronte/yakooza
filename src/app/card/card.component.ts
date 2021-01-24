import { Component, Input, OnInit } from '@angular/core';

import { Card } from '../libs/cards';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
})
export class CardComponent implements OnInit {
  @Input() card?: Card;
  @Input() size?: string;
  @Input() hidden?: boolean;
  @Input() hideShadow?: boolean;

  ngOnInit(): void {}
}
