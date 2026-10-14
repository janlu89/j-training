import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { APP_VERSION } from '../../../core/app-version';
import { InstallPromptService } from '../../../core/services/pwa/install-prompt.service';
import { SettingsSection } from '../../../shared/ui/settings-section/settings-section';

/** Installing J-Training as an app, and the version in use. */
@Component({
  selector: 'app-app-section',
  imports: [TranslocoPipe, ButtonDirective, ButtonIcon, ButtonLabel, SettingsSection],
  template: `
    <app-settings-section
      [title]="'settings.app.title' | transloco"
      [description]="'settings.app.description' | transloco"
    >
      @if (state() === 'available') {
        <button pButton type="button" class="app__install" (click)="install()">
          <i class="pi pi-mobile" pButtonIcon aria-hidden="true"></i>
          <span pButtonLabel>{{ 'settings.app.install' | transloco }}</span>
        </button>
      } @else {
        <p class="app__state">{{ 'settings.app.state.' + state() | transloco }}</p>
      }
      <p class="app__version">{{ 'settings.app.version' | transloco: { version } }}</p>
    </app-settings-section>
  `,
  styles: `
    .app__install {
      align-self: flex-start;
    }
    .app__state {
      margin: 0;
      font-weight: 600;
    }
    .app__version {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSection {
  private readonly installer = inject(InstallPromptService);

  protected readonly state = this.installer.state;
  protected readonly version = APP_VERSION;

  protected install(): Promise<void> {
    return this.installer.install();
  }
}
