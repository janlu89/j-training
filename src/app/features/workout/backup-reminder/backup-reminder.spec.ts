import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupStatusService } from '../../../core/services/backup/backup-status.service';
import { BackupService } from '../../../core/services/backup/backup.service';
import { CLOCK } from '../../../core/services/clock';
import { LanguageService } from '../../../core/services/language.service';
import { provideTranslocoForTests } from '../../../core/testing/transloco-testing';
import { BackupReminder } from './backup-reminder';

const NOW = new Date(2026, 9, 15, 9, 0).getTime();

describe('BackupReminder', () => {
  const reminderDue = signal(false);
  const lastBackupAt = signal<number | undefined>(undefined);
  const snoozeReminder = vi.fn().mockResolvedValue(undefined);
  const exportToFile = vi.fn();
  let fixture: ComponentFixture<BackupReminder>;
  let element: HTMLElement;

  beforeEach(async () => {
    reminderDue.set(true);
    lastBackupAt.set(undefined);
    snoozeReminder.mockClear();
    exportToFile.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTests(),
        { provide: BackupStatusService, useValue: { reminderDue, lastBackupAt, snoozeReminder } },
        { provide: BackupService, useValue: { exportToFile } },
        { provide: LanguageService, useValue: { current: signal('it') } },
        { provide: CLOCK, useValue: () => NOW },
      ],
    });
    fixture = TestBed.createComponent(BackupReminder);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const button = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;

  it('shows nothing until a backup is due', async () => {
    reminderDue.set(false);
    await fixture.whenStable();

    expect(element.textContent?.trim()).toBe('');
  });

  it('invites a first backup', () => {
    expect(element.querySelector('h3')?.textContent).toContain('È ora di un backup');
    expect(element.textContent).toContain('Non hai ancora fatto un backup dei tuoi allenamenti');
  });

  it('says how old the last backup is', async () => {
    lastBackupAt.set(new Date(2026, 9, 5, 20, 0).getTime());
    await fixture.whenStable();

    expect(element.textContent).toContain('Ultimo backup: settimana scorsa.');
  });

  it('exports a backup in one tap and tells where it was saved', async () => {
    exportToFile.mockResolvedValue('j-training-backup-2026-10-15.json');

    button('Esporta backup').click();
    await fixture.whenStable();

    expect(exportToFile).toHaveBeenCalledOnce();
    expect(element.textContent).toContain(
      'Backup salvato nei download: j-training-backup-2026-10-15.json',
    );
    expect(element.querySelector('h3')).toBeNull();
  });

  it('postpones the reminder', () => {
    button('Più tardi').click();

    expect(snoozeReminder).toHaveBeenCalledOnce();
  });
});
