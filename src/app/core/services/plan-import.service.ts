import { Injectable, inject } from '@angular/core';
import { ImportIssue, ParsedPlan, Phase, PlanParseResult } from '../models';
import { PlanRepository } from '../repositories/plan.repository';
import { parsePlanCsv } from './plan-csv/plan-csv-parser';

/** A plan CSV is a few KB: anything larger is almost certainly the wrong file. */
export const MAX_PLAN_FILE_BYTES = 1024 * 1024;

export interface PlanImportPreview {
  fileName: string;
  /** Suggested plan name: the file name without extension. */
  suggestedName: string;
  result: PlanParseResult;
  /** Plans already imported with the same `fase` number (informative, not blocking). */
  samePhase: Phase[];
}

export interface PlanImportOptions {
  name: string;
  activate: boolean;
}

/** Reads a CSV file into a preview, then stores the confirmed plan. */
@Injectable({ providedIn: 'root' })
export class PlanImportService {
  private readonly plans = inject(PlanRepository);

  async preview(file: File): Promise<PlanImportPreview> {
    const fileName = file.name;
    const suggestedName = fileName.replace(/\.[^.]+$/, '').trim() || fileName;
    if (file.size > MAX_PLAN_FILE_BYTES) {
      return { fileName, suggestedName, result: failure({ code: 'fileTooLarge' }), samePhase: [] };
    }
    const result = parsePlanCsv(await file.text());
    const samePhase = result.ok ? await this.plans.findByFase(result.plan.fase) : [];
    return { fileName, suggestedName, result, samePhase };
  }

  import(plan: ParsedPlan, options: PlanImportOptions): Promise<number> {
    return this.plans.savePlan(
      { ...plan, name: options.name.trim(), importedAt: Date.now() },
      options.activate,
    );
  }
}

function failure(issue: ImportIssue): PlanParseResult {
  return { ok: false, issues: [issue] };
}
