import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ImportIssue } from '../../../core/models';

/** Above this many problems the file is clearly not a plan: show the first ones only. */
const MAX_VISIBLE = 20;

@Component({
  selector: 'app-import-issues',
  imports: [TranslocoPipe],
  templateUrl: './import-issues.html',
  styleUrl: './import-issues.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportIssues {
  readonly issues = input.required<readonly ImportIssue[]>();

  protected readonly visible = computed(() => this.issues().slice(0, MAX_VISIBLE));
  protected readonly hidden = computed(() => Math.max(0, this.issues().length - MAX_VISIBLE));
}
