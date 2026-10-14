import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './core/layout/app-header/app-header';
import { BottomNav } from './core/layout/bottom-nav/bottom-nav';
import { MAIN_NAVIGATION } from './core/layout/navigation';

/** Mobile shell: header, routed page, bottom navigation. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeader, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly appName = 'J-Training';
  protected readonly navigation = MAIN_NAVIGATION;
}
