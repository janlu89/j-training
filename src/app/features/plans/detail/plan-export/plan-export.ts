import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Message } from 'primeng/message';
import { PlanExportFormat } from '../../../../core/models';
import { PlanExportService } from '../../../../core/services/plan-export/plan-export.service';

/** Exports the plan with all its saved sets, as Excel for people or CSV for tools. */
@Component({
  selector: 'app-plan-export',
  imports: [TranslocoPipe, ButtonDirective, ButtonIcon, ButtonLabel, Message],
  templateUrl: './plan-export.html',
  styleUrl: './plan-export.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanExport {
  private readonly exporter = inject(PlanExportService);

  readonly phaseId = input.required<number>();

  protected readonly busy = signal(false);
  protected readonly savedFile = signal<string | null>(null);
  protected readonly failed = signal(false);

  protected async export(format: PlanExportFormat): Promise<void> {
    this.savedFile.set(null);
    this.failed.set(false);
    this.busy.set(true);
    try {
      this.savedFile.set(await this.exporter.export(this.phaseId(), format));
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
