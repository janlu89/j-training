import { TestBed } from '@angular/core/testing';
import { PlanRepository } from '../repositories/plan.repository';
import { useTestDatabase } from '../testing/test-database';
import { MAX_PLAN_FILE_BYTES, PlanImportService } from './plan-import.service';

const CSV = [
  'fase,giorno,ordine,esercizio,tipo,attrezzo,serie,rip,posizione,ultimo_kg,unita_carico,rec_sec,rir,stato,note',
  '7,sabato,1,Squat,,,3,8,,80,totale,120,,attivo,',
].join('\n');

function file(content: string, name = 'scheda luglio.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('PlanImportService', () => {
  useTestDatabase();
  let service: PlanImportService;
  let plans: PlanRepository;

  beforeEach(() => {
    service = TestBed.inject(PlanImportService);
    plans = TestBed.inject(PlanRepository);
  });

  it('previews a valid file and suggests its name', async () => {
    const preview = await service.preview(file(CSV));

    expect(preview.suggestedName).toBe('scheda luglio');
    expect(preview.result.ok).toBe(true);
    expect(preview.samePhase).toEqual([]);
  });

  it('reports plans already imported with the same fase', async () => {
    const first = await service.preview(file(CSV));
    if (!first.result.ok) throw new Error('invalid fixture');
    await service.import(first.result.plan, { name: 'Luglio', activate: true });

    const second = await service.preview(file(CSV, 'copia.csv'));

    expect(second.samePhase.map((phase) => phase.name)).toEqual(['Luglio']);
  });

  it('rejects files larger than the limit without reading them', async () => {
    const big = file('x'.repeat(MAX_PLAN_FILE_BYTES + 1));
    const preview = await service.preview(big);
    expect(preview.result).toEqual({ ok: false, issues: [{ code: 'fileTooLarge' }] });
  });

  it('stores the confirmed plan with a trimmed name and the import time', async () => {
    const preview = await service.preview(file(CSV));
    if (!preview.result.ok) throw new Error('invalid fixture');

    const before = Date.now();
    const id = await service.import(preview.result.plan, { name: '  Luglio  ', activate: true });

    const plan = await plans.getPlan(id);
    expect(plan?.phase.name).toBe('Luglio');
    expect(plan?.phase.importedAt).toBeGreaterThanOrEqual(before);
    expect(plan?.days[0].exercises[0].esercizio).toBe('Squat');
  });
});
