import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppHeader } from './core/layout/app-header/app-header';
import { BottomNav } from './core/layout/bottom-nav/bottom-nav';
import { MAIN_NAVIGATION } from './core/layout/navigation';
import { RestTimerBar } from './core/layout/rest-timer-bar/rest-timer-bar';
import { RestTimerService, formatRest } from './core/services/rest-timer/rest-timer.service';

/** Mobile shell: header with settings, routed page, rest timer when running, bottom navigation. */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    AppHeader,
    BottomNav,
    RestTimerBar,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly appName = 'J-Training';
  protected readonly navigation = MAIN_NAVIGATION;
  /** Application-wide: the rest keeps running while the user moves between pages. */
  protected readonly rest = inject(RestTimerService);
  protected readonly restRemaining = computed(() => formatRest(this.rest.remainingMs()));
}
