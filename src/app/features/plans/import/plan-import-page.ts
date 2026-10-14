import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { PLAN_CSV_COLUMNS } from '../../../core/services/plan-csv/plan-csv-columns';
import { PlanImportPreview, PlanImportService } from '../../../core/services/plan-import.service';
import { ImportIssues } from './import-issues';
import { ImportSummary } from './import-summary';

/** Choose a CSV, review what will be created, name the plan and confirm. */
@Component({
  selector: 'app-plan-import-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    InputText,
    Message,
    ImportIssues,
    ImportSummary,
  ],
  templateUrl: './plan-import-page.html',
  styleUrl: './plan-import-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanImportPage {
  private readonly importer = inject(PlanImportService);
  private readonly router = inject(Router);

  protected readonly columns = PLAN_CSV_COLUMNS.join(', ');
  protected readonly preview = signal<PlanImportPreview | null>(null);
  protected readonly name = signal('');
  protected readonly activate = signal(true);
  protected readonly busy = signal(false);

  protected readonly parsedPlan = computed(() => {
    const result = this.preview()?.result;
    return result?.ok ? result.plan : null;
  });
  protected readonly issues = computed(() => {
    const result = this.preview()?.result;
    return result && !result.ok ? result.issues : null;
  });
  protected readonly canImport = computed(
    () => !!this.parsedPlan() && this.name().trim().length > 0 && !this.busy(),
  );

  protected async onFileSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.busy.set(true);
    try {
      const preview = await this.importer.preview(file);
      this.preview.set(preview);
      this.name.set(preview.suggestedName);
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const plan = this.parsedPlan();
    if (!plan || !this.canImport()) {
      return;
    }
    this.busy.set(true);
    try {
      const activate = this.activate();
      const id = await this.importer.import(plan, { name: this.name(), activate });
      await this.router.navigateByUrl(activate ? '/workout' : `/plans/${id}`);
    } finally {
      this.busy.set(false);
    }
  }

  protected reset(): void {
    this.preview.set(null);
  }
}
