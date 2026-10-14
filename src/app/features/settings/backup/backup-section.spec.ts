import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import type { MockInstance } from 'vitest';
import { BackupFile, BackupReadResult } from '../../../core/models';
import { AppRestartService } from '../../../core/services/app-restart.service';
import { BackupService } from '../../../core/services/backup/backup.service';
import { LanguageService } from '../../../core/services/language.service';
import { provideTranslocoForTests } from '../../../core/testing/transloco-testing';
import { BackupSection, RESTORED_URL } from './backup-section';

const BACKUP: BackupFile = {
  schemaVersion: 1,
  exportedAt: '2026-10-14T18:30:00.000Z',
  phases: [{ id: 1, name: 'Luglio', fase: 7, status: 'active', importedAt: 1 }],
  days: [],
  exercises: [],
  sessions: [{ id: 1, phaseId: 1, dayId: 1, startedAt: 2, endedAt: 3, outcome: 'skipped' }],
  setLogs: [],
};

describe('BackupSection', () => {
  const exportToFile = vi.fn();
  const read = vi.fn<(file: File) => Promise<BackupReadResult>>();
  const restore = vi.fn();
  const restartAt = vi.fn();
  let fixture: ComponentFixture<BackupSection>;
  let element: HTMLElement;
  let confirm: MockInstance<ConfirmationService['confirm']>;

  beforeEach(async () => {
    for (const mock of [exportToFile, read, restore, restartAt]) {
      mock.mockReset();
    }
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTests(),
        { provide: BackupService, useValue: { exportToFile, read, restore } },
        { provide: AppRestartService, useValue: { restartAt } },
        { provide: LanguageService, useValue: { current: signal('it') } },
      ],
    });
    fixture = TestBed.createComponent(BackupSection);
    element = fixture.nativeElement as HTMLElement;
    confirm = vi.spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm');
    await fixture.whenStable();
  });

  const button = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.includes(label),
    )!;

  async function chooseFile(): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('[data-testid="backup-file"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['{}'], 'backup.json')] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  const confirmation = (): Confirmation => confirm.mock.calls[0][0];

  it('exports a backup and tells where it was saved', async () => {
    exportToFile.mockResolvedValue('j-training-backup-2026-10-14.json');

    button('Esporta backup').click();
    await fixture.whenStable();

    expect(exportToFile).toHaveBeenCalledOnce();
    expect(element.textContent).toContain(
      'Backup salvato nei download: j-training-backup-2026-10-14.json',
    );
  });

  it('asks before replacing the data, with what the backup contains', async () => {
    read.mockResolvedValue({ ok: true, backup: BACKUP });

    await chooseFile();

    expect(confirmation().header).toBe('Ripristinare il backup?');
    expect(confirmation().message).toContain(
      'Backup del 14/10/26 · Schede: 1 · Allenamenti: 1 · Serie: 0.',
    );
    expect(confirmation().acceptLabel).toBe('Sostituisci i dati');
    expect(restore).not.toHaveBeenCalled();
  });

  it('restores the backup and restarts the app once confirmed', async () => {
    read.mockResolvedValue({ ok: true, backup: BACKUP });
    restore.mockResolvedValue(undefined);
    await chooseFile();

    confirmation().accept?.();
    await fixture.whenStable();

    expect(restore).toHaveBeenCalledWith(BACKUP);
    expect(restartAt).toHaveBeenCalledWith(RESTORED_URL);
  });

  it('keeps the data when the restore fails', async () => {
    read.mockResolvedValue({ ok: true, backup: BACKUP });
    restore.mockRejectedValue(new Error('QuotaExceededError'));
    await chooseFile();

    confirmation().accept?.();
    await fixture.whenStable();

    expect(restartAt).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ripristino non riuscito.');
    expect(element.textContent).toContain(
      'I dati di questo dispositivo non sono stati modificati.',
    );
  });

  it('explains why a file was refused, pointing at the invalid value', async () => {
    read.mockResolvedValue({ ok: false, issue: { code: 'invalidRecord', path: 'setLogs[3].kg' } });

    await chooseFile();

    expect(confirm).not.toHaveBeenCalled();
    const alert = element.querySelector('p-message');
    expect(alert?.textContent).toContain('Il backup è danneggiato: contiene un valore non valido.');
    expect(alert?.textContent).toContain('Posizione: setLogs[3].kg');
  });

  it('confirms a restore after the app restarted', async () => {
    fixture.componentRef.setInput('restored', true);
    await fixture.whenStable();

    expect(element.querySelector('p-message')?.textContent).toContain('Backup ripristinato');
  });
});
