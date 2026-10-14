import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PlanExportFormat, PlanRecords } from '../../models';
import { PlanExportRepository } from '../../repositories/plan-export.repository';
import { FileDownloadService } from '../file-download.service';

/** Characters not allowed in file names on Windows or Android, and control characters. */
const UNSAFE_FILE_NAME = /[\\/:*?"<>|\p{Cc}]+/gu;

/** Exports a plan with all its saved sets to a spreadsheet file. */
@Injectable({ providedIn: 'root' })
export class PlanExportService {
  private readonly plans = inject(PlanExportRepository);
  private readonly transloco = inject(TranslocoService);
  private readonly download = inject(FileDownloadService);

  /** Saves the file to the device and returns its name. */
  async export(phaseId: number, format: PlanExportFormat): Promise<string> {
    const records = await this.plans.getRecords(phaseId);
    if (!records) {
      throw new Error(`Plan ${phaseId} does not exist`);
    }
    const fileName = `${this.baseName(records)}.${format}`;
    this.download.save(await this.build(records, format), fileName);
    return fileName;
  }

  /**
   * The writers are loaded on demand: ExcelJS alone is about 1 MB, needed only when exporting,
   * so neither the first load of the app nor the plan page pays for it.
   */
  private async build(records: PlanRecords, format: PlanExportFormat): Promise<Blob> {
    if (format === 'csv') {
      const { buildPlanCsv } = await import('./plan-csv-export');
      return buildPlanCsv(records);
    }
    const { buildPlanWorkbook } = await import('./plan-xlsx-export');
    return buildPlanWorkbook(records, (key, params) => this.transloco.translate(key, params));
  }

  private baseName({ phase }: PlanRecords): string {
    const name = this.transloco.translate('planExport.fileName', {
      name: phase.name,
      fase: phase.fase,
    });
    return name.replace(UNSAFE_FILE_NAME, '-').replace(/\s+/g, ' ').trim() || 'j-training';
  }
}
