import { TestBed } from '@angular/core/testing';
import { PlanExportService } from '../../../../core/services/plan-export/plan-export.service';
import { provideTranslocoForTests } from '../../../../core/testing/transloco-testing';
import { PlanExport } from './plan-export';

describe('PlanExport', () => {
  const exportPlan = vi.fn();

  beforeEach(() => {
    exportPlan.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTests(),
        { provide: PlanExportService, useValue: { export: exportPlan } },
      ],
    });
  });

  async function render(): Promise<{ element: HTMLElement; stable: () => Promise<void> }> {
    const fixture = TestBed.createComponent(PlanExport);
    fixture.componentRef.setInput('phaseId', 7);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, stable: () => fixture.whenStable() };
  }

  const button = (element: HTMLElement, label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;

  it.each([
    ['Excel', 'xlsx', 'Luglio - fase 7.xlsx'],
    ['CSV', 'csv', 'Luglio - fase 7.csv'],
  ])('exports the plan as %s and tells where the file is', async (label, format, fileName) => {
    exportPlan.mockResolvedValue(fileName);
    const { element, stable } = await render();

    button(element, label).click();
    await stable();

    expect(exportPlan).toHaveBeenCalledWith(7, format);
    expect(element.querySelector('p-message')?.textContent).toContain(
      `File salvato nei download: ${fileName}`,
    );
  });

  it('says when the export failed', async () => {
    exportPlan.mockRejectedValue(new Error('quota'));
    const { element, stable } = await render();

    button(element, 'Excel').click();
    await stable();

    expect(element.querySelector('p-message')?.textContent).toContain('Esportazione non riuscita.');
  });
});
