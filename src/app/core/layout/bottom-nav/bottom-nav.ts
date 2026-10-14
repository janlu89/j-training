import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NavItem } from '../navigation';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  readonly items = input.required<readonly NavItem[]>();
}
